import mongoose from "mongoose";
import Resource from "../models/resource.model.js";
import Module from "../models/module.model.js";
import Course from "../models/course.model.js";
import Lesson from "../models/lesson.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";
import fs from 'fs';
import path from 'path';

export const createResource = asyncHandler(async (req, res) => {
    const { courseId, moduleId, lessonId, scope, title, type, description, url } = req.body;
    const file = req.file;


    // Validate required fields
    if (!title || !type || !scope) {
        throw new ApiError("Title, type, and scope are required", 400);
    }

    // Validate scope
    if (!['course', 'module', 'lesson'].includes(scope)) {
        throw new ApiError("Scope must be 'course', 'module', or 'lesson'", 400);
    }

    // Validate and check existence of parent entity
    let parentEntity;
    let parentId;

    if (scope === 'course') {
        if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
            throw new ApiError("Valid Course ID is required for course-scoped resources", 400);
        }
        parentEntity = await Course.findById(courseId);
        if (!parentEntity) {
            throw new ApiError("Course not found", 404);
        }
        parentId = courseId;
    } else if (scope === 'module') {
        if (!moduleId || !mongoose.Types.ObjectId.isValid(moduleId)) {
            throw new ApiError("Valid Module ID is required for module-scoped resources", 400);
        }
        parentEntity = await Module.findById(moduleId);
        if (!parentEntity) {
            throw new ApiError("Module not found", 404);
        }
        parentId = moduleId;
    } else if (scope === 'lesson') {
        if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
            throw new ApiError("Valid Lesson ID is required for lesson-scoped resources", 400);
        }
        parentEntity = await Lesson.findById(lessonId);
        if (!parentEntity) {
            throw new ApiError("Lesson not found", 404);
        }
        parentId = lessonId;
    }

    // Check if file or URL is provided
    if (!file && !url) {
        throw new ApiError("Either file or URL must be provided", 400);
    }

    let resourceData = {
        scope,
        title,
        type,
        description: description || "",
        createdBy: req.user._id
    };

    // Set the appropriate ID based on scope
    if (scope === 'course') {
        resourceData.courseId = parentId;
    } else if (scope === 'module') {
        resourceData.moduleId = parentId;
    } else if (scope === 'lesson') {
        resourceData.lessonId = parentId;
    }

    // Handle file upload
    if (file) {
        try {
            // Upload to Cloudinary
            const uploadResult = await uploadToCloudinary(file.path, `learning-management/resources/${scope}s`);
            
            if (uploadResult.success) {
                resourceData.url = uploadResult.url;
                resourceData.publicId = uploadResult.public_id;
                resourceData.fileSize = uploadResult.size;
                resourceData.format = uploadResult.format;
                resourceData.fileName = file.originalname;
            } else {
                throw new ApiError(`File upload failed: ${uploadResult.error}`, 500);
            }
        } catch (error) {
            // Clean up local file if Cloudinary upload fails
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
            throw new ApiError(`File upload failed: ${error.message}`, 500);
        }
    } else if (url) {
        resourceData.url = url;
    }

    // Create resource
    const resource = await Resource.create(resourceData);

    // Update parent entity with new resource
    if (scope === 'course') {
        await Course.findByIdAndUpdate(parentId, {
            $push: { resources: resource._id }
        });
    } else if (scope === 'module') {
        await Module.findByIdAndUpdate(parentId, {
            $push: { resources: resource._id }
        });
    } else if (scope === 'lesson') {
        await Lesson.findByIdAndUpdate(parentId, {
            $push: { resources: resource._id }
        });
    }

    res.status(201).json(
        new ApiResponse(201, resource, "Resource created successfully")
    );
});

export const getResourcesByModule = asyncHandler(async (req, res) => {
    const rawModuleId = req.params?.moduleId ?? req.body?.moduleId;

    if (!rawModuleId || rawModuleId === 'undefined' || rawModuleId === 'null') {
        return res.status(400).json(new ApiResponse(400, [], "Module ID is required"));
    }

    let moduleId = rawModuleId;
    if (!mongoose.Types.ObjectId.isValid(rawModuleId)) {
        // Resolve by slug
        const found = await Module.findOne({ slug: String(rawModuleId).toLowerCase() }).select('_id');
        if (!found) {
            return res.status(400).json(new ApiResponse(400, [], "Invalid module identifier"));
        }
        moduleId = found._id;
    }

    try {
        const resources = await Resource.find({ moduleId, scope: 'module' })
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        return res.json(
            new ApiResponse(200, resources, "Resources retrieved successfully")
        );
    } catch (err) {
        return res.status(500).json(new ApiResponse(500, [], "Error fetching resources"));
    }
});

