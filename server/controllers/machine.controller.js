import { pool } from "../db/connectDB.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const fetchOperatorsForMachines = async (machineIds) => {
    if (!machineIds.length) return {};
    const placeholders = machineIds.map(() => '?').join(',');
    const [rows] = await pool.query(
        `SELECT mo.machineId, u.id, u.fullName, u.email
         FROM machine_operators mo
         JOIN users u ON mo.operatorId = u.id
         WHERE mo.machineId IN (${placeholders})
         ORDER BY mo.assignedAt ASC`,
        machineIds
    );
    const map = {};
    for (const row of rows) {
        if (!map[row.machineId]) map[row.machineId] = [];
        map[row.machineId].push({ id: row.id, fullName: row.fullName, email: row.email });
    }
    return map;
};

const attachOperators = (machine, operators) => ({
    ...machine,
    operators,
    operatorId: operators[0]?.id ?? machine.operatorId ?? null,
    operatorName: operators.length ? operators.map(o => o.fullName).join(', ') : (machine.operatorName ?? null),
    operatorEmail: operators[0]?.email ?? null,
});

// @desc    Create a new machine
// @route   POST /api/machines
// @access  Private
export const createMachine = asyncHandler(async (req, res) => {
    const { name, lineId, description } = req.body;

    if (!name || !lineId) {
        throw new ApiError(400, "Name and Line ID are required");
    }

    // Check if line exists
    const [lines] = await pool.query("SELECT id FROM [lines] WHERE id = ?", [lineId]);
    if (lines.length === 0) {
        throw new ApiError(404, "Line not found");
    }

    // Check if machine with same name exists in this line
    const [existingMachine] = await pool.query("SELECT id FROM machines WHERE name = ? AND line = ?", [name, lineId]);
    if (existingMachine.length > 0) {
        throw new ApiError(400, "Machine with this name already exists in this line");
    }

    // Insert
    const [result] = await pool.query(
        "INSERT INTO machines (name, line, description, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, GETDATE(), GETDATE()); SELECT SCOPE_IDENTITY() AS id;",
        [name, lineId, description, true]
    );

    const [newMachine] = await pool.query("SELECT * FROM machines WHERE id = ?", [result[0].id]);

    res.status(201).json(
        new ApiResponse(201, newMachine[0], "Machine created successfully")
    );
});

// @desc    Get all machines for a line
// @route   GET /api/machines/line/:lineId
// @access  Private
export const getMachinesByLine = asyncHandler(async (req, res) => {
    const { lineId } = req.params;

    const [machines] = await pool.query(
        `SELECT m.*, u.fullName as operatorName
         FROM machines m
         LEFT JOIN users u ON m.operatorId = u.id
         WHERE m.line = ?
         ORDER BY m.createdAt DESC`,
        [lineId]
    );

    const machineIds = machines.map(m => m.id);
    const operatorsMap = await fetchOperatorsForMachines(machineIds);

    const result = machines.map(m => attachOperators(m, operatorsMap[m.id] || []));

    res.status(200).json(
        new ApiResponse(200, result, "Machines fetched successfully")
    );
});

// @desc    Get a single machine by ID
// @route   GET /api/machines/:id
// @access  Private
export const getMachineById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [rows] = await pool.query(
        `SELECT m.*, u.fullName as operatorName, u.email as operatorEmail
         FROM machines m
         LEFT JOIN users u ON m.operatorId = u.id
         WHERE m.id = ?`,
        [id]
    );

    if (rows.length === 0) {
        throw new ApiError(404, "Machine not found");
    }

    const operatorsMap = await fetchOperatorsForMachines([parseInt(id)]);
    const machine = attachOperators(rows[0], operatorsMap[rows[0].id] || []);

    res.status(200).json(
        new ApiResponse(200, machine, "Machine fetched successfully")
    );
});

