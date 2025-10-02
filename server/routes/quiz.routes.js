import { Router } from "express";
import { 
    createQuiz, 
    getAllQuizzes, 
    getQuizById, 
    updateQuiz, 
    deleteQuiz,
    getAccessibleQuizzes,
    getCourseQuizzes,
    getQuizzesByCourse,
    getQuizzesByModule,
    getQuizzesByLesson
} from "../controllers/quiz.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), createQuiz);
router.get("/", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getAllQuizzes);
router.get("/accessible/:courseId/:moduleId", verifyJWT, authorizeRoles("STUDENT"), getAccessibleQuizzes);
router.get("/course/:courseId", verifyJWT, authorizeRoles("STUDENT"), getCourseQuizzes);
// New scoped endpoints
router.get("/by-course/:courseId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getQuizzesByCourse);
router.get("/by-module/:moduleId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getQuizzesByModule);
router.get("/by-lesson/:lessonId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getQuizzesByLesson);
router.get("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getQuizById);
router.put("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), updateQuiz);
router.delete("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), deleteQuiz);

export default router;
