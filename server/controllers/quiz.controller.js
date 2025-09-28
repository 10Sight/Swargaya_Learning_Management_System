import mongoose from "mongoose";

import Quiz from "../models/quiz.model.js";
import Course from "../models/course.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkModuleAccessForAssessments } from "../utils/moduleCompletion.js";

export const createQuiz = asyncHandler(async (req, res) => {
    const { courseId, moduleId, title, questions, passingScore, description, timeLimit, attemptsAllowed } = req.body;

    if(!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Invalid course ID", 400);
    }

    if(moduleId && !mongoose.Types.ObjectId.isValid(moduleId)) {
        throw new ApiError("Invalid module ID", 400);
    }

    const course = await Course.findById(courseId);
    if(!course) {
        throw new ApiError("Course not found", 404);
    }

    // If moduleId is provided, verify the module exists and belongs to the course
    if(moduleId) {
        const Module = (await import("../models/module.model.js")).default;
        const module = await Module.findOne({ _id: moduleId, course: courseId });
        if(!module) {
            throw new ApiError("Module not found or does not belong to this course", 404);
        }
    }

    if(!title || !questions || questions.length === 0) {
        throw new ApiError("Title and questions are required", 400);
    }

    const quiz = await Quiz.create({
        course: courseId,
        module: moduleId || null,
        title,
        description,
        questions,
        passingScore,
        timeLimit,
        attemptsAllowed,
        createdBy: req.user._id,
    });

    course.quizzes.push(quiz._id);
    await course.save();

    res.status(201)
        .json(new ApiResponse(201, quiz, "Quiz created successfully"));
});

export const getAllQuizzes = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const searchQuery = search
        ? { title: { $regex: search, $options: "i" } }
        : {};

    if(req.query.courseId) {
        searchQuery.course = req.query.courseId;
    }

    const total = await Quiz.countDocuments(searchQuery);

    const quizzes = await Quiz.find(searchQuery)
        .populate("course", "title")
        .populate("module", "title")
        .populate("createdBy", "fullName email role")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    res.json(
        new ApiResponse(200, {
            quizzes,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit,
            },
        }, "Quizzes fetched successfully")
    );
});

export const getQuizById = asyncHandler(async (req, res) => {
    if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError("Invalid quiz ID", 400);
    }

    const quiz = await Quiz.findById(req.params.id)
        .populate("course", "title")
        .populate("createdBy", "fullName email");

    if(!quiz) {
        throw new ApiError("Quiz not found", 404);
    }

    res.json(new ApiResponse(200, quiz, "Quiz fetched successfully"));
});

export const updateQuiz = asyncHandler(async (req, res) => {
    if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError("Invalid quiz ID", 400);
    }

    const { title, questions } = req.body;

    const quiz = await Quiz.findById(req.params.id);
    if(!quiz) {
        throw new ApiError("Quiz not found", 404);
    }

    if(title) quiz.title = title;
    if(questions && questions.length > 0) quiz.questions = questions;

    await quiz.save();

    res.json(new ApiResponse(200, quiz, "Quiz updated successfully"));
});

export const deleteQuiz = asyncHandler(async (req, res) => {
    if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError("Invalid quiz ID", 400);
    }

    const quiz = await Quiz.findById(req.params.id);
    if(!quiz) {
        throw new ApiError("Quiz not found", 404);
    }

    await Course.findByIdAndUpdate(quiz.course, {
        $pull: { quizzes: quiz._id },
    });

    await quiz.deleteOne();

    res.json(new ApiResponse(200, null, "Quiz deleted successfully"));
});

// Get quizzes accessible to a student for a specific module
export const getAccessibleQuizzes = asyncHandler(async (req, res) => {
    const { courseId, moduleId } = req.params;
    const userId = req.user._id;

    if(!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(moduleId)) {
        throw new ApiError("Invalid course ID or module ID", 400);
    }

    // Check if user has access to assessments for this module (effective completion)
    const accessCheck = await checkModuleAccessForAssessments(userId, courseId, moduleId);
    
    if (!accessCheck.hasAccess) {
        // Return empty array with access information
        return res.json(new ApiResponse(200, {
            quizzes: [],
            accessInfo: {
                hasAccess: false,
                reason: accessCheck.reason
            }
        }, "Module quizzes locked - complete all lessons to unlock"));
    }

    // User has access, fetch quizzes based on onlyModule parameter
    const onlyModule = String(req.query.onlyModule || '').toLowerCase() === 'true';
    let filter;
    
    if (onlyModule) {
        // First try to find quizzes specifically assigned to this module
        filter = { course: courseId, module: moduleId };

        const moduleOnlyQuizzes = await Quiz.find(filter)
            .populate("course", "title")
            .populate("module", "title")
            .sort({ createdAt: -1 });

        // If module has specific content, return it
        if (moduleOnlyQuizzes.length > 0) {
            return res.json(new ApiResponse(200, {
                quizzes: moduleOnlyQuizzes,
                accessInfo: {
                    hasAccess: true,
                    reason: accessCheck.reason
                }
            }, "Accessible quizzes (module-specific) fetched successfully"));
        }

        // Fallback: if no module-specific content, return course-wide items
        filter = { 
            course: courseId,
            $or: [
                { module: null },
                { module: { $exists: false } }
            ]
        };

        const fallbackQuizzes = await Quiz.find(filter)
            .populate("course", "title")
            .populate("module", "title")
            .sort({ createdAt: -1 });
        return res.json(new ApiResponse(200, {
            quizzes: fallbackQuizzes,
            accessInfo: {
                hasAccess: true,
                reason: accessCheck.reason
            }
        }, "Accessible quizzes (course-wide fallback) fetched successfully"));
    } else {
        // Return both module-specific and course-wide quizzes
        filter = { 
            course: courseId, 
            $or: [ 
                { module: moduleId }, 
                { module: null }, 
                { module: { $exists: false } }
            ] 
        };

        const quizzes = await Quiz.find(filter)
            .populate("course", "title")
            .populate("module", "title")
            .sort({ createdAt: -1 });

        return res.json(new ApiResponse(200, {
            quizzes,
            accessInfo: {
                hasAccess: true,
                reason: accessCheck.reason
            }
        }, "Accessible quizzes fetched successfully"));
    }
});
