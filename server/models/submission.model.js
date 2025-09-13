import { Schema, model } from "mongoose";

const submissionSchema = new Schema(
    {
        assignment: {
            type: Schema.Types.ObjectId,
            ref: "Assignment",
            required: true,
            index: true,
        },
        student: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        fileUrl: {
            type: String,
            required: true,
        },
        grade: {
            type: Number,
            min: 0,
            max: 100,
            default: null,
        },
        feedback: {
            type: String,
            trim: true,
        },
        submittedAt: {
            type: Date,
            default: Date.now,
        },
        isLate: {
            type: Boolean,
            default: false,
        },
        resubmissionCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true
    }
);

submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

export default model("Submission", submissionSchema);