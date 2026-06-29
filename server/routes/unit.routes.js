import { Router } from "express";
import { createUnit, getAllUnits, getUnitById, updateUnit, deleteUnit } from "../controllers/unit.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { ApiError } from "../utils/ApiError.js";

const router = Router();

const requireSuperAdmin = (req, res, next) => {
    if (req.user?.role !== "SUPERADMIN") {
        return next(new ApiError("Access denied. SuperAdmin only.", 403));
    }
    next();
};

// All routes require authentication
router.use(verifyJWT);

// Read — any authenticated role
router.get("/", getAllUnits);
router.get("/:id", getUnitById);

// Write — SuperAdmin only
router.post("/", requireSuperAdmin, createUnit);
router.put("/:id", requireSuperAdmin, updateUnit);
router.delete("/:id", requireSuperAdmin, deleteUnit);

export default router;
