import { Schema, model } from "mongoose";
import validator from "validator";

const { trim } = validator;

const optionSchema = new Schema(
    {
        text: {
            type: String,
            required: [true, "Option text is required"],
            trim: true,
        },
        isCorrect: {
            type: Boolean,
            default: false,
        },
    },
    { _id: false }
);

const questionSchema = new Schema(
    {
        questionText: {
            type: String,
            required: [ true, "Question text is required" ],
            trim: true,
        },
        options: {
            type: [optionSchema],
            validate: {
                validator: function (v) {
                    return v && v.length >= 2;
                },
                message: "A question must have at least 2 options",
            },
        },
        marks: {
            type: Number,
            default: 1,
            min: [1, "Marks must be at least 1"],
        },
    }
    // _id: true by default, which is what we need for question tracking
);

const quizSchema = new Schema(
    {
        course: {
            type: Schema.Types.ObjectId,
            ref: "Course",
            required: [true, "Course reference is required"],
            index: true,
        },
        module: {
            type: Schema.Types.ObjectId,
            ref: "Module",
            required: false,
            index: true,
        },
        title: {
            type: String,
            required: [true, "Quiz title is required"],
            trim: true,
            maxlength: [150, "Quiz title cannot exceed 150 characters"],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, "Description too long"],
        },
        questions: {
            type: [questionSchema],
            validate: {
                validator: function (v) {
                    return v && v.length > 0;
                },
                message: "Quiz must contain at lest one question",
            },
        },
        passingScore: {
            type: Number,
            required: [true, "Passing score is required"],
            min: [0, "Passing score cannot be negative"],
        },
        timeLimit: {
            type: Number,
            default: null,
            min: [1, "Time limit must be at least 1 minute"],
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Quiz must have a creator"],
        },
        isPublished: {
            type: Boolean,
            default: false,
        },
        attemptsAllowed: {
            type: Number,
            default: 1,
            min: [1, "At least 1 attempt must be allowed"],
        },
    },
    {
        timestamps: true
    }
);

quizSchema.index({ course: 1, createdBy: 1 });

export default model("Quiz", quizSchema);