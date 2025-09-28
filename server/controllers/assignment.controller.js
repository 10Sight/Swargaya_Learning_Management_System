import mongoose from "mongoose";

import Assignment from "../models/assignment.model.js";
import Course from "../models/course.model.js";
import Submission from "../models/submission.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkModuleAccessForAssessments } from "../utils/moduleCompletion.js";

export const createAssignment = asyncHandler(async (req, res) => {
    const { courseId, moduleId, title, description, dueDate, maxScore, allowResubmission } = req.body;

    if(!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Invalid course ID", 400);
    }

    if(moduleId && !mongoose.Types.ObjectId.isValid(moduleId)) {
        throw new ApiError("Invalid module ID", 400);
    }

    const course = await Course.findById(courseId);
    if(!course) throw new ApiError("Course not found", 404);

    // If moduleId is provided, verify the module exists and belongs to the course
    if(moduleId) {
        const Module = (await import("../models/module.model.js")).default;
        const module = await Module.findOne({ _id: moduleId, course: courseId });
        if(!module) {
            throw new ApiError("Module not found or does not belong to this course", 404);
        }
    }

    // Create assignment with required fields
    const assignment = await Assignment.create({
        course: courseId,
        module: moduleId || null,
        lesson: courseId, // Use courseId as lesson for now
        instructor: course.instructor || req.user._id, // Use course instructor or current user
        title,
        description,
        dueDate,
        maxScore: maxScore || 100,
        allowResubmission: allowResubmission !== undefined ? allowResubmission : true,
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
            throw new ApiError("Invalid course ID", 400);
        }
        query.course = courseId;
    }

    const assignments = await Assignment.find(query)
        .populate("course", "title")
        .populate("module", "title")
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
        throw new ApiError("Invalid assignment ID", 400);
    }

    const assignment = await Assignment.findById(id)
        .populate("course", "title")
        .populate("instructor", "fullName email")
        .populate("createdBy", "fullName email");

    if(!assignment) throw new ApiError("Assignment not found", 404);

    res.json(new ApiResponse(200, assignment, "Assignment fetched successfully"));
});

export const updatedAssignment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, dueDate } = req.body;

    if(!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError("Invalid assignment ID", 400);
    }

    const assignment = await Assignment.findById(id);
    if(!assignment) throw new ApiError("Assignment not found", 404);

    if(title) assignment.title = title;
    if(description) assignment.description = description;
    if(dueDate) assignment.dueDate = dueDate;

    await assignment.save();

    res.json(new ApiResponse(200, assignment, "Assignment updated successfully"));
});

export const deleteAssignment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if(!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError("Invalid assignment ID", 400);
    }

    const assignment = await Assignment.findById(id);
    if(!assignment) throw new ApiError("Assignment not found", 404);

    await Course.findByIdAndUpdate(assignment.course, {
        $pull: { assignments: assignment._id },
    });

    await Submission.deleteMany({ assignment: assignment._id });
    await assignment.deleteOne();

    res.json(new ApiResponse(200, null, "Assignment deleted successfully"));
});

// Get assignments accessible to a student for a specific module
export const getAccessibleAssignments = asyncHandler(async (req, res) => {
    const { courseId, moduleId } = req.params;
    const userId = req.user._id;

    if(!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(moduleId)) {
        throw new ApiError("Invalid course ID or module ID", 400);
    }

    // Check if user has access to assessments for this module (effective completion)
    const accessCheck = await checkModuleAccessForAssessments(userId, courseId, moduleId);
    
    if (!accessCheck.hasAccess) {
        // Return empty array with access information
        return res.json(new ApiResponse(200, {
            assignments: [],
            accessInfo: {
                hasAccess: false,
                reason: accessCheck.reason
            }
        }, "Module assignments locked - complete all lessons to unlock"));
    }

    // User has access, fetch assignments based on onlyModule parameter
    const onlyModule = String(req.query.onlyModule || '').toLowerCase() === 'true';
    let filter;
    
    if (onlyModule) {
        // First try to find assignments specifically assigned to this module
        filter = { course: courseId, module: moduleId };

        const moduleOnlyAssignments = await Assignment.find(filter)
            .populate("course", "title")
            .populate("module", "title")
            .populate("instructor", "fullName email")
            .populate("createdBy", "fullName email")
            .sort({ createdAt: -1 });

        // If module has specific content, return it
        if (moduleOnlyAssignments.length > 0) {
            return res.json(new ApiResponse(200, {
                assignments: moduleOnlyAssignments,
                accessInfo: {
                    hasAccess: true,
                    reason: accessCheck.reason
                }
            }, "Accessible assignments (module-specific) fetched successfully"));
        }

        // Fallback: if no module-specific content, return course-wide items
        filter = { 
            course: courseId,
            $or: [
                { module: null },
                { module: { $exists: false } }
            ]
        };

        const fallbackAssignments = await Assignment.find(filter)
            .populate("course", "title")
            .populate("module", "title")
            .populate("instructor", "fullName email")
            .populate("createdBy", "fullName email")
            .sort({ createdAt: -1 });
        return res.json(new ApiResponse(200, {
            assignments: fallbackAssignments,
            accessInfo: {
                hasAccess: true,
                reason: accessCheck.reason
            }
        }, "Accessible assignments (course-wide fallback) fetched successfully"));
    } else {
        // Return both module-specific and course-wide assignments
        filter = { 
            course: courseId, 
            $or: [ 
                { module: moduleId }, 
                { module: null }, 
                { module: { $exists: false } }
            ] 
        };

        const assignments = await Assignment.find(filter)
            .populate("course", "title")
            .populate("module", "title")
            .populate("instructor", "fullName email")
            .populate("createdBy", "fullName email")
            .sort({ createdAt: -1 });

        return res.json(new ApiResponse(200, {
            assignments,
            accessInfo: {
                hasAccess: true,
                reason: accessCheck.reason
            }
        }, "Accessible assignments fetched successfully"));
    }
});
