import { Router } from "express";
import { 
    createAssignment, 
    getAllAssignments, 
    getAssigmentById, 
    updatedAssignment, 
    deleteAssignment 
} from "../controllers/assignment.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), createAssignment);
router.get("/", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getAllAssignments);
router.get("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN", "STUDENT"), getAssigmentById);
router.put("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), updatedAssignment);
router.delete("/:id", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), deleteAssignment);

export default router;
