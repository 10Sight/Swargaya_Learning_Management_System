import { pool } from "../db/connectDB.js";
import logger from "../logger/winston.logger.js";

class CourseLevelConfig {
  constructor(data) {
    this.id = data.id;
    this._id = data.id; // Compatibility

    this.name = data.name || "Default Course Level Configuration";
    this.description = data.description || "System-wide course level configuration";
    this.levels = typeof data.levels === 'string' ? JSON.parse(data.levels) : (data.levels || []);
    this.isActive = data.isActive !== undefined ? !!data.isActive : true;
    this.isDefault = !!data.isDefault;

    // Multi-tier scope properties
    this.scopeType = data.scopeType || "GLOBAL"; // 'GLOBAL' | 'UNIT' | 'DEPARTMENT'
    this.unit = data.unit || null;
    this.departmentId = data.departmentId !== undefined && data.departmentId !== null ? Number(data.departmentId) : null;
    this.departmentName = data.departmentName || null;

    this.createdBy = data.createdBy;
    this.lastModifiedBy = data.lastModifiedBy;

    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;

    // Ensure levels are sorted by order on instantiation
    if (this.levels && this.levels.length > 0) {
      this.levels.sort((a, b) => a.order - b.order);
    }
  }

  static async init() {
    const query = `
      IF OBJECT_ID(N'dbo.course_level_configs', N'U') IS NULL
      BEGIN
          CREATE TABLE dbo.course_level_configs (
              id INT IDENTITY(1,1) PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              description VARCHAR(MAX),
              levels VARCHAR(MAX) NOT NULL,
              isActive BIT DEFAULT 1,
              isDefault BIT DEFAULT 0,
              scopeType VARCHAR(50) DEFAULT 'GLOBAL',
              unit NVARCHAR(255) NULL,
              departmentId INT NULL,
              departmentName NVARCHAR(255) NULL,
              createdBy VARCHAR(255),
              lastModifiedBy VARCHAR(255),
              createdAt DATETIME DEFAULT GETDATE(),
              updatedAt DATETIME DEFAULT GETDATE(),
              CONSTRAINT unique_config_name UNIQUE (name)
          );
          
          CREATE INDEX idx_status ON dbo.course_level_configs(isActive, isDefault);
      END
    `;
    try {
      await pool.query(query);

      // Safe schema migrations for existing tables
      const alterQueries = [
        `IF COL_LENGTH(N'dbo.course_level_configs', N'scopeType') IS NULL
         BEGIN
           ALTER TABLE dbo.course_level_configs ADD scopeType VARCHAR(50) DEFAULT 'GLOBAL';
         END`,
        `IF COL_LENGTH(N'dbo.course_level_configs', N'unit') IS NULL
         BEGIN
           ALTER TABLE dbo.course_level_configs ADD unit NVARCHAR(255) NULL;
         END`,
        `IF COL_LENGTH(N'dbo.course_level_configs', N'departmentId') IS NULL
         BEGIN
           ALTER TABLE dbo.course_level_configs ADD departmentId INT NULL;
         END`,
        `IF COL_LENGTH(N'dbo.course_level_configs', N'departmentName') IS NULL
         BEGIN
           ALTER TABLE dbo.course_level_configs ADD departmentName NVARCHAR(255) NULL;
         END`,
        `UPDATE dbo.course_level_configs SET scopeType = 'GLOBAL' WHERE scopeType IS NULL;`,
        `IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_scope' AND object_id = OBJECT_ID(N'dbo.course_level_configs'))
         BEGIN
           CREATE INDEX idx_scope ON dbo.course_level_configs(scopeType, unit, departmentId, isActive);
         END`
      ];

      for (const q of alterQueries) {
        await pool.query(q);
      }
    } catch (error) {
      logger.error("Failed to initialize CourseLevelConfig table", error);
    }
  }

  static async create(data) {
    const levels = data.levels || [];
    if (levels.length === 0) throw new Error("At least one level is required");

    const scopeType = data.scopeType || "GLOBAL";

    // Ensure isDefault reset is strictly scoped to GLOBAL
    if (data.isDefault && (scopeType === 'GLOBAL' || !data.scopeType)) {
      await pool.query("UPDATE course_level_configs SET isDefault = 0 WHERE scopeType = 'GLOBAL' OR scopeType IS NULL");
    }

    // Sort levels by order
    levels.sort((a, b) => a.order - b.order);

    const config = new CourseLevelConfig({ ...data, scopeType, levels });

    const fields = [
      "name", "description", "levels", "isActive", "isDefault",
      "scopeType", "unit", "departmentId", "departmentName",
      "createdBy", "lastModifiedBy", "createdAt"
    ];

    if (!config.createdAt) config.createdAt = new Date();

    const values = fields.map(field => {
      let val = config[field];
      if (field === 'levels') return JSON.stringify(val);
      if (val === undefined) return null;
      return val;
    });

    const placeholders = fields.map(() => "?").join(",");
    const query = `INSERT INTO course_level_configs (${fields.join(",")}) VALUES (${placeholders}); SELECT SCOPE_IDENTITY() AS id;`;

    const [rows] = await pool.query(query, values);
    return CourseLevelConfig.findById(rows[0].id);
  }

