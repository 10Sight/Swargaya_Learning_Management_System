import { Router } from "express";
import { 
    attemptQuiz, 
    getMyAttempts, 
    getAttemptsQuiz, 
    getAttemptById, 
    deleteAttempt,
    getStudentAttempts,
    startQuiz,
    submitQuiz,
    getQuizAttemptStatus,
    adminUpdateAttempt,
    requestExtraAttempt,
    listExtraAttemptRequests,
    approveExtraAttempt,
    rejectExtraAttempt
} from "../controllers/attemptedQuiz.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("STUDENT"), attemptQuiz);

// New quiz flow routes - put specific routes BEFORE generic ones
router.get("/start/:quizId", verifyJWT, authorizeRoles("STUDENT"), startQuiz);
router.post("/submit", verifyJWT, authorizeRoles("STUDENT"), submitQuiz);
router.get("/status/:quizId", verifyJWT, authorizeRoles("STUDENT"), getQuizAttemptStatus);

// Extra attempt requests
router.post("/extra-requests", verifyJWT, authorizeRoles("STUDENT"), requestExtraAttempt);
router.get("/extra-requests", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), listExtraAttemptRequests);
router.patch("/extra-requests/:id/approve", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), approveExtraAttempt);
router.patch("/extra-requests/:id/reject", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), rejectExtraAttempt);

// Other specific routes
router.get("/my", verifyJWT, authorizeRoles("STUDENT"), getMyAttempts);
router.get("/quiz/:quizId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), getAttemptsQuiz);
router.get("/student/:studentId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), getStudentAttempts);

// Generic routes - put these LAST to avoid conflicts
router.get("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getAttemptById);
router.delete("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), deleteAttempt);
router.patch("/:id/admin-update", verifyJWT, authorizeRoles("ADMIN"), adminUpdateAttempt);

export default router;
