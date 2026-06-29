import fs from "fs";
import path from "path";
import ENV from "../configs/env.config.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// Upload single file
export const uploadSingleFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError("No file uploaded", 400);
  }

  try {
    const publicUrl = `${ENV.BACKEND_URL}/uploads/${req.file.filename}`;

    return res
      .status(200)
      .json(
        new ApiResponse(200, {
          url: publicUrl,
          public_id: req.file.filename,
        }, "File uploaded successfully")
      );
  } catch (err) {
    try { if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (_) { }
    throw new ApiError(err?.message || "Failed to store file", 500);
  }
});

// Upload multiple files
export const uploadMultipleFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError("No files uploaded", 400);
  }

  const results = [];
  const errors = [];

  // Parallel uploads could be faster but serial is safer for resource limits
  for (const file of req.files) {
    try {
      const publicUrl = `${ENV.BACKEND_URL}/uploads/${file.filename}`;

      results.push({
        url: publicUrl,
        public_id: file.filename,
        originalName: file.originalname
      });
    } catch (err) {
      try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch (_) { }
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
