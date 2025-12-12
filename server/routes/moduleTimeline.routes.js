import { Router } from "express";
import {
  createOrUpdateTimeline,
  getTimelinesForDepartment,
  getAllTimelines,
  deleteTimeline,
  getTimelineStatus,
  processTimelineEnforcement,
  sendTimelineWarnings,
  getMyTimelineNotifications,
  markNotificationRead
} from "../controllers/moduleTimeline.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";
import checkAccountStatus from "../middlewares/accountStatus.middleware.js";

const router = Router();

// Admin routes for timeline management
// Create or update timeline
router.post(
  "/",
  verifyJWT,
  authorizeRoles("ADMIN", "SUPERADMIN"),
  createOrUpdateTimeline
);

// Update existing timeline
router.put(
  "/:timelineId",
  verifyJWT,
  authorizeRoles("ADMIN", "SUPERADMIN"),
  createOrUpdateTimeline
);

router.get(
  "/",
  verifyJWT,
  authorizeRoles("ADMIN", "INSTRUCTOR", "SUPERADMIN"),
  getAllTimelines
);

router.get(
  "/department/:courseId/:departmentId",
  verifyJWT,
  authorizeRoles("ADMIN", "INSTRUCTOR", "SUPERADMIN"),
  getTimelinesForDepartment
);

router.get(
  "/status/:courseId/:departmentId",
  verifyJWT,
  authorizeRoles("ADMIN", "INSTRUCTOR", "SUPERADMIN"),
  getTimelineStatus
);

router.delete(
  "/:timelineId",
  verifyJWT,
  authorizeRoles("ADMIN", "SUPERADMIN"),
  deleteTimeline
);

// Background job routes (can be called by cron jobs or admin)
router.post(
  "/process-enforcement",
  verifyJWT,
  authorizeRoles("ADMIN", "SUPERADMIN"),
  processTimelineEnforcement
);

router.post(
  "/send-warnings",
  verifyJWT,
  authorizeRoles("ADMIN", "SUPERADMIN"),
  sendTimelineWarnings
);

// Student routes for viewing timeline notifications
router.get(
  "/notifications/:courseId",
  verifyJWT,
  authorizeRoles("STUDENT"),
  checkAccountStatus(true), // Allow pending students to see notifications
  getMyTimelineNotifications
);

router.patch(
  "/notifications/:courseId/:notificationId/read",
  verifyJWT,
  authorizeRoles("STUDENT"),
  checkAccountStatus(true), // Allow pending students to mark as read
  markNotificationRead
);

export default router;
