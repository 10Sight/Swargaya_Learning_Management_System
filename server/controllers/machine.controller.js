import { pool } from "../db/connectDB.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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

    const [machines] = await pool.query("SELECT * FROM machines WHERE line = ? ORDER BY createdAt DESC", [lineId]);

    res.status(200).json(
        new ApiResponse(200, machines, "Machines fetched successfully")
    );
});

// @desc    Update a machine
// @route   PUT /api/machines/:id
// @access  Private
export const updateMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const [existing] = await pool.query("SELECT * FROM machines WHERE id = ?", [id]);
    if (existing.length === 0) {
        throw new ApiError(404, "Machine not found");
    }
    const machine = existing[0];

    // If name is being updated, check for duplicates within the same line
    if (name && name !== machine.name) {
        const [duplicate] = await pool.query(
            "SELECT id FROM machines WHERE name = ? AND line = ? AND id != ?",
            [name, machine.line, id]
        );

        if (duplicate.length > 0) {
            throw new ApiError(400, "Machine with this name already exists in this line");
        }
    }

    let updateFields = [];
    let updateValues = [];

    if (typeof name !== 'undefined') { updateFields.push("name = ?"); updateValues.push(name); }
    if (typeof description !== 'undefined') { updateFields.push("description = ?"); updateValues.push(description); }
    if (typeof isActive !== 'undefined') { updateFields.push("isActive = ?"); updateValues.push(isActive); }

    if (updateFields.length > 0) {
        updateFields.push("updatedAt = GETDATE()");
        await pool.query(`UPDATE machines SET ${updateFields.join(', ')} WHERE id = ?`, [...updateValues, id]);
    }

    const [updatedMachine] = await pool.query("SELECT * FROM machines WHERE id = ?", [id]);

    res.status(200).json(
        new ApiResponse(200, updatedMachine[0], "Machine updated successfully")
    );
});

// @desc    Delete a machine
// @route   DELETE /api/machines/:id
// @access  Private
export const deleteMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [result] = await pool.query("DELETE FROM machines WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
        throw new ApiError(404, "Machine not found");
    }

    res.status(200).json(
        new ApiResponse(200, {}, "Machine deleted successfully")
    );
});
