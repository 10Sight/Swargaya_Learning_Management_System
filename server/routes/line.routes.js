import express from "express";
import {
    createLine,
    getLinesByDepartment,
    updateLine,
    deleteLine
} from "../controllers/line.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.post("/", authorizeRoles("ADMIN", "SUPERADMIN"), createLine);
router.get("/department/:departmentId", getLinesByDepartment);
router.put("/:id", authorizeRoles("ADMIN", "SUPERADMIN"), updateLine);
router.delete("/:id", authorizeRoles("ADMIN", "SUPERADMIN"), deleteLine);

export default router;
