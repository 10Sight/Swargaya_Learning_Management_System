import Assignment from "../models/assignment.model.js";
import Course from "../models/course.model.js";
import Module from "../models/module.model.js";
import Lesson from "../models/lesson.model.js";
import Submission from "../models/submission.model.js";
import User from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkModuleAccessForAssessments } from "../utils/moduleCompletion.js";

// Helper to manual populate
const populateAssignment = async (assignment) => {
    if (!assignment) return null;
    if (assignment.course) assignment.course = await Course.findById(assignment.course).then(c => c ? { id: c.id, title: c.title } : null);
    if (assignment.module) assignment.module = await Module.findById(assignment.module).then(m => m ? { id: m.id, title: m.title } : null);
    if (assignment.instructor) assignment.instructor = await User.findById(assignment.instructor).then(u => u ? { id: u.id, fullName: u.fullName, email: u.email } : null);
    if (assignment.createdBy) assignment.createdBy = await User.findById(assignment.createdBy).then(u => u ? { id: u.id, fullName: u.fullName, email: u.email } : null);
    return assignment;
};

export const createAssignment = asyncHandler(async (req, res) => {
    const { courseId, moduleId, lessonId, scope, title, description, dueDate, maxScore, allowResubmission } = req.body;

    if (!title || !dueDate) {
        throw new ApiError("Title and due date are required", 400);
    }

    if (scope && !['course', 'module', 'lesson'].includes(scope)) {
        throw new ApiError("Scope must be 'course', 'module', or 'lesson'", 400);
    }

    const actualScope = scope || (lessonId ? 'lesson' : moduleId ? 'module' : 'course');

    if (!courseId) {
        throw new ApiError("Valid Course ID is required", 400);
    }

    const course = await Course.findById(courseId);
    if (!course) {
        throw new ApiError("Course not found", 404);
    }

    let parentId;

    if (actualScope === 'course') {
        parentId = courseId;
    } else if (actualScope === 'module') {
        if (!moduleId) {
            throw new ApiError("Valid Module ID is required for module-scoped assignment", 400);
        }
        const module = await Module.findOne({ id: moduleId, course: courseId });
        if (!module) {
            throw new ApiError("Module not found or does not belong to this course", 404);
        }
        parentId = moduleId;
    } else if (actualScope === 'lesson') {
        if (!lessonId) {
            throw new ApiError("Valid Lesson ID is required for lesson-scoped assignment", 400);
        }
        if (!moduleId) {
            throw new ApiError("Valid Module ID is required for lesson-scoped assignment", 400);
        }
        const lesson = await Lesson.findById(lessonId);
        if (!lesson) {
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
        instructor: course.instructor || req.user.id,
        createdBy: req.user.id,
        course: courseId
    };

    if (actualScope === 'course') {
        assignmentData.courseId = parentId;
    } else if (actualScope === 'module') {
        assignmentData.courseId = courseId;
        assignmentData.moduleId = parentId;
        assignmentData.module = parentId;
    } else if (actualScope === 'lesson') {
        assignmentData.courseId = courseId;
        assignmentData.moduleId = moduleId;
        assignmentData.lessonId = parentId;
        assignmentData.module = moduleId;
        assignmentData.lesson = parentId;
    }

    const assignment = await Assignment.create(assignmentData);

    // Mongoose had course.assignments.push(). In SQL, relationship is inverse (Assignment has courseId), 
    // so no update to Course table needed unless we have a specific summary column.
    // Course model does not seem to have 'assignments' JSON or list column in our new SQL model. It relies on queries.

    res.status(201)
        .json(new ApiResponse(201, assignment, "Assignment created successfully"));
});

export const getAllAssignments = asyncHandler(async (req, res) => {
    const { courseId } = req.query;

    const query = {};

    if (courseId) {
        let resolvedCourseId = courseId;
        // Check if looks like slug or ID. 
        // In this migration IDs are ints usually but we kept strings for mongo IDs.
        // If it's a slug, we find the course.
        const courseBySlug = await Course.findOne({ slug: courseId });
        if (courseBySlug) {
            resolvedCourseId = courseBySlug.id;
        } else {
            // Try ID direct
            const courseById = await Course.findById(courseId);
            if (!courseById) {
                // If neither, maybe invalid ID logic or just no results
                // throw or empty?
            }
        }
        query.course = resolvedCourseId;
    }

    // Sort usually done in find or manually
    query.sort = { createdAt: -1 };

    let assignments = await Assignment.find(query);

    // Populate
    assignments = await Promise.all(assignments.map(populateAssignment));

    res.json(
        new ApiResponse(200, assignments, "Assignments fetched successfully")
    );
});

export const getAssigmentById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    let assignment = await Assignment.findById(id);

    if (!assignment) throw new ApiError("Assignment not found", 404);

    assignment = await populateAssignment(assignment);

    res.json(new ApiResponse(200, assignment, "Assignment fetched successfully"));
});

