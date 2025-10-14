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
import checkAccountStatus from "../middlewares/accountStatus.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), createQuiz);
router.get("/", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), checkAccountStatus(false), getAllQuizzes);
router.get("/accessible/:courseId/:moduleId", verifyJWT, authorizeRoles("STUDENT"), checkAccountStatus(false), getAccessibleQuizzes);
router.get("/course/:courseId", verifyJWT, authorizeRoles("STUDENT"), checkAccountStatus(false), getCourseQuizzes);
// New scoped endpoints
router.get("/by-course/:courseId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), checkAccountStatus(false), getQuizzesByCourse);
router.get("/by-module/:moduleId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), checkAccountStatus(false), getQuizzesByModule);
router.get("/by-lesson/:lessonId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), checkAccountStatus(false), getQuizzesByLesson);
router.get("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), checkAccountStatus(false), getQuizById);
router.put("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), updateQuiz);
router.delete("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), deleteQuiz);

export default router;
