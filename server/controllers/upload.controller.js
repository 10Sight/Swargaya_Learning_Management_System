import fs from "fs";
import path from "path";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

// Upload single file
export const uploadSingleFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError("No file uploaded", 400);
  }

  try {
    const uploadResult = await uploadToCloudinary(req.file.path, 'general-uploads');
    if (!uploadResult.success) {
      throw new ApiError(`Cloudinary upload failed: ${uploadResult.error}`, 500);
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, {
          url: uploadResult.url,
          public_id: uploadResult.public_id,
          format: uploadResult.format,
          size: uploadResult.size,
        }, "File uploaded successfully")
      );
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) { }
    }
    throw new ApiError(err?.message || "Failed to upload file to Cloudinary", err?.statusCode || 500);
  }
});

// Upload multiple files
export const uploadMultipleFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError("No files uploaded", 400);
  }

  const results = [];
  const errors = [];

  for (const file of req.files) {
    try {
      const uploadResult = await uploadToCloudinary(file.path, 'general-uploads');
      if (uploadResult.success) {
        results.push({
          url: uploadResult.url,
          public_id: uploadResult.public_id,
          originalName: file.originalname,
          format: uploadResult.format,
          size: uploadResult.size
        });
      } else {
        errors.push({ file: file.originalname, error: uploadResult.error });
      }
    } catch (err) {
      if (fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (_) { }
      }
      errors.push({ file: file.originalname, error: err.message });
    }
  }

  if (results.length === 0 && errors.length > 0) {
    throw new ApiError(`All uploads failed. Errors: ${errors.map(e => e.error).join(', ')}`, 500);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, { uploaded: results, errors }, "Files processed")
    );
});
