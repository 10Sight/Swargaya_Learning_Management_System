import CourseLevelConfig from "../models/courseLevelConfig.model.js";
import Progress from "../models/progress.model.js";
import User from "../models/auth.model.js";
import { pool } from "../db/connectDB.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Helper to manually populate user fields
const populateConfig = async (config) => {
  if (!config) return null;

  // createdBy
  if (config.createdBy && typeof config.createdBy !== 'object') {
    const u = await User.findById(config.createdBy);
    if (u) config.createdBy = { _id: u.id, fullName: u.fullName, email: u.email };
  }

  // lastModifiedBy
  if (config.lastModifiedBy && typeof config.lastModifiedBy !== 'object') {
    const u = await User.findById(config.lastModifiedBy);
    if (u) config.lastModifiedBy = { _id: u.id, fullName: u.fullName, email: u.email };
  }
  return config;
};

/**
 * Get the active course level configuration
 * Supports cascading resolution: ?unit=...&departmentId=...
 * If user is authenticated as STUDENT without explicit query params, falls back to their assigned unit/dept.
 * @route GET /api/course-level-config/active
 * @access Public / Authenticated
 */
export const getActiveConfig = asyncHandler(async (req, res) => {
  let unit = req.query.unit;
  let departmentId = req.query.departmentId;

  // Derive scope from authenticated student if not explicitly passed
  if (req.user && !unit && !departmentId) {
    if (req.user.role === "STUDENT") {
      unit = req.user.unit;
      departmentId = req.user.department;
    }
  }

  const config = await CourseLevelConfig.getActiveConfig({ unit, departmentId });

  if (!config) {
    throw new ApiError("No active course level configuration found", 404);
  }

  res.json(new ApiResponse(200, config, "Active configuration fetched successfully"));
});

/**
 * Get entire governance matrix (Global + all Units + all Departments)
 * @route GET /api/course-level-config/hierarchy-matrix
 * @access Admin, SuperAdmin
 */
export const getHierarchyMatrix = asyncHandler(async (req, res) => {
  const matrix = await CourseLevelConfig.findHierarchyMatrix();
  res.json(new ApiResponse(200, matrix, "Hierarchy matrix fetched successfully"));
});

/**
 * Delete a scope override so that the Unit or Department reverts to parent inheritance
 * @route DELETE /api/course-level-config/scope-override
 * @access SuperAdmin
 */
export const deleteScopeOverride = asyncHandler(async (req, res) => {
  const { scopeType, unit, departmentId } = req.body;

  if (!scopeType || (scopeType === 'UNIT' && !unit) || (scopeType === 'DEPARTMENT' && !departmentId)) {
    throw new ApiError("Scope parameters (scopeType and unit/departmentId) are required", 400);
  }

  const deleted = await CourseLevelConfig.deleteScopeOverride({ scopeType, unit, departmentId });

  res.json(new ApiResponse(200, { deleted }, "Scope override removed successfully; reverted to inherited configuration"));
});

/**
 * Get all course level configurations (optionally filtered by scope)
 * @route GET /api/course-level-config
 * @access Admin, SuperAdmin
 */
export const getAllConfigs = asyncHandler(async (req, res) => {
  const query = { sort: { isDefault: -1, createdAt: -1 } };

  if (req.query.scopeType) {
    query.scopeType = req.query.scopeType;
  }
  if (req.query.unit) {
    query.unit = req.query.unit;
  }
  if (req.query.departmentId) {
    query.departmentId = req.query.departmentId;
  }

  const configs = await CourseLevelConfig.find(query);
  const populatedConfigs = await Promise.all(configs.map(populateConfig));

  res.json(new ApiResponse(200, populatedConfigs, "Configurations fetched successfully"));
});

/**
 * Get a specific configuration by ID
 * @route GET /api/course-level-config/:id
 * @access Admin, SuperAdmin
 */
export const getConfigById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const rawConfig = await CourseLevelConfig.findById(id);

  if (!rawConfig) {
    throw new ApiError("Configuration not found", 404);
  }

  const config = await populateConfig(rawConfig);

  res.json(new ApiResponse(200, config, "Configuration fetched successfully"));
});

