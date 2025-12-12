import { Schema, model } from "mongoose";
import { AvailableCourseStatus, AvailableCourseDifficultyLevels } from "../constants.js";

const courseSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        description: {
            type: String,
            required: true,
        },
        thumbnail: {
            publicId: { type: String, default: "" },
            url: { type: String, default: "" },
        },
        category: {
            type: String,
            required: true,
            index: true,
        },
        tags: [
            {
                type: String,
                trim: true,
            },
        ],

        instructor: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true, // Index for instructor queries
        },
        students: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        price: {
            type: Number,
            default: 0,
        },
        difficulty: {
            type: String,
            default: "BEGGINER",
        },
        status: {
            type: String,
            enum: AvailableCourseStatus,
            default: "DRAFT",
            index: true, // Index for filtering by status
        },
        modules: [
            {
                type: Schema.Types.ObjectId,
                ref: "Module"
            },
        ],
        reviews: [
            {
                student: { type: Schema.Types.ObjectId, ref: "User" },
                rating: { type: Number, min: 1, max: 5 },
                comment: String,
                createdAt: { type: Date, default: Date.now },
            },
        ],
        totalEnrollments: {
            type: Number,
            default: 0,
        },
        averageRating: {
            type: Number,
            default: 0,
        },
        slug: {
            type: String,
            trim: true,
            lowercase: true,
            unique: true,
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        quizzes: [
            {
                type: Schema.Types.ObjectId,
                ref: "Quiz",
            },
        ],
        assignments: [
            {
                type: Schema.Types.ObjectId,
                ref: "Assignment",
            },
        ],
        resources: [
            {
                type: Schema.Types.ObjectId,
                ref: "Resource",
            },
        ],
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

courseSchema.virtual('studentCount').get(function () {
    return this.students ? this.students.length : 0;
});

courseSchema.set('toJSON', { virtuals: true });

import { slugify, ensureUniqueSlug } from "../utils/slugify.js";

courseSchema.pre('save', async function (next) {
    if (!this.isModified('title') && this.slug) return next();
    const base = slugify(this.title);
    this.slug = await ensureUniqueSlug(this.constructor, base, {}, this._id);
    next();
});

export default model("Course", courseSchema);
