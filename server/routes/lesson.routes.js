import { Router } from "express";
import {
  createLesson,
  getLessonsByModule,
  getLessonById,
  updateLesson,
  deleteLesson,
} from "../controllers/lesson.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { authorizeRole } from "../middlewares/roleAuth.middleware.js";
import { SYSTEM_PERMISSIONS } from "../controllers/rolesPermissions.controller.js";

const router = Router();

// Apply JWT verification to all routes
router.use(verifyJWT);

// Lesson CRUD operations with permission-based authorization
// /api/modules/:moduleId/lessons
router.post("/modules/:moduleId/lessons", authorizeRole([SYSTEM_PERMISSIONS.LESSON_CREATE]), createLesson);
router.get("/modules/:moduleId/lessons", authorizeRole([SYSTEM_PERMISSIONS.LESSON_READ]), getLessonsByModule);

// /api/modules/:moduleId/lessons/:lessonId
router.get("/modules/:moduleId/lessons/:lessonId", authorizeRole([SYSTEM_PERMISSIONS.LESSON_READ]), getLessonById);
router.put("/modules/:moduleId/lessons/:lessonId", authorizeRole([SYSTEM_PERMISSIONS.LESSON_UPDATE]), updateLesson);
router.delete("/modules/:moduleId/lessons/:lessonId", authorizeRole([SYSTEM_PERMISSIONS.LESSON_DELETE]), deleteLesson);

export default router;
