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
        // Legacy fields - keeping for backward compatibility
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
        type: {
            type: String,
            enum: ["MODULE", "COURSE", "LESSON"],
            default: function() {
                // Determine type based on scope or legacy logic
                if (this.scope) {
                    return this.scope.toUpperCase();
                }
                return this.module ? "MODULE" : "COURSE";
            },
            index: true,
        },
        // New resource-like scoping system
        courseId: {
            type: Schema.Types.ObjectId,
            ref: "Course",
            default: function() {
                return this.course; // Use legacy course field as fallback
            }
        },
        moduleId: {
            type: Schema.Types.ObjectId,
            ref: "Module",
            default: function() {
                return this.module; // Use legacy module field as fallback
            }
        },
        lessonId: {
            type: Schema.Types.ObjectId,
            ref: "Lesson",
            default: null
        },
        // Scope - helps identify where quiz belongs
        scope: {
            type: String,
            enum: ["course", "module", "lesson"],
            default: function() {
                // Determine scope based on what IDs are provided
                if (this.lessonId || (this.type && this.type === "LESSON")) {
                    return "lesson";
                } else if (this.moduleId || this.module) {
                    return "module";
                } else {
                    return "course";
                }
            }
        },
        title: {
            type: String,
            required: [true, "Quiz title is required"],
            trim: true,
            maxlength: [150, "Quiz title cannot exceed 150 characters"],
        },
        slug: {
            type: String,
            trim: true,
            lowercase: true,
            unique: true,
            index: true,
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
        // attemptsAllowed === 0 => unlimited attempts
        attemptsAllowed: {
            type: Number,
            default: 1,
            validate: {
                validator(value) {
                    // Allow 0 to represent unlimited, or any positive integer
                    return value === 0 || value >= 1;
                },
                message: "Attempts must be 0 (unlimited) or at least 1",
            },
        },
    },
    {
        timestamps: true
    }
);

quizSchema.index({ course: 1, createdBy: 1 });

// Pre-save hook to ensure data consistency between new and legacy fields
quizSchema.pre('save', function(next) {
    const quiz = this;
    
    // Sync new fields with legacy fields for backward compatibility
    if (quiz.courseId && !quiz.course) {
        quiz.course = quiz.courseId;
    }
    if (quiz.course && !quiz.courseId) {
        quiz.courseId = quiz.course;
    }
    
    if (quiz.moduleId && !quiz.module) {
        quiz.module = quiz.moduleId;
    }
    if (quiz.module && !quiz.moduleId) {
        quiz.moduleId = quiz.module;
    }
    
    // Validate scope matches provided IDs
    if (quiz.scope === 'course' && (quiz.moduleId || quiz.lessonId)) {
        return next(new Error('Course-scoped quiz cannot have module or lesson IDs'));
    }
    if (quiz.scope === 'module' && (!quiz.moduleId || quiz.lessonId)) {
        return next(new Error('Module-scoped quiz must have moduleId and cannot have lessonId'));
    }
    if (quiz.scope === 'lesson' && (!quiz.lessonId || !quiz.moduleId)) {
        return next(new Error('Lesson-scoped quiz must have both moduleId and lessonId'));
    }
    
    next();
});

import { slugify, ensureUniqueSlug } from "../utils/slugify.js";

quizSchema.pre('save', async function(next) {
    if (!this.isModified('title') && this.slug) return next();
    const base = slugify(this.title);
    this.slug = await ensureUniqueSlug(this.constructor, base, {}, this._id);
    next();
});

export default model("Quiz", quizSchema);
