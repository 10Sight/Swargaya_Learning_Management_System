import { Router } from "express";
import { 
    createCourse, 
    getCourses, 
    getCourseById, 
    updatedCourse, 
    deleteCourse, 
    togglePublishCourse,
    getCourseAnalytics,
    getCourseStudents,
    getSoftDeletedCourses,
    restoreCourse
} from "../controllers/course.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), createCourse);

// Super admin specific routes - must come before /:id routes
router.get("/deleted/all", verifyJWT, authorizeRoles("SUPERADMIN"), getSoftDeletedCourses);
router.patch("/deleted/:id/restore", verifyJWT, authorizeRoles("SUPERADMIN"), restoreCourse);

router.get("/", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT", "SUPERADMIN"), getCourses);
router.get("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getCourseById);
router.get("/:id/analytics", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), getCourseAnalytics);
router.get("/:id/students", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), getCourseStudents);
router.put("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), updatedCourse);
router.delete("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "SUPERADMIN"), deleteCourse);
router.patch("/:id/toggle-publish", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), togglePublishCourse);

export default router;
