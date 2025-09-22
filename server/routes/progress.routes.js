import { Router } from "express";
import { 
    initializeProgress, 
    updateProgress, 
    upgradeLevel, 
    getMyProgress, 
    getCourseProgress 
} from "../controllers/progress.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

router.post("/", verifyJWT, authorizeRoles("STUDENT"), initializeProgress);
router.patch("/", verifyJWT, authorizeRoles("STUDENT"), updateProgress);
router.patch("/upgrade-level", verifyJWT, authorizeRoles("STUDENT"), upgradeLevel);
router.get("/my/:courseId", verifyJWT, authorizeRoles("STUDENT"), getMyProgress);
router.get("/course/:courseId", verifyJWT, authorizeRoles("INSTRUCTOR", "ADMIN"), getCourseProgress);

export default router;
