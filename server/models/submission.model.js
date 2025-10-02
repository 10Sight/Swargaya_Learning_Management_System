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
            required: false, // Made optional for backward compatibility
        },
        attachments: [{
            filename: {
                type: String,
                required: true
            },
            originalName: {
                type: String,
                required: true
            },
            filePath: {
                type: String,
                required: true
            },
            fileSize: {
                type: Number,
                required: true
            },
            mimeType: {
                type: String,
                required: true
            },
            uploadedAt: {
                type: Date,
                default: Date.now
            }
        }],
        grade: {
            type: Number,
            min: 0,
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
        status: {
            type: String,
            enum: ['DRAFT', 'SUBMITTED', 'GRADED', 'RETURNED'],
            default: 'SUBMITTED'
        },
        gradedAt: {
            type: Date,
            default: null
        },
        gradedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
    },
    {
        timestamps: true
    }
);

submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

export default model("Submission", submissionSchema);