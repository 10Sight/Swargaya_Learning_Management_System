import mongoose from "mongoose";

import Progress from "../models/progress.model.js";
import Course from "../models/course.model.js";
import Certificate from "../models/certificate.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const initializeProgress = asyncHandler(async (req, res) => {
    const { courseId } = req.body;
    const userId = req.user._id;

    if(!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError(400, "Invalid course ID");
    }

    const course = await Course.findById(courseId);
    if(!course) throw new ApiError(404, "Course not found");

    let progress = await Progress.findOne({ user: userId, course: courseId });
    if(progress) {
        throw new ApiError(400, "Progress already initialized for this coruse");
    }

    progress = await Progress.create({
        user: userId,
        course: courseId,
        currentLevel: "L1",
        completedModules: [],
        percentage: 0,
    });

    res
        .status(201)
        .json(new ApiResponse(201, progress, "Progress initialized successfully"));
});

export const updateProgress = asyncHandler(async (req, res) => {
    const { courseId, moduleId } = req.body;
    const userId = req.user._id;

    const progress = await Progress.findOne({ user: userId, course: courseId });
    if(!progress) throw new ApiError(404, "Progress now found");

    if(!progress.completedModules.includes(moduleId)) {
        progress.completedModules.push(moduleId);
    }

    await progress.calculateProgress();

    res.json(new ApiResponse(200, progress, "Progress updated successfully"));
});

export const upgradeLevel = asyncHandler(async (req, res) => {
    const { courseId } = req.body;
    const userId = req.user._id;

    const progress = await Progress.findOne({ user: userId, course: courseId });
    if(!progress) throw new ApiError(404, "Progress not found");

    if(progress.percentage < 100) {
        throw new ApiError(400, "Cannot upgrade level until progress is 100%");
    }

    if(progress.currentLevel === "L1") {
        progress.currentLevel = "L2";
    } else if(progress.currentLevel === "L2") {
        progress.currentLevel = "L3";
    } else if(progress.currentLevel === "L3") {
        const certificate = await Certificate.create({
            user: userId,
            course: courseId,
            issuedBy: req.user._id,
        });
        progress.isCompleted = true;

        await progress.save();
        return res.json(
            new ApiResponse(
                200,
                { progress, certificate },
                "Course completed, certificate issued"
            )
        );
    }

    await progress.save();
    res.json(
        new ApiResponse(200, progress, "Level upgraded successfully")
    );
});

export const getMyProgress = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user._id;

    const progress = await Progress.findOne({ user: userId, course: courseId })
        .populate("course", "title")
        .populate("user", "fullName email");

    if(!progress) throw new ApiError(404, "Progress not found");

    res.json(new ApiResponse(200, progress, "Progress fetched successfully"));
});

export const getCourseProgress = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const progresses = await Progress.find({ course: courseId })
        .populate("user", "fullName email")
        .sort({ createdAt: -1 });

    res.json(
        new ApiResponse(200, progresses, "Course progress fetched successfully")
    );
});