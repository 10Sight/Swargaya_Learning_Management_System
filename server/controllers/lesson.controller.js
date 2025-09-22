import Lesson from "../models/lesson.model.js";
import Module from "../models/module.model.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import {ApiError} from "../utils/ApiError.js";

export const createLesson = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;
  const { title, content, duration, order } = req.body;

  const module = await Module.findById(moduleId);
  if (!module) {
    throw new ApiError(404, "Module not found");
  }

  const lesson = await Lesson.create({
    module: moduleId,
    title,
    content,
    duration,
    order,
  });

  module.lessons.push(lesson._id);
  await module.save();

  res
    .status(201)
    .json(new ApiResponse(201, lesson, "Lesson created successfully"));
});

export const getLessonsByModule = asyncHandler(async (req, res) => {
  const { moduleId } = req.params;
  const lessons = await Lesson.find({ module: moduleId }).sort({ order: 1 });
  res
    .status(200)
    .json(new ApiResponse(200, lessons, "Lessons fetched successfully"));
});

export const getLessonById = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    throw new ApiError(404, "Lesson not found");
  }
  res
    .status(200)
    .json(new ApiResponse(200, lesson, "Lesson fetched successfully"));
});

export const updateLesson = asyncHandler(async (req, res) => {
  const { lessonId } = req.params;
  const updates = req.body;

  const lesson = await Lesson.findByIdAndUpdate(lessonId, updates, {
    new: true,
    runValidators: true,
  });

  if (!lesson) {
    throw new ApiError(404, "Lesson not found");
  }

  res
    .status(200)
    .json(new ApiResponse(200, lesson, "Lesson updated successfully"));
});

export const deleteLesson = asyncHandler(async (req, res) => {
  const { moduleId, lessonId } = req.params;

  const lesson = await Lesson.findByIdAndDelete(lessonId);
  if (!lesson) {
    throw new ApiError(404, "Lesson not found");
  }

  await Module.findByIdAndUpdate(moduleId, { $pull: { lessons: lessonId } });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Lesson deleted successfully"));
});
