import mongoose from "mongoose";
import User from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Define system permissions
const SYSTEM_PERMISSIONS = {
  // User Management
  USER_CREATE: "user:create",
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",
  USER_SUSPEND: "user:suspend",
  USER_ACTIVATE: "user:activate",

  // Course Management
  COURSE_CREATE: "course:create",
  COURSE_READ: "course:read",
  COURSE_UPDATE: "course:update",
  COURSE_DELETE: "course:delete",
  COURSE_PUBLISH: "course:publish",

  // Module Management
  MODULE_CREATE: "module:create",
  MODULE_READ: "module:read",
  MODULE_UPDATE: "module:update",
  MODULE_DELETE: "module:delete",

  // Lesson Management
  LESSON_CREATE: "lesson:create",
  LESSON_READ: "lesson:read",
  LESSON_UPDATE: "lesson:update",
  LESSON_DELETE: "lesson:delete",

  // Resource Management
  RESOURCE_CREATE: "resource:create",
  RESOURCE_READ: "resource:read",
  RESOURCE_UPDATE: "resource:update",
  RESOURCE_DELETE: "resource:delete",

  // Department Management
  DEPARTMENT_CREATE: "department:create",
  DEPARTMENT_READ: "department:read",
  DEPARTMENT_UPDATE: "department:update",
  DEPARTMENT_DELETE: "department:delete",
  DEPARTMENT_MANAGE_STUDENTS: "department:manage_students",

  // Quiz Management
  QUIZ_CREATE: "quiz:create",
  QUIZ_READ: "quiz:read",
  QUIZ_UPDATE: "quiz:update",
  QUIZ_DELETE: "quiz:delete",
  QUIZ_GRADE: "quiz:grade",

  // Assignment Management
  ASSIGNMENT_CREATE: "assignment:create",
  ASSIGNMENT_READ: "assignment:read",
  ASSIGNMENT_UPDATE: "assignment:update",
  ASSIGNMENT_DELETE: "assignment:delete",
  ASSIGNMENT_GRADE: "assignment:grade",

  // Certificate Management
  CERTIFICATE_CREATE: "certificate:create",
  CERTIFICATE_READ: "certificate:read",
  CERTIFICATE_UPDATE: "certificate:update",
  CERTIFICATE_DELETE: "certificate:delete",
  CERTIFICATE_ISSUE: "certificate:issue",

  // Analytics & Reports
  ANALYTICS_READ: "analytics:read",
  ANALYTICS_EXPORT: "analytics:export",
  REPORTS_GENERATE: "reports:generate",

  // System Administration
  SYSTEM_SETTINGS: "system:settings",
  SYSTEM_BACKUP: "system:backup",
  SYSTEM_RESTORE: "system:restore",
  SYSTEM_MAINTENANCE: "system:maintenance",

  // Bulk Operations
  BULK_ENROLLMENT: "bulk:enrollment",
  BULK_EMAIL: "bulk:email",
  BULK_CERTIFICATES: "bulk:certificates",

  // Audit & Logs
  AUDIT_READ: "audit:read",
  AUDIT_DELETE: "audit:delete",

  // Role Management
  ROLE_CREATE: "role:create",
  ROLE_READ: "role:read",
  ROLE_UPDATE: "role:update",
  ROLE_DELETE: "role:delete",
  ROLE_ASSIGN: "role:assign"
};