// @desc    Update a machine
// @route   PUT /api/machines/:id
// @access  Private
export const updateMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, isActive, operatorId, operatorIds, assignOperatorId, unassignOperatorId } = req.body;

    const [existing] = await pool.query("SELECT * FROM machines WHERE id = ?", [id]);
    if (existing.length === 0) {
        throw new ApiError(404, "Machine not found");
    }
    const machine = existing[0];

    if (name && name !== machine.name) {
        const [duplicate] = await pool.query(
            "SELECT id FROM machines WHERE name = ? AND line = ? AND id != ?",
            [name, machine.line, id]
        );
        if (duplicate.length > 0) {
            throw new ApiError(400, "Machine with this name already exists in this line");
        }
    }

    // Handle junction table operator changes
    const operatorFieldChanged =
        Array.isArray(operatorIds) ||
        assignOperatorId != null ||
        unassignOperatorId != null ||
        typeof operatorId !== 'undefined';

    if (Array.isArray(operatorIds)) {
        await pool.query("DELETE FROM machine_operators WHERE machineId = ?", [id]);
        for (const opId of operatorIds) {
            await pool.query(
                "INSERT INTO machine_operators (machineId, operatorId) VALUES (?, ?)",
                [id, opId]
            );
        }
    } else if (assignOperatorId != null) {
        await pool.query(
            `IF NOT EXISTS (SELECT 1 FROM machine_operators WHERE machineId = ? AND operatorId = ?)
             INSERT INTO machine_operators (machineId, operatorId) VALUES (?, ?)`,
            [id, assignOperatorId, id, assignOperatorId]
        );
    } else if (unassignOperatorId != null) {
        await pool.query(
            "DELETE FROM machine_operators WHERE machineId = ? AND operatorId = ?",
            [id, unassignOperatorId]
        );
    } else if (typeof operatorId !== 'undefined') {
        // Legacy single-operator path
        await pool.query("DELETE FROM machine_operators WHERE machineId = ?", [id]);
        if (operatorId !== null) {
            await pool.query(
                "INSERT INTO machine_operators (machineId, operatorId) VALUES (?, ?)",
                [id, operatorId]
            );
        }
    }

    // Build machines UPDATE (field edits + operatorId sync if needed)
    const updateFields = [];
    const updateValues = [];

    if (typeof name !== 'undefined') { updateFields.push("name = ?"); updateValues.push(name); }
    if (typeof description !== 'undefined') { updateFields.push("description = ?"); updateValues.push(description); }
    if (typeof isActive !== 'undefined') { updateFields.push("isActive = ?"); updateValues.push(isActive); }

    if (operatorFieldChanged) {
        const [firstOp] = await pool.query(
            "SELECT TOP 1 operatorId FROM machine_operators WHERE machineId = ? ORDER BY assignedAt ASC",
            [id]
        );
        const syncedOperatorId = firstOp.length > 0 ? firstOp[0].operatorId : null;
        updateFields.push("operatorId = ?");
        updateValues.push(syncedOperatorId);
    }

    if (updateFields.length > 0) {
        updateFields.push("updatedAt = GETDATE()");
        await pool.query(`UPDATE machines SET ${updateFields.join(', ')} WHERE id = ?`, [...updateValues, id]);
    }

    const [updatedRows] = await pool.query("SELECT * FROM machines WHERE id = ?", [id]);
    const operatorsMap = await fetchOperatorsForMachines([parseInt(id)]);
    const response = attachOperators(updatedRows[0], operatorsMap[updatedRows[0].id] || []);

    res.status(200).json(
        new ApiResponse(200, response, "Machine updated successfully")
    );
});

// @desc    Delete a machine
// @route   DELETE /api/machines/:id
// @access  Private
export const deleteMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [existing] = await pool.query("SELECT id FROM machines WHERE id = ?", [id]);
    if (existing.length === 0) {
        throw new ApiError(404, "Machine not found");
    }

    await pool.query("DELETE FROM machine_operators WHERE machineId = ?", [id]);
    await pool.query("DELETE FROM machines WHERE id = ?", [id]);

    res.status(200).json(
        new ApiResponse(200, {}, "Machine deleted successfully")
    );
});
