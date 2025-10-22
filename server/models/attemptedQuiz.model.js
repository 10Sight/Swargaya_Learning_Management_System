import { Schema, model } from "mongoose";
import { AvailableStudentStatus } from "../constants.js";

const answerSchema = new Schema(
    {
        questionId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        selectedOptions: [
            {
                type: String,
                required: true,
            },
        ],
        isCorrect: {
            type: Boolean,
            default: false,
        },
        marksObtained: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        _id: false
    }
);

const quizAttemptSchema = new Schema(
    {
        quiz: {
            type: Schema.Types.ObjectId,
            ref: "Quiz",
            required: [true, "Quiz refrence is required"],
            index: true,
        },
        student: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User refrence is required"],
            index: true,
        },
        answer: {
            type: [answerSchema],
            default: [],
        },
        score: {
            type: Number,
            default: 0,
            min: 0,
        },
        status: {
            type: String,
            enum: AvailableStudentStatus,
            default: "IN_PROGRESS",
        },
        startedAt: {
            type: Date,
            default: Date.now,
        },
        completedAt: {
            type: Date,
        },
        attemptNumber: {
            type: Number,
            default: 1,
            min: 1,
        },
        timeTaken: {
            type: Number,
            default: 0,
        },
        // Admin adjustment metadata
        manuallyAdjusted: {
            type: Boolean,
            default: false,
        },
        adjustedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        adjustedAt: {
            type: Date,
        },
        adjustmentNotes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true
    }
);

quizAttemptSchema.index({ quiz: 1, student: 1, attemptNumber: 1 }, {unique: true});

export default model("QuizAttempt", quizAttemptSchema);