// Define default role permissions
const DEFAULT_ROLES = {
  STUDENT: {
    name: "Student",
    description: "Basic student access to courses and assignments",
    permissions: [
      SYSTEM_PERMISSIONS.COURSE_READ,
      SYSTEM_PERMISSIONS.MODULE_READ,
      SYSTEM_PERMISSIONS.LESSON_READ,
      SYSTEM_PERMISSIONS.RESOURCE_READ,
      SYSTEM_PERMISSIONS.QUIZ_READ,
      SYSTEM_PERMISSIONS.ASSIGNMENT_READ,
      SYSTEM_PERMISSIONS.CERTIFICATE_READ
    ],
    isSystemRole: true,
    color: "#3B82F6"
  },
  INSTRUCTOR: {
    name: "Instructor",
    description: "Instructor access to manage courses and students",
    permissions: [
      // Course Management
      SYSTEM_PERMISSIONS.COURSE_CREATE,
      SYSTEM_PERMISSIONS.COURSE_READ,
      SYSTEM_PERMISSIONS.COURSE_UPDATE,
      SYSTEM_PERMISSIONS.COURSE_DELETE,
      SYSTEM_PERMISSIONS.COURSE_PUBLISH,
      // Module Management
      SYSTEM_PERMISSIONS.MODULE_CREATE,
      SYSTEM_PERMISSIONS.MODULE_READ,
      SYSTEM_PERMISSIONS.MODULE_UPDATE,
      SYSTEM_PERMISSIONS.MODULE_DELETE,
      // Lesson Management
      SYSTEM_PERMISSIONS.LESSON_CREATE,
      SYSTEM_PERMISSIONS.LESSON_READ,
      SYSTEM_PERMISSIONS.LESSON_UPDATE,
      SYSTEM_PERMISSIONS.LESSON_DELETE,
      // Resource Management
      SYSTEM_PERMISSIONS.RESOURCE_CREATE,
      SYSTEM_PERMISSIONS.RESOURCE_READ,
      SYSTEM_PERMISSIONS.RESOURCE_UPDATE,
      SYSTEM_PERMISSIONS.RESOURCE_DELETE,
      // Department Management
      SYSTEM_PERMISSIONS.DEPARTMENT_CREATE,
      SYSTEM_PERMISSIONS.DEPARTMENT_READ,
      SYSTEM_PERMISSIONS.DEPARTMENT_UPDATE,
      SYSTEM_PERMISSIONS.DEPARTMENT_MANAGE_STUDENTS,
      // Assessment Management
      SYSTEM_PERMISSIONS.QUIZ_CREATE,
      SYSTEM_PERMISSIONS.QUIZ_READ,
      SYSTEM_PERMISSIONS.QUIZ_UPDATE,
      SYSTEM_PERMISSIONS.QUIZ_DELETE,
      SYSTEM_PERMISSIONS.QUIZ_GRADE,
      SYSTEM_PERMISSIONS.ASSIGNMENT_CREATE,
      SYSTEM_PERMISSIONS.ASSIGNMENT_READ,
      SYSTEM_PERMISSIONS.ASSIGNMENT_UPDATE,
      SYSTEM_PERMISSIONS.ASSIGNMENT_DELETE,
      SYSTEM_PERMISSIONS.ASSIGNMENT_GRADE,
      // Certificate Management
      SYSTEM_PERMISSIONS.CERTIFICATE_CREATE,
      SYSTEM_PERMISSIONS.CERTIFICATE_READ,
      SYSTEM_PERMISSIONS.CERTIFICATE_ISSUE,
      // Analytics & User Management
      SYSTEM_PERMISSIONS.ANALYTICS_READ,
      SYSTEM_PERMISSIONS.USER_READ
    ],
    isSystemRole: true,
    color: "#10B981"
  },
  ADMIN: {
    name: "Admin",
    description: "Administrator access to system management",
    permissions: [
      ...Object.values(SYSTEM_PERMISSIONS).filter(p =>
        !p.includes('system:') &&
        !p.includes('role:') &&
        p !== SYSTEM_PERMISSIONS.USER_DELETE
      ),
      SYSTEM_PERMISSIONS.AUDIT_READ,
      SYSTEM_PERMISSIONS.BULK_ENROLLMENT,
      SYSTEM_PERMISSIONS.BULK_EMAIL,
      SYSTEM_PERMISSIONS.BULK_CERTIFICATES
    ],
    isSystemRole: true,
    color: "#F59E0B"
  },
  SUPERADMIN: {
    name: "SuperAdmin",
    description: "Full system access and control",
    permissions: Object.values(SYSTEM_PERMISSIONS),
    isSystemRole: true,
    color: "#EF4444"
  }
};

