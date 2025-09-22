import { Router } from "express";
import { 
    attemptQuiz, 
    getMyAttempts, 
    getAttemptsQuiz, 
    getAttemptById, 
    deleteAttempt 
} from "../controllers/attemptedQuiz.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("STUDENT"), attemptQuiz);
router.get("/my", verifyJWT, authorizeRoles("STUDENT"), getMyAttempts);
router.get("/quiz/:quizId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), getAttemptsQuiz);
router.get("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getAttemptById);
router.delete("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), deleteAttempt);

export default router;