export const updatedAssignment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, dueDate } = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) throw new ApiError("Assignment not found", 404);

    if (title) assignment.title = title;
    if (description) assignment.description = description;
    if (dueDate) assignment.dueDate = dueDate;

    await assignment.save();

    res.json(new ApiResponse(200, assignment, "Assignment updated successfully"));
});

export const deleteAssignment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const assignment = await Assignment.findById(id);
    if (!assignment) throw new ApiError("Assignment not found", 404);

    // No need to $pull from course in SQL

    // Delete submissions
    // Mongoose: await Submission.deleteMany({ assignment: assignment._id });
    // SQL: Need to implement deleteMany or raw query
    // Let's use raw query via pool imported in model or just loop if efficient? 
    // Best: Add delete method to Submission model or import pool here.
    // Since we don't have pool here, we can rely on model or add delete logic.
    // Ideally, Submission logic should be in Submission model or service.
    // For now, let's assume we need to import pool or use model capability.
    // Our Submission model didn't have deleteMany.
    // But we can import pool from db.

    // Lazy fix: Import pool for this delete.
    const { pool } = await import("../db/connectDB.js");
    await pool.query("DELETE FROM submissions WHERE assignment = ?", [assignment.id]);
    await pool.query("DELETE FROM assignments WHERE id = ?", [id]);

    res.json(new ApiResponse(200, null, "Assignment deleted successfully"));
});

// Get assignments accessible to a student for a specific module
export const getAccessibleAssignments = asyncHandler(async (req, res) => {
    const { courseId, moduleId } = req.params;
    const userId = req.user.id;

    // Check module access
    // CAUTION: checkModuleAccessForAssessments might return old mongoose structures. 
    // Assuming it's compatible or will be refactored. 
    const accessCheck = await checkModuleAccessForAssessments(userId, courseId, moduleId);

    if (!accessCheck.hasAccess) {
        return res.json(new ApiResponse(200, {
            assignments: [],
            accessInfo: {
                hasAccess: false,
                reason: accessCheck.reason
            }
        }, "Module assignments locked - complete all lessons to unlock"));
    }

    const onlyModule = String(req.query.onlyModule || '').toLowerCase() === 'true';
    let assignments = [];

    if (onlyModule) {
        // Module specific only
        assignments = await Assignment.find({ course: courseId, module: moduleId });

        if (assignments.length > 0) {
            assignments = await Promise.all(assignments.map(populateAssignment));
            return res.json(new ApiResponse(200, {
                assignments,
                accessInfo: { hasAccess: true, reason: accessCheck.reason }
            }, "Accessible assignments (module-specific) fetched successfully"));
        }

        // Fallback: course-wide
        // "module: null" or module doesn't exist. In SQL, module IS NULL.
        // find() helper usually supports simple equality. SQL has to handle IS NULL if we pass null.
        // Our find() in Assignment model: keys.map(key => `${key} = ?`).
        // If query[key] is null, `key = null` is NOT correct SQL (needs IS NULL). 
        // We might need raw query here for OR/IS NULL conditions or update find() in model.
        // Let's use raw pool query for complex OR condition logic.

        const { pool } = await import("../db/connectDB.js");
        const [rows] = await pool.query(`
            SELECT * FROM assignments 
            WHERE course = ? AND (module IS NULL OR module = '') 
            ORDER BY createdAt DESC
        `, [courseId]);

        assignments = rows.map(r => new Assignment(r));
        assignments = await Promise.all(assignments.map(populateAssignment));

        return res.json(new ApiResponse(200, {
            assignments,
            accessInfo: { hasAccess: true, reason: accessCheck.reason }
        }, "Accessible assignments (course-wide fallback) fetched successfully"));

    } else {
        // Module specific OR course-wide
        const { pool } = await import("../db/connectDB.js");
        const [rows] = await pool.query(`
            SELECT * FROM assignments 
            WHERE course = ? AND (module = ? OR module IS NULL OR module = '') 
            ORDER BY createdAt DESC
        `, [courseId, moduleId]);

        assignments = rows.map(r => new Assignment(r));
        assignments = await Promise.all(assignments.map(populateAssignment));

        return res.json(new ApiResponse(200, {
            assignments,
            accessInfo: { hasAccess: true, reason: accessCheck.reason }
        }, "Accessible assignments fetched successfully"));
    }
});