// Get all roles and permissions
export const getRolesAndPermissions = asyncHandler(async (req, res) => {
  try {
    // Get all available permissions grouped by category
    const permissions = {
      "User Management": [
        { id: SYSTEM_PERMISSIONS.USER_CREATE, name: "Create Users", description: "Create new user accounts" },
        { id: SYSTEM_PERMISSIONS.USER_READ, name: "View Users", description: "View user information and profiles" },
        { id: SYSTEM_PERMISSIONS.USER_UPDATE, name: "Update Users", description: "Edit user information and profiles" },
        { id: SYSTEM_PERMISSIONS.USER_DELETE, name: "Delete Users", description: "Permanently delete user accounts" },
        { id: SYSTEM_PERMISSIONS.USER_SUSPEND, name: "Suspend Users", description: "Suspend user accounts" },
        { id: SYSTEM_PERMISSIONS.USER_ACTIVATE, name: "Activate Users", description: "Activate suspended accounts" }
      ],
      "Course Management": [
        { id: SYSTEM_PERMISSIONS.COURSE_CREATE, name: "Create Courses", description: "Create new courses" },
        { id: SYSTEM_PERMISSIONS.COURSE_READ, name: "View Courses", description: "View course content and information" },
        { id: SYSTEM_PERMISSIONS.COURSE_UPDATE, name: "Update Courses", description: "Edit course content and settings" },
        { id: SYSTEM_PERMISSIONS.COURSE_DELETE, name: "Delete Courses", description: "Delete courses from system" },
        { id: SYSTEM_PERMISSIONS.COURSE_PUBLISH, name: "Publish Courses", description: "Publish courses to students" }
      ],
      "Module Management": [
        { id: SYSTEM_PERMISSIONS.MODULE_CREATE, name: "Create Modules", description: "Create new course modules" },
        { id: SYSTEM_PERMISSIONS.MODULE_READ, name: "View Modules", description: "View module content and information" },
        { id: SYSTEM_PERMISSIONS.MODULE_UPDATE, name: "Update Modules", description: "Edit module content and settings" },
        { id: SYSTEM_PERMISSIONS.MODULE_DELETE, name: "Delete Modules", description: "Delete modules from courses" }
      ],
      "Lesson Management": [
        { id: SYSTEM_PERMISSIONS.LESSON_CREATE, name: "Create Lessons", description: "Create new lessons in modules" },
        { id: SYSTEM_PERMISSIONS.LESSON_READ, name: "View Lessons", description: "View lesson content and information" },
        { id: SYSTEM_PERMISSIONS.LESSON_UPDATE, name: "Update Lessons", description: "Edit lesson content and settings" },
        { id: SYSTEM_PERMISSIONS.LESSON_DELETE, name: "Delete Lessons", description: "Delete lessons from modules" }
      ],
      "Resource Management": [
        { id: SYSTEM_PERMISSIONS.RESOURCE_CREATE, name: "Create Resources", description: "Upload and create learning resources" },
        { id: SYSTEM_PERMISSIONS.RESOURCE_READ, name: "View Resources", description: "View uploaded resources" },
        { id: SYSTEM_PERMISSIONS.RESOURCE_UPDATE, name: "Update Resources", description: "Edit and update resources" },
        { id: SYSTEM_PERMISSIONS.RESOURCE_DELETE, name: "Delete Resources", description: "Delete uploaded resources" }
      ],
      "Department Management": [
        { id: SYSTEM_PERMISSIONS.DEPARTMENT_CREATE, name: "Create Departments", description: "Create new student departments" },
        { id: SYSTEM_PERMISSIONS.DEPARTMENT_READ, name: "View Departments", description: "View department information" },
        { id: SYSTEM_PERMISSIONS.DEPARTMENT_UPDATE, name: "Update Departments", description: "Edit department information" },
        { id: SYSTEM_PERMISSIONS.DEPARTMENT_DELETE, name: "Delete Departments", description: "Delete student departments" },
        { id: SYSTEM_PERMISSIONS.DEPARTMENT_MANAGE_STUDENTS, name: "Manage Students", description: "Add/remove students from departments" }
      ],
      "Assessment Management": [
        { id: SYSTEM_PERMISSIONS.QUIZ_CREATE, name: "Create Quizzes", description: "Create new quizzes and tests" },
        { id: SYSTEM_PERMISSIONS.QUIZ_READ, name: "View Quizzes", description: "View quiz content and results" },
        { id: SYSTEM_PERMISSIONS.QUIZ_UPDATE, name: "Update Quizzes", description: "Edit quiz content and settings" },
        { id: SYSTEM_PERMISSIONS.QUIZ_DELETE, name: "Delete Quizzes", description: "Delete quizzes from system" },
        { id: SYSTEM_PERMISSIONS.QUIZ_GRADE, name: "Grade Quizzes", description: "Grade student quiz attempts" },
        { id: SYSTEM_PERMISSIONS.ASSIGNMENT_CREATE, name: "Create Assignments", description: "Create new assignments" },
        { id: SYSTEM_PERMISSIONS.ASSIGNMENT_READ, name: "View Assignments", description: "View assignment content and submissions" },
        { id: SYSTEM_PERMISSIONS.ASSIGNMENT_UPDATE, name: "Update Assignments", description: "Edit assignment content" },
        { id: SYSTEM_PERMISSIONS.ASSIGNMENT_DELETE, name: "Delete Assignments", description: "Delete assignments" },
        { id: SYSTEM_PERMISSIONS.ASSIGNMENT_GRADE, name: "Grade Assignments", description: "Grade student submissions" }
      ],
      "Certificate Management": [
        { id: SYSTEM_PERMISSIONS.CERTIFICATE_CREATE, name: "Create Templates", description: "Create certificate templates" },
        { id: SYSTEM_PERMISSIONS.CERTIFICATE_READ, name: "View Certificates", description: "View issued certificates" },
        { id: SYSTEM_PERMISSIONS.CERTIFICATE_UPDATE, name: "Update Templates", description: "Edit certificate templates" },
        { id: SYSTEM_PERMISSIONS.CERTIFICATE_DELETE, name: "Delete Certificates", description: "Delete certificates and templates" },
        { id: SYSTEM_PERMISSIONS.CERTIFICATE_ISSUE, name: "Issue Certificates", description: "Issue certificates to students" }
      ],
      "Analytics & Reports": [
        { id: SYSTEM_PERMISSIONS.ANALYTICS_READ, name: "View Analytics", description: "Access system analytics and reports" },
        { id: SYSTEM_PERMISSIONS.ANALYTICS_EXPORT, name: "Export Analytics", description: "Export analytics data" },
        { id: SYSTEM_PERMISSIONS.REPORTS_GENERATE, name: "Generate Reports", description: "Generate custom reports" }
      ],
      "Bulk Operations": [
        { id: SYSTEM_PERMISSIONS.BULK_ENROLLMENT, name: "Bulk Enrollment", description: "Enroll multiple users at once" },
        { id: SYSTEM_PERMISSIONS.BULK_EMAIL, name: "Bulk Email", description: "Send bulk email campaigns" },
        { id: SYSTEM_PERMISSIONS.BULK_CERTIFICATES, name: "Bulk Certificates", description: "Generate certificates in bulk" }
      ],
      "System Administration": [
        { id: SYSTEM_PERMISSIONS.SYSTEM_SETTINGS, name: "System Settings", description: "Modify system configuration" },
        { id: SYSTEM_PERMISSIONS.SYSTEM_BACKUP, name: "System Backup", description: "Create system backups" },
        { id: SYSTEM_PERMISSIONS.SYSTEM_RESTORE, name: "System Restore", description: "Restore from backups" },
        { id: SYSTEM_PERMISSIONS.SYSTEM_MAINTENANCE, name: "Maintenance Mode", description: "Enable/disable maintenance mode" }
      ],
      "Audit & Security": [
        { id: SYSTEM_PERMISSIONS.AUDIT_READ, name: "View Audit Logs", description: "Access system audit logs" },
        { id: SYSTEM_PERMISSIONS.AUDIT_DELETE, name: "Delete Audit Logs", description: "Delete audit log entries" }
      ],
      "Role Management": [
        { id: SYSTEM_PERMISSIONS.ROLE_CREATE, name: "Create Roles", description: "Create new user roles" },
        { id: SYSTEM_PERMISSIONS.ROLE_READ, name: "View Roles", description: "View role information" },
        { id: SYSTEM_PERMISSIONS.ROLE_UPDATE, name: "Update Roles", description: "Edit role permissions" },
        { id: SYSTEM_PERMISSIONS.ROLE_DELETE, name: "Delete Roles", description: "Delete custom roles" },
        { id: SYSTEM_PERMISSIONS.ROLE_ASSIGN, name: "Assign Roles", description: "Assign roles to users" }
      ]
    };

    // Get roles (in a real implementation, these would come from database)
    const roles = Object.entries(DEFAULT_ROLES).map(([key, role]) => ({
      id: key,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      isSystemRole: role.isSystemRole,
      color: role.color,
      userCount: 0 // This would be calculated from database
    }));

    // Get user count for each role
    for (const role of roles) {
      const count = await User.countDocuments({ role: role.id });
      role.userCount = count;
    }

    res.json(new ApiResponse(200, {
      permissions,
      roles,
      systemPermissions: SYSTEM_PERMISSIONS
    }, "Roles and permissions fetched successfully"));

  } catch (error) {
    throw new ApiError("Failed to fetch roles and permissions", 500);
  }
});

