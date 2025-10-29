import Lesson from "../models/lesson.model.js";
import Module from "../models/module.model.js";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

export const createLesson = asyncHandler(async (req, res) => {
  const rawModuleId = req.params?.moduleId ?? req.body?.moduleId;
  const { title, content, duration, order, slides } = req.body || {};

  if (!rawModuleId || rawModuleId === "undefined" || rawModuleId === "null") {
    return res.status(400).json(new ApiResponse(400, null, "Module ID is required"));
  }

  if (!mongoose.Types.ObjectId.isValid(rawModuleId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid module ID format"));
  }

  const module = await Module.findById(rawModuleId);
  if (!module) {
    return res.status(404).json(new ApiResponse(404, null, "Module not found"));
  }

  // Normalize slides if provided
  let normalizedSlides = [];
  if (Array.isArray(slides)) {
    normalizedSlides = slides.map((s, idx) => ({
      order: typeof s.order === 'number' ? s.order : idx + 1,
      contentHtml: String(s.contentHtml || ''),
      bgColor: s.bgColor || '#ffffff',
      images: Array.isArray(s.images) ? s.images.map(img => ({
        url: img.url,
        public_id: img.public_id,
        alt: img.alt || ''
      })) : [],
      elements: Array.isArray(s.elements) ? s.elements.map(el => ({
        id: String(el.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
        type: el.type,
        xPct: Number(el.xPct ?? 10),
        yPct: Number(el.yPct ?? 10),
        wPct: Number(el.wPct ?? 20),
        hPct: Number(el.hPct ?? 10),
        rotation: Number(el.rotation ?? 0),
        text: el.text,
        fill: el.fill,
        stroke: el.stroke,
        url: el.url,
        alt: el.alt,
        aspectRatio: typeof el.aspectRatio === 'number' ? el.aspectRatio : undefined,
      })) : []
    }));
  }

  // Back-compat: if slides provided but content missing, set content from first slide
  const legacyContent = (content && content.trim().length > 0)
    ? content
    : (normalizedSlides[0]?.contentHtml || '');

  const lesson = await Lesson.create({
    module: rawModuleId,
    title,
    content: legacyContent,
    slides: normalizedSlides,
    duration,
    order,
  });

  module.lessons.push(lesson._id);
  await module.save();

  return res
    .status(201)
    .json(new ApiResponse(201, lesson, "Lesson created successfully"));
});

export const getLessonsByModule = asyncHandler(async (req, res) => {
  const rawModuleId = req.params?.moduleId ?? req.body?.moduleId;

  if (!rawModuleId || rawModuleId === 'undefined' || rawModuleId === 'null') {
    return res.status(400).json(new ApiResponse(400, [], "Module ID is required"));
  }

  let moduleId = rawModuleId;
  if (!mongoose.Types.ObjectId.isValid(rawModuleId)) {
    const m = await Module.findOne({ slug: String(rawModuleId).toLowerCase() }).select('_id');
    if (!m) {
      return res.status(400).json(new ApiResponse(400, [], "Invalid module identifier"));
    }
    moduleId = m._id;
  }

  try {
    const lessons = await Lesson.find({ module: moduleId })
      .select('module title content duration order resources slides createdAt updatedAt')
      .sort({ order: 1 })
      .lean();

    // Ensure slides present; fallback from legacy content if needed
    const normalized = lessons.map(l => {
      let slides = Array.isArray(l.slides) ? l.slides : [];
      if ((!slides || slides.length === 0) && l.content) {
        slides = [{ order: 1, contentHtml: String(l.content || ''), bgColor: '#ffffff', images: [] }];
      }
      return { ...l, slides };
    });

    return res
      .status(200)
      .json(new ApiResponse(200, normalized, "Lessons fetched successfully"));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, [], "Error fetching lessons"));
  }
});

