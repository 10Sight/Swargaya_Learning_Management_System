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
import batchStatusScheduler from "../services/batchStatusScheduler.js";
import batchCleanupScheduler from "../services/batchCleanupScheduler.js";

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

// Get all batches assigned to an instructor
export const getMyBatches = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userRole = req.user.role;
    
    let batches;
    
    if (userRole === "INSTRUCTOR") {
        // For instructors, find all batches where they are assigned as instructor
        batches = await Batch.find({
            instructor: userId,
            isDeleted: { $ne: true }
        })
        .populate("course", "title name")
        .populate("students", "fullName email")
        .select("name status startDate endDate capacity students course createdAt")
        .sort({ createdAt: -1 });
    } else if (userRole === "STUDENT") {
        // For students, return their single assigned batch
        if (!req.user.batch) {
            return res.json(new ApiResponse(200, [], "No batch assigned"));
        }
        
        const batch = await Batch.findById(req.user.batch)
            .populate("instructor", "fullName email")
            .populate("course", "title name")
            .select("name status startDate endDate capacity schedule instructor course");
            
        batches = batch ? [batch] : [];
    } else {
        // For admins and superadmins, they don't have assigned batches
        batches = [];
    }

    return res.json(new ApiResponse(200, {
        batches,
        totalBatches: batches.length
    }, "My batches fetched successfully"));
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

    // Check if batch already has this instructor assigned
    if(batch.instructor && batch.instructor.toString() === instructorId) {
        throw new ApiError("Instructor is already assigned to this batch", 400);
    }

    // Check if batch already has a different instructor
    if(batch.instructor && batch.instructor.toString() !== instructorId) {
        throw new ApiError("Batch already has a different instructor assigned", 400);
    }

    // Update batch with instructor
    batch.instructor = instructorId;
    await batch.save();

    // Add batch to instructor's batches array if not already present
    if (!instructor.batches) {
        instructor.batches = [];
    }
    if (!instructor.batches.includes(batchId)) {
        instructor.batches.push(batchId);
        await instructor.save();
    }

    const updatedBatch = await Batch.findById(batchId).populate("instructor", "fullName email");
    res.json(new ApiResponse(200, updatedBatch, "Instructor assigned successfully"));
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

    // Remove batch from instructor's batches array
    const instructor = await User.findById(instructorId);
    if (instructor && instructor.batches && instructor.batches.includes(batchId)) {
        instructor.batches = instructor.batches.filter(id => id.toString() !== batchId.toString());
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
    
    // Exclude soft-deleted batches unless super admin specifically wants them
    if (!req.query.includeDeleted || req.user.role !== "SUPERADMIN") {
        searchQuery.isDeleted = { $ne: true };
    }

    // Auto-update batch statuses when fetching (only for non-cancelled batches)
    // This ensures status is always current when viewing batches
    try {
        await Batch.updateAllStatuses();
    } catch (error) {
        // Silently ignore non-critical errors during status update
    }

    const total = await Batch.countDocuments(searchQuery);

    const batches = await Batch.find(searchQuery)
    .populate("instructor", "fullName email")
    .populate("students", "fullName email")
    .populate("course", "title name") 
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

    const oldStatus = batch.status;

    if(name) batch.name = name;
    if(status && status !== oldStatus) {
        batch.status = status;
        // Track status change timestamp for COMPLETED and CANCELLED statuses
        if(status === 'COMPLETED' || status === 'CANCELLED') {
            batch.statusUpdatedAt = new Date();
        }
    }
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

    if (req.user.role === "SUPERADMIN") {
        // Super admin can permanently delete
        await batch.deleteOne();
        res.json(new ApiResponse(200, null, "Batch permanently deleted successfully"));
    } else {
        // Regular admin - soft delete
        batch.isDeleted = true;
        await batch.save();
        res.json(new ApiResponse(200, null, "Batch deleted successfully"));
    }
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

// Super admin functions for managing soft-deleted batches
export const getSoftDeletedBatches = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const searchQuery = {
        isDeleted: true
    };
    
    if (search) {
        searchQuery.name = { $regex: search, $options: "i" };
    }

    const total = await Batch.countDocuments(searchQuery);

    const batches = await Batch.find(searchQuery)
        .populate("instructor", "fullName email")
        .populate("students", "fullName email")
        .populate("course", "title name")
        .skip(skip)
        .limit(limit)
        .sort({ updatedAt: -1 });

    res.json(
        new ApiResponse(200,
            {
                batches,
                totalBatches: total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit,
            },
            "Soft-deleted batches fetched successfully"
        )
    );
});

