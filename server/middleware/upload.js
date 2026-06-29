import multer from 'multer';
import path from 'path';
import fs from 'fs';

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

// File filter to check file types
const fileFilter = (req, file, cb) => {
  // Broaden allowed types to include MS Office and other documents
  const allowedExtensions = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|mp4|mov|avi|wmv|webm/;
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  
  // For mimetypes, we'll be more inclusive for application types (Office docs)
  const isDocument = file.mimetype.includes('application/vnd') || 
                     file.mimetype.includes('application/msword') ||
                     file.mimetype.includes('application/pdf') ||
                     file.mimetype.includes('text/plain');
                     
  const isImage = file.mimetype.startsWith('image/');
  const isVideo = file.mimetype.startsWith('video/');

  if (extname && (isDocument || isImage || isVideo)) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents (PDF, Word, Excel, PPT), and videos are allowed.'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  // fileSize limit removed for local storage migration
  fileFilter: fileFilter
});

export default upload; 