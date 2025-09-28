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
    getStudentProgress
} from "../controllers/progress.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("STUDENT"), initializeProgress);
router.patch("/", verifyJWT, authorizeRoles("STUDENT"), updateProgress);
router.patch("/lesson-complete", verifyJWT, authorizeRoles("STUDENT"), markLessonComplete);
router.patch("/module-complete", verifyJWT, authorizeRoles("STUDENT"), markModuleComplete);
router.patch("/upgrade-level", verifyJWT, authorizeRoles("STUDENT"), upgradeLevel);
router.get("/my/:courseId", verifyJWT, authorizeRoles("STUDENT"), getMyProgress);
router.get("/init/:courseId", verifyJWT, authorizeRoles("STUDENT"), getOrInitializeProgress);
router.get("/validate-access/:courseId/:moduleId", verifyJWT, authorizeRoles("STUDENT"), validateModuleAccess);
router.get("/course/:courseId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), getCourseProgress);
router.get("/student/:studentId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), getStudentProgress);

export default router;
