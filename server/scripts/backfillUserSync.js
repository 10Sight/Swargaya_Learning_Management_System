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
    const [users] = await pool.query("SELECT id, machines FROM users");
    const [operatorRows] = await pool.query("SELECT machineId, operatorId FROM machine_operators");
    const [machineRows] = await pool.query("SELECT id, name, line FROM machines");
    const machineMap = new Map(machineRows.map(m => [String(m.id), { name: m.name, lineId: m.line }]));
    const validMachineIds = new Set(machineMap.keys());

    const operatorsByUser = new Map();
    for (const row of operatorRows) {
        const key = String(row.operatorId);
        if (!operatorsByUser.has(key)) operatorsByUser.set(key, new Set());
        operatorsByUser.get(key).add(String(row.machineId));
    }

    let usersUpdated = 0, operatorRowsAdded = 0;
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
        const union = new Set([...fromUser, ...fromOperators]);

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

    return { usersUpdated, operatorRowsAdded, machinesRecomputed: affectedMachines.size };
}

(async () => {
    try {
        const deptResult = await backfillDepartments();
        console.log('Department sync backfill complete:', deptResult);

        const machineResult = await backfillMachines();
        console.log('Machine sync backfill complete:', machineResult);

        process.exit(0);
    } catch (err) {
        console.error('Backfill failed:', err);
        process.exit(1);
    }
})();
