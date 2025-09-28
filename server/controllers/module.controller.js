import Module from "../models/module.model.js";
import Course from "../models/course.model.js";

import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createModule = asyncHandler(async (req, res) => {
    const { courseId, title, description, order } = req.body;

    if(!courseId || !title) {
        throw new ApiError(400, "Course ID and Title are required");
    }

    const course = await Course.findById(courseId);

    if(!course) throw new ApiError(404, "Course not found");

    const module = await Module.create({
        course: courseId,
        title,
        description,
        order,
    });

    course.modules.push(module._id);
    await course.save();

    res.status(201).json(new ApiResponse(201, module, "Moduel created successfully"));
});

export const getModulesByCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const modules = await Module.find({ course: courseId })
        .populate("resources")
        .populate("lessons")
        .sort({ order: 1 });
    res.status(200).json(new ApiResponse(200, modules, "Modules fetched successfully"));
});

export const updateModule = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;
    const { title, description, order } = req.body;

    const module = await Module.findByIdAndUpdate(
        moduleId,
        { title, description, order },
        { new: true }
    );

    if(!module) throw new ApiError(404, "Moduel not found");

    res.status(200).json(new ApiResponse(200, module, "Module updated successfully"));
});

export const deleteModule = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;

    const module = await Module.findByIdAndDelete(moduleId);
    if(!module) throw new ApiError(404, "Module not found");

    await Course.findByIdAndUpdate(module.course, { $pull: { modules: moduleId } });

    res.status(200).json(new ApiResponse(200, {}, "Module deleted successfully"));
});