import mongoose from "mongoose";

import Batch from "../models/batch.model.js";
import User from "../models/auth.model.js";
import Course from "../models/course.model.js";
import Progress from "../models/progress.model.js";
import Submission from "../models/submission.model.js";
import AttemptedQuiz from "../models/attemptedQuiz.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getMyBatch = asyncHandler(async (req, res) => {
    // If user has no batch assigned
    if (!req.user?.batch) {
        return res.json(new ApiResponse(200, null, "No batch assigned"));
    }

    const batch = await Batch.findById(req.user.batch)
        .populate("instructor", "fullName email")
        .populate("course", "title name")
        .select("name status startDate endDate capacity schedule");

    if (!batch) {
        return res.json(new ApiResponse(200, null, "No batch assigned"));
    }

    return res.json(new ApiResponse(200, batch, "My batch fetched successfully"));
});

export const createBatch = asyncHandler(async (req, res) => {
    const { name, instructorId, courseId, startDate, endDate, capacity } = req.body;

    if(!name) throw new ApiError("Batch name is required", 400);

    if(instructorId && !mongoose.Types.ObjectId.isValid(instructorId)) {
        throw new ApiError("Invalid instructor ID", 400);
    }

    if(courseId && !mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Invalid course ID", 400);
    }

    let instructor = null;
    if(instructorId) {
        instructor = await User.findById(instructorId);
        if(!instructor || instructor.role !== "INSTRUCTOR") {
            throw new ApiError("Invalid instructor selected", 400);
        }
    }

    let course = null;
    if(courseId) {
        course = await Course.findById(courseId);
        if(!course) {
            throw new ApiError("Invalid course selected", 400);
        }
    }

    const batchData = {
        name,
        instructor: instructorId || null,
        course: courseId || null,
        students: [],
    };
    
    if (startDate) batchData.startDate = new Date(startDate);
    if (endDate) batchData.endDate = new Date(endDate);
    if (capacity) batchData.capacity = parseInt(capacity);
    
    const batch = await Batch.create(batchData);

    res.status(201)
        .json(new ApiResponse(201, batch, "Batch created successfully"));
});

export const assignInstructor = asyncHandler(async (req, res) => {
    const { batchId, instructorId } = req.body;

    if(!mongoose.Types.ObjectId.isValid(batchId)) {
        throw new ApiError("Invalid batch ID", 400);
    }

    if(!mongoose.Types.ObjectId.isValid(instructorId)) {
        throw new ApiError("Invalid Instructor ID", 400);
    }

    const batch = await Batch.findById(batchId);
    if(!batch) throw new ApiError("Batch not found", 404);

    const instructor = await User.findById(instructorId);
    if(!instructor || instructor.role !== "INSTRUCTOR") {
        throw new ApiError("Invalid instructor selected", 400);
    }

    // Check if instructor is already assigned to another batch
    if(instructor.batch && instructor.batch.toString() !== batchId) {
        throw new ApiError("Instructor is already assigned to another batch", 400);
    }

    // Check if batch already has an instructor
    if(batch.instructor && batch.instructor.toString() !== instructorId) {
        throw new ApiError("Batch already has an instructor assigned", 400);
    }

    // Update batch with instructor
    batch.instructor = instructorId;
    await batch.save();

    // Update instructor with batch
    instructor.batch = batchId;
    await instructor.save();

    res.json(new ApiResponse(200, batch, "Instructor assigned successfully"));
});

export const removeInstructor = asyncHandler(async (req, res) => {
    const { batchId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(batchId)) {
        throw new ApiError("Invalid batch ID", 400);
    }

    const batch = await Batch.findById(batchId);
    if (!batch) throw new ApiError("Batch not found", 404);

    // Check if batch has an instructor
    if (!batch.instructor) {
        throw new ApiError("No instructor assigned to this batch", 400);
    }

    const instructorId = batch.instructor;
    
    // Remove instructor from batch
    batch.instructor = undefined;
    await batch.save();

    // Remove batch from instructor
    const instructor = await User.findById(instructorId);
    if (instructor && instructor.batch && instructor.batch.toString() === batchId) {
        instructor.batch = undefined;
        await instructor.save();
    }

    res.json(new ApiResponse(200, batch, "Instructor removed successfully"));
});

