import { Router } from "express";
import { 
    initializeProgress, 
    updateProgress, 
    upgradeLevel, 
    getMyProgress, 
    getCourseProgress,
    getOrInitializeProgress,
    markModuleComplete,
    markLessonComplete,
    validateModuleAccess,
    getStudentProgress,
    getMyAllProgress,
    setStudentLevel,
    getCourseCompletionReport,
    getTimelineViolations,
    checkModuleAccessWithTimeline,
    updateCurrentAccessibleModule
} from "../controllers/progress.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";
import checkAccountStatus from "../middlewares/accountStatus.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("STUDENT"), checkAccountStatus(false), initializeProgress);
router.patch("/", verifyJWT, authorizeRoles("STUDENT"), checkAccountStatus(false), updateProgress);
router.patch("/lesson-complete", verifyJWT, authorizeRoles("STUDENT"), checkAccountStatus(false), markLessonComplete);
router.patch("/module-complete", verifyJWT, authorizeRoles("STUDENT"), checkAccountStatus(false), markModuleComplete);
router.patch("/upgrade-level", verifyJWT, authorizeRoles("STUDENT"), checkAccountStatus(false), upgradeLevel);
router.patch("/admin/set-level", verifyJWT, authorizeRoles("ADMIN"), setStudentLevel);
router.get("/my/:courseId", verifyJWT, authorizeRoles("STUDENT"), checkAccountStatus(false), getMyProgress);
router.get("/my", verifyJWT, authorizeRoles("STUDENT"), checkAccountStatus(true), getMyAllProgress);
router.get("/init/:courseId", verifyJWT, authorizeRoles("STUDENT"), checkAccountStatus(false), getOrInitializeProgress);
router.get("/validate-access/:courseId/:moduleId", verifyJWT, authorizeRoles("STUDENT"), checkAccountStatus(false), validateModuleAccess);
router.get("/course/:courseId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), getCourseProgress);
router.get("/report/:courseId", verifyJWT, authorizeRoles("STUDENT"), checkAccountStatus(false), getCourseCompletionReport);
router.get("/student/:studentId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), getStudentProgress);

// Timeline-related routes
router.get("/timeline-violations/:studentId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getTimelineViolations);
router.get("/timeline-access/:courseId/:moduleId", verifyJWT, authorizeRoles("STUDENT"), checkAccountStatus(false), checkModuleAccessWithTimeline);
router.patch("/admin/update-accessible-module", verifyJWT, authorizeRoles("ADMIN"), updateCurrentAccessibleModule);

export default router;
