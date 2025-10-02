import { Schema, model } from "mongoose";

const batchSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        course: {
            type: Schema.Types.ObjectId,
            ref: "Course",
            required: false,
            index: true,
        },
        instructor: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: false,
            index: true, // Index for instructor queries
        },
        students: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        startDate: {
            type: Date,
            required: false,
            default: null,
        },
        endDate: {
            type: Date,
        },
        capacity: {
            type: Number,
            default: 50,
        },
        status: {
            type: String,
            enum: ["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"],
            default: "UPCOMING",
            index: true, // Index for status filtering
        },
        schedule: [
            {
                day: { type: String },
                startTime: { type: String },
                endTime: { type: String },
            },
        ],
        notes: {
            type: String,
            trim: true,
        },
        batchQuiz: {
            type: Schema.Types.ObjectId,
            ref: "Quiz",
            required: false,
        },
        batchAssignment: {
            type: Schema.Types.ObjectId,
            ref: "Assignment",
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

export default model("Batch", batchSchema);