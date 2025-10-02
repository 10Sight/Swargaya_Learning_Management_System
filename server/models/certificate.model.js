import { model, Schema } from "mongoose";

const certificateSchema = new Schema(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        course: {
            type: Schema.Types.ObjectId,
            ref: "Course",
            required: true,
            index: true,
        },
        issuedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        grade: {
            type: String,
            enum: ["A+", "A", "B", "C", "PASS", "FAIL"],
            default: "PASS",
        },
        issueDate: {
            type: Date,
            default: Date.now,
        },
        expiryDate: {
            type: Date,
        },
        fileUrl: {
            type: String,
        },
        status: {
            type: String,
            enum: ["ACTIVE", "REVOKED", "EXPIRED"],
            default: "ACTIVE",
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true
    }
);

export default model("Certificate", certificateSchema);