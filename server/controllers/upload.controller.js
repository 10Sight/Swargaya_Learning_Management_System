import cloudinary from "../configs/cloudinary.config.js";
import fs from "fs";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// Upload single file
export const uploadSingleFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError("No file uploaded", 400);
  }

  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto", // auto-detect image/pdf/video
      folder: "uploads",     // optional folder in Cloudinary
      use_filename: true,
      unique_filename: true,
    });

    try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch (_) {}

    return res
      .status(200)
      .json(
        new ApiResponse(200, {
          url: result.secure_url,
          public_id: result.public_id,
        }, "File uploaded successfully")
      );
  } catch (err) {
    try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch (_) {}
    throw new ApiError(err?.message || "Failed to upload file", 500);
  }
});

// Upload multiple files
export const uploadMultipleFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError("No files uploaded", 400);
  }

  const results = [];

  try {
    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: "auto",
        folder: "uploads",
        use_filename: true,
        unique_filename: true,
      });

      try { if (file?.path) fs.unlinkSync(file.path); } catch (_) {}

      results.push({
        url: result.secure_url,
        public_id: result.public_id,
      });
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, results, "Files uploaded successfully")
      );
  } catch (err) {
    // cleanup any remaining tmp files
    for (const file of req.files) {
      try { if (file?.path) fs.unlinkSync(file.path); } catch (_) {}
    }
    throw new ApiError(err?.message || "Failed to upload files", 500);
  }
});
