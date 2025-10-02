import { Router } from "express";
import { createModule, getModulesByCourse, getModuleById, updateModule, deleteModule } from "../controllers/module.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("ADMIN"), createModule);
router.get("/course/:courseId", verifyJWT, getModulesByCourse);
router.get("/:moduleId", verifyJWT, getModuleById);
router.put("/:moduleId", verifyJWT, authorizeRoles("ADMIN"), updateModule);
router.delete("/:moduleId", verifyJWT, authorizeRoles("ADMIN"), deleteModule);

export default router;