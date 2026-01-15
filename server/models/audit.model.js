import { pool } from "../db/connectDB.js";
import logger from "../logger/winston.logger.js";

class Audit {
  constructor(data) {
    this.id = data.id;
    this._id = data.id; // Compatibility

    this.user = data.user;
    this.action = data.action;
    this.resourceType = data.resourceType;
    this.resourceId = data.resourceId;
    this.severity = data.severity || 'low';
    this.status = data.status || 'success';
    this.ip = data.ip;
    this.userAgent = data.userAgent;
    this.details = typeof data.details === 'string' ? JSON.parse(data.details) : (data.details || {});

    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async init() {
    const query = `
            CREATE TABLE IF NOT EXISTS audits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user VARCHAR(255),
                action VARCHAR(255) NOT NULL,
                resourceType VARCHAR(255),
                resourceId VARCHAR(255),
                severity VARCHAR(50) DEFAULT 'low',
                status VARCHAR(50) DEFAULT 'success',
                ip VARCHAR(255),
                userAgent TEXT,
                details TEXT,
                createdAt DATETIME,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_created (user, createdAt DESC)
            )
        `;
    try {
      await pool.query(query);
    } catch (error) {
      logger.error("Failed to initialize Audit table", error);
    }
  }

  static async create(data) {
    const audit = new Audit(data);

    const fields = [
      "user", "action", "resourceType", "resourceId",
      "severity", "status", "ip", "userAgent", "details", "createdAt"
    ];

    if (!audit.createdAt) audit.createdAt = new Date();

    const values = fields.map(field => {
      let val = audit[field];
      if (field === 'details') return JSON.stringify(val);
      if (val === undefined) return null;
      return val;
    });

    const placeholders = fields.map(() => "?").join(",");
    const query = `INSERT INTO audits (${fields.join(",")}) VALUES (${placeholders})`;

    const [result] = await pool.query(query, values);
    return Audit.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query("SELECT * FROM audits WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return new Audit(rows[0]);
  }

  static async findOne(query) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    if (keys.length === 0) return null;

    const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
    const values = keys.map(key => query[key]);

    const [rows] = await pool.query(`SELECT * FROM audits WHERE ${whereClause} LIMIT 1`, values);
    if (rows.length === 0) return null;
    return new Audit(rows[0]);
  }

  static async find(query = {}) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    let sql = "SELECT * FROM audits";
    let values = [];

    if (keys.length > 0) {
      const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
      sql += ` WHERE ${whereClause}`;
      values = keys.map(key => query[key]);
    }

    // Default sort by createdAt DESC as per original model index hint
    sql += " ORDER BY createdAt DESC";

    const [rows] = await pool.query(sql, values);
    return rows.map(row => new Audit(row));
  }

  static async countDocuments(query = {}) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    let sql = "SELECT COUNT(*) as count FROM audits";
    let values = [];

    if (keys.length > 0) {
      const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
      sql += ` WHERE ${whereClause}`;
      values = keys.map(key => query[key]);
    }

    const [rows] = await pool.query(sql, values);
    return rows[0].count;
  }

  async save() {
    const fields = [
      "user", "action", "resourceType", "resourceId",
      "severity", "status", "ip", "userAgent", "details"
    ];

    const setClause = fields.map(field => `${field} = ?`).join(", ");
    const values = fields.map(field => {
      let val = this[field];
      if (field === 'details') return JSON.stringify(val);
      return val;
    });
    values.push(this.id);

    await pool.query(`UPDATE audits SET ${setClause} WHERE id = ?`, values);
    return this;
  }
}

// Initialize table
Audit.init();

export default Audit;
