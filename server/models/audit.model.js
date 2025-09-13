import { Schema, model } from "mongoose";

const auditSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
