import { Router } from "express";
import {
  getRolesAndPermissions,
  createCustomRole,
  updateRolePermissions,
  deleteCustomRole,
  assignRoleToUser,
  bulkAssignRoles,
  getUsersByRole
} from "../controllers/rolesPermissions.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { authorizeRole } from "../middlewares/roleAuth.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Get all roles and permissions - Requires ROLE_READ permission
router.get("/", authorizeRole(['ROLE_READ']), getRolesAndPermissions);

// Create custom role - Requires ROLE_CREATE permission (typically SuperAdmin)
router.post("/roles", authorizeRole(['ROLE_CREATE']), createCustomRole);

// Update role permissions - Requires ROLE_UPDATE permission
router.patch("/roles/:roleId", authorizeRole(['ROLE_UPDATE']), updateRolePermissions);

// Delete custom role - Requires ROLE_DELETE permission
router.delete("/roles/:roleId", authorizeRole(['ROLE_DELETE']), deleteCustomRole);

// Assign role to user - Requires ROLE_ASSIGN permission
router.post("/assign", authorizeRole(['ROLE_ASSIGN']), assignRoleToUser);

// Bulk assign roles - Requires ROLE_ASSIGN permission
router.post("/bulk-assign", authorizeRole(['ROLE_ASSIGN']), bulkAssignRoles);

// Get users by role - Requires ROLE_READ and USER_READ permissions
router.get("/roles/:roleId/users", authorizeRole(['ROLE_READ', 'USER_READ']), getUsersByRole);

export default router;
