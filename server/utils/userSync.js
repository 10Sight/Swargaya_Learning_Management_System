import { pool } from "../db/connectDB.js";

const parseJSON = (data, fallback = []) => {
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch (e) { return fallback; }
  }
  return data || fallback;
};

// Recomputes the legacy machines.operatorId column from the machine_operators
// junction table (first assigned operator wins), matching machine.controller.js logic.
export const recomputeOperatorIdForMachine = async (machineId) => {
  const [firstOp] = await pool.query(
    "SELECT TOP 1 operatorId FROM machine_operators WHERE machineId = ? ORDER BY assignedAt ASC",
    [machineId]
  );
  const operatorId = firstOp.length > 0 ? firstOp[0].operatorId : null;
  await pool.query("UPDATE machines SET operatorId = ? WHERE id = ?", [operatorId, machineId]);
};

// Self-healing: scans every department's `students` array (instead of trusting the
// caller-supplied oldDepartmentId) and makes sure the user is present in exactly the
// target department and absent from every other one. This recovers automatically from
// any prior desync, e.g. a department switch that only wrote one side of the relation.
const syncDepartmentMembership = async (userId, newDepartmentId) => {
  const [depts] = await pool.query("SELECT id, students FROM departments");
  for (const dept of depts) {
    const students = parseJSON(dept.students);
    const isMember = students.map(String).includes(String(userId));
    const shouldBeMember = newDepartmentId != null && String(dept.id) === String(newDepartmentId);

    if (isMember && !shouldBeMember) {
      const next = students.filter(sid => String(sid) !== String(userId));
      await pool.query("UPDATE departments SET students = ? WHERE id = ?", [JSON.stringify(next), dept.id]);
    } else if (!isMember && shouldBeMember) {
      await pool.query("UPDATE departments SET students = ? WHERE id = ?", [JSON.stringify([...students, userId]), dept.id]);
    }
  }
};

// Drops machine_operators assignments for machines whose line belongs to `departmentId`.
// Used when a user's department changes, so operator assignments from their old
// department's lines/machines don't dangle around after the move.
const removeMachinesForDepartment = async (userId, departmentId) => {
  if (!departmentId) return;
  const [rows] = await pool.query(
    `SELECT mo.machineId FROM machine_operators mo
     JOIN machines m ON mo.machineId = m.id
     JOIN [lines] l ON m.line = l.id
     WHERE mo.operatorId = ? AND l.department = ?`,
    [userId, departmentId]
  );
  if (rows.length === 0) return;

  await pool.query(
    `DELETE mo
     FROM machine_operators mo
     JOIN machines m ON mo.machineId = m.id
     JOIN [lines] l ON m.line = l.id
     WHERE mo.operatorId = ? AND l.department = ?`,
    [userId, departmentId]
  );

  await Promise.all(rows.map(r => recomputeOperatorIdForMachine(r.machineId)));
};

// Applies an explicit target list of machine IDs to the machine_operators junction table.
const syncMachineOperators = async (userId, machineIds) => {
  const [currentRows] = await pool.query("SELECT machineId FROM machine_operators WHERE operatorId = ?", [userId]);
  const currentIds = currentRows.map(r => String(r.machineId));
  const nextIds = (machineIds || [])
    .map(m => (m && typeof m === 'object') ? m.id : m)
    .filter(id => id !== undefined && id !== null)
    .map(id => String(id));

  const toRemove = currentIds.filter(id => !nextIds.includes(id));
  const toAdd = nextIds.filter(id => !currentIds.includes(id));

  for (const machineId of toRemove) {
    await pool.query("DELETE FROM machine_operators WHERE machineId = ? AND operatorId = ?", [machineId, userId]);
  }
  for (const machineId of toAdd) {
    await pool.query(
      `IF NOT EXISTS (SELECT 1 FROM machine_operators WHERE machineId = ? AND operatorId = ?)
       INSERT INTO machine_operators (machineId, operatorId) VALUES (?, ?)`,
      [machineId, userId, machineId, userId]
    );
  }

  const affected = [...new Set([...toRemove, ...toAdd])];
  await Promise.all(affected.map(recomputeOperatorIdForMachine));
};

// Rebuilds users.lines / users.machines from the machine_operators junction table, which is
// the source of truth for operator assignments. Running this on every sync call means the
// JSON columns can never drift out of sync with actual assignments, regardless of which
// code path (student edit, department move, machine operator change) triggered the update.
const resyncLinesAndMachinesFromOperators = async (userId) => {
  const [rows] = await pool.query(
    `SELECT m.id, m.name, m.line as lineId, l.name as lineName
     FROM machine_operators mo
     JOIN machines m ON mo.machineId = m.id
     LEFT JOIN [lines] l ON m.line = l.id
     WHERE mo.operatorId = ?
     ORDER BY mo.assignedAt ASC`,
    [userId]
  );

  // machines.line is a VARCHAR column (holding numeric line IDs as text), while lines.id is a
  // real INT — mssql returns the former as a string and the latter as a number. Cast here so
  // the id always matches the number type the frontend gets from /api/lines/department/:id
  // (otherwise `formData.lines.some(l => l.id === line.id)` never matches and the Lines
  // checkboxes in the Edit dialog show nothing checked).
  const machines = rows.map(r => ({ id: r.id, name: r.name, lineId: r.lineId != null ? Number(r.lineId) : null }));

  const linesMap = new Map();
  for (const r of rows) {
    if (r.lineId != null && !linesMap.has(String(r.lineId))) {
      linesMap.set(String(r.lineId), { id: Number(r.lineId), name: r.lineName });
    }
  }

  await pool.query("UPDATE users SET lines = ?, machines = ? WHERE id = ?", [
    JSON.stringify([...linesMap.values()]), JSON.stringify(machines), userId
  ]);
};

// Unified sync entry point — keeps a user's department membership, machine_operators
// assignments, and derived lines/machines JSON columns consistent with each other.
// Pass `undefined` for a field to leave that part untouched. The lines/machines resync
// always runs, since it's cheap self-healing that every caller benefits from (e.g. a
// machine operator change made directly against machine_operators, with no department or
// machineIds args here, still needs the user's derived arrays refreshed).
export const syncUserRelations = async ({ userId, oldDepartmentId, newDepartmentId, machineIds }) => {
  if (newDepartmentId !== undefined) {
    await syncDepartmentMembership(userId, newDepartmentId);
    if (String(oldDepartmentId || "") !== String(newDepartmentId || "")) {
      await removeMachinesForDepartment(userId, oldDepartmentId);
    }
  }

  if (machineIds !== undefined) {
    await syncMachineOperators(userId, machineIds);
  }

  await resyncLinesAndMachinesFromOperators(userId);
};
