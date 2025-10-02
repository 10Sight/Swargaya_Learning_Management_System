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
} from "../controllers/user.controller.js";
import { AvailableUserRoles } from "../constants.js";

const router = Router();
const upload = multer({ dest: "uploads/" }); // temp storage for avatar uploads

// Create user (admin/super-admin only) - sends welcome email with credentials
router.post("/", verifyJWT, authorizeRoles("ADMIN", "SUPER_ADMIN"), createUser);

// Get all users (admin/super-admin only)
router.get("/", verifyJWT, authorizeRoles("ADMIN", "SUPER_ADMIN"), getAllUsers);

// Get all instructors (admin/super-admin only)
router.get("/instructors", verifyJWT, authorizeRoles("ADMIN", "SUPER_ADMIN"), getAllInstructors);

// Get all students (admin/super-admin/instructor only)
router.get("/students", verifyJWT, authorizeRoles("ADMIN", "SUPER_ADMIN", "INSTRUCTOR"), getAllStudents);

// Get single user by ID (admin/super-admin)
router.get("/:id", verifyJWT, authorizeRoles("ADMIN", "SUPER_ADMIN"), getUserById);

// Update user by ID (admin/super-admin only)
router.patch("/:id", verifyJWT, authorizeRoles("ADMIN", "SUPER_ADMIN"), updateUser);

// Update own profile
router.patch("/profile", verifyJWT, updateProfile);

// Update avatar
router.patch(
  "/avatar",
  verifyJWT,
  upload.single("avatar"),
  updateAvatar
);

// Delete user by ID (soft delete for admins, permanent for super-admin)
router.delete("/:id", verifyJWT, authorizeRoles("ADMIN", "SUPER_ADMIN"), deleteUser);

export default router;
