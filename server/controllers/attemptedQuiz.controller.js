import mongoose from "mongoose";

import AttemptedQuiz from "../models/attemptedQuiz.model.js";
import Quiz from "../models/quiz.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const attemptQuiz = asyncHandler(async (req, res) => {
    const { quizId, answers } = req.body;
    const userId = req.user._id;

    if(!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError(400, "Invalid quiz ID");
    }

    const quiz = await Quiz.findById(quizId);
    if(!quiz) {
        throw new ApiError(400, "Quiz not found");
    }

    if(!answers || answers.length === 0) {
        throw new ApiError(400, "Answers are required");
    }

    let score = 0;
    quiz.questions.forEach((q, index) => {
        if(answers[index] && answers[index] === q.correctOption) {
            score++;
        }
    });

    const attempt = await AttemptedQuiz.create({
        quiz: quizId,
        student: userId,
        answers,
        score,
    });

    res.status(201)
        .json(new ApiResponse(201, attempt, "Quiz attempted successfully"));
});

export const getMyAttempts = asyncHandler(async (req, res) => {
    const attempts = await AttemptedQuiz.find({ student: req.user._id })
        .populate("quiz", "title course")
        .sort({ createdAt: -1 });

    res.json(new ApiResponse(200, attempts, "My attempts fetched successfully"));
});

export const getAttemptsQuiz = asyncHandler(async (req, res) => {
    const { quizId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError(400, "Invalid quiz ID");
    }

    const attempts = await AttemptedQuiz.find({ quiz: quizId })
        .populate("student", "fullName email")
        .sort({ createdAt: -1 });

    res.json(new ApiResponse(200, attempts, "Attempts for quiz fetched successfully"));
});

export const getAttemptById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if(!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid attempt ID");
    }

    const attempt = await AttemptedQuiz.findById(id)
        .populate("quiz", "title questions")
        .populate("student", "fullName email")

    if(!attempt) {
        throw new ApiError(404, "Attempt not found");
    }

    res.json(new ApiResponse(200, attempt, "Attempt fetched successfully"));
});

export const deleteAttempt = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if(!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid attempt ID");
    }

    const attempt = await AttemptedQuiz.findById(id);
    if(!attempt) {
        throw new ApiError(404, "Attempt now found");
    }

    await attempt.deleteOne();

    res.json(new ApiResponse(200, null, "Attempt deleted successfully"));
});

// New endpoint to get specific student attempts for admin
export const getStudentAttempts = asyncHandler(async (req, res) => {
    const { studentId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ApiError(400, "Invalid student ID");
    }

    const attempts = await AttemptedQuiz.find({ student: studentId })
        .populate({
            path: "quiz",
            select: "title questions passingScore",
            populate: {
                path: "course",
                select: "title"
            }
        })
        .sort({ createdAt: -1 });

    // Transform attempts to include additional computed fields
    const transformedAttempts = attempts.map(attempt => {
        const totalQuestions = attempt.quiz?.questions?.length || 0;
        const scorePercent = totalQuestions > 0 ? Math.round((attempt.score / totalQuestions) * 100) : 0;
        const passingScore = attempt.quiz?.passingScore || 70;
        const passed = scorePercent >= passingScore;

        return {
            ...attempt.toObject(),
            scorePercent,
            passed,
            totalQuestions,
            attemptedAt: attempt.createdAt
        };
    });

    res.json(new ApiResponse(200, transformedAttempts, "Student attempts fetched successfully"));
});
