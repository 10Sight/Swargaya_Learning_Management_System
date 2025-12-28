import { Router } from "express";
import {
    saveSkillMatrix,
    getSkillMatrix,
} from "../controllers/skillMatrix.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

// Protect all routes
router.use(verifyJWT);

router.route("/save").post(saveSkillMatrix);
router.route("/:departmentId/:lineId").get(getSkillMatrix);

export default router;