export const addStudentToBatch = asyncHandler(async (req, res) => {
    const { batchId, studentId } = req.body;

    if(!mongoose.Types.ObjectId.isValid(batchId)) {
        throw new ApiError("Invalid batch ID", 400);
    }

    if(!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ApiError("Invalid Student ID", 400);
    }

    const batch = await Batch.findById(batchId);
    if(!batch) throw new ApiError("Batch not found", 404);

    const student = await User.findById(studentId);
    if(!student || student.role !== "STUDENT") {
        throw new ApiError("Invalid student selected", 400);
    }

    // Check if student is already assigned to another batch
    if(student.batch && student.batch.toString() !== batchId) {
        throw new ApiError("Student is already assigned to another batch", 400);
    }

    // Check if batch is at capacity
    if(batch.capacity && batch.students.length >= batch.capacity) {
        throw new ApiError("Batch is at full capacity", 400);
    }

    // Check if student is already in this batch
    if(batch.students.includes(studentId)) {
        throw new ApiError("Student is already in this batch", 400);
    }

    // Add student to batch
    batch.students.push(studentId);
    await batch.save();

    // Update student with batch
    student.batch = batchId;
    await student.save();

    res.json(new ApiResponse(200, batch, "Student added to batch successfully"));
});

export const removeStudentFromBatch = asyncHandler(async (req, res) => {
    const { batchId, studentId } = req.body;

    if(!mongoose.Types.ObjectId.isValid(batchId)) {
        throw new ApiError("Invalid batch ID", 400);
    }

    if(!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ApiError("Invalid student ID", 400);
    }

    const batch = await Batch.findById(batchId);
    if(!batch) throw new ApiError("Batch not found", 404);

    const student = await User.findById(studentId);
    if(!student) throw new ApiError("Student not found", 404);

    // Remove student from batch
    batch.students = batch.students.filter(
        (id) => id.toString() !== studentId.toString()
    );
    await batch.save();

    // Remove batch from student
    student.batch = null;
    await student.save();

    res.json(new ApiResponse(200, batch, "Student removed from batch successfully"));
});

export const getAllBatches = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const searchQuery = search
        ? { name: { $regex: search, $options: "i" } }
        : {};

    const total = await Batch.countDocuments(searchQuery);

    const batches = await Batch.find(searchQuery)
    .populate("instructor", "fullName email")
    .populate("students", "fullName email")
    .populate("course", "title name") // Add this line
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

    res.json(
        new ApiResponse(200,
            {
                batches,
                totalBatches: total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit,
            },
            "Batches fetched successfully"
        )
    );
});

export const getBatchById = asyncHandler(async (req, res) => {
    if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError("Invalid batch ID", 400);
    }

    const batch = await Batch.findById(req.params.id)
    .populate("instructor", "fullName email")
    .populate("students", "fullName email status createdAt")
    .populate("course", "title name description difficulty status");

    if(!batch) throw new ApiError("Batch not found", 404);

    res.json(new ApiResponse(200, batch, "Batch fetched successfully"));
});

export const updateBatch = asyncHandler(async (req, res) => {
    const { name, status, courseId, startDate, endDate, capacity } = req.body;

    const batch = await Batch.findById(req.params.id);
    if(!batch) throw new ApiError("Batch not found", 404);

    if(name) batch.name = name;
    if(status) batch.status = status;
    if(courseId) batch.course = courseId; 
    if(startDate) batch.startDate = new Date(startDate);
    if(endDate) batch.endDate = new Date(endDate);
    if(capacity) batch.capacity = parseInt(capacity);

    await batch.save();

    res.json(new ApiResponse(200, batch, "Batch updated successfully"));
});

export const deleteBatch = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const batch = await Batch.findById(id);
    if(!batch) throw new ApiError("Batch not found", 404);

    await batch.deleteOne();

    res.json(new ApiResponse(200, null, "Batch deleted successfully"));
});

