import { Router } from "express";
import { 
    createBatch, 
    assignInstructor, 
    addStudentToBatch, 
    removeStudentFromBatch, 
    getAllBatches, 
    getBatchById, 
    updateBatch, 
    deleteBatch, 
    removeInstructor
} from "../controllers/batch.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("ADMIN"), createBatch);
router.post("/assign-instructor", verifyJWT, authorizeRoles("ADMIN"), assignInstructor);
router.post('/remove-instructor', verifyJWT, authorizeRoles("ADMIN"), removeInstructor);
router.post("/add-student", verifyJWT, authorizeRoles("ADMIN"), addStudentToBatch);
router.post("/remove-student", verifyJWT, authorizeRoles("ADMIN"), removeStudentFromBatch);
router.get("/", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getAllBatches);
router.get("/:id", verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR"), getBatchById);
router.put("/:id", verifyJWT, authorizeRoles("ADMIN"), updateBatch);
router.delete("/:id", verifyJWT, authorizeRoles("ADMIN"), deleteBatch);

export default router;
