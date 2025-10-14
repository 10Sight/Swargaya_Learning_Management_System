import { Schema, model } from "mongoose";

const auditSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,  // Allow system logs without a user
      index: true,
      default: null,
    },
    action: {
      type: String,
      required: true, 
    },
    resourceType: {
      type: String, 
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'success',
    },
    ip: String,
    userAgent: String,
    details: Schema.Types.Mixed, 
  },
  {
    timestamps: true,
  }
);

auditSchema.index({ user: 1, createdAt: -1 }); 

export default model("Audit", auditSchema);
