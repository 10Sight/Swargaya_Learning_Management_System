import Course from "../models/course.model.js";
import Audit from "../models/audit.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createCourse = asyncHandler(async (req, res) => {
    const { title, description, category, level, modules, instructor, quizzes, assignments } = req.body;

    if(!title || !description || !instructor) {
        throw new ApiError(400, "Title and description are required");
    }

    const course = await Course.create({
        title,
        description,
        category,
        level,
        modules,
        instructor,
        quizzes,
        assignments,
        createdBy: req.user._id,
    });

    await Audit.create({
        user: req.user._id,
        action: "CREATE_COURSE",
        details: { courseId: course._id, title: course.title },
    });

    return res
        .status(201)
        .json(new ApiResponse(201, course, "Course created successfully"));
});

export const getCourses = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, category, level, search, status } = req.query;

    const query = {};

    if(category && category.trim() !== '') query.category = category;
    if(level && level.trim() !== '') query.level = level;
    if(status && status.trim() !== '') query.status = status;
    if(search && search.trim() !== '') {
        query.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
        ];
    }

    // Include all necessary fields
    const safeFields = "title description category difficulty students status totalEnrollments modules quizzes assignments instructor createdBy createdAt";

    const courses = await Course.find(query)
        .select(safeFields)
        .populate("createdBy", "fullName email role")
        .populate("instructor", "fullName email")
        .populate("modules", "title order")
        .populate("quizzes", "title") 
        .populate("assignments", "title") 
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .sort({ createdAt: -1 });

    const total = await Course.countDocuments(query);

    return res
        .status(200)
        .json(new ApiResponse(200, { total, page, limit, courses }, "Courses fetched successfully"));
});

export const getCourseById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const course = await Course.findById(id)
        .populate("createdBy", "fullName email role")
        .populate("quizzes assignments");

    if(!course) throw new ApiError(404, "Course not found");

    return res
        .status(200)
        .json(new ApiResponse(200, course, "Course fetched successfully"));
});

export const updatedCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const updatedCourse = await Course.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
    });

    if(!updatedCourse) throw new ApiError(404, "Course not found");

    await Audit.create({
        user: req.user._id,
        action: "UPDATED_COURSE",
        details: { courseId: updatedCourse._id },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, updatedCourse, "Course updated successfully"));
});

export const deleteCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const course = await Course.findByIdAndDelete(id);

    if(!course) throw new ApiError(404, "Course not found");

    await Audit.create({
        user: req.user._id,
        action: "DELETE_COURSE",
        details: { courseId: course._id, title: course.title },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Course deleted successfully"));
});

export const togglePublishCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const course = await Course.findById(id);
    if(!course) throw new ApiError(404, "Course not found");

    course.status = course.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";

    await course.save();

    await Audit.create({
        user: req.user._id,
        action: course.status === "PUBLISHED" ? "PUBLISH_COURSE" : "UNPUBLISH_COURSE",
        details: { courseId: course._id },
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                course,
                `Course ${course.status === "PUBLISHED" ? "published" : "unpublished"} successfully`
            )
        );
});