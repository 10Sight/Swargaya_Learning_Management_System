import { pool } from "../db/connectDB.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";
import fs from 'fs';

// Create Resource
export const createResource = asyncHandler(async (req, res) => {
    const { courseId, moduleId, lessonId, scope, title, type, description, url } = req.body;
    const file = req.file;

    if (!title || !type || !scope) {
        throw new ApiError("Title, type, and scope are required", 400);
    }
    if (!['course', 'module', 'lesson'].includes(scope)) {
        throw new ApiError("Scope must be 'course', 'module', or 'lesson'", 400);
    }

    let parentId;
    let finalCourseId = null;
    let finalModuleId = null;
    let finalLessonId = null;

    // Validate Existence & Set IDs
    if (scope === 'course') {
        if (!courseId) throw new ApiError("Valid Course ID is required", 400);
        const [rows] = await pool.query("SELECT id FROM courses WHERE id = ?", [courseId]);
        if (rows.length === 0) throw new ApiError("Course not found", 404);
        parentId = courseId;
        finalCourseId = courseId;
    } else if (scope === 'module') {
        if (!moduleId) throw new ApiError("Valid Module ID is required", 400);
        const [rows] = await pool.query("SELECT id FROM modules WHERE id = ?", [moduleId]);
        if (rows.length === 0) throw new ApiError("Module not found", 404);
        parentId = moduleId;
        finalModuleId = moduleId;
    } else if (scope === 'lesson') {
        if (!lessonId) throw new ApiError("Valid Lesson ID is required", 400);
        const [rows] = await pool.query("SELECT id FROM lessons WHERE id = ?", [lessonId]);
        if (rows.length === 0) throw new ApiError("Lesson not found", 404);
        parentId = lessonId;
        finalLessonId = lessonId;
    }

    if (!file && !url) throw new ApiError("Either file or URL must be provided", 400);

    let resourceData = {
        scope, title, type, description: description || "",
        createdBy: req.user.id,
        url: url || null,
        publicId: null, fileSize: null, format: null, fileName: null
    };

    if (file) {
        try {
            const uploadResult = await uploadToCloudinary(file.path, `learning-management/resources/${scope}s`);
            if (uploadResult.success) {
                resourceData.url = uploadResult.url;
                resourceData.publicId = uploadResult.public_id;
                resourceData.fileSize = uploadResult.size;
                resourceData.format = uploadResult.format;
                resourceData.fileName = file.originalname;
            } else {
                throw new Error(uploadResult.error);
            }
        } catch (error) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            throw new ApiError(`File upload failed: ${error.message}`, 500);
        }
    }

    const [result] = await pool.query(
        `INSERT INTO resources 
        (courseId, moduleId, lessonId, scope, title, type, description, url, publicId, fileSize, format, fileName, createdBy, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
            finalCourseId, finalModuleId, finalLessonId, scope,
            resourceData.title, resourceData.type, resourceData.description,
            resourceData.url, resourceData.publicId, resourceData.fileSize,
            resourceData.format, resourceData.fileName, resourceData.createdBy
        ]
    );

    const [newRes] = await pool.query("SELECT * FROM resources WHERE id = ?", [result.insertId]);
    res.status(201).json(new ApiResponse(201, newRes[0], "Resource created successfully"));
});

// Get Resources by Module
export const getResourcesByModule = asyncHandler(async (req, res) => {
    const rawModuleId = req.params?.moduleId ?? req.body?.moduleId;
    if (!rawModuleId) return res.status(400).json(new ApiResponse(400, [], "Module ID is required"));

    // Resolve slug if string
    // Assuming purely checking against ID first or slug
    // Simple approach: try ID check in DB, fallback to slug logic via SQL query
    let rows;

    // We can do one query that covers both ID and Slug check by JOIN or subquery logic, 
    // OR just resolve slug first. 
    // Given previous pattern:
    let moduleId = rawModuleId;

    // Check if UUID/ID format
    // MySQL allows string vs int ID. Assuming int IDs for auto-inc or UUID strings. 
    // We'll query using 'module' column directly if ID, or handle validation.
    // Simplifying: If user passes slug, this fails if we don't resolve.
    // Let's resolve safely.

    const [mods] = await pool.query("SELECT id FROM modules WHERE id = ? OR slug = ?", [rawModuleId, rawModuleId]);
    if (mods.length === 0) return res.status(400).json(new ApiResponse(400, [], "Invalid module identifier"));
    moduleId = mods[0].id;

    const [resources] = await pool.query(`
        SELECT r.*, u.fullName as creatorName, u.email as creatorEmail
        FROM resources r
        LEFT JOIN users u ON r.createdBy = u.id
        WHERE r.moduleId = ? AND r.scope = 'module'
        ORDER BY r.createdAt DESC
    `, [moduleId]);

    const formatted = resources.map(r => ({
        ...r,
        createdBy: { id: r.createdBy, name: r.creatorName, email: r.creatorEmail },
    })).map(r => { delete r.creatorName; delete r.creatorEmail; return r; });

    res.json(new ApiResponse(200, formatted, "Resources retrieved successfully"));
});

// Get Resources by Course
export const getResourcesByCourse = asyncHandler(async (req, res) => {
    const rawCourseId = req.params?.courseId ?? req.body?.courseId;
    if (!rawCourseId) return res.status(400).json(new ApiResponse(400, [], "Course ID is required"));

    const [courses] = await pool.query("SELECT id FROM courses WHERE id = ? OR slug = ?", [rawCourseId, rawCourseId]);
    if (courses.length === 0) return res.status(400).json(new ApiResponse(400, [], "Invalid course identifier"));
    const courseId = courses[0].id;

    const [resources] = await pool.query(`
        SELECT r.*, u.fullName as creatorName, u.email as creatorEmail
        FROM resources r
        LEFT JOIN users u ON r.createdBy = u.id
        WHERE r.courseId = ? AND r.scope = 'course'
        ORDER BY r.createdAt DESC
    `, [courseId]);

    const formatted = resources.map(r => ({
        ...r,
        createdBy: { id: r.createdBy, name: r.creatorName, email: r.creatorEmail },
    })).map(r => { delete r.creatorName; delete r.creatorEmail; return r; });

    res.json(new ApiResponse(200, formatted, "Resources retrieved successfully"));
});

// Get Resources by Lesson
export const getResourcesByLesson = asyncHandler(async (req, res) => {
    const rawLessonId = req.params?.lessonId ?? req.body?.lessonId;
    if (!rawLessonId) return res.status(400).json(new ApiResponse(400, [], "Lesson ID is required"));

    const [lessons] = await pool.query("SELECT id FROM lessons WHERE id = ? OR slug = ?", [rawLessonId, rawLessonId]);
    if (lessons.length === 0) return res.status(400).json(new ApiResponse(400, [], "Invalid lesson identifier"));
    const lessonId = lessons[0].id;

    const [resources] = await pool.query(`
        SELECT r.*, u.fullName as creatorName, u.email as creatorEmail
        FROM resources r
        LEFT JOIN users u ON r.createdBy = u.id
        WHERE r.lessonId = ? AND r.scope = 'lesson'
        ORDER BY r.createdAt DESC
    `, [lessonId]);

    const formatted = resources.map(r => ({
        ...r,
        createdBy: { id: r.createdBy, name: r.creatorName, email: r.creatorEmail },
    })).map(r => { delete r.creatorName; delete r.creatorEmail; return r; });

    res.json(new ApiResponse(200, formatted, "Resources retrieved successfully"));
});

// Delete Resource
export const deleteResource = asyncHandler(async (req, res) => {
    const { resourceId } = req.params;
    const [rows] = await pool.query("SELECT * FROM resources WHERE id = ?", [resourceId]);
    if (rows.length === 0) throw new ApiError("Resource not found", 404);
    const resource = rows[0];

    if (resource.publicId) {
        try { await deleteFromCloudinary(resource.publicId); } catch (e) { }
    }

    await pool.query("DELETE FROM resources WHERE id = ?", [resourceId]);
    res.json(new ApiResponse(200, null, "Deleted"));
});

// Update Resource
export const updateResource = asyncHandler(async (req, res) => {
    const { resourceId } = req.params;
    const { title, type, description, url } = req.body;
    const file = req.file;

    const [rows] = await pool.query("SELECT * FROM resources WHERE id = ?", [resourceId]);
    if (rows.length === 0) throw new ApiError("Resource not found", 404);
    const resource = rows[0];

    let updateData = {
        title: title || resource.title,
        type: type || resource.type,
        description: description || resource.description,
        url: resource.url,
        publicId: resource.publicId,
        fileSize: resource.fileSize,
        format: resource.format
    };

    if (file) {
        try {
            if (resource.publicId) await deleteFromCloudinary(resource.publicId);
            const uploadResult = await uploadToCloudinary(file.path, 'learning-management/resources');
            if (uploadResult.success) {
                updateData.url = uploadResult.url;
                updateData.publicId = uploadResult.public_id;
                updateData.fileSize = uploadResult.size;
                updateData.format = uploadResult.format;
            } else {
                throw new Error(uploadResult.error);
            }
        } catch (e) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            throw new ApiError(`Upload failed: ${e.message}`, 500);
        }
    } else if (url) {
        if (resource.publicId) await deleteFromCloudinary(resource.publicId);
        updateData.url = url;
        updateData.publicId = null;
        updateData.fileSize = null;
        updateData.format = null;
    }

    await pool.query(
        `UPDATE resources SET title=?, type=?, description=?, url=?, publicId=?, fileSize=?, format=?, updatedAt=NOW() WHERE id=?`,
        [updateData.title, updateData.type, updateData.description, updateData.url, updateData.publicId, updateData.fileSize, updateData.format, resourceId]
    );

    const [updated] = await pool.query("SELECT * FROM resources WHERE id = ?", [resourceId]);
    res.json(new ApiResponse(200, updated[0], "Updated"));
});