/**
 * Create a new course level configuration or scope override
 * @route POST /api/course-level-config
 * @access SuperAdmin
 */
export const createConfig = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    levels,
    isDefault,
    scopeType = "GLOBAL",
    unit = null,
    departmentId = null,
    departmentName = null
  } = req.body;

  // Validate required fields
  if (!name || !levels || !Array.isArray(levels) || levels.length === 0) {
    throw new ApiError("Name and at least one level are required", 400);
  }

  // Validate each level
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    if (!level.name || level.order === undefined) {
      throw new ApiError(`Level at index ${i} must have name and order`, 400);
    }
    if (!level.completionTimeframe ||
      level.completionTimeframe.minDays === undefined ||
      level.completionTimeframe.maxDays === undefined) {
      throw new ApiError(`Level at index ${i} must have completionTimeframe with minDays and maxDays`, 400);
    }
    if (level.completionTimeframe.minDays < 0 || level.completionTimeframe.maxDays < 0) {
      throw new ApiError(`Level at index ${i} cannot have negative days`, 400);
    }
    if (level.completionTimeframe.minDays > level.completionTimeframe.maxDays) {
      throw new ApiError(`Level at index ${i}: minDays cannot be greater than maxDays`, 400);
    }
  }

  // Enforce additive-safety for scope overrides: cannot remove or rename levels in use
  if (scopeType !== "GLOBAL") {
    const safety = await CourseLevelConfig.validateOverrideSafety(levels, { scopeType, unit, departmentId });
    if (!safety.isValid) {
      throw new ApiError(safety.reason, 400);
    }
  }

  // If override already exists for this Unit or Department, update it seamlessly (upsert behavior)
  if (scopeType === "UNIT" && unit) {
    const existing = await CourseLevelConfig.findOne({ scopeType: "UNIT", unit });
    if (existing) {
      existing.name = name;
      existing.description = description || "";
      existing.levels = levels;
      existing.lastModifiedBy = req.user.id;
      await existing.save();
      return res.json(new ApiResponse(200, existing, "Unit level configuration updated successfully"));
    }
  } else if (scopeType === "DEPARTMENT" && departmentId) {
    const existing = await CourseLevelConfig.findOne({ scopeType: "DEPARTMENT", departmentId });
    if (existing) {
      existing.name = name;
      existing.description = description || "";
      existing.levels = levels;
      existing.departmentName = departmentName || existing.departmentName;
      existing.unit = unit || existing.unit;
      existing.lastModifiedBy = req.user.id;
      await existing.save();
      return res.json(new ApiResponse(200, existing, "Department level configuration updated successfully"));
    }
  }

  const config = await CourseLevelConfig.create({
    name,
    description: description || "",
    levels,
    isDefault: scopeType === "GLOBAL" ? (isDefault || false) : false,
    isActive: true,
    scopeType,
    unit,
    departmentId,
    departmentName,
    createdBy: req.user.id,
    lastModifiedBy: req.user.id,
  });

  res.json(new ApiResponse(201, config, "Configuration created successfully"));
});

/**
 * Update an existing course level configuration
 * @route PATCH /api/course-level-config/:id
 * @access SuperAdmin
 */
