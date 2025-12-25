import mongoose from "mongoose";

const onJobTrainingSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        // The main table entries (typically 15 rows)
        entries: [
            {
                date: { type: Date },
                hours: { type: Number },
                productionTarget: { type: Number },
                totalPartProduction: { type: Number },
                okParts: { type: Number },
                rejection: { type: Number },
                cycleTimeTarget: { type: Number },
                cycleTimeActual: { type: Number },
                ncTag: { type: String }, // Critical
                escalationSystem: { type: String },
                sosFollow: { type: String },
                customerComplaint: { type: String }, // Critical
                ppeUses: { type: String },
                associateSign: { type: String },
                mtsTrainerSign: { type: String },
                tlSign: { type: String },
                shiftInchargeSign: { type: String },
            },
        ],
        // Scoring Matrix Values (0, 1, 2, 3 or 'Fail')
        // We store the calculated score for each category
        scoring: {
            totalProduction: { type: Number },
            okProduction: { type: Number },
            rejection: { type: Number }, // Or String if 'Fail' is possible? keeping Number for now (0)
            avgCycleTime: { type: Number },

            // Process Checks (3 or 0/Fail)
            ncTag: { type: Number },
            escalation: { type: Number },
            sos: { type: Number },
            ppe: { type: Number },
            customerComplaint: { type: Number },
        },

        // Calculated Totals
        totalMarks: { type: Number, default: 36 }, // 4 cats * 3 + 5 process * 3 = 12 + 15 = 27? Wait. 4 cols * 3 = 12. 5 processes * 3 = 15. Total 27? 
        // Image says: "Total Marks"
        // Let's just allow frontend to send these.
        totalMarksObtained: { type: Number },
        totalPercentage: { type: Number },
        result: { type: String, enum: ["Pass", "Fail", "Pending"], default: "Pending" },

        // Footer Guidelines & Remarks
        guidelines: { type: String },
        remarks: { type: String },

        // Metadata
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    },
    { timestamps: true }
);

// Unique index to ensure one active evaluation per student? 
// Or allow history? For now, maybe just one per student is enough for "Level-1".
// onJobTrainingSchema.index({ student: 1 }, { unique: true });

const OnJobTraining = mongoose.model("OnJobTraining", onJobTrainingSchema);

export default OnJobTraining;
