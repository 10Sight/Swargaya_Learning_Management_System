import { Router } from "express";
import { getAllAudits, getAuditById, deleteAudit } from "../controllers/audit.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

router.get("/", verifyJWT, authorizeRoles("ADMIN"), getAllAudits);
router.get("/:id", verifyJWT, authorizeRoles("ADMIN"), getAuditById);
router.delete("/:id", verifyJWT, authorizeRoles("ADMIN"), deleteAudit);

export default router;