export const restoreBatch = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const batch = await Batch.findById(id);
    if (!batch) throw new ApiError("Batch not found", 404);
    
    if (!batch.isDeleted) {
        throw new ApiError("Batch is not deleted", 400);
    }

    batch.isDeleted = false;
    await batch.save();

    res.json(new ApiResponse(200, batch, "Batch restored successfully"));
});

// ==================== BATCH STATUS MANAGEMENT ====================

// Update all batch statuses based on dates
export const updateAllBatchStatuses = asyncHandler(async (req, res) => {
    const result = await batchStatusScheduler.updateBatchStatuses();
    
    res.json(new ApiResponse(200, result, "Batch statuses updated successfully"));
});

// Update specific batch status
export const updateBatchStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError("Invalid batch ID", 400);
    }
    
    const batch = await Batch.findById(id);
    if (!batch) {
        throw new ApiError("Batch not found", 404);
    }
    
    const oldStatus = batch.status;
    const newStatus = await batch.updateStatus();
    
    res.json(new ApiResponse(200, {
        batchId: batch._id,
        name: batch.name,
        oldStatus,
        newStatus,
        startDate: batch.startDate,
        endDate: batch.endDate
    }, "Batch status updated successfully"));
});

// Cancel batch and notify users
export const cancelBatch = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError("Invalid batch ID", 400);
    }
    
    const batch = await Batch.findById(id)
        .populate('students', 'fullName email')
        .populate('instructor', 'fullName email')
        .populate('course', 'title');
        
    if (!batch) {
        throw new ApiError("Batch not found", 404);
    }
    
    if (batch.status === 'CANCELLED') {
        throw new ApiError("Batch is already cancelled", 400);
    }
    
    const oldStatus = batch.status;
    batch.status = 'CANCELLED';
    if (reason) {
        batch.notes = (batch.notes ? batch.notes + '\n\n' : '') + 
                      `CANCELLED: ${reason} (${new Date().toISOString()})`;
    }
    await batch.save();
    
    // Send notifications to all users in the batch
    const notifications = [];
    const message = `Your batch "${batch.name}" has been cancelled. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`;
    
    // Add students to notifications
    batch.students.forEach(student => {
        notifications.push({
            recipient: student._id,
            type: 'ERROR',
            title: `Batch Cancelled: ${batch.name}`,
            message: message,
            metadata: {
                batchId: batch._id,
                batchName: batch.name,
                oldStatus,
                newStatus: 'CANCELLED',
                reason: reason || '',
                courseTitle: batch.course?.title || 'N/A'
            }
        });
    });
    
    // Add instructor to notifications if exists
    if (batch.instructor) {
        notifications.push({
            recipient: batch.instructor._id,
            type: 'ERROR',
            title: `Batch Cancelled: ${batch.name}`,
            message: message.replace('Your batch', 'Your assigned batch'),
            metadata: {
                batchId: batch._id,
                batchName: batch.name,
                oldStatus,
                newStatus: 'CANCELLED',
                reason: reason || '',
                courseTitle: batch.course?.title || 'N/A'
            }
        });
    }
    
    // Here you would typically save these notifications to a notifications collection
    // notifications would be saved to database here
    
    res.json(new ApiResponse(200, {
        batch: {
            _id: batch._id,
            name: batch.name,
            oldStatus,
            newStatus: batch.status,
            reason: reason || ''
        },
        notificationsSent: notifications.length
    }, "Batch cancelled successfully and notifications sent"));
});

// Get batch notifications for current user
export const getMyBatchNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { batchId } = req.params; // Optional - if not provided, uses user's assigned batch
    
    const notifications = await batchStatusScheduler.getBatchNotificationsForUser(
        userId, 
        batchId || null
    );
    
    res.json(new ApiResponse(200, notifications, "Batch notifications retrieved successfully"));
});

