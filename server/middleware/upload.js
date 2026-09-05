import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { isAllowedUpload } from '../config/resourceTypes.config.js';

// Ensure upload directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Stream-level MIME + extension verification against the resource type matrix.
// This only confirms the file is *some* supported type; resource.controller.js
// separately cross-checks it against the declared `type` field.
const fileFilter = (req, file, cb) => {
  if (isAllowedUpload(file.originalname, file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error('Invalid file type. Only images, videos, PDFs, text files, and Office documents (Word, Excel, PowerPoint) are allowed.'));
};

// Configure multer
const upload = multer({
  storage: storage,
  // fileSize limit removed for local storage migration
  fileFilter: fileFilter
});

export default upload; 