import { Schema, model } from "mongoose";

const machineSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Machine name is required"],
            trim: true
        },
        line: {
            type: Schema.Types.ObjectId,
            ref: "Line",
            required: [true, "Line ID is required"]
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

// Compound index to ensure unique machine names within a line
machineSchema.index({ name: 1, line: 1 }, { unique: true });

export default model("Machine", machineSchema);
