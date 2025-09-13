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
            default: "BEGINNER",
        },
        status: {
            type: String,
            enum: AvailableCourseStatus,
            default: "DRAFT",
        },
        modules: [
            {
                title: { type: String, required: true },
                description: String,
                lessons: [
                    {
                        title: { type: String, required: true },
                        videoUrl: String,
                        content: String,
                        resources: [String],
                        duration: Number,
                    },
                ],
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
    },
    {
        timestamps: true,
    }
);

export default model("Course", courseSchema);