export const updateConfig = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, levels, isDefault, isActive, scopeType, unit, departmentId, departmentName } = req.body;

  const config = await CourseLevelConfig.findById(id);

  if (!config) {
    throw new ApiError("Configuration not found", 404);
  }

  // Validate levels if provided
  if (levels) {
    if (!Array.isArray(levels) || levels.length === 0) {
      throw new ApiError("Levels must be a non-empty array", 400);
    }

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      if (!level.name || level.order === undefined) {
        throw new ApiError(`Level at index ${i} must have name and order`, 400);
      }
      if (!level.completionTimeframe ||
        level.completionTimeframe.minDays === undefined ||
        level.completionTimeframe.maxDays === undefined) {
        throw new ApiError(`Level at index ${i} must have completionTimeframe with minDays and maxDays`, 400);
      }
      if (level.completionTimeframe.minDays < 0 || level.completionTimeframe.maxDays < 0) {
        throw new ApiError(`Level at index ${i} cannot have negative days`, 400);
      }
      if (level.completionTimeframe.minDays > level.completionTimeframe.maxDays) {
        throw new ApiError(`Level at index ${i}: minDays cannot be greater than maxDays`, 400);
      }
    }

    // Enforce additive-safety for scope overrides
    const effectiveScope = scopeType || config.scopeType;
    if (effectiveScope && effectiveScope !== "GLOBAL") {
      const safety = await CourseLevelConfig.validateOverrideSafety(levels, {
        scopeType: effectiveScope,
        unit: unit || config.unit,
        departmentId: departmentId || config.departmentId
      });
      if (!safety.isValid) {
        throw new ApiError(safety.reason, 400);
      }
    }

    config.levels = levels;
  }

  if (name) config.name = name;
  if (description !== undefined) config.description = description;
  if (isDefault !== undefined && (config.scopeType === 'GLOBAL' || !config.scopeType)) config.isDefault = isDefault;
  if (isActive !== undefined) config.isActive = isActive;
  if (scopeType !== undefined) config.scopeType = scopeType;
  if (unit !== undefined) config.unit = unit;
  if (departmentId !== undefined) config.departmentId = departmentId;
  if (departmentName !== undefined) config.departmentName = departmentName;

  config.lastModifiedBy = req.user.id;

  await config.save();

  res.json(new ApiResponse(200, config, "Configuration updated successfully"));
});

/**
 * Delete a course level configuration
 * @route DELETE /api/course-level-config/:id
 * @access SuperAdmin
 */
export const deleteConfig = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const config = await CourseLevelConfig.findById(id);

  if (!config) {
    throw new ApiError("Configuration not found", 404);
  }

  // Prevent deletion if it's the only active global configuration
  if (config.scopeType === 'GLOBAL' || !config.scopeType) {
    const [rows] = await pool.query("SELECT COUNT(*) as count FROM course_level_configs WHERE isActive = 1 AND (scopeType = 'GLOBAL' OR scopeType IS NULL)");
    const activeConfigCount = rows[0].count;

    if (config.isActive && activeConfigCount <= 1) {
      throw new ApiError("Cannot delete the only active global configuration", 400);
    }

    if (config.isDefault) {
      throw new ApiError("Cannot delete the default global configuration. Set another configuration as default first.", 400);
    }
  }

  await pool.query("DELETE FROM course_level_configs WHERE id = ?", [id]);

  res.json(new ApiResponse(200, null, "Configuration deleted successfully"));
});

/**
 * Set a configuration as default (GLOBAL only)
 * @route PATCH /api/course-level-config/:id/set-default
 * @access SuperAdmin
 */
export const setAsDefault = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const config = await CourseLevelConfig.findById(id);

  if (!config) {
    throw new ApiError("Configuration not found", 404);
  }

  if (config.scopeType && config.scopeType !== "GLOBAL") {
    throw new ApiError("Only Global configurations can be marked as system default", 400);
  }

  config.isDefault = true;
  config.isActive = true;
  config.lastModifiedBy = req.user.id;

  await config.save();

  res.json(new ApiResponse(200, config, "Configuration set as default successfully"));
});

/**
 * Validate level compatibility with existing progress records
 * Supports optional scope filtering: { levels, unit, departmentId }
 * @route POST /api/course-level-config/validate-compatibility
 * @access Admin, SuperAdmin
 */
