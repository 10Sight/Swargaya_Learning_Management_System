import {Router} from "express";
import {
  createLesson,
  getLessonsByModule,
  getLessonById,
  updateLesson,
  deleteLesson,
} from "../controllers/lesson.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

// /api/modules/:moduleId/lessons
router.post("/modules/:moduleId/lessons",verifyJWT, createLesson);
router.get("/modules/:moduleId/lessons",verifyJWT, getLessonsByModule);

// /api/modules/:moduleId/lessons/:lessonId
router.get("/modules/:moduleId/lessons/:lessonId",verifyJWT, getLessonById);
router.put("/modules/:moduleId/lessons/:lessonId",verifyJWT, updateLesson);
router.delete("/modules/:moduleId/lessons/:lessonId",verifyJWT, deleteLesson);

export default router;
