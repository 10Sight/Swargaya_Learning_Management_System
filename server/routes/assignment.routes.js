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
import checkAccountStatus from "../middlewares/accountStatus.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), createAssignment);
router.get("/", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), checkAccountStatus(false), getAllAssignments);
router.get("/accessible/:courseId/:moduleId", verifyJWT, authorizeRoles("STUDENT"), checkAccountStatus(false), getAccessibleAssignments);
router.get("/course/:courseId", verifyJWT, authorizeRoles("STUDENT"), checkAccountStatus(false), getCourseAssignments);
// New scoped endpoints
router.get("/by-course/:courseId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), checkAccountStatus(false), getAssignmentsByCourse);
router.get("/by-module/:moduleId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), checkAccountStatus(false), getAssignmentsByModule);
router.get("/by-lesson/:lessonId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), checkAccountStatus(false), getAssignmentsByLesson);
router.get("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), checkAccountStatus(false), getAssigmentById);
router.put("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), updatedAssignment);
router.delete("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), deleteAssignment);

export default router;
