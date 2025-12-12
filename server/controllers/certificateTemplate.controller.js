import mongoose from "mongoose";

import CertificateTemplate from "../models/certificateTemplate.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Create a new certificate template (Admin only)
export const createCertificateTemplate = asyncHandler(async (req, res) => {
    const { name, description, template, styles, placeholders, isDefault } = req.body;

    if (!name || !template) {
        throw new ApiError("Name and template are required", 400);
    }

    // Validate placeholders structure
    if (placeholders && !Array.isArray(placeholders)) {
        throw new ApiError("Placeholders must be an array", 400);
    }

    const templateData = {
        name,
        description,
        template,
        styles: styles || "",
        placeholders: placeholders || [
            { key: "studentName", description: "Student's full name", required: true },
            { key: "courseName", description: "Course title", required: true },
            { key: "departmentName", description: "Department name", required: true },
            { key: "instructorName", description: "Instructor's full name", required: true },
            { key: "level", description: "Student's completion level", required: true },
            { key: "issueDate", description: "Certificate issue date", required: true },
            { key: "grade", description: "Grade or score", required: false }
        ],
        isDefault: isDefault || false,
        createdBy: req.user._id,
        updatedBy: req.user._id,
    };

    const certificateTemplate = await CertificateTemplate.create(templateData);

    res.status(201).json(
        new ApiResponse(201, certificateTemplate, "Certificate template created successfully")
    );
});

// Get all certificate templates (Admin only)
export const getCertificateTemplates = asyncHandler(async (req, res) => {
    const templates = await CertificateTemplate.find({ isActive: true })
        .populate("createdBy", "fullName email")
        .populate("updatedBy", "fullName email")
        .sort({ isDefault: -1, createdAt: -1 });

    res.json(new ApiResponse(200, templates, "Certificate templates fetched successfully"));
});

// Get certificate template by ID
export const getCertificateTemplateById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError("Invalid template ID", 400);
    }

    const template = await CertificateTemplate.findById(id)
        .populate("createdBy", "fullName email")
        .populate("updatedBy", "fullName email");

    if (!template || !template.isActive) {
        throw new ApiError("Certificate template not found", 404);
    }

    res.json(new ApiResponse(200, template, "Certificate template fetched successfully"));
});

// Get default certificate template
export const getDefaultCertificateTemplate = asyncHandler(async (req, res) => {
    let template = await CertificateTemplate.findOne({ isDefault: true, isActive: true })
        .populate("createdBy", "fullName email")
        .populate("updatedBy", "fullName email");

    if (!template) {
        // If no default template, get the first available template
        template = await CertificateTemplate.findOne({ isActive: true })
            .populate("createdBy", "fullName email")
            .populate("updatedBy", "fullName email")
            .sort({ createdAt: 1 });
    }

    if (!template) {
        throw new ApiError("No certificate template available", 404);
    }

    res.json(new ApiResponse(200, template, "Default certificate template fetched successfully"));
});

// Update certificate template (Admin only)
export const updateCertificateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, template, styles, placeholders, isDefault, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError("Invalid template ID", 400);
    }

    const existingTemplate = await CertificateTemplate.findById(id);
    if (!existingTemplate) {
        throw new ApiError("Certificate template not found", 404);
    }

    const updateData = {
        updatedBy: req.user._id,
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (template !== undefined) updateData.template = template;
    if (styles !== undefined) updateData.styles = styles;
    if (placeholders !== undefined) updateData.placeholders = placeholders;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedTemplate = await CertificateTemplate.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    )
        .populate("createdBy", "fullName email")
        .populate("updatedBy", "fullName email");

    res.json(new ApiResponse(200, updatedTemplate, "Certificate template updated successfully"));
});

// Delete certificate template (Admin only) - Soft delete
export const deleteCertificateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError("Invalid template ID", 400);
    }

    const template = await CertificateTemplate.findById(id);
    if (!template) {
        throw new ApiError("Certificate template not found", 404);
    }

    if (template.isDefault) {
        throw new ApiError("Cannot delete the default certificate template", 400);
    }

    // Soft delete by setting isActive to false
    template.isActive = false;
    template.updatedBy = req.user._id;
    await template.save();

    res.json(new ApiResponse(200, null, "Certificate template deleted successfully"));
});

// Set template as default (Admin only)
export const setDefaultCertificateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError("Invalid template ID", 400);
    }

    const template = await CertificateTemplate.findById(id);
    if (!template || !template.isActive) {
        throw new ApiError("Certificate template not found", 404);
    }

    // Remove default from all other templates
    await CertificateTemplate.updateMany(
        { _id: { $ne: id } },
        { $set: { isDefault: false } }
    );

    // Set this template as default
    template.isDefault = true;
    template.updatedBy = req.user._id;
    await template.save();

    const updatedTemplate = await CertificateTemplate.findById(id)
        .populate("createdBy", "fullName email")
        .populate("updatedBy", "fullName email");

    res.json(new ApiResponse(200, updatedTemplate, "Default certificate template updated successfully"));
});
