import Line from "../models/line.model.js";
import Department from "../models/department.model.js";
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
    const department = await Department.findById(departmentId);
    if (!department) {
        throw new ApiError(404, "Department not found");
    }

    // Check if line with same name exists in this department
    const existingLine = await Line.findOne({ name, department: departmentId });
    if (existingLine) {
        throw new ApiError(400, "Line with this name already exists in this department");
    }

    const line = await Line.create({
        name,
        department: departmentId,
        description
    });

    res.status(201).json(
        new ApiResponse(201, line, "Line created successfully")
    );
});

// @desc    Get all lines for a department
// @route   GET /api/lines/department/:departmentId
// @access  Private
export const getLinesByDepartment = asyncHandler(async (req, res) => {
    const { departmentId } = req.params;

    const lines = await Line.find({ department: departmentId }).sort({ createdAt: -1 });

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

    const line = await Line.findById(id);

    if (!line) {
        throw new ApiError(404, "Line not found");
    }

    // If name is being updated, check for duplicates
    if (name && name !== line.name) {
        const existingLine = await Line.findOne({
            name,
            department: line.department,
            _id: { $ne: id }
        });

        if (existingLine) {
            throw new ApiError(400, "Line with this name already exists in this department");
        }
        line.name = name;
    }

    if (description !== undefined) line.description = description;
    if (isActive !== undefined) line.isActive = isActive;

    await line.save();

    res.status(200).json(
        new ApiResponse(200, line, "Line updated successfully")
    );
});

// @desc    Delete a line
// @route   DELETE /api/lines/:id
// @access  Private
export const deleteLine = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const line = await Line.findById(id);

    if (!line) {
        throw new ApiError(404, "Line not found");
    }

    await line.deleteOne();

    res.status(200).json(
        new ApiResponse(200, {}, "Line deleted successfully")
    );
});
