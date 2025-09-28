import mongoose from "mongoose";

import Submission from "../models/submission.model.js";
import Assignment from "../models/assignment.model.js";
import User from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createSubmission = asyncHandler(async (req, res) => {
    const { assignmentId, fileUrl } = req.body;

    if(!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new ApiError(400, "Invalid assignment ID");
    }

    const assignment = await Assignment.findById(assignmentId);
    if(!assignment) throw new ApiError(404, "Assignment not found");

    const existing = await Submission.findOne({
        assignment: assignmentId,
        student: req.user._id,
    });

    if(existing) {
        throw new ApiError(400, "Submission already exists. Please resubmit");
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

    if(!mongoose.Types.ObjectId.isValid(submissionId)) {
        throw new ApiError(400, "Invalid submission ID");
    }

    const submission = await Submission.findById(submissionId);
    if(!submission) throw new ApiError(404, "Submission not found");

    if(submission.student.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Not authorized to resubmit this assignment");
    }

    submission.fileUrl = fileUrl;
    submission.resubmissionCount += 1;
    submission.submittedAt = new Date();

    await submission.save();

    res.json(new ApiResponse(200, submission, "Submission resubmitted successfully"));
});

export const getSubmissionByAssignment = asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(assignmentId)) {
        throw new ApiError(400, "Invalid assignment ID");
    }

    const submissions = await Submission.find({ assignment: assignmentId })
        .populate("student", "fullName email")
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

    if(!mongoose.Types.ObjectId.isValid(submissionId)) {
        throw new ApiError(400, "Invalid submission ID");
    }

    const submission = await Submission.findById(submissionId);
    if(!submission) throw new ApiError(404, "Submission not found");

    submission.grade = grade;
    submission.feedback = feedback;
    await submission.save();

    res.json(new ApiResponse(200, submission, "Submission graded successfully"));
});

// New endpoint to get specific student submissions for admin
export const getStudentSubmissions = asyncHandler(async (req, res) => {
    const { studentId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ApiError(400, "Invalid student ID");
    }

    const submissions = await Submission.find({ student: studentId })
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
