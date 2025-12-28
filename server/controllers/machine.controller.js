import Machine from "../models/machine.model.js";
import Line from "../models/line.model.js";
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
    const line = await Line.findById(lineId);
    if (!line) {
        throw new ApiError(404, "Line not found");
    }

    // Check if machine with same name exists in this line
    const existingMachine = await Machine.findOne({ name, line: lineId });
    if (existingMachine) {
        throw new ApiError(400, "Machine with this name already exists in this line");
    }

    const machine = await Machine.create({
        name,
        line: lineId,
        description
    });

    res.status(201).json(
        new ApiResponse(201, machine, "Machine created successfully")
    );
});

// @desc    Get all machines for a line
// @route   GET /api/machines/line/:lineId
// @access  Private
export const getMachinesByLine = asyncHandler(async (req, res) => {
    const { lineId } = req.params;

    const machines = await Machine.find({ line: lineId }).sort({ createdAt: -1 });

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

    const machine = await Machine.findById(id);

    if (!machine) {
        throw new ApiError(404, "Machine not found");
    }

    // If name is being updated, check for duplicates within the same line
    if (name && name !== machine.name) {
        const existingMachine = await Machine.findOne({
            name,
            line: machine.line,
            _id: { $ne: id }
        });

        if (existingMachine) {
            throw new ApiError(400, "Machine with this name already exists in this line");
        }
        machine.name = name;
    }

    if (description !== undefined) machine.description = description;
    if (isActive !== undefined) machine.isActive = isActive;

    await machine.save();

    res.status(200).json(
        new ApiResponse(200, machine, "Machine updated successfully")
    );
});

// @desc    Delete a machine
// @route   DELETE /api/machines/:id
// @access  Private
export const deleteMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const machine = await Machine.findById(id);

    if (!machine) {
        throw new ApiError(404, "Machine not found");
    }

    await machine.deleteOne();

    res.status(200).json(
        new ApiResponse(200, {}, "Machine deleted successfully")
    );
});
