import mongoose from "mongoose";
import Course from "../models/course.model.js";
import Audit from "../models/audit.model.js";
import Progress from "../models/progress.model.js";
import Submission from "../models/submission.model.js";
import AttemptedQuiz from "../models/attemptedQuiz.model.js";
import User from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createCourse = asyncHandler(async (req, res) => {
    const { title, description, category, level, modules, instructor, quizzes, assignments } = req.body;

    if(!title || !description || !instructor) {
        throw new ApiError("Title and description are required", 400);
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
    
    // Exclude soft-deleted courses unless super admin specifically wants them
    if (!req.query.includeDeleted || req.user.role !== "SUPERADMIN") {
        query.isDeleted = { $ne: true };
    }

    // Include all necessary fields
    const safeFields = "title slug description category difficulty students status totalEnrollments modules quizzes assignments instructor createdBy createdAt";

    const courses = await Course.find(query)
        .select(safeFields)
        .populate("createdBy", "fullName email role")
        .populate("instructor", "fullName email")
        .populate("modules", "title order")
        .populate("quizzes", "title") 
        .populate("assignments", "title") 
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .sort({ createdAt: -1 })
        .lean(); // Use lean for read-only data

    const total = await Course.countDocuments(query);

    return res
        .status(200)
        .json(new ApiResponse(200, { total, page, limit, courses }, "Courses fetched successfully"));
});

export const getCourseById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    let course;
    if (mongoose.Types.ObjectId.isValid(id)) {
        course = await Course.findById(id)
            .populate("createdBy", "fullName email role")
            .populate("quizzes assignments")
            .lean();
    }
    if (!course) {
        course = await Course.findOne({ slug: id })
            .populate("createdBy", "fullName email role")
            .populate("quizzes assignments")
            .lean();
    }

    if(!course) throw new ApiError("Course not found", 404);

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

    if(!updatedCourse) throw new ApiError("Course not found", 404);

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

    const course = await Course.findById(id);
    if(!course) throw new ApiError("Course not found", 404);

    if (req.user.role === "SUPERADMIN") {
        // Super admin can permanently delete
        await course.deleteOne();
        await Audit.create({
            user: req.user._id,
            action: "DELETE_COURSE_PERMANENT",
            details: { courseId: course._id, title: course.title },
        });
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Course permanently deleted successfully"));
    } else {
        // Regular admin - soft delete
        course.isDeleted = true;
        await course.save();
        await Audit.create({
            user: req.user._id,
            action: "DELETE_COURSE_SOFT",
            details: { courseId: course._id, title: course.title },
        });
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Course deleted successfully"));
    }
});

export const togglePublishCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const course = await Course.findById(id);
    if(!course) throw new ApiError("Course not found", 404);

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

// Get course analytics for admin/instructor
export const getCourseAnalytics = asyncHandler(async (req, res) => {
    const { id: courseId } = req.params;

    let resolvedCourseId = courseId;
    if(!mongoose.Types.ObjectId.isValid(courseId)) {
        const c = await Course.findOne({ slug: courseId }).select('_id');
        if (!c) {
            throw new ApiError("Invalid course ID", 400);
        }
        resolvedCourseId = c._id;
    }

    const course = await Course.findById(resolvedCourseId)
        .populate('modules', '_id title order')
.populate('students', '_id fullName slug')
        .lean(); // Use lean for performance

    if(!course) {
        throw new ApiError("Course not found", 404);
    }

    // Get progress data for enrolled students
    const progressData = await Progress.find({
        course: resolvedCourseId
    })
.populate('student', 'fullName email slug avatar')
    .lean();

    // Calculate overall progress stats
    const totalModules = course.modules?.length || 0;
    const studentsWithProgress = progressData.filter(p => p.completedModules?.length > 0).length;
    const averageProgress = progressData.length > 0 
        ? Math.round(progressData.reduce((sum, p) => {
            const studentProgress = totalModules > 0 ? (p.completedModules?.length || 0) / totalModules * 100 : 0;
            return sum + studentProgress;
        }, 0) / progressData.length)
        : 0;

    // Get recent submissions for this course's assignments
    const submissions = await Submission.find({
        assignment: { $in: course.assignments }
    })
    .populate('student', 'fullName email avatar')
    .populate('assignment', 'title dueDate')
    .sort({ submittedAt: -1 })
    .limit(10)
    .lean();

    // Get recent quiz attempts for this course's quizzes
    const quizAttempts = await AttemptedQuiz.find({
        quiz: { $in: course.quizzes }
    })
    .populate('student', 'fullName email avatar')
    .populate('quiz', 'title questions passingScore')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    // Transform quiz attempts with computed fields
    const transformedAttempts = quizAttempts.map(attempt => {
        const totalQuestions = attempt.quiz?.questions?.length || 0;
        // Calculate total marks properly by summing up marks from all questions
        const totalMarks = attempt.quiz?.questions?.reduce((sum, question) => sum + (question.marks || 1), 0) || totalQuestions;
        const scorePercent = totalMarks > 0 ? Math.round((attempt.score / totalMarks) * 100) : 0;
        const passingScore = attempt.quiz?.passingScore || 70;
        const passed = scorePercent >= passingScore;

        return {
            ...attempt,
            scorePercent,
            passed,
            totalQuestions,
            totalMarks,
            attemptedAt: attempt.createdAt
        };
    });

    // Calculate submission stats
    const totalSubmissions = submissions.length;
    const gradedSubmissions = submissions.filter(s => s.grade !== undefined).length;
    const averageGrade = gradedSubmissions > 0 
        ? Math.round(submissions.filter(s => s.grade !== undefined)
            .reduce((sum, s) => sum + s.grade, 0) / gradedSubmissions)
        : 0;

    // Calculate quiz stats
    const totalQuizAttempts = transformedAttempts.length;
    const passedAttempts = transformedAttempts.filter(a => a.passed).length;
    const averageQuizScore = transformedAttempts.length > 0 
        ? Math.round(transformedAttempts.reduce((sum, a) => sum + a.scorePercent, 0) / transformedAttempts.length)
        : 0;

    res.json(new ApiResponse(200, {
        courseInfo: {
            _id: course._id,
            title: course.title,
            status: course.status,
            totalModules,
            totalEnrollments: course.students?.length || 0
        },
        progressStats: {
            totalStudents: course.students?.length || 0,
            studentsWithProgress,
            averageProgress,
            totalModules
        },
        submissionStats: {
            totalSubmissions,
            gradedSubmissions,
            pendingGrading: totalSubmissions - gradedSubmissions,
            averageGrade
        },
        quizStats: {
            totalAttempts: totalQuizAttempts,
            passedAttempts,
            failedAttempts: totalQuizAttempts - passedAttempts,
            passRate: totalQuizAttempts > 0 ? Math.round((passedAttempts / totalQuizAttempts) * 100) : 0,
            averageScore: averageQuizScore
        },
        recentActivity: {
            recentSubmissions: submissions.slice(0, 5),
            recentQuizAttempts: transformedAttempts.slice(0, 5)
        }
    }, "Course analytics fetched successfully"));
});

