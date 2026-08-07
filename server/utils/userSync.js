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

const syncUserDepartment = async (userId, oldDepartmentId, newDepartmentId) => {
  if (String(oldDepartmentId || "") === String(newDepartmentId || "")) return;

  if (oldDepartmentId) {
    const [rows] = await pool.query("SELECT students FROM departments WHERE id = ?", [oldDepartmentId]);
    if (rows.length > 0) {
      const students = parseJSON(rows[0].students).filter(sid => String(sid) !== String(userId));
      await pool.query("UPDATE departments SET students = ? WHERE id = ?", [JSON.stringify(students), oldDepartmentId]);
    }
  }

  if (newDepartmentId) {
    const [rows] = await pool.query("SELECT students FROM departments WHERE id = ?", [newDepartmentId]);
    if (rows.length > 0) {
      const students = parseJSON(rows[0].students);
      if (!students.map(String).includes(String(userId))) {
        students.push(userId);
        await pool.query("UPDATE departments SET students = ? WHERE id = ?", [JSON.stringify(students), newDepartmentId]);
      }
    }
  }
};

const syncUserMachines = async (userId, machineIds) => {
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
  for (const machineId of affected) {
    await recomputeOperatorIdForMachine(machineId);
  }
};

// Keeps a user's department/machine assignments in sync with the department.students
// array and the machine_operators junction table (+ legacy machines.operatorId column).
// Pass `undefined` for a field to leave that part of the sync untouched.
export const syncUserRelations = async ({ userId, oldDepartmentId, newDepartmentId, machineIds }) => {
  if (newDepartmentId !== undefined) {
    await syncUserDepartment(userId, oldDepartmentId, newDepartmentId);
  }
  if (machineIds !== undefined) {
    await syncUserMachines(userId, machineIds);
  }
};
