import { Schema, model } from "mongoose";

const elementSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['text', 'rect', 'image'], required: true },
    xPct: { type: Number, default: 10 },
    yPct: { type: Number, default: 10 },
    wPct: { type: Number, default: 20 },
    hPct: { type: Number, default: 10 },
    rotation: { type: Number, default: 0 },
    // Text
    text: { type: String },
    // Shape styles
    fill: { type: String },
    stroke: { type: String },
    // Image
    url: { type: String },
    alt: { type: String },
    aspectRatio: { type: Number },
  },
  { _id: false }
);

const slideSchema = new Schema(
  {
    order: { type: Number, default: 1 },
    // Store TipTap/HTML content as string to keep frontend simple and flexible
    contentHtml: { type: String, default: "" },
    bgColor: { type: String, default: "#ffffff" },
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String },
        alt: { type: String, default: "" },
      },
    ],
    // New positioned elements (text boxes, shapes, images)
    elements: { type: [elementSchema], default: [] },
  },
  { _id: true }
);

const lessonSchema = new Schema(
  {
    module: {
      type: Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // Legacy single content field (kept for backward compatibility)
    content: {
      type: String,
      trim: true,
    },
    // New slide-based presentation content
    slides: {
      type: [slideSchema],
      default: [],
    },
    duration: {
      type: Number,
      default: 0,
    },
    order: {
      type: Number,
      default: 1,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
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

lessonSchema.index({ module: 1, slug: 1 }, { unique: true });

lessonSchema.pre('save', async function(next) {
  if (!this.isModified('title') && this.slug) return next();
  const base = slugify(this.title);
  this.slug = await ensureUniqueSlug(this.constructor, base, { module: this.module }, this._id);
  next();
});

export default model("Lesson", lessonSchema);
