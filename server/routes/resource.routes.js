import express from "express";
import { 
    createResource, 
    getResourcesByModule, 
    deleteResource, 
    updateResource 
} from "../controllers/resource.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Apply JWT verification to all routes
router.use(verifyJWT);

// Create resource with file upload
router.post("/", upload.single('file'), createResource);

// Get resources by module - Use specific route
router.get("/module/:moduleId", getResourcesByModule);

// Update resource with file upload
router.put("/:resourceId", upload.single('file'), updateResource);

// Delete resource
router.delete("/:resourceId", deleteResource);

export default router;