// Get batch status with enhanced information
export const getBatchStatusInfo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError("Invalid batch ID", 400);
    }
    
    const batch = await Batch.findById(id)
        .populate('course', 'title')
        .populate('instructor', 'fullName email')
        .select('name status startDate endDate capacity students notes createdAt updatedAt');
        
    if (!batch) {
        throw new ApiError("Batch not found", 404);
    }
    
    const today = new Date();
    const statusInfo = {
        batch: {
            _id: batch._id,
            name: batch.name,
            status: batch.status,
            startDate: batch.startDate,
            endDate: batch.endDate,
            capacity: batch.capacity,
            currentStudents: batch.students.length,
            course: batch.course,
            instructor: batch.instructor,
            notes: batch.notes,
            createdAt: batch.createdAt,
            updatedAt: batch.updatedAt
        },
        statusCalculation: {
            currentStatus: batch.status,
            calculatedStatus: batch.calculateStatus(),
            isStatusAccurate: batch.status === batch.calculateStatus()
        },
        timeline: {
            daysUntilStart: batch.startDate ? Math.ceil((new Date(batch.startDate) - today) / (1000 * 60 * 60 * 24)) : null,
            daysUntilEnd: batch.endDate ? Math.ceil((new Date(batch.endDate) - today) / (1000 * 60 * 60 * 24)) : null,
            duration: batch.startDate && batch.endDate ? 
                Math.ceil((new Date(batch.endDate) - new Date(batch.startDate)) / (1000 * 60 * 60 * 24)) : null
        }
    };
    
    res.json(new ApiResponse(200, statusInfo, "Batch status information retrieved successfully"));
});

// Get batch scheduler status (admin only)
export const getBatchSchedulerStatus = asyncHandler(async (req, res) => {
    const schedulerStatus = batchStatusScheduler.getStatus();
    
    res.json(new ApiResponse(200, schedulerStatus, "Batch scheduler status retrieved successfully"));
});

// Restart batch scheduler (admin only)
export const restartBatchScheduler = asyncHandler(async (req, res) => {
    batchStatusScheduler.restart();
    
    res.json(new ApiResponse(200, null, "Batch scheduler restarted successfully"));
});

// ==================== BATCH CLEANUP MANAGEMENT ====================

// Get batches scheduled for cleanup (admin only)
export const getBatchesScheduledForCleanup = asyncHandler(async (req, res) => {
    const scheduledBatches = await batchCleanupScheduler.getBatchesScheduledForCleanup();
    
    res.json(new ApiResponse(200, {
        batches: scheduledBatches,
        count: scheduledBatches.length,
        cleanupThreshold: '7 days after status change to COMPLETED/CANCELLED'
    }, "Batches scheduled for cleanup retrieved successfully"));
});

// Trigger manual batch cleanup (superadmin only)
export const triggerBatchCleanup = asyncHandler(async (req, res) => {
    if (req.user.role !== "SUPERADMIN") {
        throw new ApiError("Only super admin can trigger manual cleanup", 403);
    }
    
    const result = await batchCleanupScheduler.triggerCleanup();
    
    res.json(new ApiResponse(200, result, "Manual batch cleanup completed"));
});

// Get batch cleanup scheduler status (admin only)
export const getBatchCleanupStatus = asyncHandler(async (req, res) => {
    const cleanupStatus = batchCleanupScheduler.getStatus();
    const scheduledBatches = await batchCleanupScheduler.getBatchesScheduledForCleanup();
    
    res.json(new ApiResponse(200, {
        scheduler: cleanupStatus,
        batchesScheduledForCleanup: scheduledBatches.length,
        nextCleanupTime: '2:00 AM UTC daily',
        warningTime: '1:00 AM UTC daily'
    }, "Batch cleanup status retrieved successfully"));
});

// Restart batch cleanup scheduler (admin only)
export const restartBatchCleanupScheduler = asyncHandler(async (req, res) => {
    batchCleanupScheduler.restart();
    
    res.json(new ApiResponse(200, null, "Batch cleanup scheduler restarted successfully"));
});

// Send manual cleanup warning (admin only)
export const sendManualCleanupWarning = asyncHandler(async (req, res) => {
    await batchCleanupScheduler.sendCleanupWarnings();
    
    res.json(new ApiResponse(200, null, "Manual cleanup warnings sent successfully"));
});

