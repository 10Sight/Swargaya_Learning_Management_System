import { Router } from "express";
import {
    saveSkillMatrix,
    getSkillMatrix,
} from "../controllers/skillMatrix.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

// Protect all routes with JWT and allowed roles
router.use(verifyJWT, authorizeRoles("ADMIN", "INSTRUCTOR", "SUPERADMIN"));

router.route("/save").post(saveSkillMatrix);
router.route("/:departmentId/:lineId").get(getSkillMatrix);

export default router;
