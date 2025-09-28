import mongoose from "mongoose";
import Resource from "../models/resource.model.js";
import Module from "../models/module.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";
import fs from 'fs';
import path from 'path';

export const createResource = asyncHandler(async (req, res) => {
    const { moduleId, title, type, description, url } = req.body;
    const file = req.file;

    console.log("Received data:", { moduleId, title, type, description, url });
    console.log("File:", file ? "Present" : "Not present");

    if (!moduleId) {
        throw new ApiError("Module ID is required", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
        throw new ApiError("Invalid module ID format", 400);
    }

    // Check if module exists
    const module = await Module.findById(moduleId);
    if (!module) {
        throw new ApiError("Module not found", 404);
    }

    // Validate required fields
    if (!title || !type) {
        throw new ApiError("Title and type are required", 400);
    }

    // Check if file or URL is provided
    if (!file && !url) {
        throw new ApiError("Either file or URL must be provided", 400);
    }

    let resourceData = {
        moduleId,
        title,
        type,
        description: description || "",
        createdBy: req.user._id
    };

    // Handle file upload
    if (file) {
        try {
            // Upload to Cloudinary
            const uploadResult = await uploadToCloudinary(file.path, 'learning-management/resources');
            
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

    // Update module with new resource
    await Module.findByIdAndUpdate(moduleId, {
        $push: { resources: resource._id }
    });

    res.status(201).json(
        new ApiResponse(201, resource, "Resource created successfully")
    );
});

export const getResourcesByModule = asyncHandler(async (req, res) => {
    const { moduleId } = req.params;

    console.log("Getting resources for module:", moduleId);

    if (!moduleId) {
        throw new ApiError("Module ID is required", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
        throw new ApiError("Invalid module ID format", 400);
    }

    const resources = await Resource.find({ moduleId })
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });

    res.json(
        new ApiResponse(200, resources, "Resources retrieved successfully")
    );
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
                console.error('Failed to delete from Cloudinary:', deleteResult.error);
            }
        } catch (error) {
            console.error('Cloudinary delete error:', error);
        }
    }

    // Remove resource from module
    await Module.findByIdAndUpdate(resource.moduleId, {
        $pull: { resources: resourceId }
    });

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
