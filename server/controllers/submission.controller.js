import mongoose from "mongoose";

import Submission from "../models/submission.model.js";
import Assignment from "../models/assignment.model.js";
import User from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createSubmission = asyncHandler(async (req, res) => {
    const { assignmentId, fileUrl } = req.body;

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new ApiError("Invalid assignment ID", 400);
    }

    const assignment = await Assignment.findById(assignmentId).populate('course').populate('module');
    if (!assignment) throw new ApiError("Assignment not found", 404);

    // Validate access permissions for assignments
    if (assignment.module && assignment.type === "MODULE") {
        // Module assignment - check module completion
        const { checkModuleAccessForAssessments } = await import("../utils/moduleCompletion.js");
        const accessCheck = await checkModuleAccessForAssessments(req.user._id, assignment.course._id, assignment.module._id);
        if (!accessCheck.hasAccess) {
            throw new ApiError(accessCheck.reason || "Access denied. Complete all lessons in the module first.", 403);
        }
    } else if (assignment.type === "COURSE") {
        // Course assignment - check if all modules are completed
        const Progress = (await import("../models/progress.model.js")).default;
        const Course = (await import("../models/course.model.js")).default;

        const course = await Course.findById(assignment.course._id).populate('modules');
        if (!course) {
            throw new ApiError("Course not found", 404);
        }

        const progress = await Progress.findOne({
            student: req.user._id,
            course: assignment.course._id
        });

        if (!progress) {
            throw new ApiError("No progress found. Complete all modules first.", 403);
        }

        const totalModules = course.modules?.length || 0;
        const completedModules = progress.completedModules?.length || 0;

        if (completedModules < totalModules) {
            throw new ApiError(`Complete all ${totalModules} modules to access this course assignment. Currently completed: ${completedModules}`, 403);
        }
    }

    const existing = await Submission.findOne({
        assignment: assignmentId,
        student: req.user._id,
    });

    if (existing) {
        throw new ApiError("Submission already exists. Please resubmit", 400);
    }

    const isLate = assignment.dueDate && new Date() > assignment.dueDate;

    const submission = await Submission.create({
        assignment: assignmentId,
        student: req.user._id,
        fileUrl,
        isLate,
    });

    res.status(201)
        .json(new ApiResponse(201, submission, "Submission created successfully"));
});

export const resubmitAssignment = asyncHandler(async (req, res) => {
    const { submissionId, fileUrl } = req.body;

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
        throw new ApiError("Invalid submission ID", 400);
    }

    const submission = await Submission.findById(submissionId);
    if (!submission) throw new ApiError("Submission not found", 404);

    if (submission.student.toString() !== req.user._id.toString()) {
        throw new ApiError("Not authorized to resubmit this assignment", 403);
    }

    submission.fileUrl = fileUrl;
    submission.resubmissionCount += 1;
    submission.submittedAt = new Date();

    await submission.save();

    res.json(new ApiResponse(200, submission, "Submission resubmitted successfully"));
});

export const getSubmissionByAssignment = asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new ApiError("Invalid assignment ID", 400);
    }

    const submissions = await Submission.find({ assignment: assignmentId })
        .populate("student", "fullName email slug")
        .sort({ submittedAt: -1 });

    res.json(new ApiResponse(200, submissions, "Submissions fetched successfully"));
});

export const getMySubmissions = asyncHandler(async (req, res) => {
    const submissions = await Submission.find({ student: req.user._id })
        .populate("assignment", "title dueDate")
        .sort({ submittedAt: -1 });

    res.json(new ApiResponse(200, submissions, "Your submissions fetched successfully"));
});

export const gradeSubmission = asyncHandler(async (req, res) => {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
        throw new ApiError("Invalid submission ID", 400);
    }

    const submission = await Submission.findById(submissionId)
        .populate({
            path: 'assignment',
            populate: {
                path: 'course',
                select: 'title'
            }
        })
        .populate('student', 'fullName email department');
    if (!submission) throw new ApiError("Submission not found", 404);

    // Verify instructor authorization - check if instructor teaches this course
    if (req.user.role === 'INSTRUCTOR') {
        const Department = (await import("../models/department.model.js")).default;
        const department = await Department.findById(submission.student.department);

        if (!department ||
            department.instructor.toString() !== req.user._id.toString() ||
            department.course.toString() !== submission.assignment.course._id.toString()) {
            throw new ApiError("You are not authorized to grade this submission", 403);
        }
    }

    // Validate grade if provided
    if (grade !== null && grade !== undefined) {
        const maxScore = submission.assignment.maxScore || 100;
        if (grade < 0 || grade > maxScore) {
            throw new ApiError(`Grade must be between 0 and ${maxScore}`, 400);
        }
    }

    submission.grade = grade;
    submission.feedback = feedback || '';
    submission.status = grade !== null && grade !== undefined ? 'GRADED' : submission.status;
    submission.gradedAt = grade !== null && grade !== undefined ? new Date() : submission.gradedAt;
    submission.gradedBy = grade !== null && grade !== undefined ? req.user._id : submission.gradedBy;

    await submission.save();

    const populatedSubmission = await Submission.findById(submission._id)
        .populate('assignment', 'title maxScore dueDate')
        .populate('student', 'fullName email')
        .populate('gradedBy', 'fullName email');

    res.json(new ApiResponse(200, populatedSubmission, "Submission graded successfully"));
});

// New endpoint to get specific student submissions for admin
export const getStudentSubmissions = asyncHandler(async (req, res) => {
    const { studentId } = req.params;

    let resolvedStudentId = studentId;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        const User = (await import("../models/auth.model.js")).default;
        const handle = String(studentId).toLowerCase();
        const u = await User.findOne({ $or: [{ slug: handle }, { userName: handle }] }).select('_id');
        if (!u) {
            throw new ApiError("Invalid student ID", 400);
        }
        resolvedStudentId = u._id;
    }

    const submissions = await Submission.find({ student: resolvedStudentId })
        .populate({
            path: "assignment",
            select: "title dueDate maxScore",
            populate: {
                path: "course",
                select: "title"
            }
        })
        .sort({ submittedAt: -1 });

    res.json(new ApiResponse(200, submissions, "Student submissions fetched successfully"));
});
