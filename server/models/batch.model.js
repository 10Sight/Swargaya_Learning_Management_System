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
    },
    {
        timestamps: true,
    }
);

export default model("Batch", batchSchema);