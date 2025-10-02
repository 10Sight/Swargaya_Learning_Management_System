import express from "express";
import { 
    createResource, 
    getResourcesByModule,
    getResourcesByCourse,
    getResourcesByLesson,
    deleteResource, 
    updateResource 
} from "../controllers/resource.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Apply JWT verification to all routes
router.use(verifyJWT);

// Get resources by different scopes
router.get("/course/:courseId", getResourcesByCourse);
router.get("/module/:moduleId", getResourcesByModule);
router.get("/lesson/:lessonId", getResourcesByLesson);

// Create resource with file upload (supports course, module, and lesson scopes)
router.post("/", upload.single('file'), createResource);

// Update resource with file upload
router.put("/:resourceId", upload.single('file'), updateResource);

// Delete resource
router.delete("/:resourceId", deleteResource);

export default router;
