import { Router } from "express";
import { 
    createAssignment, 
    getAllAssignments, 
    getAssigmentById, 
    updatedAssignment, 
    deleteAssignment,
    getAccessibleAssignments,
    getCourseAssignments,
    getAssignmentsByCourse,
    getAssignmentsByModule,
    getAssignmentsByLesson
} from "../controllers/assignment.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), createAssignment);
router.get("/", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getAllAssignments);
router.get("/accessible/:courseId/:moduleId", verifyJWT, authorizeRoles("STUDENT"), getAccessibleAssignments);
router.get("/course/:courseId", verifyJWT, authorizeRoles("STUDENT"), getCourseAssignments);
// New scoped endpoints
router.get("/by-course/:courseId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getAssignmentsByCourse);
router.get("/by-module/:moduleId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getAssignmentsByModule);
router.get("/by-lesson/:lessonId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getAssignmentsByLesson);
router.get("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getAssigmentById);
router.put("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), updatedAssignment);
router.delete("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), deleteAssignment);

export default router;
