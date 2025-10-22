import Module from "../models/module.model.js";
import Course from "../models/course.model.js";
import mongoose from "mongoose";

import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createModule = asyncHandler(async (req, res) => {
    const { courseId, title, description, order } = req.body;

    if(!courseId || !title) {
        throw new ApiError("Course ID and Title are required", 400);
    }

    const course = await Course.findById(courseId);

    if(!course) throw new ApiError("Course not found", 404);

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

    let id = courseId;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        const course = await Course.findOne({ slug: courseId }).select('_id');
        if (!course) return res.status(404).json(new ApiResponse(404, [], "Course not found"));
        id = course._id;
    }

    const modules = await Module.find({ course: id })
        .populate("resources")
        .populate("lessons")
        .sort({ order: 1 });
    res.status(200).json(new ApiResponse(200, modules, "Modules fetched successfully"));
});

export const getModuleById = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;


    if (!moduleId || moduleId === 'undefined' || moduleId === 'null') {
        return res.status(400).json(new ApiResponse(400, null, "Module ID is required"));
    }

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
        return res.status(400).json(new ApiResponse(400, null, "Invalid module ID format"));
    }

    const module = await Module.findById(moduleId)
        .populate("course", "title description")
        .populate("resources")
        .populate("lessons");
    
    if (!module) {
        return res.status(404).json(new ApiResponse(404, null, "Module not found"));
    }

    res.status(200).json(new ApiResponse(200, module, "Module fetched successfully"));
});

export const updateModule = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;
    const { title, description, order } = req.body;

    const module = await Module.findByIdAndUpdate(
        moduleId,
        { title, description, order },
        { new: true }
    );

    if(!module) throw new ApiError("Moduel not found", 404);

    res.status(200).json(new ApiResponse(200, module, "Module updated successfully"));
});

export const deleteModule = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;

    const module = await Module.findByIdAndDelete(moduleId);
    if(!module) throw new ApiError("Module not found", 404);

    await Course.findByIdAndUpdate(module.course, { $pull: { modules: moduleId } });

    res.status(200).json(new ApiResponse(200, {}, "Module deleted successfully"));
});