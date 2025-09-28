import { Router } from "express";
import {
    getDashboardStats,
    getUserStats,
    getCourseStats,
    getEngagementStats,
    getSystemHealth
} from "../controllers/analytics.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";

const router = Router();

// All analytics routes require authentication and admin/superadmin access
router.use(verifyJWT);
router.use(authorizeRoles("ADMIN", "SUPERADMIN"));

// Analytics endpoints
router.get("/dashboard", getDashboardStats);
router.get("/users", getUserStats);
router.get("/courses", getCourseStats);
router.get("/engagement", getEngagementStats);
router.get("/health", getSystemHealth);

export default router;