// Create custom role
export const createCustomRole = asyncHandler(async (req, res) => {
  try {
    const { name, description, permissions = [], color = "#6B7280" } = req.body;

    if (!name) {
      throw new ApiError("Role name is required", 400);
    }

    // Validate permissions
    const validPermissions = Object.values(SYSTEM_PERMISSIONS);
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));

    if (invalidPermissions.length > 0) {
      throw new ApiError(`Invalid permissions: ${invalidPermissions.join(", ")}`, 400);
    }

    // Create role ID from name
    const roleId = name.toUpperCase().replace(/\s+/g, '_');

    // Check if role already exists (in a real implementation, check database)
    if (DEFAULT_ROLES[roleId]) {
      throw new ApiError("Role already exists", 400);
    }

    // In a real implementation, save to database
    const newRole = {
      id: roleId,
      name,
      description,
      permissions,
      isSystemRole: false,
      color,
      createdBy: req.user._id,
      createdAt: new Date(),
      userCount: 0
    };

    // Log role creation
    const auditLogger = (await import("../utils/auditLogger.js")).default;
    await auditLogger({
      action: 'CREATE_ROLE',
      userId: req.user._id,
      details: {
        roleName: name,
        permissions: permissions.length,
        roleId
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(new ApiResponse(201, newRole, "Role created successfully"));

  } catch (error) {
    throw new ApiError(error.message || "Failed to create role", error.statusCode || 500);
  }
});

// Update role permissions
export const updateRolePermissions = asyncHandler(async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissions = [], name, description, color } = req.body;

    // Check if role exists and is not a system role for critical operations
    const existingRole = DEFAULT_ROLES[roleId];
    if (!existingRole) {
      throw new ApiError("Role not found", 404);
    }

    // Prevent modification of system roles (except by SuperAdmin)
    if (existingRole.isSystemRole && req.user.role !== 'SUPERADMIN') {
      throw new ApiError("Cannot modify system roles", 403);
    }

    // Validate permissions
    const validPermissions = Object.values(SYSTEM_PERMISSIONS);
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));

    if (invalidPermissions.length > 0) {
      throw new ApiError(`Invalid permissions: ${invalidPermissions.join(", ")}`, 400);
    }

    // In a real implementation, update in database
    const updatedRole = {
      id: roleId,
      name: name || existingRole.name,
      description: description || existingRole.description,
      permissions,
      isSystemRole: existingRole.isSystemRole,
      color: color || existingRole.color,
      updatedBy: req.user._id,
      updatedAt: new Date()
    };

    // Log role update
    const auditLogger = (await import("../utils/auditLogger.js")).default;
    await auditLogger({
      action: 'UPDATE_ROLE',
      userId: req.user._id,
      details: {
        roleId,
        roleName: updatedRole.name,
        permissionsChanged: permissions.length,
        oldPermissionsCount: existingRole.permissions.length
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(new ApiResponse(200, updatedRole, "Role updated successfully"));

  } catch (error) {
    throw new ApiError(error.message || "Failed to update role", error.statusCode || 500);
  }
});

