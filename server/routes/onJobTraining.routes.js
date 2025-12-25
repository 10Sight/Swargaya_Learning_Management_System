import express from "express";
import {
    getOnJobTraining,
    saveOnJobTraining,
} from "../controllers/onJobTraining.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = express.Router();

// Routes
router.route("/:studentId")
    .get(verifyJWT, getOnJobTraining)
    .post(verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN", "INSTRUCTOR"), saveOnJobTraining);

export default router;