export const getLessonById = asyncHandler(async (req, res) => {
  const rawLessonId = req.params?.lessonId ?? req.body?.lessonId;

  if (!rawLessonId || rawLessonId === 'undefined' || rawLessonId === 'null') {
    return res.status(400).json(new ApiResponse(400, null, "Lesson ID is required"));
  }

  let lesson = null;
  if (mongoose.Types.ObjectId.isValid(rawLessonId)) {
    lesson = await Lesson.findById(rawLessonId)
      .select('module title content duration order resources slides createdAt updatedAt')
      .lean();
  }
  if (!lesson) {
    lesson = await Lesson.findOne({ slug: String(rawLessonId).toLowerCase() })
      .select('module title content duration order resources slides createdAt updatedAt')
      .lean();
  }
  if (!lesson) {
    return res.status(404).json(new ApiResponse(404, null, "Lesson not found"));
  }
  // Ensure slides is present; fallback from legacy content if needed
  if (!Array.isArray(lesson.slides) || lesson.slides.length === 0) {
    lesson.slides = lesson.content
      ? [{ order: 1, contentHtml: String(lesson.content || ''), bgColor: '#ffffff', images: [] }]
      : [];
  }
  return res
    .status(200)
    .json(new ApiResponse(200, lesson, "Lesson fetched successfully"));
});