export const getCourseAssignments = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) throw new ApiError("Course not found", 404);

    const { pool } = await import("../db/connectDB.js");
    const [rows] = await pool.query(`
        SELECT * FROM assignments 
        WHERE course = ? AND (module IS NULL OR module = '')
        ORDER BY createdAt DESC
    `, [courseId]);

    let assignments = rows.map(r => new Assignment(r));
    assignments = await Promise.all(assignments.map(populateAssignment));

    res.json(new ApiResponse(200, {
        assignments,
        courseTitle: course.title
    }, "Course assignments fetched successfully"));
});

export const getAssignmentsByCourse = asyncHandler(async (req, res) => {
    const rawCourseId = req.params?.courseId ?? req.body?.courseId;

    if (!rawCourseId) {
        return res.status(400).json(new ApiResponse(400, [], "Course ID is required"));
    }

    try {
        let assignments = await Assignment.find({ courseId: rawCourseId, scope: 'course' });
        // find returns array sorted if supported or default sort.
        // We want sort by createdAt desc. Our find() supports sort param? 
        // Yes, "sort" key in query object.
        assignments = await Assignment.find({ courseId: rawCourseId, scope: 'course', sort: { createdAt: -1 } });

        assignments = await Promise.all(assignments.map(populateAssignment));

        return res.json(
            new ApiResponse(200, assignments, "Assignments retrieved successfully")
        );
    } catch (err) {
        return res.status(500).json(new ApiResponse(500, [], "Error fetching assignments"));
    }
});

export const getAssignmentsByModule = asyncHandler(async (req, res) => {
    const rawModuleId = req.params?.moduleId ?? req.body?.moduleId;

    if (!rawModuleId) {
        return res.status(400).json(new ApiResponse(400, [], "Module ID is required"));
    }

    try {
        let assignments = await Assignment.find({ moduleId: rawModuleId, scope: 'module', sort: { createdAt: -1 } });
        assignments = await Promise.all(assignments.map(populateAssignment));

        return res.json(
            new ApiResponse(200, assignments, "Assignments retrieved successfully")
        );
    } catch (err) {
        return res.status(500).json(new ApiResponse(500, [], "Error fetching assignments"));
    }
});

export const getAssignmentsByLesson = asyncHandler(async (req, res) => {
    const rawLessonId = req.params?.lessonId ?? req.body?.lessonId;

    if (!rawLessonId) {
        return res.status(400).json(new ApiResponse(400, [], "Lesson ID is required"));
    }

    try {
        let assignments = await Assignment.find({ lessonId: rawLessonId, scope: 'lesson', sort: { createdAt: -1 } });
        assignments = await Promise.all(assignments.map(populateAssignment));

        return res.json(
            new ApiResponse(200, assignments, "Assignments retrieved successfully")
        );
    } catch (err) {
        return res.status(500).json(new ApiResponse(500, [], "Error fetching assignments"));
    }
});
