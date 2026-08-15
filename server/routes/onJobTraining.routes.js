import express from "express";
import {
    createOnJobTraining,
    getStudentOnJobTrainings,
    getOnJobTrainingById,
    updateOnJobTraining,
    getAllOnJobTrainings,
    deleteOnJobTraining
} from "../controllers/onJobTraining.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = express.Router();

// Routes
router.get("/", verifyJWT, authorizeRoles("SUPERADMIN", "ADMIN", "INSTRUCTOR"), getAllOnJobTrainings);
router.post("/create", verifyJWT, authorizeRoles("SUPERADMIN", "ADMIN", "INSTRUCTOR"), createOnJobTraining);
router.get("/student/:studentId", verifyJWT, getStudentOnJobTrainings);
router.get("/:id", verifyJWT, getOnJobTrainingById);
router.patch("/:id", verifyJWT, authorizeRoles("SUPERADMIN", "ADMIN", "INSTRUCTOR"), updateOnJobTraining);
router.delete("/:id", verifyJWT, authorizeRoles("SUPERADMIN", "ADMIN", "INSTRUCTOR"), deleteOnJobTraining);

export default router;
