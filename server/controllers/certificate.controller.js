import mongoose from "mongoose";

import Certificate from "../models/certificate.model.js";
import Course from "../models/course.model.js";
import User from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const issueCertificate = asyncHandler(async (req, res) => {
    const { courseId, studentId } = req.body;

    if(!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ApiError(400, "Invalid course or student ID");
    }

    const course = await Course.findById(courseId);
    if(!course) throw new ApiError(404, "Course not found");

    const student = await User.findById(studentId);
    if(!student) throw new ApiError(404, "Student not found");

    const existing = await Certificate.findOne({ user: studentId, course: courseId });
    if(existing) {
        throw new ApiError(400, "Certificate already issued for this student & course");
    }

    const certificate = await Certificate.create({
        user: studentId,
        course: courseId,
        issuedBy: req.user._id,
    });

    res.status(201)
        .json(new ApiResponse(201, certificate, "Certificate issued successfully"));
});

export const getCertificateById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if(!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid certificate ID");
    } 

    const certificate = await Certificate.findById(id)
        .populate("user", "fullName email")
        .populate("course", "title")
        .populate("issuedBy", "fullName email");

    if(!certificate) throw new ApiError(404, "Certificate not found");

    res.json(new ApiResponse(200, certificate, "Certificate fetched successfully"));
});

export const getStudentCertificates = asyncHandler(async (req, res) => {
    const studentId = req.user._id;

    const certificates = await Certificate.find({ user: studentId })
        .populate("course", "title")
        .sort({ issuedAt: -1 });

    res.json(new ApiResponse(200, certificates, "Certificate fetched successfully"));
});

export const getCourseCertificates = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError(400, "Invalid course ID");
    }

    const certificates = await Certificate.find({ course: courseId })
        .populate("user", "fullName email")
        .populate("issuedBy", "fullName email")
        .sort({ issuedAt: -1 });

    res.json(new ApiResponse(200, certificates, "Course certificates fetched successfully"));
});

export const revokeCertificate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if(!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid certificate ID");
    }

    const certificate = await Certificate.findById(id);
    if(!certificate) throw new ApiError(404, "Certificate not found");

    await certificate.deleteOne();

    res.json(new ApiResponse(200, null, "Certificate revoked successfully"));
});