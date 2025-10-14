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
    getMyBatches,
    getBatchAssessments,
    getBatchProgress,
    getBatchSubmissions,
    getBatchAttempts,
    getBatchCourseContent,
    getSoftDeletedBatches,
    restoreBatch,
    // Batch status management
    updateAllBatchStatuses,
    updateBatchStatus,
    cancelBatch,
    getMyBatchNotifications,
    getBatchStatusInfo,
    getBatchSchedulerStatus,
    restartBatchScheduler,
    // Batch cleanup management
    getBatchesScheduledForCleanup,
    triggerBatchCleanup,
    getBatchCleanupStatus,
    restartBatchCleanupScheduler,
    sendManualCleanupWarning
} from "../controllers/batch.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";
import checkAccountStatus from "../middlewares/accountStatus.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("ADMIN"), createBatch);
router.post("/assign-instructor", verifyJWT, authorizeRoles("ADMIN"), assignInstructor);
router.post('/remove-instructor', verifyJWT, authorizeRoles("ADMIN"), removeInstructor);
router.post("/add-student", verifyJWT, authorizeRoles("ADMIN"), addStudentToBatch);
router.post("/remove-student", verifyJWT, authorizeRoles("ADMIN"), removeStudentFromBatch);
// Specific routes first to avoid conflicts
router.get("/me/my-batch", verifyJWT, authorizeRoles("STUDENT", "INSTRUCTOR", "ADMIN", "SUPERADMIN"), checkAccountStatus(true), getMyBatch);
router.get("/me/my-batches", verifyJWT, authorizeRoles("STUDENT", "INSTRUCTOR", "ADMIN", "SUPERADMIN"), checkAccountStatus(true), getMyBatches);
router.get("/me/course-content", verifyJWT, authorizeRoles("STUDENT", "INSTRUCTOR", "ADMIN", "SUPERADMIN"), checkAccountStatus(false), getBatchCourseContent);
router.get("/me/assessments", verifyJWT, authorizeRoles("STUDENT"), checkAccountStatus(false), getBatchAssessments);

// Super admin specific routes - must come before /:id routes
router.get("/deleted/all", verifyJWT, authorizeRoles("SUPERADMIN"), getSoftDeletedBatches);
router.patch("/deleted/:id/restore", verifyJWT, authorizeRoles("SUPERADMIN"), restoreBatch);

// General routes
router.get("/", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR", "SUPERADMIN"), getAllBatches);
router.get("/:id", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getBatchById);
router.get("/:id/progress", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getBatchProgress);
router.get("/:id/submissions", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getBatchSubmissions);
router.get("/:id/attempts", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getBatchAttempts);
router.put("/:id", verifyJWT, authorizeRoles("ADMIN"), updateBatch);
router.delete("/:id", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), deleteBatch);

// ==================== BATCH STATUS MANAGEMENT ROUTES ====================

// Batch status update routes (Admin/SuperAdmin)
router.post("/status/update-all", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), updateAllBatchStatuses);
router.patch("/status/:id/update", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), updateBatchStatus);
router.post("/:id/cancel", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), cancelBatch);

// Batch status information routes
router.get("/status/:id/info", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR", "SUPERADMIN"), getBatchStatusInfo);

// Batch notification routes
router.get("/notifications/my-batch", verifyJWT, authorizeRoles("STUDENT", "INSTRUCTOR"), checkAccountStatus(true), getMyBatchNotifications);
router.get("/notifications/:batchId", verifyJWT, authorizeRoles("STUDENT", "INSTRUCTOR"), checkAccountStatus(true), getMyBatchNotifications);

// Batch scheduler management (SuperAdmin only)
router.get("/scheduler/status", verifyJWT, authorizeRoles("SUPERADMIN"), getBatchSchedulerStatus);
router.post("/scheduler/restart", verifyJWT, authorizeRoles("SUPERADMIN"), restartBatchScheduler);

// ==================== BATCH CLEANUP MANAGEMENT ROUTES ====================

// Batch cleanup information routes (Admin)
router.get("/cleanup/scheduled", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), getBatchesScheduledForCleanup);
router.get("/cleanup/status", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), getBatchCleanupStatus);

// Batch cleanup control routes (SuperAdmin only)
router.post("/cleanup/trigger", verifyJWT, authorizeRoles("SUPERADMIN"), triggerBatchCleanup);
router.post("/cleanup/scheduler/restart", verifyJWT, authorizeRoles("SUPERADMIN"), restartBatchCleanupScheduler);
router.post("/cleanup/warnings/send", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), sendManualCleanupWarning);

export default router;
