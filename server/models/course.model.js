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
            enum: AvailableCourseDifficultyLevels,
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
    },
    {
        timestamps: true,
    }
);

courseSchema.virtual('studentCount').get(function() {
    return this.students ? this.students.length : 0;
});

courseSchema.set('toJSON', { virtuals: true });

export default model("Course", courseSchema);
