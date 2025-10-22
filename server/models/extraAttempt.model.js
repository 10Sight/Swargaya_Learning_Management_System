import { Schema, model } from "mongoose";

const extraAttemptAllowanceSchema = new Schema({
  quiz: { type: Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
  student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  extraAttemptsGranted: { type: Number, default: 1, min: 1 },
  grantedBy: { type: Schema.Types.ObjectId, ref: "User" },
  approvedAt: { type: Date },
}, { timestamps: true });

extraAttemptAllowanceSchema.index({ quiz: 1, student: 1 });

export default model("ExtraAttemptAllowance", extraAttemptAllowanceSchema);
