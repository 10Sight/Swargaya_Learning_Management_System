import { uploadToCloudinary } from "../config/cloudinary.js";
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
    const result = await uploadToCloudinary(req.file.path, "uploads");

    if (!result.success) {
      throw new Error(result.error || "Upload failed");
    }

    // uploadToCloudinary typically handles unlink if we look at common implementations, 
    // but for safety in this controller refactor where we don't see the helper code:
    // We will assume helper MIGHT not unlink on success in all versions, 
    // but usually it does. 
    // However, looking at resource.controller pattern, we unlinked on catch.
    // Let's rely on helper or manual unlink? 
    // Best practice: Helper usually does it. If not, we can do it here. 
    // I'll check if file still exists before unlinking to be safe.
    try { if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (_) { }

    return res
      .status(200)
      .json(
        new ApiResponse(200, {
          url: result.url,
          public_id: result.public_id,
        }, "File uploaded successfully")
      );
  } catch (err) {
    try { if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (_) { }
    throw new ApiError(err?.message || "Failed to upload file", 500);
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
      const result = await uploadToCloudinary(file.path, "uploads");

      try { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); } catch (_) { }

      if (result.success) {
        results.push({
          url: result.url,
          public_id: result.public_id,
          originalName: file.originalname
        });
      } else {
        errors.push({ file: file.originalname, error: result.error });
      }
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