export const updateLesson = asyncHandler(async (req, res) => {
  const rawLessonId = req.params?.lessonId ?? req.body?.lessonId;
  const { title, content, duration, order, slides } = req.body || {};

  if (!rawLessonId || rawLessonId === 'undefined' || rawLessonId === 'null') {
    return res.status(400).json(new ApiResponse(400, null, "Lesson ID is required"));
  }

  if (!mongoose.Types.ObjectId.isValid(rawLessonId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid lesson ID format"));
  }

  // Only set fields that are explicitly provided to avoid clearing required fields
  const updateDoc = {};
  if (typeof title !== 'undefined') updateDoc.title = title;
  if (typeof content !== 'undefined') updateDoc.content = content;
  if (typeof duration === 'number') updateDoc.duration = duration;
  if (typeof order === 'number') updateDoc.order = order;

  if (Array.isArray(slides)) {
    const normalizedSlides = slides.map((s, idx) => ({
      order: typeof s.order === 'number' ? s.order : idx + 1,
      contentHtml: String(s.contentHtml || ''),
      bgColor: s.bgColor || '#ffffff',
      images: Array.isArray(s.images) ? s.images.map(img => ({
        url: img.url,
        public_id: img.public_id,
        alt: img.alt || ''
      })) : [],
      elements: Array.isArray(s.elements) ? s.elements.map(el => ({
        id: String(el.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
        type: el.type,
        xPct: Number(el.xPct ?? 10),
        yPct: Number(el.yPct ?? 10),
        wPct: Number(el.wPct ?? 20),
        hPct: Number(el.hPct ?? 10),
        rotation: Number(el.rotation ?? 0),
        text: el.text,
        fill: el.fill,
        stroke: el.stroke,
        url: el.url,
        alt: el.alt,
        aspectRatio: typeof el.aspectRatio === 'number' ? el.aspectRatio : undefined,
      })) : []
    }));
    updateDoc.slides = normalizedSlides;
    // Back-compat: update legacy content with first slide html so older clients see something
    if (!updateDoc.content || updateDoc.content.trim().length === 0) {
      updateDoc.content = normalizedSlides[0]?.contentHtml || '';
    }
  }

  const lesson = await Lesson.findByIdAndUpdate(rawLessonId, updateDoc, {
    new: true,
    runValidators: true,
  });

  if (!lesson) {
    return res.status(404).json(new ApiResponse(404, null, "Lesson not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, lesson, "Lesson updated successfully"));
});

export const deleteLesson = asyncHandler(async (req, res) => {
  const rawModuleId = req.params?.moduleId ?? req.body?.moduleId;
  const rawLessonId = req.params?.lessonId ?? req.body?.lessonId;

  if (!rawModuleId || rawModuleId === 'undefined' || rawModuleId === 'null') {
    return res.status(400).json(new ApiResponse(400, null, "Module ID is required"));
  }
  if (!mongoose.Types.ObjectId.isValid(rawModuleId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid module ID format"));
  }

  if (!rawLessonId || rawLessonId === 'undefined' || rawLessonId === 'null') {
    return res.status(400).json(new ApiResponse(400, null, "Lesson ID is required"));
  }
  if (!mongoose.Types.ObjectId.isValid(rawLessonId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid lesson ID format"));
  }

  const lesson = await Lesson.findByIdAndDelete(rawLessonId);
  if (!lesson) {
    return res.status(404).json(new ApiResponse(404, null, "Lesson not found"));
  }

  await Module.findByIdAndUpdate(rawModuleId, { $pull: { lessons: rawLessonId } });

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Lesson deleted successfully"));
});

// Slide-level operations
export const addSlide = asyncHandler(async (req, res) => {
  const rawModuleId = req.params?.moduleId ?? req.body?.moduleId;
  const rawLessonId = req.params?.lessonId ?? req.body?.lessonId;
  const { contentHtml = '', bgColor = '#ffffff', images = [], order, elements = [] } = req.body || {};

  if (!rawModuleId || !mongoose.Types.ObjectId.isValid(rawModuleId)) {
    return res.status(400).json(new ApiResponse(400, null, "Valid module ID is required"));
  }
  if (!rawLessonId || !mongoose.Types.ObjectId.isValid(rawLessonId)) {
    return res.status(400).json(new ApiResponse(400, null, "Valid lesson ID is required"));
  }

  const lesson = await Lesson.findById(rawLessonId);
  if (!lesson) return res.status(404).json(new ApiResponse(404, null, "Lesson not found"));
  if (String(lesson.module) !== String(rawModuleId)) {
    return res.status(400).json(new ApiResponse(400, null, "Lesson does not belong to module"));
  }

  const newOrder = typeof order === 'number' ? order : (lesson.slides?.length || 0) + 1;
  const slide = {
    order: newOrder,
    contentHtml: String(contentHtml || ''),
    bgColor: bgColor || '#ffffff',
    images: Array.isArray(images) ? images.map(img => ({ url: img.url, public_id: img.public_id, alt: img.alt || '' })) : [],
    elements: Array.isArray(elements) ? elements.map(el => ({
      id: String(el.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      type: el.type,
      xPct: Number(el.xPct ?? 10),
      yPct: Number(el.yPct ?? 10),
      wPct: Number(el.wPct ?? 20),
      hPct: Number(el.hPct ?? 10),
      rotation: Number(el.rotation ?? 0),
      text: el.text,
      fill: el.fill,
      stroke: el.stroke,
      url: el.url,
      alt: el.alt,
      aspectRatio: typeof el.aspectRatio === 'number' ? el.aspectRatio : undefined,
    })) : [],
  };

  lesson.slides = [...(lesson.slides || []), slide].sort((a,b)=> (a.order||0)-(b.order||0)).map((s,i)=>({ ...s, order: i+1 }));
  await lesson.save();

  return res.status(201).json(new ApiResponse(201, lesson, "Slide added"));
});

export const updateSlide = asyncHandler(async (req, res) => {
  const rawModuleId = req.params?.moduleId ?? req.body?.moduleId;
  const rawLessonId = req.params?.lessonId ?? req.body?.lessonId;
  const slideId = req.params?.slideId ?? req.body?.slideId;
  const { contentHtml, bgColor, images, order, elements } = req.body || {};

  if (!rawModuleId || !mongoose.Types.ObjectId.isValid(rawModuleId)) {
    return res.status(400).json(new ApiResponse(400, null, "Valid module ID is required"));
  }
  if (!rawLessonId || !mongoose.Types.ObjectId.isValid(rawLessonId)) {
    return res.status(400).json(new ApiResponse(400, null, "Valid lesson ID is required"));
  }
  if (!slideId || !mongoose.Types.ObjectId.isValid(slideId)) {
    return res.status(400).json(new ApiResponse(400, null, "Valid slide ID is required"));
  }

  const lesson = await Lesson.findById(rawLessonId);
  if (!lesson) return res.status(404).json(new ApiResponse(404, null, "Lesson not found"));
  if (String(lesson.module) !== String(rawModuleId)) {
    return res.status(400).json(new ApiResponse(400, null, "Lesson does not belong to module"));
  }

  const sIdx = (lesson.slides || []).findIndex(s => String(s._id) === String(slideId));
  if (sIdx === -1) return res.status(404).json(new ApiResponse(404, null, "Slide not found"));

  if (typeof contentHtml !== 'undefined') lesson.slides[sIdx].contentHtml = String(contentHtml || '');
  if (typeof bgColor !== 'undefined') lesson.slides[sIdx].bgColor = bgColor || '#ffffff';
  if (Array.isArray(images)) lesson.slides[sIdx].images = images.map(img => ({ url: img.url, public_id: img.public_id, alt: img.alt || '' }));
  if (Array.isArray(elements)) lesson.slides[sIdx].elements = elements.map(el => ({
    id: String(el.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    type: el.type,
    xPct: Number(el.xPct ?? 10),
    yPct: Number(el.yPct ?? 10),
    wPct: Number(el.wPct ?? 20),
    hPct: Number(el.hPct ?? 10),
    rotation: Number(el.rotation ?? 0),
    text: el.text,
    fill: el.fill,
    stroke: el.stroke,
    url: el.url,
    alt: el.alt,
    aspectRatio: typeof el.aspectRatio === 'number' ? el.aspectRatio : undefined,
  }));
  if (typeof order === 'number') lesson.slides[sIdx].order = order;

  // Normalize order
  lesson.slides = lesson.slides.sort((a,b)=> (a.order||0)-(b.order||0)).map((s,i)=>({ ...s.toObject?.() ? s.toObject() : s, order: i+1 }));
  await lesson.save();

  return res.status(200).json(new ApiResponse(200, lesson, "Slide updated"));
});

export const deleteSlide = asyncHandler(async (req, res) => {
  const rawModuleId = req.params?.moduleId ?? req.body?.moduleId;
  const rawLessonId = req.params?.lessonId ?? req.body?.lessonId;
  const slideId = req.params?.slideId ?? req.body?.slideId;

  if (!rawModuleId || !mongoose.Types.ObjectId.isValid(rawModuleId)) {
    return res.status(400).json(new ApiResponse(400, null, "Valid module ID is required"));
  }
  if (!rawLessonId || !mongoose.Types.ObjectId.isValid(rawLessonId)) {
    return res.status(400).json(new ApiResponse(400, null, "Valid lesson ID is required"));
  }
  if (!slideId || !mongoose.Types.ObjectId.isValid(slideId)) {
    return res.status(400).json(new ApiResponse(400, null, "Valid slide ID is required"));
  }

  const lesson = await Lesson.findById(rawLessonId);
  if (!lesson) return res.status(404).json(new ApiResponse(404, null, "Lesson not found"));
  if (String(lesson.module) !== String(rawModuleId)) {
    return res.status(400).json(new ApiResponse(400, null, "Lesson does not belong to module"));
  }

  lesson.slides = (lesson.slides || []).filter(s => String(s._id) !== String(slideId)).map((s,i)=>({ ...(s.toObject?.() ? s.toObject() : s), order: i+1 }));
  await lesson.save();

  return res.status(200).json(new ApiResponse(200, lesson, "Slide deleted"));
});

export const reorderSlides = asyncHandler(async (req, res) => {
  const rawModuleId = req.params?.moduleId ?? req.body?.moduleId;
  const rawLessonId = req.params?.lessonId ?? req.body?.lessonId;
  const { order = [], slides: slidesOrder = [] } = req.body || {};

  if (!rawModuleId || !mongoose.Types.ObjectId.isValid(rawModuleId)) {
    return res.status(400).json(new ApiResponse(400, null, "Valid module ID is required"));
  }
  if (!rawLessonId || !mongoose.Types.ObjectId.isValid(rawLessonId)) {
    return res.status(400).json(new ApiResponse(400, null, "Valid lesson ID is required"));
  }

  const lesson = await Lesson.findById(rawLessonId);
  if (!lesson) return res.status(404).json(new ApiResponse(404, null, "Lesson not found"));
  if (String(lesson.module) !== String(rawModuleId)) {
    return res.status(400).json(new ApiResponse(400, null, "Lesson does not belong to module"));
  }

  const current = lesson.slides || [];
  if (!current.length) return res.status(200).json(new ApiResponse(200, lesson, "No slides to reorder"));

  let newOrderIds = [];
  if (Array.isArray(order) && order.length) {
    newOrderIds = order.map(id => String(id));
  } else if (Array.isArray(slidesOrder) && slidesOrder.length) {
    newOrderIds = slidesOrder.sort((a,b)=> (a.order||0)-(b.order||0)).map(s => String(s._id || s.id));
  } else {
    return res.status(400).json(new ApiResponse(400, null, "Provide 'order' as array of slideIds or 'slides' with {_id, order}"));
  }

  const byId = new Map(current.map(s => [String(s._id), s]));
  const reordered = newOrderIds.map(id => byId.get(id)).filter(Boolean);
  if (reordered.length !== current.length) {
    return res.status(400).json(new ApiResponse(400, null, "Order does not include all slides"));
  }

  lesson.slides = reordered.map((s, i) => ({ ...(s.toObject?.() ? s.toObject() : s), order: i + 1 }));
  await lesson.save();

  return res.status(200).json(new ApiResponse(200, lesson, "Slides reordered"));
});
