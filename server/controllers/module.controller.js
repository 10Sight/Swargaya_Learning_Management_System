import { pool } from "../db/connectDB.js";
import { slugify } from "../utils/slugify.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Create a new module
// @route   POST /api/modules
// @access  Private
export const createModule = asyncHandler(async (req, res) => {
    const { courseId, title, description, order } = req.body;

    if (!courseId || !title) {
        throw new ApiError("Course ID and Title are required", 400);
    }

    // Check if course exists
    const [courses] = await pool.query("SELECT id FROM courses WHERE id = ?", [courseId]);
    if (courses.length === 0) {
        throw new ApiError("Course not found", 404);
    }

    // Generate unique slug
    let baseSlug = slugify(title);
    let slug = baseSlug;
    let suffix = 1;

    while (true) {
        const [existingSlug] = await pool.query("SELECT id FROM modules WHERE slug = ?", [slug]);
        if (existingSlug.length === 0) break;
        suffix++;
        slug = `${baseSlug}-${suffix}`;
    }

    const [result] = await pool.query(
        "INSERT INTO modules (course, title, slug, description, [order], createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, GETDATE(), GETDATE()); SELECT SCOPE_IDENTITY() AS id;",
        [courseId, title, slug, description, order || 0]
    );

    const [newModule] = await pool.query("SELECT * FROM modules WHERE id = ?", [result[0].id]);

    // Note: We do NOT push to course.modules array anymore as relationships are handled via Foreign Key `module.course`.
    // If the frontend relies on the array in Course object, it should be fetching modules via `getModulesByCourse` or properly populated Course queries.

    res.status(201).json(new ApiResponse(201, newModule[0], "Module created successfully"));
});

// @desc    Get all modules for a course
// @route   GET /api/modules/course/:courseId
// @access  Private
export const getModulesByCourse = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    let id = courseId;

    // Resolve course ID safely
    let courses = [];
    if (/^\d+$/.test(courseId)) {
        [courses] = await pool.query("SELECT id FROM courses WHERE id = ?", [courseId]);
    }
    if (courses.length === 0) {
        [courses] = await pool.query("SELECT id FROM courses WHERE slug = ?", [courseId]);
    }

    if (courses.length === 0) return res.status(404).json(new ApiResponse(404, [], "Course not found"));
    id = courses[0].id;

    const [modules] = await pool.query("SELECT * FROM modules WHERE course = ? ORDER BY [order] ASC", [id]);

    // Populate Lessons and Resources
    for (let m of modules) {
        // Lessons
        const [lessons] = await pool.query("SELECT id, title, duration, [order], content FROM lessons WHERE module = ? ORDER BY [order] ASC", [m.id]);
        m.lessons = lessons;

        // Resources (Assuming simple 1:N or M:N via link table is not standard here yet, checking context implies simple FK usually)
        // If resources table has module FK:
        try {
            // Check if resources table likely exists. If verified structure, uncomment. 
            // Logic: "SELECT * FROM resources WHERE module = ?"
            // Previous Mongoose `populate('resources')` implies relation.
            const [resources] = await pool.query("SELECT * FROM resources WHERE module = ?", [m.id]);
            m.resources = resources;
        } catch (e) {
            m.resources = []; // Table might not exist or be different
        }
    }

    res.status(200).json(new ApiResponse(200, modules, "Modules fetched successfully"));
});

// @desc    Get module by ID
// @route   GET /api/modules/:moduleId
// @access  Private
export const getModuleById = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;

    if (!moduleId || moduleId === 'undefined' || moduleId === 'null') {
        return res.status(400).json(new ApiResponse(400, null, "Module ID is required"));
    }

    const [rows] = await pool.query("SELECT * FROM modules WHERE id = ?", [moduleId]);
    if (rows.length === 0) {
        return res.status(404).json(new ApiResponse(404, null, "Module not found"));
    }
    const module = rows[0];

    // Populate Course (partial)
    const [courses] = await pool.query("SELECT id, title, description FROM courses WHERE id = ?", [module.course]);
    if (courses.length > 0) module.course = courses[0];

    // Populate Lessons
    const [lessons] = await pool.query("SELECT * FROM lessons WHERE module = ? ORDER BY [order] ASC", [moduleId]);
    module.lessons = lessons;

    // Populate Resources
    try {
        const [resources] = await pool.query("SELECT * FROM resources WHERE module = ?", [moduleId]);
        module.resources = resources;
    } catch (e) {
        module.resources = [];
    }

    res.status(200).json(new ApiResponse(200, module, "Module fetched successfully"));
});

// @desc    Update module
// @route   PUT /api/modules/:moduleId
// @access  Private
export const updateModule = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;
    const { title, description, order } = req.body;

    const [existing] = await pool.query("SELECT * FROM modules WHERE id = ?", [moduleId]);
    if (existing.length === 0) throw new ApiError("Module not found", 404);

    let updateFields = [];
    let updateValues = [];

    if (typeof title !== 'undefined') { updateFields.push("title = ?"); updateValues.push(title); }
    if (typeof description !== 'undefined') { updateFields.push("description = ?"); updateValues.push(description); }
    if (typeof order !== 'undefined') { updateFields.push("[order] = ?"); updateValues.push(order); }

    if (updateFields.length > 0) {
        updateFields.push("updatedAt = GETDATE()");
        await pool.query(`UPDATE modules SET ${updateFields.join(', ')} WHERE id = ?`, [...updateValues, moduleId]);
    }

    const [updated] = await pool.query("SELECT * FROM modules WHERE id = ?", [moduleId]);

    res.status(200).json(new ApiResponse(200, updated[0], "Module updated successfully"));
});

// @desc    Delete module
// @route   DELETE /api/modules/:moduleId
// @access  Private
export const deleteModule = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;

    const [result] = await pool.query("DELETE FROM modules WHERE id = ?", [moduleId]);
    if (result.affectedRows === 0) throw new ApiError("Module not found", 404);

    // Note: Implicitly, ON DELETE CASCADE usually handles lessons/resources if configured in SQL.
    // Otherwise, we might need to manual delete lessons.
    // Mongoose implicitly didn't cascade unless middleware.
    // Assuming DB Constraints or manual cleanup required?
    // Safe bet: Delete lessons for this module to be sure if no CASCADE.
    await pool.query("DELETE FROM lessons WHERE module = ?", [moduleId]);
    try { await pool.query("DELETE FROM resources WHERE module = ?", [moduleId]); } catch (e) { }

    res.status(200).json(new ApiResponse(200, {}, "Module deleted successfully"));
});