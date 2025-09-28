import mongoose from "mongoose";
import Enrollment from "../models/enrollment.model.js";
import Course from "../models/course.model.js";
import User from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const enrollStudent = asyncHandler(async (req, res) => {
    const { courseId, studentId } = req.body;

    if(!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Invalid Course ID", 400);
    }

    if(!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ApiError("Invalid Student ID", 400);
    }

    const course = await Course.findById(courseId);
    if(!course) throw new ApiError("Course not found", 404);

    const student = await User.findById(studentId);
    if(!student || student.role !== "STUDENT") {
        throw new ApiError("Invalid Student", 400);
    }

    const existingEnrollment = await Enrollment.findOne({
        course: courseId,
        student: studentId,
    });
    if(existingEnrollment) {
        throw new ApiError("Student already enrolled in this course", 400);
    }

    const enrollment = await Enrollment.create({
        student: studentId,
        course: courseId,
        enrolledBy: req.user._id,
    });

    // Update course enrollment count
    await Course.findByIdAndUpdate(courseId, {
        $inc: { totalEnrollments: 1 },
        $addToSet: { students: studentId }
    });

    // Update student's enrolled courses
    await User.findByIdAndUpdate(studentId, {
        $addToSet: { enrolledCourses: courseId }
    });

    res.status(201)
        .json(new ApiResponse(201, enrollment, "Student enrolled successfully"));
});

export const unenrollStudent = asyncHandler(async (req, res) => {
    const { courseId, studentId } = req.body;

    const enrollment = await Enrollment.findByIdAndDelete({
        course: courseId,
        student: studentId,
    });

    if(!enrollment) {
        throw new ApiError("Enrollment not found", 404);
    }

    res.json(new ApiResponse(200, null, "Student unenrolled successfully"));
});

export const getAllEnrollments = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const searchQuery = search
        ? { status: { $regex: search, $options: "i" } }
        : {};

    const total = await Enrollment.countDocuments(searchQuery);

    const enrollments = await Enrollment.find(searchQuery)
        .populate("student", "fullName email")
        .populate("course", "title")
        .populate("enrolledBy", "fullName email role")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    res.json(
        new ApiResponse(
            200,
            {
                enrollments,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit),
                    limit,
                },
            },
            "Enrollments fetched successfully"
        )
    );
});

export const getStudentEnrollments = asyncHandler(async (req, res) => {
    const { studentId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ApiError("Invalid student ID", 400);
    }

    const enrollments = await Enrollment.find({ student: studentId })
        .populate("course", "title description")
        .sort({ createdAt: -1 });

    res.json(new ApiResponse(200, enrollments, "Student enrollments fetched successfully"));
});

export const getCourseEnrollments = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Invalid course ID", 400);
    }

    const enrollments = await Enrollment.find({ course: courseId })
        .populate("student", "fullName email")
        .sort({ createdAt: -1 });

    res.json(new ApiResponse(200, enrollments, "Course enrollments fetched successfully"));
});

export const updateEnrollment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const enrollment = await Enrollment.findById(id);
    if(!enrollment) throw new ApiError("Enrollment not found", 404);

    if(status) enrollment.status = status;

    await enrollment.save();

    res.json(new ApiResponse(200, enrollment, "Enrollment updated successfully"));
});

export const deleteEnrollment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const enrollment = await Enrollment.findById(id);
    if(!enrollment) throw new ApiError("Enrollment not found", 404);

    await enrollment.deleteOne();

    res.json(new ApiResponse(200, null, "Enrollment deleted successfully"));
});