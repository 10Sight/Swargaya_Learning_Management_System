import { pool } from '../db/connectDB.js';
import { recomputeOperatorIdForMachine } from '../utils/userSync.js';

const parseArray = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch (e) { return []; }
    }
    return [];
};

// Reconciles departments.students against each STUDENT's current primary
// users.department (source of truth), removing stale entries left behind by
// department switches that predate the userSync fix, and adding any missing ones.
async function backfillDepartments() {
    const [students] = await pool.query("SELECT id, department FROM users WHERE role = 'STUDENT'");
    const studentDeptMap = new Map(students.map(u => [String(u.id), u.department ? String(u.department) : null]));

    const [departments] = await pool.query("SELECT id, students FROM departments");

    let deptsUpdated = 0, studentsRemoved = 0, studentsAdded = 0;
    const deptStudentsMap = new Map();

    for (const dept of departments) {
        const original = parseArray(dept.students);
        const cleaned = original.filter(sid => studentDeptMap.get(String(sid)) === String(dept.id));
        studentsRemoved += original.length - cleaned.length;
        deptStudentsMap.set(String(dept.id), { list: cleaned, originalRaw: JSON.stringify(original) });
    }

    for (const [studentId, deptId] of studentDeptMap) {
        if (!deptId || !deptStudentsMap.has(deptId)) continue;
        const entry = deptStudentsMap.get(deptId);
        if (!entry.list.map(String).includes(studentId)) {
            entry.list.push(isNaN(studentId) ? studentId : parseInt(studentId));
            studentsAdded++;
        }
    }

    for (const [deptId, entry] of deptStudentsMap) {
        const newRaw = JSON.stringify(entry.list);
        if (newRaw !== entry.originalRaw) {
            await pool.query("UPDATE departments SET students = ? WHERE id = ?", [newRaw, deptId]);
            deptsUpdated++;
        }
    }

    return { deptsUpdated, studentsRemoved, studentsAdded };
}

// Reconciles users.machines against machine_operators. Historical data could be out
// of sync in either direction (Students.jsx wrote users.machines directly; the Line
// Detail page wrote machine_operators directly), so we merge rather than pick a
// single side, then recompute the legacy machines.operatorId column.
const getMachineEntryId = (m) => (m && typeof m === 'object') ? m.id : m;