// Get course enrollments/students with progress
export const getCourseStudents = asyncHandler(async (req, res) => {
    const { id: courseId } = req.params;

    let resolvedCourseId = courseId;
    if(!mongoose.Types.ObjectId.isValid(courseId)) {
        const c = await Course.findOne({ slug: courseId }).select('_id');
        if (!c) {
            throw new ApiError("Invalid course ID", 400);
        }
        resolvedCourseId = c._id;
    }

    const course = await Course.findById(resolvedCourseId)
.populate('students', 'fullName email slug avatar createdAt')
        .populate('modules', '_id title');

    if(!course) {
        throw new ApiError("Course not found", 404);
    }

    const totalModules = course.modules?.length || 0;

    // Get progress for all enrolled students
    const progressData = await Progress.find({
        student: { $in: course.students.map(s => s._id) },
        course: resolvedCourseId
    })
    .populate('student', 'fullName email avatar')
    .lean();

    // Transform student data with progress
    const studentsWithProgress = course.students.map(student => {
        const studentProgress = progressData.find(p => 
            p.student._id.toString() === student._id.toString()
        );

        if (!studentProgress) {
            return {
                student: {
                    _id: student._id,
                    fullName: student.fullName,
                    email: student.email,
                    avatar: student.avatar,
                    enrolledAt: student.createdAt
                },
                completedModules: 0,
                totalModules,
                progressPercentage: 0,
                currentLevel: "L1",
                lastActivity: null
            };
        }

        const completedModules = studentProgress.completedModules?.length || 0;
        const progressPercentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

        return {
            student: {
                _id: studentProgress.student._id,
                fullName: studentProgress.student.fullName,
                email: studentProgress.student.email,
                avatar: studentProgress.student.avatar,
                enrolledAt: student.createdAt
            },
            completedModules,
            totalModules,
            progressPercentage,
            currentLevel: studentProgress.currentLevel,
            lastActivity: studentProgress.updatedAt
        };
    });

    res.json(new ApiResponse(200, {
        courseTitle: course.title,
        totalStudents: course.students?.length || 0,
        students: studentsWithProgress
    }, "Course students fetched successfully"));
});

// Super admin functions for managing soft-deleted courses
export const getSoftDeletedCourses = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search } = req.query;

    const query = {
        isDeleted: true
    };
    
    if (search && search.trim() !== '') {
        query.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
        ];
    }

    const courses = await Course.find(query)
        .select("title description category difficulty status totalEnrollments instructor createdBy createdAt updatedAt")
        .populate("createdBy", "fullName email role")
        .populate("instructor", "fullName email")
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .sort({ updatedAt: -1 })
        .lean();

    const total = await Course.countDocuments(query);

    return res
        .status(200)
        .json(new ApiResponse(200, { total, page, limit, courses }, "Soft-deleted courses fetched successfully"));
});

export const restoreCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) throw new ApiError("Course not found", 404);
    
    if (!course.isDeleted) {
        throw new ApiError("Course is not deleted", 400);
    }

    course.isDeleted = false;
    await course.save();

    await Audit.create({
        user: req.user._id,
        action: "RESTORE_COURSE",
        details: { courseId: course._id, title: course.title },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, course, "Course restored successfully"));
});
