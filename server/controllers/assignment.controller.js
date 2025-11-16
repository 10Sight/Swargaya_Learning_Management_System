import mongoose from "mongoose";

import Assignment from "../models/assignment.model.js";
import Course from "../models/course.model.js";
import Submission from "../models/submission.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkModuleAccessForAssessments } from "../utils/moduleCompletion.js";

export const createAssignment = asyncHandler(async (req, res) => {
    const { courseId, moduleId, lessonId, scope, title, description, dueDate, maxScore, allowResubmission } = req.body;

    // Validate required fields
    if (!title || !dueDate) {
        throw new ApiError("Title and due date are required", 400);
    }

    // Validate scope
    if (scope && !['course', 'module', 'lesson'].includes(scope)) {
        throw new ApiError("Scope must be 'course', 'module', or 'lesson'", 400);
    }

    // Determine scope from provided parameters if not explicitly set
    const actualScope = scope || (lessonId ? 'lesson' : moduleId ? 'module' : 'course');
    
    // Validate course ID
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Valid Course ID is required", 400);
    }
    
    const course = await Course.findById(courseId);
    if (!course) {
        throw new ApiError("Course not found", 404);
    }

    // Validate scope-specific requirements
    let parentEntity;
    let parentId;

    if (actualScope === 'course') {
        parentEntity = course;
        parentId = courseId;
    } else if (actualScope === 'module') {
        if (!moduleId || !mongoose.Types.ObjectId.isValid(moduleId)) {
            throw new ApiError("Valid Module ID is required for module-scoped assignment", 400);
        }
        const Module = (await import("../models/module.model.js")).default;
        parentEntity = await Module.findOne({ _id: moduleId, course: courseId });
        if (!parentEntity) {
            throw new ApiError("Module not found or does not belong to this course", 404);
        }
        parentId = moduleId;
    } else if (actualScope === 'lesson') {
        if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
            throw new ApiError("Valid Lesson ID is required for lesson-scoped assignment", 400);
        }
        if (!moduleId || !mongoose.Types.ObjectId.isValid(moduleId)) {
            throw new ApiError("Valid Module ID is required for lesson-scoped assignment", 400);
        }
        const Lesson = (await import("../models/lesson.model.js")).default;
        parentEntity = await Lesson.findById(lessonId);
        if (!parentEntity) {
            throw new ApiError("Lesson not found", 404);
        }
        parentId = lessonId;
    }

    let assignmentData = {
        scope: actualScope,
        title,
        description,
        dueDate,
        maxScore: maxScore || 100,
        allowResubmission: allowResubmission !== undefined ? allowResubmission : true,
        instructor: course.instructor || req.user._id,
        createdBy: req.user._id,
        // Legacy fields for backward compatibility
        course: courseId
    };

    // Set the appropriate ID based on scope
    if (actualScope === 'course') {
        assignmentData.courseId = parentId;
    } else if (actualScope === 'module') {
        assignmentData.courseId = courseId;
        assignmentData.moduleId = parentId;
        assignmentData.module = parentId; // Legacy field
    } else if (actualScope === 'lesson') {
        assignmentData.courseId = courseId;
        assignmentData.moduleId = moduleId;
        assignmentData.lessonId = parentId;
        assignmentData.module = moduleId; // Legacy field
        assignmentData.lesson = parentId; // Legacy field
    }

    const assignment = await Assignment.create(assignmentData);

    // Update parent entity with new assignment (if needed for legacy compatibility)
    course.assignments.push(assignment._id);
    await course.save();

    res.status(201)
        .json(new ApiResponse(201, assignment, "Assignment created successfully"));
});

