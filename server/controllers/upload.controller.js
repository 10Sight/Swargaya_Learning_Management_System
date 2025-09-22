import cloudinary from "../configs/cloudinary.config.js";
import fs from "fs";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// Upload single file
export const uploadSingleFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No file uploaded");
  }

  const result = await cloudinary.uploader.upload(req.file.path, {
    resource_type: "auto", // auto-detect image/pdf/video
    folder: "uploads",     // optional folder in Cloudinary
  });

  fs.unlinkSync(req.file.path); // delete local file after upload

  return res
    .status(200)
    .json(
      new ApiResponse(200, {
        url: result.secure_url,
        public_id: result.public_id,
      }, "File uploaded successfully")
    );
});

// Upload multiple files
export const uploadMultipleFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, "No files uploaded");
  }

  const results = [];

  for (const file of req.files) {
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: "auto",
      folder: "uploads",
    });

    fs.unlinkSync(file.path); 

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
});
