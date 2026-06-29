import { pool } from "../db/connectDB.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";
import fs from 'fs';
import path from 'path';
import ENV from "../configs/env.config.js";

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
    const isNumeric = (str) => /^\d+$/.test(String(str));

    if (scope === 'course') {
        if (!courseId) throw new ApiError("Valid Course ID is required", 400);
        let courseQuery = "SELECT id FROM courses WHERE slug = ?";
        let courseParams = [courseId];
        if (isNumeric(courseId)) {
            courseQuery += " OR id = ?";
            courseParams.push(courseId);
        }
        const [rows] = await pool.query(courseQuery, courseParams);
        if (rows.length === 0) throw new ApiError("Course not found", 404);
        parentId = rows[0].id;
        finalCourseId = rows[0].id;
    } else if (scope === 'module') {
        if (!moduleId) throw new ApiError("Valid Module ID is required", 400);
        let moduleQuery = "SELECT id FROM modules WHERE slug = ?";
        let moduleParams = [moduleId];
        if (isNumeric(moduleId)) {
            moduleQuery += " OR id = ?";
            moduleParams.push(moduleId);
        }
        const [rows] = await pool.query(moduleQuery, moduleParams);
        if (rows.length === 0) throw new ApiError("Module not found", 404);
        parentId = rows[0].id;
        finalModuleId = rows[0].id;
    } else if (scope === 'lesson') {
        if (!lessonId) throw new ApiError("Valid Lesson ID is required", 400);
        let lessonQuery = "SELECT id FROM lessons WHERE slug = ?";
        let lessonParams = [lessonId];
        if (isNumeric(lessonId)) {
            lessonQuery += " OR id = ?";
            lessonParams.push(lessonId);
        }
        const [rows] = await pool.query(lessonQuery, lessonParams);
        if (rows.length === 0) throw new ApiError("Lesson not found", 404);
        parentId = rows[0].id;
        finalLessonId = rows[0].id;
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
            // Local Storage Logic
            const publicUrl = `${ENV.BACKEND_URL}/uploads/${file.filename}`;
            
            resourceData.url = publicUrl;
            resourceData.publicId = file.filename; // Using filename as identifier for deletion
            resourceData.fileSize = file.size;
            resourceData.format = path.extname(file.originalname).substring(1);
            resourceData.fileName = file.originalname;
        } catch (error) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            throw new ApiError(`File storage failed: ${error.message}`, 500);
        }
    }

    const [result] = await pool.query(
        `INSERT INTO resources 
        (courseId, moduleId, lessonId, scope, title, type, description, url, publicId, fileSize, format, fileName, createdBy, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), GETDATE()); SELECT SCOPE_IDENTITY() AS id;`,
        [
            finalCourseId, finalModuleId, finalLessonId, scope,
            resourceData.title, resourceData.type, resourceData.description,
            resourceData.url, resourceData.publicId, resourceData.fileSize,
            resourceData.format, resourceData.fileName, resourceData.createdBy
        ]
    );

    const [newRes] = await pool.query("SELECT * FROM resources WHERE id = ?", [result[0].id]);
    res.status(201).json(new ApiResponse(201, newRes[0], "Resource created successfully"));
});

// Get Resources by Module
export const getResourcesByModule = asyncHandler(async (req, res) => {
    const rawModuleId = req.params?.moduleId ?? req.body?.moduleId;
    if (!rawModuleId) return res.status(400).json(new ApiResponse(400, [], "Module ID is required"));

    let moduleId = rawModuleId;

    // Check if UUID/ID format
    // MySQL allows string vs int ID. Assuming int IDs for auto-inc or UUID strings. 
    // We'll query using 'module' column directly if ID, or handle validation.
    // Simplifying: If user passes slug, this fails if we don't resolve.
    // Let's resolve safely.

    const isNumeric = (str) => /^\d+$/.test(String(str));
    let modQuery = "SELECT id FROM modules WHERE slug = ?";
    let modParams = [rawModuleId];
    if (isNumeric(rawModuleId)) {
        modQuery += " OR id = ?";
        modParams.push(rawModuleId);
    }
    const [mods] = await pool.query(modQuery, modParams);
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
        _id: r.id,
        createdBy: { id: r.createdBy, name: r.creatorName, email: r.creatorEmail },
    })).map(r => { delete r.creatorName; delete r.creatorEmail; return r; });

    res.json(new ApiResponse(200, formatted, "Resources retrieved successfully"));
});

// Get Resources by Course
export const getResourcesByCourse = asyncHandler(async (req, res) => {
    const rawCourseId = req.params?.courseId ?? req.body?.courseId;
    if (!rawCourseId) return res.status(400).json(new ApiResponse(400, [], "Course ID is required"));

    const isNumeric = (str) => /^\d+$/.test(String(str));
    let courseQuery = "SELECT id FROM courses WHERE slug = ?";
    let courseParams = [rawCourseId];
    if (isNumeric(rawCourseId)) {
        courseQuery += " OR id = ?";
        courseParams.push(rawCourseId);
    }
    const [courses] = await pool.query(courseQuery, courseParams);
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

    const isNumeric = (str) => /^\d+$/.test(String(str));
    let lessonQuery = "SELECT id FROM lessons WHERE slug = ?";
    let lessonParams = [rawLessonId];
    if (isNumeric(rawLessonId)) {
        lessonQuery += " OR id = ?";
        lessonParams.push(rawLessonId);
    }
    const [lessons] = await pool.query(lessonQuery, lessonParams);
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
        try { 
            const filePath = path.join('uploads', resource.publicId);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath); 
        } catch (e) { 
            console.error("Failed to delete local file:", e);
        }
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
            // Delete old file if exists
            if (resource.publicId) {
                const oldPath = path.join('uploads', resource.publicId);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }

            const publicUrl = `${ENV.BACKEND_URL}/uploads/${file.filename}`;
            updateData.url = publicUrl;
            updateData.publicId = file.filename;
            updateData.fileSize = file.size;
            updateData.format = path.extname(file.originalname).substring(1);
        } catch (e) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            throw new ApiError(`Upload failed: ${e.message}`, 500);
        }
    } else if (url) {
        if (resource.publicId) {
            const oldPath = path.join('uploads', resource.publicId);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        updateData.url = url;
        updateData.publicId = null;
        updateData.fileSize = null;
        updateData.format = null;
    }

    await pool.query(
        `UPDATE resources SET title=?, type=?, description=?, url=?, publicId=?, fileSize=?, format=?, updatedAt=GETDATE() WHERE id=?`,
        [updateData.title, updateData.type, updateData.description, updateData.url, updateData.publicId, updateData.fileSize, updateData.format, resourceId]
    );

    const [updated] = await pool.query("SELECT * FROM resources WHERE id = ?", [resourceId]);
    res.json(new ApiResponse(200, updated[0], "Updated"));
});