export const getAllAssignments = asyncHandler(async (req, res) => {
    const { courseId } = req.query;

    const query = {};

    if (courseId) {
        let resolvedCourseId = courseId;

        // Allow either a MongoDB ObjectId or a course slug, similar to other controllers
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            const course = await Course.findOne({ slug: courseId }).select('_id');
            if (!course) {
                throw new ApiError("Invalid course ID", 400);
            }
            resolvedCourseId = course._id;
        }

        query.course = resolvedCourseId;
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

// Get all assignments for a course (course-level assignments)
export const getCourseAssignments = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user._id;

    if(!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Invalid course ID", 400);
    }

    // Verify course exists and user has access
    const course = await Course.findById(courseId);
    if(!course) throw new ApiError("Course not found", 404);

    // Get course-level assignments (assignments without specific module assignment or course-wide assignments)
    const assignments = await Assignment.find({ 
        course: courseId,
        $or: [
            { module: null },
            { module: { $exists: false }}
        ]
    })
        .populate("course", "title")
        .populate("module", "title")
        .populate("instructor", "fullName email")
        .populate("createdBy", "fullName email")
        .sort({ createdAt: -1 });

    res.json(new ApiResponse(200, {
        assignments,
        courseTitle: course.title
    }, "Course assignments fetched successfully"));
});

// Get assignments by course scope (similar to resources)
export const getAssignmentsByCourse = asyncHandler(async (req, res) => {
    const rawCourseId = req.params?.courseId ?? req.body?.courseId;

    if (!rawCourseId || rawCourseId === 'undefined' || rawCourseId === 'null') {
        return res.status(400).json(new ApiResponse(400, [], "Course ID is required"));
    }

    if (!mongoose.Types.ObjectId.isValid(rawCourseId)) {
        return res.status(400).json(new ApiResponse(400, [], "Invalid course ID format"));
    }

    try {
        const assignments = await Assignment.find({ courseId: rawCourseId, scope: 'course' })
            .populate('createdBy', 'name email')
            .populate('course', 'title')
            .populate('instructor', 'name email')
            .sort({ createdAt: -1 });

        return res.json(
            new ApiResponse(200, assignments, "Assignments retrieved successfully")
        );
    } catch (err) {
        return res.status(500).json(new ApiResponse(500, [], "Error fetching assignments"));
    }
});

// Get assignments by module scope (similar to resources)
export const getAssignmentsByModule = asyncHandler(async (req, res) => {
    const rawModuleId = req.params?.moduleId ?? req.body?.moduleId;

    if (!rawModuleId || rawModuleId === 'undefined' || rawModuleId === 'null') {
        return res.status(400).json(new ApiResponse(400, [], "Module ID is required"));
    }

    if (!mongoose.Types.ObjectId.isValid(rawModuleId)) {
        return res.status(400).json(new ApiResponse(400, [], "Invalid module ID format"));
    }

    try {
        const assignments = await Assignment.find({ moduleId: rawModuleId, scope: 'module' })
            .populate('createdBy', 'name email')
            .populate('course', 'title')
            .populate('module', 'title')
            .populate('instructor', 'name email')
            .sort({ createdAt: -1 });

        return res.json(
            new ApiResponse(200, assignments, "Assignments retrieved successfully")
        );
    } catch (err) {
        return res.status(500).json(new ApiResponse(500, [], "Error fetching assignments"));
    }
});

// Get assignments by lesson scope (similar to resources)
export const getAssignmentsByLesson = asyncHandler(async (req, res) => {
    const rawLessonId = req.params?.lessonId ?? req.body?.lessonId;

    if (!rawLessonId || rawLessonId === 'undefined' || rawLessonId === 'null') {
        return res.status(400).json(new ApiResponse(400, [], "Lesson ID is required"));
    }

    if (!mongoose.Types.ObjectId.isValid(rawLessonId)) {
        return res.status(400).json(new ApiResponse(400, [], "Invalid lesson ID format"));
    }

    try {
        const assignments = await Assignment.find({ lessonId: rawLessonId, scope: 'lesson' })
            .populate('createdBy', 'name email')
            .populate('course', 'title')
            .populate('module', 'title')
            .populate('instructor', 'name email')
            .sort({ createdAt: -1 });

        return res.json(
            new ApiResponse(200, assignments, "Assignments retrieved successfully")
        );
    } catch (err) {
        return res.status(500).json(new ApiResponse(500, [], "Error fetching assignments"));
    }
});
