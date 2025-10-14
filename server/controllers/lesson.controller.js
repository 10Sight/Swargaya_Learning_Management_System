import Lesson from "../models/lesson.model.js";
import Module from "../models/module.model.js";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

export const createLesson = asyncHandler(async (req, res) => {
  const rawModuleId = req.params?.moduleId ?? req.body?.moduleId;
  const { title, content, duration, order } = req.body || {};


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

  const lesson = await Lesson.create({
    module: rawModuleId,
    title,
    content,
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

  if (!mongoose.Types.ObjectId.isValid(rawModuleId)) {
    return res.status(400).json(new ApiResponse(400, [], "Invalid module ID format"));
  }

  try {
    const lessons = await Lesson.find({ module: rawModuleId }).sort({ order: 1 });
    return res
      .status(200)
      .json(new ApiResponse(200, lessons, "Lessons fetched successfully"));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, [], "Error fetching lessons"));
  }
});

export const getLessonById = asyncHandler(async (req, res) => {
  const rawLessonId = req.params?.lessonId ?? req.body?.lessonId;

  if (!rawLessonId || rawLessonId === 'undefined' || rawLessonId === 'null') {
    return res.status(400).json(new ApiResponse(400, null, "Lesson ID is required"));
  }

  if (!mongoose.Types.ObjectId.isValid(rawLessonId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid lesson ID format"));
  }

  const lesson = await Lesson.findById(rawLessonId);
  if (!lesson) {
    return res.status(404).json(new ApiResponse(404, null, "Lesson not found"));
  }
  return res
    .status(200)
    .json(new ApiResponse(200, lesson, "Lesson fetched successfully"));
});

export const updateLesson = asyncHandler(async (req, res) => {
  const rawLessonId = req.params?.lessonId ?? req.body?.lessonId;
  const updates = req.body || {};

  if (!rawLessonId || rawLessonId === 'undefined' || rawLessonId === 'null') {
    return res.status(400).json(new ApiResponse(400, null, "Lesson ID is required"));
  }

  if (!mongoose.Types.ObjectId.isValid(rawLessonId)) {
    return res.status(400).json(new ApiResponse(400, null, "Invalid lesson ID format"));
  }

  const lesson = await Lesson.findByIdAndUpdate(rawLessonId, updates, {
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
