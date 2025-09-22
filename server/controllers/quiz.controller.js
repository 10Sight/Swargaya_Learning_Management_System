import mongoose from "mongoose";

import Quiz from "../models/quiz.model.js";
import Course from "../models/course.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createQuiz = asyncHandler(async (req, res) => {
    const { courseId, title, questions, passingScore } = req.body;

    if(!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError(400, "Invalid course ID");
    }

    const course = await Course.findById(courseId);
    if(!course) {
        throw new ApiError(404, "Course not found");
    }

    if(!title || !questions || questions.length === 0) {
        throw new ApiError(400, "Title and questions are required");
    }

    const quiz = await Quiz.create({
        course: courseId,
        title,
        questions,
        passingScore,
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
        throw new ApiError(400, "Invalid quiz ID");
    }

    const quiz = await Quiz.findById(req.params.id)
        .populate("course", "title")
        .populate("createdBy", "fullName email");

    if(!quiz) {
        throw new ApiError(404, "Quiz not found");
    }

    res.json(new ApiResponse(200, quiz, "Quiz fetched successfully"));
});

export const updateQuiz = asyncHandler(async (req, res) => {
    if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "Invalid quiz ID");
    }

    const { title, questions } = req.body;

    const quiz = await Quiz.findById(req.params.id);
    if(!quiz) {
        throw new ApiError(404, "Quiz not found");
    }

    if(title) quiz.title = title;
    if(questions && questions.length > 0) quiz.questions = questions;

    await quiz.save();

    res.json(new ApiResponse(200, quiz, "Quiz updated successfully"));
});

export const deleteQuiz = asyncHandler(async (req, res) => {
    if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError(400, "Invalid quiz ID");
    }

    const quiz = await Quiz.findById(req.params.id);
    if(!quiz) {
        throw new ApiError(404, "Quiz not found");
    }

    await Course.findByIdAndUpdate(quiz.course, {
        $pull: { quizzes: quiz._id },
    });

    await quiz.deleteOne();

    res.json(new ApiResponse(200, null, "Quiz deleted successfully"));
});