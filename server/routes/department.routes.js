import { Router } from "express";
import {
    createDepartment,
    assignInstructor,
    addStudentToDepartment,
    removeStudentFromDepartment,
    getAllDepartments,
    getAllDepartmentsProgress,
    getDepartmentById,
    updateDepartment,
    deleteDepartment,
    removeInstructor,
    getMyDepartment,
    getMyDepartments,
    getDepartmentAssessments,
    getDepartmentProgress,
    getDepartmentSubmissions,
    getDepartmentAttempts,
    getDepartmentCourseContent,
    getSoftDeletedDepartments,
    restoreDepartment,
    // Department status management
    updateAllDepartmentStatuses,
    updateDepartmentStatus,
    cancelDepartment,
    getMyDepartmentNotifications,
    getDepartmentStatusInfo,
    getDepartmentSchedulerStatus,
    restartDepartmentScheduler,
    // Department cleanup management
    getDepartmentsScheduledForCleanup,
    triggerDepartmentCleanup,
    getDepartmentCleanupStatus,
    restartDepartmentCleanupScheduler,
    sendManualCleanupWarning
} from "../controllers/department.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";
import checkAccountStatus from "../middlewares/accountStatus.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("ADMIN"), createDepartment);
router.post("/assign-instructor", verifyJWT, authorizeRoles("ADMIN"), assignInstructor);
router.post('/remove-instructor', verifyJWT, authorizeRoles("ADMIN"), removeInstructor);
router.post("/add-student", verifyJWT, authorizeRoles("ADMIN"), addStudentToDepartment);
router.post("/remove-student", verifyJWT, authorizeRoles("ADMIN"), removeStudentFromDepartment);
// Specific routes first to avoid conflicts
router.get("/me/my-department", verifyJWT, authorizeRoles("STUDENT", "INSTRUCTOR", "ADMIN", "SUPERADMIN"), checkAccountStatus(true), getMyDepartment);
router.get("/me/my-departments", verifyJWT, authorizeRoles("STUDENT", "INSTRUCTOR", "ADMIN", "SUPERADMIN"), checkAccountStatus(true), getMyDepartments);
router.get("/me/course-content", verifyJWT, authorizeRoles("STUDENT", "INSTRUCTOR", "ADMIN", "SUPERADMIN"), checkAccountStatus(false), getDepartmentCourseContent);
router.get("/me/assessments", verifyJWT, authorizeRoles("STUDENT"), checkAccountStatus(false), getDepartmentAssessments);

// Global Progress Route (Must be before /:id routes)
router.get("/progress/all", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR", "SUPERADMIN"), getAllDepartmentsProgress);

// Placeholder to skip, I need to read the route file first come before /:id routes
router.get("/deleted/all", verifyJWT, authorizeRoles("SUPERADMIN"), getSoftDeletedDepartments);
router.patch("/deleted/:id/restore", verifyJWT, authorizeRoles("SUPERADMIN"), restoreDepartment);

// General routes
// General routes
router.get("/", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR", "SUPERADMIN"), (req, res, next) => {
    console.log("[DEBUG] Hit getAllDepartments route handler");
    next();
}, getAllDepartments);
router.get("/:id", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getDepartmentById);
router.get("/:id/progress", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getDepartmentProgress);
router.get("/:id/submissions", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getDepartmentSubmissions);
router.get("/:id/attempts", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getDepartmentAttempts);
router.put("/:id", verifyJWT, authorizeRoles("ADMIN"), updateDepartment);
router.delete("/:id", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), deleteDepartment);

// ==================== DEPARTMENT STATUS MANAGEMENT ROUTES ====================

// Department status update routes (Admin/SuperAdmin)
router.post("/status/update-all", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), updateAllDepartmentStatuses);
router.patch("/status/:id/update", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), updateDepartmentStatus);
router.post("/:id/cancel", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), cancelDepartment);

// Department status information routes
router.get("/status/:id/info", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR", "SUPERADMIN"), getDepartmentStatusInfo);

// Department notification routes
router.get("/notifications/my-department", verifyJWT, authorizeRoles("STUDENT", "INSTRUCTOR"), checkAccountStatus(true), getMyDepartmentNotifications);
router.get("/notifications/:departmentId", verifyJWT, authorizeRoles("STUDENT", "INSTRUCTOR"), checkAccountStatus(true), getMyDepartmentNotifications);

// Department scheduler management (SuperAdmin only)
router.get("/scheduler/status", verifyJWT, authorizeRoles("SUPERADMIN"), getDepartmentSchedulerStatus);
router.post("/scheduler/restart", verifyJWT, authorizeRoles("SUPERADMIN"), restartDepartmentScheduler);

// ==================== DEPARTMENT CLEANUP MANAGEMENT ROUTES ====================

// Department cleanup information routes (Admin)
router.get("/cleanup/scheduled", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), getDepartmentsScheduledForCleanup);
router.get("/cleanup/status", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), getDepartmentCleanupStatus);

// Department cleanup control routes (SuperAdmin only)
router.post("/cleanup/trigger", verifyJWT, authorizeRoles("SUPERADMIN"), triggerDepartmentCleanup);
router.post("/cleanup/scheduler/restart", verifyJWT, authorizeRoles("SUPERADMIN"), restartDepartmentCleanupScheduler);
router.post("/cleanup/warnings/send", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), sendManualCleanupWarning);

export default router;
