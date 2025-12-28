import { Schema, model } from "mongoose";

const lineSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Line name is required"],
            trim: true
        },
        department: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            required: [true, "Department is required"]
        },
        description: {
            type: String,
            trim: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

// Compound index to ensure unique line names within a department
lineSchema.index({ name: 1, department: 1 }, { unique: true });

export default model("Line", lineSchema);