export const getResourcesByCourse = asyncHandler(async (req, res) => {
    const rawCourseId = req.params?.courseId ?? req.body?.courseId;

    if (!rawCourseId || rawCourseId === 'undefined' || rawCourseId === 'null') {
        return res.status(400).json(new ApiResponse(400, [], "Course ID is required"));
    }

    let courseId = rawCourseId;
    if (!mongoose.Types.ObjectId.isValid(rawCourseId)) {
        // Resolve by slug
        const found = await Course.findOne({ slug: String(rawCourseId).toLowerCase() }).select('_id');
        if (!found) {
            return res.status(400).json(new ApiResponse(400, [], "Invalid course identifier"));
        }
        courseId = found._id;
    }

    try {
        const resources = await Resource.find({ courseId, scope: 'course' })
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        return res.json(
            new ApiResponse(200, resources, "Resources retrieved successfully")
        );
    } catch (err) {
        return res.status(500).json(new ApiResponse(500, [], "Error fetching resources"));
    }
});

export const getResourcesByLesson = asyncHandler(async (req, res) => {
    const rawLessonId = req.params?.lessonId ?? req.body?.lessonId;

    if (!rawLessonId || rawLessonId === 'undefined' || rawLessonId === 'null') {
        return res.status(400).json(new ApiResponse(400, [], "Lesson ID is required"));
    }

    let lessonId = rawLessonId;
    if (!mongoose.Types.ObjectId.isValid(rawLessonId)) {
        // Resolve by slug
        const found = await Lesson.findOne({ slug: String(rawLessonId).toLowerCase() }).select('_id');
        if (!found) {
            return res.status(400).json(new ApiResponse(400, [], "Invalid lesson identifier"));
        }
        lessonId = found._id;
    }

    try {
        const resources = await Resource.find({ lessonId, scope: 'lesson' })
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        return res.json(
            new ApiResponse(200, resources, "Resources retrieved successfully")
        );
    } catch (err) {
        return res.status(500).json(new ApiResponse(500, [], "Error fetching resources"));
    }
});

export const deleteResource = asyncHandler(async (req, res) => {
    const { resourceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        throw new ApiError("Invalid resource ID", 400);
    }

    const resource = await Resource.findById(resourceId);
    if (!resource) {
        throw new ApiError("Resource not found", 404);
    }

    // Delete from Cloudinary if it has a publicId
    if (resource.publicId) {
        try {
            const deleteResult = await deleteFromCloudinary(resource.publicId);
            if (!deleteResult.success) {
                // Failed to delete from Cloudinary
            }
        } catch (error) {
            // Cloudinary delete error
        }
    }

    // Remove resource from parent entity based on scope
    if (resource.scope === 'course' && resource.courseId) {
        await Course.findByIdAndUpdate(resource.courseId, {
            $pull: { resources: resourceId }
        });
    } else if (resource.scope === 'module' && resource.moduleId) {
        await Module.findByIdAndUpdate(resource.moduleId, {
            $pull: { resources: resourceId }
        });
    } else if (resource.scope === 'lesson' && resource.lessonId) {
        await Lesson.findByIdAndUpdate(resource.lessonId, {
            $pull: { resources: resourceId }
        });
    }

    // Delete resource from database
    await Resource.findByIdAndDelete(resourceId);

    res.json(
        new ApiResponse(200, null, "Resource deleted successfully")
    );
});

export const updateResource = asyncHandler(async (req, res) => {
    const { resourceId } = req.params;
    const { title, type, description, url } = req.body;
    const file = req.file;

    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        throw new ApiError("Invalid resource ID", 400);
    }

    const resource = await Resource.findById(resourceId);
    if (!resource) {
        throw new ApiError("Resource not found", 404);
    }

    const updateData = {
        title: title || resource.title,
        type: type || resource.type,
        description: description || resource.description,
    };

    // Handle file upload if new file is provided
    if (file) {
        try {
            // Delete old file from Cloudinary if it exists
            if (resource.publicId) {
                await deleteFromCloudinary(resource.publicId);
            }

            // Upload new file to Cloudinary
            const uploadResult = await uploadToCloudinary(file.path, 'learning-management/resources');
            
            if (uploadResult.success) {
                updateData.url = uploadResult.url;
                updateData.publicId = uploadResult.public_id;
                updateData.fileSize = uploadResult.size;
                updateData.format = uploadResult.format;
            } else {
                throw new ApiError(`File upload failed: ${uploadResult.error}`, 500);
            }
        } catch (error) {
            // Clean up local file if Cloudinary upload fails
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
            throw new ApiError(`File upload failed: ${error.message}`, 500);
        }
    } else if (url) {
        // Delete old file from Cloudinary if it exists
        if (resource.publicId) {
            await deleteFromCloudinary(resource.publicId);
        }
        updateData.url = url;
        updateData.publicId = null;
        updateData.fileSize = null;
        updateData.format = null;
    }

    const updatedResource = await Resource.findByIdAndUpdate(
        resourceId,
        updateData,
        { new: true }
    );

    res.json(
        new ApiResponse(200, updatedResource, "Resource updated successfully")
    );
});
