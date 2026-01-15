import { pool } from "../db/connectDB.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// Helper to safely parse JSON
const parseJSON = (data, fallback = null) => {
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch (e) { return fallback; }
    }
    return data || fallback;
};

// @desc    Save (Upsert) Skill Matrix
// @route   POST /api/v1/skill-matrix/save
// @access  Private (Admin)
const saveSkillMatrix = asyncHandler(async (req, res) => {
    const { department, line, entries, headerInfo, footerInfo } = req.body;

    if (!department || !line) {
        throw new ApiError(400, "Department and Line are required");
    }

    // Prepare JSON strings
    const entriesJson = JSON.stringify(entries || []);
    const headerJson = JSON.stringify(headerInfo || {});
    const footerJson = JSON.stringify(footerInfo || {});

    // Check if exists
    const [existing] = await pool.query(
        "SELECT id FROM skill_matrices WHERE department = ? AND line = ?",
        [department, line]
    );

    let matrixId;
    if (existing.length > 0) {
        // Update
        matrixId = existing[0].id;
        await pool.query(
            `UPDATE skill_matrices 
             SET entries = ?, headerInfo = ?, footerInfo = ?, updatedAt = NOW() 
             WHERE id = ?`,
            [entriesJson, headerJson, footerJson, matrixId]
        );
    } else {
        // Insert
        const [result] = await pool.query(
            `INSERT INTO skill_matrices (department, line, entries, headerInfo, footerInfo, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [department, line, entriesJson, headerJson, footerJson]
        );
        matrixId = result.insertId;
    }

    // Fetch updated/created
    const [rows] = await pool.query("SELECT * FROM skill_matrices WHERE id = ?", [matrixId]);
    const matrix = rows[0];

    // Parse JSON for response
    matrix.entries = parseJSON(matrix.entries);
    matrix.headerInfo = parseJSON(matrix.headerInfo);
    matrix.footerInfo = parseJSON(matrix.footerInfo);

    res.status(200).json(
        new ApiResponse(200, matrix, "Skill Matrix saved successfully")
    );
});

// @desc    Get Skill Matrix by Department and Line
// @route   GET /api/v1/skill-matrix/:departmentId/:lineId
// @access  Private
const getSkillMatrix = asyncHandler(async (req, res) => {
    const { departmentId, lineId } = req.params;

    if (!departmentId || !lineId) {
        throw new ApiError(400, "Department ID and Line ID are required");
    }

    const [rows] = await pool.query(
        "SELECT * FROM skill_matrices WHERE department = ? AND line = ?",
        [departmentId, lineId]
    );

    if (rows.length === 0) {
        // Return null data with success code if not found, 
        // frontend will handle the "not created yet" state by showing default derived data
        return res
            .status(200)
            .json(new ApiResponse(200, null, "No saved matrix found used default"));
    }

    const matrix = rows[0];
    matrix.entries = parseJSON(matrix.entries);
    matrix.headerInfo = parseJSON(matrix.headerInfo);
    matrix.footerInfo = parseJSON(matrix.footerInfo);

    res.status(200).json(
        new ApiResponse(200, matrix, "Skill Matrix fetched successfully")
    );
});

export { saveSkillMatrix, getSkillMatrix };