// Get batch quiz and assignment for completed students
export const getBatchAssessments = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Get user's batch
    const user = await User.findById(userId).populate('batch');
    if(!user || !user.batch) {
        throw new ApiError("No batch assigned to user", 404);
    }

    const batch = await Batch.findById(user.batch)
        .populate('batchQuiz')
        .populate('batchAssignment')
        .populate('course');

    if(!batch || !batch.course) {
        throw new ApiError("Batch or course not found", 404);
    }

    // Check if student has completed all modules
    const progress = await Progress.findOne({ student: userId, course: batch.course._id });
    
    if(!progress) {
        return res.json(new ApiResponse(200, { 
            hasAccess: false, 
            reason: "No progress found",
            batchQuiz: null,
            batchAssignment: null
        }, "Batch assessments check completed"));
    }

    // Get total modules in course
    const course = await Course.findById(batch.course._id).populate('modules');
    const totalModules = course?.modules?.length || 0;
    const completedModules = progress.completedModules?.length || 0;

    const hasAccess = totalModules > 0 && completedModules >= totalModules;

    if(!hasAccess) {
        return res.json(new ApiResponse(200, {
            hasAccess: false,
            reason: `Complete all ${totalModules} modules to unlock batch assessments. ${completedModules} completed.`,
            batchQuiz: null,
            batchAssignment: null,
            progress: {
                completed: completedModules,
                total: totalModules
            }
        }, "Batch assessments locked"));
    }

    res.json(new ApiResponse(200, {
        hasAccess: true,
        reason: "All modules completed",
        batchQuiz: batch.batchQuiz,
        batchAssignment: batch.batchAssignment,
        progress: {
            completed: completedModules,
            total: totalModules
        }
    }, "Batch assessments unlocked"));
});

// Get batch progress analytics for admin/instructor
export const getBatchProgress = asyncHandler(async (req, res) => {
    const { id: batchId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(batchId)) {
        throw new ApiError("Invalid batch ID", 400);
    }

    const batch = await Batch.findById(batchId)
        .populate('course', 'title modules')
        .populate('students', '_id fullName');

    if(!batch) {
        throw new ApiError("Batch not found", 404);
    }

    if(!batch.course) {
        return res.json(new ApiResponse(200, {
            batchProgress: [],
            overallStats: {
                totalStudents: batch.students.length,
                studentsWithProgress: 0,
                averageProgress: 0,
                totalModules: 0
            }
        }, "No course assigned to batch"));
    }

    // Get course details
    const course = await Course.findById(batch.course._id).populate('modules');
    const totalModules = course?.modules?.length || 0;

    // Get progress for all students in batch
    const progressData = await Progress.find({
        student: { $in: batch.students.map(s => s._id) },
        course: batch.course._id
    })
    .populate('student', 'fullName email avatar')
    .lean();

    // Transform progress data
    const batchProgress = batch.students.map(student => {
        const studentProgress = progressData.find(p => 
            p.student._id.toString() === student._id.toString()
        );

        if (!studentProgress) {
            return {
                student: {
                    _id: student._id,
                    fullName: student.fullName,
                    email: student.email || '',
                    avatar: student.avatar
                },
                completedModules: 0,
                completedLessons: 0,
                totalModules,
                progressPercentage: 0,
                lastActivity: null,
                courseTitle: course?.title,
                currentLevel: 'L1',
                levelLockEnabled: false,
                lockedLevel: null
            };
        }

        const completedModules = studentProgress.completedModules?.length || 0;
        const completedLessons = studentProgress.completedLessons?.length || 0;
        const progressPercentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

        return {
            student: {
                _id: studentProgress.student._id,
                fullName: studentProgress.student.fullName,
                email: studentProgress.student.email,
                avatar: studentProgress.student.avatar
            },
            completedModules,
            completedLessons,
            totalModules,
            progressPercentage,
            lastActivity: studentProgress.updatedAt,
            courseTitle: course?.title,
            currentLevel: studentProgress.currentLevel || 'L1',
            levelLockEnabled: studentProgress.levelLockEnabled || false,
            lockedLevel: studentProgress.lockedLevel || null
        };
    });

    // Calculate overall stats
    const studentsWithProgress = batchProgress.filter(p => p.completedModules > 0).length;
    const averageProgress = batchProgress.length > 0 
        ? Math.round(batchProgress.reduce((sum, p) => sum + p.progressPercentage, 0) / batchProgress.length)
        : 0;

    const overallStats = {
        totalStudents: batch.students.length,
        studentsWithProgress,
        averageProgress,
        totalModules
    };

    res.json(new ApiResponse(200, {
        batchProgress,
        overallStats
    }, "Batch progress fetched successfully"));
});

