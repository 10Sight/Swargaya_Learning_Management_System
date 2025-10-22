import { Schema, model } from "mongoose";

const attemptExtensionRequestSchema = new Schema({
  quiz: { type: Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
  student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  reason: { type: String, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING', index: true },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  reviewedAt: { type: Date },
  extraAttemptsGranted: { type: Number, default: 1, min: 1 },
}, { timestamps: true });

attemptExtensionRequestSchema.index({ quiz: 1, student: 1, status: 1 });

export default model("AttemptExtensionRequest", attemptExtensionRequestSchema);
