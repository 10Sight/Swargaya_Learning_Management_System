import { Router } from "express";
import { 
    createBatch, 
    assignInstructor, 
    addStudentToBatch, 
    removeStudentFromBatch, 
    getAllBatches, 
    getBatchById, 
    updateBatch, 
    deleteBatch, 
    removeInstructor,
    getMyBatch,
    getBatchAssessments,
    getBatchProgress,
    getBatchSubmissions,
    getBatchAttempts,
    getBatchCourseContent
} from "../controllers/batch.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("ADMIN"), createBatch);
router.post("/assign-instructor", verifyJWT, authorizeRoles("ADMIN"), assignInstructor);
router.post('/remove-instructor', verifyJWT, authorizeRoles("ADMIN"), removeInstructor);
router.post("/add-student", verifyJWT, authorizeRoles("ADMIN"), addStudentToBatch);
router.post("/remove-student", verifyJWT, authorizeRoles("ADMIN"), removeStudentFromBatch);
// Specific routes first to avoid conflicts
router.get("/me/my-batch", verifyJWT, authorizeRoles("STUDENT", "INSTRUCTOR", "ADMIN", "SUPERADMIN"), getMyBatch);
router.get("/me/course-content", verifyJWT, authorizeRoles("STUDENT", "INSTRUCTOR", "ADMIN", "SUPERADMIN"), getBatchCourseContent);
router.get("/me/assessments", verifyJWT, authorizeRoles("STUDENT"), getBatchAssessments);

// General routes
router.get("/", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getAllBatches);
router.get("/:id", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getBatchById);
router.get("/:id/progress", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getBatchProgress);
router.get("/:id/submissions", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getBatchSubmissions);
router.get("/:id/attempts", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getBatchAttempts);
router.put("/:id", verifyJWT, authorizeRoles("ADMIN"), updateBatch);
router.delete("/:id", verifyJWT, authorizeRoles("ADMIN"), deleteBatch);

export default router;
