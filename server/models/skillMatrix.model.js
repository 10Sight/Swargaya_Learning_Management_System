import mongoose from "mongoose";

const skillMatrixSchema = new mongoose.Schema(
    {
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: true,
        },
        line: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Line",
            required: true,
        },
        // Array of row entries
        entries: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    default: null, // For manual rows, this might be null or a placeholder
                },
                manualName: { type: String, default: "" }, // If manual row, store name here
                isManual: { type: Boolean, default: false },
                doj: { type: String, default: "-" },
                assignedStationId: { type: String, default: "" }, // Current primary station
                detCas: { type: String, default: "" }, // DET/CAS column
                stations: [
                    {
                        machineId: { type: String }, // Corresponds to Machine._id
                        name: { type: String }, // Snapshot for display
                        level: { type: Number, default: 0 },
                        critical: { type: String, default: "Non-Critical" },
                        min: { type: String, default: "L-1" }, // Snapshot
                        curr: { type: String, default: "L-0" },
                    },
                ],
            },
        ],
        // Header Information
        headerInfo: {
            formatNo: { type: String, default: "F-HRM-03-001" },
            revNo: { type: String, default: "8" },
            revDate: { type: String, default: "03-06-2025" },
            pageNo: { type: String, default: "1" },
        },
        // Footer Information
        footerInfo: {
            guidelines: { type: String, default: "" },
            legendNote: { type: String, default: "" },
            revisions: [
                {
                    date: { type: String },
                    revNo: { type: String },
                    change: { type: String },
                    reason: { type: String },
                },
            ],
        },
    },
    { timestamps: true }
);

// Compound index to ensure unique matrix per Dept + Line
skillMatrixSchema.index({ department: 1, line: 1 }, { unique: true });

export const SkillMatrix = mongoose.model("SkillMatrix", skillMatrixSchema);
