import { Router } from "express";
import multer from "multer";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updateProfile,
  updateAvatar,
  deleteUser,
  getAllInstructors,
  getAllStudents,
  getSoftDeletedUsers,
  restoreUser,
} from "../controllers/user.controller.js";
import { AvailableUserRoles } from "../constants.js";

const router = Router();
const upload = multer({ dest: "uploads/" }); // temp storage for avatar uploads

// Create user (admin/super-admin only) - sends welcome email with credentials
router.post("/", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), createUser);

// Get all users (admin/super-admin only)
router.get("/", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), getAllUsers);

// Get all instructors (admin/super-admin only)
router.get("/instructors", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), getAllInstructors);

// Get all students (admin/super-admin/instructor only)
router.get("/students", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN", "INSTRUCTOR"), getAllStudents);

// Super admin specific routes - must come before /:id routes
router.get("/deleted/all", verifyJWT, authorizeRoles("SUPERADMIN"), getSoftDeletedUsers);
router.patch("/deleted/:id/restore", verifyJWT, authorizeRoles("SUPERADMIN"), restoreUser);

// Update own profile
router.patch("/profile", verifyJWT, updateProfile);

// Update avatar
router.patch(
  "/avatar",
  verifyJWT,
  upload.single("avatar"),
  updateAvatar
);
router.get("/:id", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), getUserById);
router.patch("/:id", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), updateUser);
router.delete("/:id", verifyJWT, authorizeRoles("ADMIN", "SUPERADMIN"), deleteUser);

export default router;