// Delete custom role
export const deleteCustomRole = asyncHandler(async (req, res) => {
  try {
    const { roleId } = req.params;

    // Check if role exists
    const existingRole = DEFAULT_ROLES[roleId];
    if (!existingRole) {
      throw new ApiError("Role not found", 404);
    }

    // Prevent deletion of system roles
    if (existingRole.isSystemRole) {
      throw new ApiError("Cannot delete system roles", 403);
    }

    // Check if any users have this role
    const usersWithRole = await User.countDocuments({ role: roleId });
    if (usersWithRole > 0) {
      throw new ApiError(`Cannot delete role: ${usersWithRole} users still have this role`, 400);
    }

    // In a real implementation, delete from database
    // await Role.findByIdAndDelete(roleId);

    // Log role deletion
    const auditLogger = (await import("../utils/auditLogger.js")).default;
    await auditLogger({
      action: 'DELETE_ROLE',
      userId: req.user._id,
      details: {
        roleId,
        roleName: existingRole.name
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(new ApiResponse(200, {}, "Role deleted successfully"));

  } catch (error) {
    throw new ApiError(error.message || "Failed to delete role", error.statusCode || 500);
  }
});

// Assign role to user
export const assignRoleToUser = asyncHandler(async (req, res) => {
  try {
    const { userId, roleId } = req.body;

    if (!userId || !roleId) {
      throw new ApiError("User ID and Role ID are required", 400);
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError("User not found", 404);
    }

    // Check if role exists
    const role = DEFAULT_ROLES[roleId];
    if (!role) {
      throw new ApiError("Role not found", 404);
    }

    // Prevent non-superadmins from assigning superadmin role
    if (roleId === 'SUPERADMIN' && req.user.role !== 'SUPERADMIN') {
      throw new ApiError("Insufficient permissions to assign SuperAdmin role", 403);
    }

    const oldRole = user.role;

    // Update user role
    await User.findByIdAndUpdate(userId, { role: roleId });

    // Log role assignment
    const auditLogger = (await import("../utils/auditLogger.js")).default;
    await auditLogger({
      action: 'ASSIGN_ROLE',
      userId: req.user._id,
      details: {
        targetUserId: userId,
        targetUserName: user.fullName,
        oldRole,
        newRole: roleId,
        roleName: role.name
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(new ApiResponse(200, {
      userId,
      userEmail: user.email,
      userName: user.fullName,
      oldRole,
      newRole: roleId,
      roleName: role.name
    }, "Role assigned successfully"));

  } catch (error) {
    throw new ApiError(error.message || "Failed to assign role", error.statusCode || 500);
  }
});

// Bulk assign roles
export const bulkAssignRoles = asyncHandler(async (req, res) => {
  try {
    const { userIds, roleId } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new ApiError("User IDs array is required", 400);
    }

    if (!roleId) {
      throw new ApiError("Role ID is required", 400);
    }

    // Check if role exists
    const role = DEFAULT_ROLES[roleId];
    if (!role) {
      throw new ApiError("Role not found", 404);
    }

    // Prevent non-superadmins from assigning superadmin role
    if (roleId === 'SUPERADMIN' && req.user.role !== 'SUPERADMIN') {
      throw new ApiError("Insufficient permissions to assign SuperAdmin role", 403);
    }

    // Check if users exist
    const users = await User.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) {
      throw new ApiError("Some users not found", 404);
    }

    const results = {
      successful: [],
      failed: []
    };

    // Update user roles
    for (const user of users) {
      try {
        const oldRole = user.role;
        await User.findByIdAndUpdate(user._id, { role: roleId });

        results.successful.push({
          userId: user._id,
          userEmail: user.email,
          userName: user.fullName,
          oldRole,
          newRole: roleId
        });
      } catch (error) {
        results.failed.push({
          userId: user._id,
          userEmail: user.email,
          error: error.message
        });
      }
    }

    // Log bulk role assignment
    const auditLogger = (await import("../utils/auditLogger.js")).default;
    await auditLogger({
      action: 'BULK_ASSIGN_ROLES',
      userId: req.user._id,
      details: {
        roleId,
        roleName: role.name,
        totalUsers: userIds.length,
        successful: results.successful.length,
        failed: results.failed.length
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(new ApiResponse(200, {
      results,
      summary: {
        total: userIds.length,
        successful: results.successful.length,
        failed: results.failed.length
      }
    }, "Bulk role assignment completed"));

  } catch (error) {
    throw new ApiError(error.message || "Failed to bulk assign roles", error.statusCode || 500);
  }
});

// Get users by role
export const getUsersByRole = asyncHandler(async (req, res) => {
  try {
    const { roleId } = req.params;
    const { page = 1, limit = 20, search = "" } = req.query;

    // Check if role exists
    if (!DEFAULT_ROLES[roleId]) {
      throw new ApiError("Role not found", 404);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build search query
    const searchQuery = {
      role: roleId,
      ...(search && {
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      })
    };

    const [users, totalUsers] = await Promise.all([
      User.find(searchQuery)
        .select('fullName email createdAt isEmailVerified isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(searchQuery)
    ]);

    res.json(new ApiResponse(200, {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / parseInt(limit)),
        totalUsers,
        limit: parseInt(limit)
      },
      role: {
        id: roleId,
        name: DEFAULT_ROLES[roleId].name
      }
    }, "Users fetched successfully"));

  } catch (error) {
    throw new ApiError(error.message || "Failed to get users by role", error.statusCode || 500);
  }
});

export { SYSTEM_PERMISSIONS, DEFAULT_ROLES };