async function backfillMachines() {
    const [users] = await pool.query("SELECT id, machines, department FROM users");
    const [operatorRows] = await pool.query("SELECT machineId, operatorId FROM machine_operators");
    const [machineRows] = await pool.query(
        `SELECT m.id, m.name, m.line as lineId, l.department as departmentId
         FROM machines m
         LEFT JOIN [lines] l ON m.line = l.id`
    );
    // m.lineId comes from machines.line, a VARCHAR column (mssql returns it as a string) —
    // cast to a number so it matches lines.id (a real INT) the way the frontend expects.
    const machineMap = new Map(machineRows.map(m => [String(m.id), { name: m.name, lineId: m.lineId != null ? Number(m.lineId) : null, departmentId: m.departmentId }]));
    const validMachineIds = new Set(machineMap.keys());

    const operatorsByUser = new Map();
    for (const row of operatorRows) {
        const key = String(row.operatorId);
        if (!operatorsByUser.has(key)) operatorsByUser.set(key, new Set());
        operatorsByUser.get(key).add(String(row.machineId));
    }

    let usersUpdated = 0, operatorRowsAdded = 0, operatorRowsRemoved = 0;
    const affectedMachines = new Set();

    for (const u of users) {
        const rawMachines = parseArray(u.machines);
        const fromUser = new Set(
            rawMachines
                .map(getMachineEntryId)
                .filter(id => id !== undefined && id !== null)
                .map(String)
                .filter(id => validMachineIds.has(id))
        );
        const fromOperators = operatorsByUser.get(String(u.id)) || new Set();
        const merged = new Set([...fromUser, ...fromOperators]);

        // Drop assignments to machines whose line belongs to a department other than the
        // user's current one (or drop everything if the user has no department at all) —
        // these are dangling cross-department leftovers from department switches that
        // predate the userSync fix, which now prevents new ones from being created.
        const union = new Set(
            [...merged].filter(machineId => {
                if (!u.department) return false;
                const info = machineMap.get(machineId);
                return info && String(info.departmentId) === String(u.department);
            })
        );

        for (const machineId of union) {
            if (!fromOperators.has(machineId)) {
                await pool.query(
                    `IF NOT EXISTS (SELECT 1 FROM machine_operators WHERE machineId = ? AND operatorId = ?)
                     INSERT INTO machine_operators (machineId, operatorId) VALUES (?, ?)`,
                    [machineId, u.id, machineId, u.id]
                );
                operatorRowsAdded++;
                affectedMachines.add(machineId);
            }
        }

        const toDrop = [...fromOperators].filter(machineId => !union.has(machineId));
        for (const machineId of toDrop) {
            await pool.query("DELETE FROM machine_operators WHERE machineId = ? AND operatorId = ?", [machineId, u.id]);
            operatorRowsRemoved++;
            affectedMachines.add(machineId);
        }

        // Always normalize to full { id, name, lineId } objects, not just when the ID set changes,
        // so pre-existing rows storing plain numbers/ids get repaired too.
        const desiredArr = [...union].sort((a, b) => Number(a) - Number(b)).map(idStr => {
            const info = machineMap.get(idStr);
            const numericId = isNaN(idStr) ? idStr : parseInt(idStr);
            return { id: numericId, name: info?.name ?? null, lineId: info?.lineId ?? null };
        });

        const currentRaw = JSON.stringify(rawMachines);
        const desiredRaw = JSON.stringify(desiredArr);
        if (currentRaw !== desiredRaw) {
            await pool.query("UPDATE users SET machines = ? WHERE id = ?", [desiredRaw, u.id]);
            usersUpdated++;
        }
    }

    for (const machineId of affectedMachines) {
        await recomputeOperatorIdForMachine(machineId);
    }

    return { usersUpdated, operatorRowsAdded, operatorRowsRemoved, machinesRecomputed: affectedMachines.size };
}

// Rebuilds users.lines from machine_operators, mirroring resyncLinesAndMachinesFromOperators
// in utils/userSync.js: a user's lines are always derived from their assigned machines, never
// stored independently. Must run after backfillMachines() so machine_operators already
// reflects any rows merged in from historical users.machines data.
async function backfillLines() {
    const [rows] = await pool.query(
        `SELECT mo.operatorId, m.line as lineId, l.name as lineName
         FROM machine_operators mo
         JOIN machines m ON mo.machineId = m.id
         LEFT JOIN [lines] l ON m.line = l.id`
    );

    const linesByUser = new Map();
    for (const r of rows) {
        if (r.lineId == null) continue;
        const key = String(r.operatorId);
        if (!linesByUser.has(key)) linesByUser.set(key, new Map());
        linesByUser.get(key).set(String(r.lineId), { id: Number(r.lineId), name: r.lineName });
    }

    const [users] = await pool.query("SELECT id, lines FROM users");
    let usersUpdated = 0;

    for (const u of users) {
        const desired = [...(linesByUser.get(String(u.id))?.values() || [])];
        const desiredRaw = JSON.stringify(desired);
        const currentRaw = JSON.stringify(parseArray(u.lines));
        if (currentRaw !== desiredRaw) {
            await pool.query("UPDATE users SET lines = ? WHERE id = ?", [desiredRaw, u.id]);
            usersUpdated++;
        }
    }

    return { usersUpdated };
}

(async () => {
    try {
        const deptResult = await backfillDepartments();
        console.log('Department sync backfill complete:', deptResult);

        const machineResult = await backfillMachines();
        console.log('Machine sync backfill complete:', machineResult);

        const linesResult = await backfillLines();
        console.log('Lines sync backfill complete:', linesResult);

        process.exit(0);
    } catch (err) {
        console.error('Backfill failed:', err);
        process.exit(1);
    }
})();