export const validateCompatibility = asyncHandler(async (req, res) => {
  const { levels, unit, departmentId } = req.body;

  if (!levels || !Array.isArray(levels)) {
    throw new ApiError("Levels array is required", 400);
  }

  let progressQuery = "SELECT DISTINCT currentLevel FROM progress WHERE currentLevel IS NOT NULL";
  let progressParams = [];

  if (departmentId) {
    progressQuery = `
      SELECT DISTINCT p.currentLevel 
      FROM progress p
      INNER JOIN users u ON p.student = u.id
      WHERE u.department = ? AND p.currentLevel IS NOT NULL
    `;
    progressParams = [departmentId];
  } else if (unit) {
    progressQuery = `
      SELECT DISTINCT p.currentLevel 
      FROM progress p
      INNER JOIN users u ON p.student = u.id
      WHERE u.unit = ? AND p.currentLevel IS NOT NULL
    `;
    progressParams = [unit];
  }

  const [levelRows] = await pool.query(progressQuery, progressParams);
  const existingLevels = levelRows.map(r => r.currentLevel);

  const levelNames = levels.map(l => l.name.toUpperCase());
  const incompatibleLevels = existingLevels.filter(
    level => level && !levelNames.includes(level.toUpperCase())
  );

  const isCompatible = incompatibleLevels.length === 0;

  // Count affected students
  let affectedStudentsCount = 0;
  if (!isCompatible) {
    const placeholders = incompatibleLevels.map(() => '?').join(',');
    let countQuery = `SELECT COUNT(*) as count FROM progress WHERE currentLevel IN (${placeholders})`;
    let countParams = [...incompatibleLevels];

    if (departmentId) {
      countQuery = `
        SELECT COUNT(*) as count 
        FROM progress p
        INNER JOIN users u ON p.student = u.id
        WHERE u.department = ? AND p.currentLevel IN (${placeholders})
      `;
      countParams = [departmentId, ...incompatibleLevels];
    } else if (unit) {
      countQuery = `
        SELECT COUNT(*) as count 
        FROM progress p
        INNER JOIN users u ON p.student = u.id
        WHERE u.unit = ? AND p.currentLevel IN (${placeholders})
      `;
      countParams = [unit, ...incompatibleLevels];
    }

    const [countRows] = await pool.query(countQuery, countParams);
    affectedStudentsCount = countRows[0].count;
  }

  res.json(new ApiResponse(200, {
    isCompatible,
    incompatibleLevels,
    affectedStudentsCount,
    suggestion: !isCompatible
      ? "Some existing student levels in this scope are not in the new configuration. Consider migrating students first."
      : "Configuration is compatible with existing progress records"
  }, "Compatibility check completed"));
});

/**
 * Migrate student levels when changing configuration
 * @route POST /api/course-level-config/migrate-levels
 * @access SuperAdmin
 */
export const migrateLevels = asyncHandler(async (req, res) => {
  const { levelMapping, unit, departmentId } = req.body;

  if (!levelMapping || typeof levelMapping !== "object") {
    throw new ApiError("Level mapping object is required", 400);
  }

  const updates = [];

  for (const [oldLevel, newLevel] of Object.entries(levelMapping)) {
    let updateQuery = "UPDATE progress SET currentLevel = ?, lockedLevel = NULL, levelLockEnabled = 0 WHERE currentLevel = ?";
    let updateParams = [newLevel, oldLevel];

    if (departmentId) {
      updateQuery = `
        UPDATE p
        SET p.currentLevel = ?, p.lockedLevel = NULL, p.levelLockEnabled = 0
        FROM progress p
        INNER JOIN users u ON p.student = u.id
        WHERE u.department = ? AND p.currentLevel = ?
      `;
      updateParams = [newLevel, departmentId, oldLevel];
    } else if (unit) {
      updateQuery = `
        UPDATE p
        SET p.currentLevel = ?, p.lockedLevel = NULL, p.levelLockEnabled = 0
        FROM progress p
        INNER JOIN users u ON p.student = u.id
        WHERE u.unit = ? AND p.currentLevel = ?
      `;
      updateParams = [newLevel, unit, oldLevel];
    }

    const [result] = await pool.query(updateQuery, updateParams);

    // Also update users.currentLevel
    let userQuery = "UPDATE users SET currentLevel = ? WHERE currentLevel = ?";
    let userParams = [newLevel, oldLevel];
    if (departmentId) {
      userQuery += " AND department = ?";
      userParams.push(departmentId);
    } else if (unit) {
      userQuery += " AND unit = ?";
      userParams.push(unit);
    }
    await pool.query(userQuery, userParams);

    updates.push({
      oldLevel,
      newLevel,
      studentsUpdated: result.affectedRows
    });
  }

  res.json(new ApiResponse(200, { updates }, "Level migration completed successfully"));
});