// Get batch submissions analytics
export const getBatchSubmissions = asyncHandler(async (req, res) => {
    const { id: batchId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(batchId)) {
        throw new ApiError("Invalid batch ID", 400);
    }

    const batch = await Batch.findById(batchId).populate('students', '_id');
    if(!batch) {
        throw new ApiError("Batch not found", 404);
    }

    const submissions = await Submission.find({
        student: { $in: batch.students.map(s => s._id) }
    })
    .populate({
        path: 'student',
        select: 'fullName email avatar'
    })
    .populate({
        path: 'assignment',
        select: 'title dueDate maxScore',
        populate: {
            path: 'course',
            select: 'title'
        }
    })
    .sort({ submittedAt: -1 });

    // Calculate stats
    const totalSubmissions = submissions.length;
    const gradedSubmissions = submissions.filter(s => s.grade !== undefined).length;
    const averageGrade = gradedSubmissions > 0 
        ? Math.round(submissions.filter(s => s.grade !== undefined)
            .reduce((sum, s) => sum + s.grade, 0) / gradedSubmissions)
        : 0;
    const lateSubmissions = submissions.filter(s => s.isLate).length;

    res.json(new ApiResponse(200, {
        submissions,
        stats: {
            totalSubmissions,
            gradedSubmissions,
            pendingGrading: totalSubmissions - gradedSubmissions,
            averageGrade,
            lateSubmissions
        }
    }, "Batch submissions fetched successfully"));
});

// Get batch quiz attempts analytics
export const getBatchAttempts = asyncHandler(async (req, res) => {
    const { id: batchId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(batchId)) {
        throw new ApiError("Invalid batch ID", 400);
    }

    const batch = await Batch.findById(batchId).populate('students', '_id');
    if(!batch) {
        throw new ApiError("Batch not found", 404);
    }

    const attempts = await AttemptedQuiz.find({
        student: { $in: batch.students.map(s => s._id) }
    })
    .populate({
        path: 'student',
        select: 'fullName email avatar'
    })
    .populate({
        path: 'quiz',
        select: 'title questions passingScore',
        populate: {
            path: 'course',
            select: 'title'
        }
    })
    .sort({ createdAt: -1 });

    // Transform attempts with computed fields
    const transformedAttempts = attempts.map(attempt => {
        const totalQuestions = attempt.quiz?.questions?.length || 0;
        const scorePercent = totalQuestions > 0 ? Math.round((attempt.score / totalQuestions) * 100) : 0;
        const passingScore = attempt.quiz?.passingScore || 70;
        const passed = scorePercent >= passingScore;

        return {
            ...attempt.toObject(),
            scorePercent,
            passed,
            totalQuestions,
            attemptedAt: attempt.createdAt
        };
    });

    // Calculate stats
    const totalAttempts = transformedAttempts.length;
    const passedAttempts = transformedAttempts.filter(a => a.passed).length;
    const averageScore = transformedAttempts.length > 0 
        ? Math.round(transformedAttempts.reduce((sum, a) => sum + a.scorePercent, 0) / transformedAttempts.length)
        : 0;

    res.json(new ApiResponse(200, {
        attempts: transformedAttempts,
        stats: {
            totalAttempts,
            passedAttempts,
            failedAttempts: totalAttempts - passedAttempts,
            passRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0,
            averageScore
        }
    }, "Batch quiz attempts fetched successfully"));
});

// Get batch course content (modules with lessons) for student dashboard
export const getBatchCourseContent = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Get user's batch
    const user = await User.findById(userId).populate('batch');
    if(!user || !user.batch) {
        throw new ApiError("No batch assigned to user", 404);
    }

    // Get batch with course details
    const batch = await Batch.findById(user.batch._id)
        .populate({
            path: 'course',
            select: 'title description modules',
            populate: {
                path: 'modules',
                select: 'title description order lessons',
                populate: {
                    path: 'lessons',
                    select: 'title content duration order'
                },
                options: { sort: { order: 1 } }
            }
        })
        .select('name course');

    if(!batch || !batch.course) {
        throw new ApiError("Batch or course not found", 404);
    }

    // Get user's progress for this course
    const progress = await Progress.findOne({ 
        student: userId, 
        course: batch.course._id 
    });

    // Format the response with progress information
    const courseContent = {
        batch: {
            _id: batch._id,
            name: batch.name
        },
        course: {
            _id: batch.course._id,
            title: batch.course.title,
            description: batch.course.description,
            modules: batch.course.modules || []
        },
        progress: {
            completedModules: progress?.completedModules || [],
            completedLessons: progress?.completedLessons || [],
            currentLevel: progress?.currentLevel || "L1"
        }
    };

    res.json(new ApiResponse(200, courseContent, "Batch course content fetched successfully"));
});

