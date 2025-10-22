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
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
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

import { slugify, ensureUniqueSlug } from "../utils/slugify.js";

moduleSchema.index({ course: 1, slug: 1 }, { unique: true });

moduleSchema.pre('save', async function(next) {
  if (!this.isModified('title') && this.slug) return next();
  const base = slugify(this.title);
  this.slug = await ensureUniqueSlug(this.constructor, base, { course: this.course }, this._id);
  next();
});

export default model("Module", moduleSchema);
