import { Schema, model } from "mongoose";

const moduleSchema = new Schema(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 1,
    },
    lessons: [
      {
        type: Schema.Types.ObjectId,
        ref: "Lesson", 
      },
    ],
    resources: [
      {
        type: Schema.Types.ObjectId,
        ref: "Resource",
      },
    ],
  },
  { timestamps: true }
);

export default model("Module", moduleSchema);
