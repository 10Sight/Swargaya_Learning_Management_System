import { pool } from "../db/connectDB.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Create a new line
// @route   POST /api/lines
// @access  Private
export const createLine = asyncHandler(async (req, res) => {
    const { name, departmentId, description } = req.body;

    if (!name || !departmentId) {
        throw new ApiError(400, "Name and Department ID are required");
    }

    // Check if department exists
    const [departments] = await pool.query("SELECT id FROM departments WHERE id = ?", [departmentId]);
    if (departments.length === 0) {
        throw new ApiError(404, "Department not found");
    }

    // Check if line with same name exists in this department
    const [existingLine] = await pool.query("SELECT id FROM [lines] WHERE name = ? AND department = ?", [name, departmentId]);
    if (existingLine.length > 0) {
        throw new ApiError(400, "Line with this name already exists in this department");
    }

    // Insert
    // Insert
    const [result] = await pool.query(
        "INSERT INTO [lines] (name, department, description, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, GETDATE(), GETDATE()); SELECT SCOPE_IDENTITY() AS id;",
        [name, departmentId, description, true]
    );

    const [newLine] = await pool.query("SELECT * FROM [lines] WHERE id = ?", [result[0].id]);

    res.status(201).json(
        new ApiResponse(201, newLine[0], "Line created successfully")
    );
});

// @desc    Get all lines for a department
// @route   GET /api/lines/department/:departmentId
// @access  Private
export const getLinesByDepartment = asyncHandler(async (req, res) => {
    const { departmentId } = req.params;

    const [lines] = await pool.query("SELECT * FROM [lines] WHERE department = ? ORDER BY createdAt DESC", [departmentId]);

    res.status(200).json(
        new ApiResponse(200, lines, "Lines fetched successfully")
    );
});

// @desc    Update a line
// @route   PUT /api/lines/:id
// @access  Private
export const updateLine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const [existing] = await pool.query("SELECT * FROM [lines] WHERE id = ?", [id]);
    if (existing.length === 0) {
        throw new ApiError(404, "Line not found");
    }
    const line = existing[0];

    // If name is being updated, check for duplicates
    if (name && name !== line.name) {
        const [duplicate] = await pool.query(
            "SELECT id FROM [lines] WHERE name = ? AND department = ? AND id != ?",
            [name, line.department, id]
        );

        if (duplicate.length > 0) {
            throw new ApiError(400, "Line with this name already exists in this department");
        }
    }

    let updateFields = [];
    let updateValues = [];

    if (typeof name !== 'undefined') { updateFields.push("name = ?"); updateValues.push(name); }
    if (typeof description !== 'undefined') { updateFields.push("description = ?"); updateValues.push(description); }
    if (typeof isActive !== 'undefined') { updateFields.push("isActive = ?"); updateValues.push(isActive); }

    if (updateFields.length > 0) {
        updateFields.push("updatedAt = GETDATE()");
        await pool.query(`UPDATE [lines] SET ${updateFields.join(', ')} WHERE id = ?`, [...updateValues, id]);
    }

    const [updatedLine] = await pool.query("SELECT * FROM [lines] WHERE id = ?", [id]);

    res.status(200).json(
        new ApiResponse(200, updatedLine[0], "Line updated successfully")
    );
});

// @desc    Delete a line
// @route   DELETE /api/lines/:id
// @access  Private
export const deleteLine = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [result] = await pool.query("DELETE FROM [lines] WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
        throw new ApiError(404, "Line not found");
    }

    res.status(200).json(
        new ApiResponse(200, {}, "Line deleted successfully")
    );
});
