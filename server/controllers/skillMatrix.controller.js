import { SkillMatrix } from "../models/skillMatrix.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// @desc    Save (Upsert) Skill Matrix
// @route   POST /api/v1/skill-matrix/save
// @access  Private (Admin)
const saveSkillMatrix = asyncHandler(async (req, res) => {
    const { department, line, entries, headerInfo, footerInfo } = req.body;

    if (!department || !line) {
        throw new ApiError(400, "Department and Line are required");
    }

    // Upsert the matrix
    const matrix = await SkillMatrix.findOneAndUpdate(
        { department, line },
        {
            department,
            line,
            entries,
            headerInfo,
            footerInfo,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

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

    const matrix = await SkillMatrix.findOne({
        department: departmentId,
        line: lineId,
    });

    if (!matrix) {
        // Return null data with success code if not found, 
        // frontend will handle the "not created yet" state by showing default derived data
        return res
            .status(200)
            .json(new ApiResponse(200, null, "No saved matrix found used default"));
    }

    res.status(200).json(
        new ApiResponse(200, matrix, "Skill Matrix fetched successfully")
    );
});

export { saveSkillMatrix, getSkillMatrix };