  static async findById(id) {
    const [rows] = await pool.query("SELECT * FROM course_level_configs WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return new CourseLevelConfig(rows[0]);
  }

  static async findOne(query) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    let sql = "SELECT TOP 1 * FROM course_level_configs";
    let values = [];

    if (keys.length > 0) {
      const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
      sql += ` WHERE ${whereClause}`;
      values = keys.map(key => query[key]);
    }

    const [rows] = await pool.query(sql, values);
    if (rows.length === 0) return null;
    return new CourseLevelConfig(rows[0]);
  }

  static async find(query = {}) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined && key !== 'sort');
    let sql = "SELECT * FROM course_level_configs";
    let values = [];

    if (keys.length > 0) {
      const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
      sql += ` WHERE ${whereClause}`;
      values = keys.map(key => query[key]);
    }

    if (query.sort) {
      const sortKey = Object.keys(query.sort)[0];
      const sortOrder = query.sort[sortKey] === -1 ? 'DESC' : 'ASC';
      sql += ` ORDER BY ${sortKey} ${sortOrder}`;
    }

    const [rows] = await pool.query(sql, values);
    return rows.map(row => new CourseLevelConfig(row));
  }

  async save() {
    // Only clear other defaults within the same GLOBAL scope
    if (this.isDefault && (this.scopeType === 'GLOBAL' || !this.scopeType)) {
      await pool.query(
        "UPDATE course_level_configs SET isDefault = 0 WHERE id != ? AND (scopeType = 'GLOBAL' OR scopeType IS NULL)",
        [this.id]
      );
    }

    // Sort levels
    if (this.levels && this.levels.length > 0) {
      this.levels.sort((a, b) => a.order - b.order);
    }

    this.updatedAt = new Date();

    const fields = [
      "name", "description", "levels", "isActive", "isDefault",
      "scopeType", "unit", "departmentId", "departmentName",
      "createdBy", "lastModifiedBy", "updatedAt"
    ];

    const setClause = fields.map(field => `${field} = ?`).join(", ");
    const values = fields.map(field => {
      let val = this[field];
      if (field === 'levels') return JSON.stringify(val);
      return val;
    });
    values.push(this.id);

    await pool.query(`UPDATE course_level_configs SET ${setClause} WHERE id = ?`, values);
    return this;
  }

  /**
   * Cascading Resolution: DEPARTMENT -> UNIT -> GLOBAL -> Seed Fallback
   */
  static async getActiveConfig(options = {}) {
    const { unit, departmentId } = options;

    // 1. Department override check
    if (departmentId) {
      const [rows] = await pool.query(
        "SELECT TOP 1 * FROM course_level_configs WHERE isActive = 1 AND scopeType = 'DEPARTMENT' AND departmentId = ? ORDER BY updatedAt DESC, id DESC",
        [departmentId]
      );
      if (rows.length > 0) return new CourseLevelConfig(rows[0]);
    }

    // 2. Unit override check (if unit not provided, derive from department if possible)
    let resolvedUnit = unit;
    if (!resolvedUnit && departmentId) {
      const [dRows] = await pool.query("SELECT unit FROM departments WHERE id = ?", [departmentId]);
      if (dRows.length > 0 && dRows[0].unit) {
        resolvedUnit = dRows[0].unit;
      }
    }

    if (resolvedUnit) {
      const [rows] = await pool.query(
        "SELECT TOP 1 * FROM course_level_configs WHERE isActive = 1 AND scopeType = 'UNIT' AND unit = ? ORDER BY updatedAt DESC, id DESC",
        [resolvedUnit]
      );
      if (rows.length > 0) return new CourseLevelConfig(rows[0]);
    }

    // 3. Global Default check (scopeType must be GLOBAL or NULL)
    let [rows] = await pool.query(
      "SELECT TOP 1 * FROM course_level_configs WHERE isActive = 1 AND isDefault = 1 AND (scopeType = 'GLOBAL' OR scopeType IS NULL)"
    );

    if (rows.length === 0) {
      [rows] = await pool.query(
        "SELECT TOP 1 * FROM course_level_configs WHERE isActive = 1 AND (scopeType = 'GLOBAL' OR scopeType IS NULL) ORDER BY createdAt DESC"
      );
    }

    // 4. Seed default if table completely lacks a global active config
    if (rows.length === 0) {
      return await this.create({
        name: "Default Configuration",
        description: "Default 3-level system (L1, L2, L3)",
        isDefault: true,
        isActive: true,
        scopeType: "GLOBAL",
        levels: [
          { name: "L1", order: 0, completionTimeframe: { minDays: 1, maxDays: 4 }, description: "Beginner Level", color: "#3B82F6" },
          { name: "L2", order: 1, completionTimeframe: { minDays: 5, maxDays: 8 }, description: "Intermediate Level", color: "#F97316" },
          { name: "L3", order: 2, completionTimeframe: { minDays: 9, maxDays: 12 }, description: "Advanced Level", color: "#10B981" },
        ],
      });
    }

    return new CourseLevelConfig(rows[0]);
  }

  /**
   * Return active configuration with explicit inheritance source indicator
   */
  static async getEffectiveConfigWithSource(options = {}) {
    const { unit, departmentId } = options;

    if (departmentId) {
      const [rows] = await pool.query(
        "SELECT TOP 1 * FROM course_level_configs WHERE isActive = 1 AND scopeType = 'DEPARTMENT' AND departmentId = ? ORDER BY updatedAt DESC, id DESC",
        [departmentId]
      );
      if (rows.length > 0) {
        return { config: new CourseLevelConfig(rows[0]), source: "DEPARTMENT" };
      }
    }

    let resolvedUnit = unit;
    if (!resolvedUnit && departmentId) {
      const [dRows] = await pool.query("SELECT unit FROM departments WHERE id = ?", [departmentId]);
      if (dRows.length > 0 && dRows[0].unit) {
        resolvedUnit = dRows[0].unit;
      }
    }

    if (resolvedUnit) {
      const [rows] = await pool.query(
        "SELECT TOP 1 * FROM course_level_configs WHERE isActive = 1 AND scopeType = 'UNIT' AND unit = ? ORDER BY updatedAt DESC, id DESC",
        [resolvedUnit]
      );
      if (rows.length > 0) {
        return { config: new CourseLevelConfig(rows[0]), source: "UNIT" };
      }
    }

    const globalConfig = await this.getActiveConfig();
    return { config: globalConfig, source: "GLOBAL" };
  }

  /**
   * Build complete hierarchy matrix for SuperAdmin governance
   */
  static async findHierarchyMatrix() {
    // 1. Get active Global config
    const globalConfig = await this.getActiveConfig();

    // 2. Get all units
    const [units] = await pool.query("SELECT id, title FROM units WHERE isActive = 1 ORDER BY title ASC");

    // 3. Get all active departments
    const [departments] = await pool.query("SELECT id, name, unit FROM departments WHERE isDeleted = 0 ORDER BY unit ASC, name ASC");

    // 4. Get all active overrides
    const [overrides] = await pool.query("SELECT * FROM course_level_configs WHERE isActive = 1 AND scopeType IN ('UNIT', 'DEPARTMENT')");
    const overrideMap = new Map();
    for (const row of overrides) {
      const cfg = new CourseLevelConfig(row);
      if (cfg.scopeType === 'UNIT' && cfg.unit) {
        overrideMap.set(`UNIT:${cfg.unit.toUpperCase()}`, cfg);
      } else if (cfg.scopeType === 'DEPARTMENT' && cfg.departmentId) {
        overrideMap.set(`DEPARTMENT:${cfg.departmentId}`, cfg);
      }
    }

    // Units matrix
    const unitsMatrix = units.map(u => {
      const key = `UNIT:${u.title.toUpperCase()}`;
      const hasOverride = overrideMap.has(key);
      const config = hasOverride ? overrideMap.get(key) : globalConfig;
      return {
        unit: u.title,
        unitId: u.id,
        hasOverride,
        source: hasOverride ? "UNIT" : "GLOBAL",
        config: config
      };
    });

    // Departments matrix
    const departmentsMatrix = departments.map(d => {
      const deptKey = `DEPARTMENT:${d.id}`;
      const unitKey = d.unit ? `UNIT:${d.unit.toUpperCase()}` : null;

      let hasDeptOverride = overrideMap.has(deptKey);
      let config = null;
      let source = "GLOBAL";

      if (hasDeptOverride) {
        config = overrideMap.get(deptKey);
        source = "DEPARTMENT";
      } else if (unitKey && overrideMap.has(unitKey)) {
        config = overrideMap.get(unitKey);
        source = "UNIT";
      } else {
        config = globalConfig;
        source = "GLOBAL";
      }

      return {
        departmentId: d.id,
        departmentName: d.name,
        unit: d.unit || null,
        hasOverride: hasDeptOverride,
        source,
        config
      };
    });

    return {
      global: globalConfig,
      units: unitsMatrix,
      departments: departmentsMatrix
    };
  }

  /**
   * Delete an override so unit/department reverts to parent inheritance
   */
  static async deleteScopeOverride({ scopeType, unit, departmentId }) {
    if (scopeType === 'UNIT' && unit) {
      await pool.query("DELETE FROM course_level_configs WHERE scopeType = 'UNIT' AND unit = ?", [unit]);
      return true;
    } else if (scopeType === 'DEPARTMENT' && departmentId) {
      await pool.query("DELETE FROM course_level_configs WHERE scopeType = 'DEPARTMENT' AND departmentId = ?", [departmentId]);
      return true;
    }
    return false;
  }

  /**
   * Validate that an override does not remove/rename levels currently in use
   */
  static async validateOverrideSafety(newLevels, scopeContext = {}) {
    const { scopeType, unit, departmentId } = scopeContext;
    const newLevelNames = (newLevels || []).map(l => String(l.name).trim().toUpperCase());

    // 1. Gather all currently used levels in this scope
    let studentCondition = "";
    let studentParams = [];

    if (scopeType === 'DEPARTMENT' && departmentId) {
      studentCondition = "WHERE department = ?";
      studentParams = [departmentId];
    } else if (scopeType === 'UNIT' && unit) {
      studentCondition = "WHERE unit = ?";
      studentParams = [unit];
    }

    // Check users currentLevel
    const [usedInUsers] = await pool.query(
      `SELECT DISTINCT currentLevel FROM users ${studentCondition}`,
      studentParams
    );

    // Check progress currentLevel
    let progressQuery = "SELECT DISTINCT currentLevel FROM progress WHERE currentLevel IS NOT NULL";
    let progressParams = [];
    if (scopeType === 'DEPARTMENT' && departmentId) {
      progressQuery = `
        SELECT DISTINCT p.currentLevel 
        FROM progress p
        INNER JOIN users u ON p.student = u.id
        WHERE u.department = ? AND p.currentLevel IS NOT NULL
      `;
      progressParams = [departmentId];
    } else if (scopeType === 'UNIT' && unit) {
      progressQuery = `
        SELECT DISTINCT p.currentLevel 
        FROM progress p
        INNER JOIN users u ON p.student = u.id
        WHERE u.unit = ? AND p.currentLevel IS NOT NULL
      `;
      progressParams = [unit];
    }

    const [usedInProgress] = await pool.query(progressQuery, progressParams);

    const allInUse = new Set();
    usedInUsers.forEach(r => { if (r.currentLevel) allInUse.add(r.currentLevel.trim().toUpperCase()); });
    usedInProgress.forEach(r => { if (r.currentLevel) allInUse.add(r.currentLevel.trim().toUpperCase()); });

    const missingLevels = [];
    for (const inUse of allInUse) {
      if (!newLevelNames.includes(inUse)) {
        missingLevels.push(inUse);
      }
    }

    if (missingLevels.length > 0) {
      return {
        isValid: false,
        missingLevels,
        reason: `Level(s) ${missingLevels.join(", ")} are currently assigned to active students in this scope and cannot be removed or renamed.`
      };
    }

    return { isValid: true };
  }

  static async isValidLevel(levelName, options = {}) {
    const config = await this.getActiveConfig(options);
    if (!config) return false;
    return config.levels.some(level => level.name.toUpperCase() === levelName.toUpperCase());
  }

  static async getLevelByName(levelName, options = {}) {
    const config = await this.getActiveConfig(options);
    if (!config) return null;
    return config.levels.find(level => level.name.toUpperCase() === levelName.toUpperCase());
  }

  getNextLevel(currentLevelName) {
    if (!currentLevelName) return this.levels[0];
    const currentLevel = this.levels.find(l => l.name.toUpperCase() === currentLevelName.toUpperCase());
    if (!currentLevel) return null;
    return this.levels.find(l => l.order === currentLevel.order + 1) || null;
  }

  getPreviousLevel(currentLevelName) {
    const currentLevel = this.levels.find(l => l.name.toUpperCase() === currentLevelName.toUpperCase());
    if (!currentLevel || currentLevel.order === 0) return null;
    return this.levels.find(l => l.order === currentLevel.order - 1) || null;
  }
}

// Initialize table
CourseLevelConfig.init();

export default CourseLevelConfig;
