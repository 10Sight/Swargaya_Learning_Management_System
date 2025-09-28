import { Router } from "express";
import { 
    createQuiz, 
    getAllQuizzes, 
    getQuizById, 
    updateQuiz, 
    deleteQuiz,
    getAccessibleQuizzes
} from "../controllers/quiz.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), createQuiz);
router.get("/", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getAllQuizzes);
router.get("/accessible/:courseId/:moduleId", verifyJWT, authorizeRoles("STUDENT"), getAccessibleQuizzes);
router.get("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getQuizById);
router.put("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), updateQuiz);
router.delete("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), deleteQuiz);

export default router;
