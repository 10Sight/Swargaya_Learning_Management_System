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
            CREATE TABLE IF NOT EXISTS course_level_configs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                levels TEXT NOT NULL,
                isActive BOOLEAN DEFAULT TRUE,
                isDefault BOOLEAN DEFAULT FALSE,
                createdBy VARCHAR(255),
                lastModifiedBy VARCHAR(255),
                createdAt DATETIME,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (isActive, isDefault)
            )
        `;
    try {
      await pool.query(query);
    } catch (error) {
      logger.error("Failed to initialize CourseLevelConfig table", error);
    }
  }

  static async create(data) {
    // Validation logic
    const levels = data.levels || [];
    if (levels.length === 0) throw new Error("At least one level is required");

    // Ensure explicit default logic
    if (data.isDefault) {
      await pool.query("UPDATE course_level_configs SET isDefault = FALSE");
    }

    // Sort levels
    levels.sort((a, b) => a.order - b.order);

    const config = new CourseLevelConfig({ ...data, levels });

    const fields = [
      "name", "description", "levels", "isActive", "isDefault",
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
    const query = `INSERT INTO course_level_configs (${fields.join(",")}) VALUES (${placeholders})`;

    const [result] = await pool.query(query, values);
    return CourseLevelConfig.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query("SELECT * FROM course_level_configs WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return new CourseLevelConfig(rows[0]);
  }

  static async findOne(query) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    let sql = "SELECT * FROM course_level_configs";
    let values = [];

    if (keys.length > 0) {
      const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
      sql += ` WHERE ${whereClause}`;
      values = keys.map(key => query[key]);
    }

    sql += " LIMIT 1";

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
      // Very basic sort handling
      const sortKey = Object.keys(query.sort)[0];
      const sortOrder = query.sort[sortKey] === -1 ? 'DESC' : 'ASC';
      sql += ` ORDER BY ${sortKey} ${sortOrder}`;
    }

    const [rows] = await pool.query(sql, values);
    return rows.map(row => new CourseLevelConfig(row));
  }

  async save() {
    if (this.isDefault) {
      await pool.query("UPDATE course_level_configs SET isDefault = FALSE WHERE id != ?", [this.id]);
    }

    // Sort levels
    if (this.levels && this.levels.length > 0) {
      this.levels.sort((a, b) => a.order - b.order);
    }

    const fields = [
      "name", "description", "levels", "isActive", "isDefault",
      "createdBy", "lastModifiedBy"
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

  // Helper: Get Active Config
  static async getActiveConfig() {
    let [rows] = await pool.query("SELECT * FROM course_level_configs WHERE isActive = TRUE AND isDefault = TRUE LIMIT 1");

    if (rows.length === 0) {
      [rows] = await pool.query("SELECT * FROM course_level_configs WHERE isActive = TRUE ORDER BY createdAt DESC LIMIT 1");
    }

    if (rows.length === 0) {
      // Create default
      return await this.create({
        name: "Default Configuration",
        description: "Default 3-level system (L1, L2, L3)",
        isDefault: true,
        isActive: true,
        levels: [
          { name: "L1", order: 0, completionTimeframe: { minDays: 1, maxDays: 4 }, description: "Beginner Level", color: "#3B82F6" },
          { name: "L2", order: 1, completionTimeframe: { minDays: 5, maxDays: 8 }, description: "Intermediate Level", color: "#F97316" },
          { name: "L3", order: 2, completionTimeframe: { minDays: 9, maxDays: 12 }, description: "Advanced Level", color: "#10B981" },
        ],
      });
    }
    return new CourseLevelConfig(rows[0]);
  }

  static async isValidLevel(levelName) {
    const config = await this.getActiveConfig();
    if (!config) return false;
    return config.levels.some(level => level.name.toUpperCase() === levelName.toUpperCase());
  }

  static async getLevelByName(levelName) {
    const config = await this.getActiveConfig();
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
