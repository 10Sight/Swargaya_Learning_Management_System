import { Schema, model } from "mongoose";

const assignmentSchema = new Schema(
    {
        course: {
            type: Schema.Types.ObjectId,
            ref: "Course",
            required: true,
            index: true,
        },
        lesson: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        instructor: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        resources: [
            {
                type: String,
            },
        ],
        dueDate: {
            type: Date,
            required: true,
        },
        maxScore: {
            type: Number,
            default: 100,
        },
        allowResubmission: {
            type: Boolean,
            default: true,
        },
        status: {
            type: String,
            enum: ["ACTIVE", "CLOSED", "ARCHIVED"],
            default: "ACTIVE",
        },
    },
    {
        timestamps: true
    }
);

export default model("Assignment", assignmentSchema);