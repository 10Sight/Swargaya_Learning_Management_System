import { Router } from "express";
import { 
    createSubmission, 
    resubmitAssignment, 
    getSubmissionByAssignment, 
    getMySubmissions, 
    gradeSubmission,
    getStudentSubmissions 
} from "../controllers/submission.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("STUDENT"), createSubmission);
router.patch("/resubmit", verifyJWT, authorizeRoles("STUDENT"), resubmitAssignment);
router.get("/assignment/:assignmentId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), getSubmissionByAssignment);
router.get("/my", verifyJWT, authorizeRoles("STUDENT"), getMySubmissions);
router.get("/student/:studentId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), getStudentSubmissions);
router.patch("/grade/:submissionId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), gradeSubmission);

export default router;
