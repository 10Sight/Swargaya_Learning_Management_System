import mongoose from "mongoose";

import Assignment from "../models/assignment.model.js";
import Course from "../models/course.model.js";
import Submission from "../models/submission.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createAssignment = asyncHandler(async (req, res) => {
    const { courseId, title, description, dueDate } = req.body;

    if(!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError(400, "Invalid course ID");
    }

    const course = await Course.findById(courseId);
    if(!course) throw new ApiError(404, "Course not found");

    // Create assignment with required fields
    const assignment = await Assignment.create({
        course: courseId,
        lesson: courseId, // Use courseId as lesson for now
        instructor: course.instructor || req.user._id, // Use course instructor or current user
        title,
        description,
        dueDate,
        createdBy: req.user._id,
    });

    // Update course assignments array
    course.assignments.push(assignment._id);
    await course.save();

    res.status(201)
        .json(new ApiResponse(201, assignment, "Assignment created successfully"));
});

export const getAllAssignments = asyncHandler(async (req, res) => {
    const { courseId } = req.query;

    const query = {};
    if(courseId) {
        if(!mongoose.Types.ObjectId.isValid(courseId)) {
            throw new ApiError(400, "Invalid course ID");
        }
        query.course = courseId;
    }

    const assignments = await Assignment.find(query)
        .populate("course", "title")
        .populate("instructor", "fullName email")
        .populate("createdBy", "fullName email")
        .sort({ createdAt: -1 });

    res.json(
        new ApiResponse(200, assignments, "Assignments fetched successfully")
    );
});

export const getAssigmentById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if(!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid assignment ID");
    }

    const assignment = await Assignment.findById(id)
        .populate("course", "title")
        .populate("instructor", "fullName email")
        .populate("createdBy", "fullName email");

    if(!assignment) throw new ApiError(404, "Assignment not found");

    res.json(new ApiResponse(200, assignment, "Assignment fetched successfully"));
});

export const updatedAssignment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, dueDate } = req.body;

    if(!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid assignment ID");
    }

    const assignment = await Assignment.findById(id);
    if(!assignment) throw new ApiError(404, "Assignment not found");

    if(title) assignment.title = title;
    if(description) assignment.description = description;
    if(dueDate) assignment.dueDate = dueDate;

    await assignment.save();

    res.json(new ApiResponse(200, assignment, "Assignment updated successfully"));
});

export const deleteAssignment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if(!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid assignment ID");
    }

    const assignment = await Assignment.findById(id);
    if(!assignment) throw new ApiError(404, "Assignment not found");

    await Course.findByIdAndUpdate(assignment.course, {
        $pull: { assignments: assignment._id },
    });

    await Submission.deleteMany({ assignment: assignment._id });
    await assignment.deleteOne();

    res.json(new ApiResponse(200, null, "Assignment deleted successfully"));
});