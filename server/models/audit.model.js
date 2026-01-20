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
            IF OBJECT_ID(N'dbo.audits', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.audits (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    [user] VARCHAR(255),
                    action VARCHAR(255) NOT NULL,
                    resourceType VARCHAR(255),
                    resourceId VARCHAR(255),
                    severity VARCHAR(50) DEFAULT 'low',
                    status VARCHAR(50) DEFAULT 'success',
                    ip VARCHAR(255),
                    userAgent VARCHAR(MAX),
                    details VARCHAR(MAX),
                    createdAt DATETIME DEFAULT GETDATE(),
                    updatedAt DATETIME DEFAULT GETDATE()
                );
                
                CREATE INDEX idx_user_created ON dbo.audits([user], createdAt DESC);
            END
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
    const query = `INSERT INTO audits (${fields.map(f => f === 'user' ? '[user]' : f).join(",")}) VALUES (${placeholders}); SELECT SCOPE_IDENTITY() AS id;`;

    const [rows] = await pool.query(query, values);
    return Audit.findById(rows[0].id);
  }

  static async findById(id) {
    const [rows] = await pool.query("SELECT * FROM audits WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return new Audit(rows[0]);
  }

  static async findOne(query) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    if (keys.length === 0) return null;

    const whereClause = keys.map(key => `${key === 'user' ? '[user]' : key} = ?`).join(" AND ");
    const values = keys.map(key => query[key]);

    const [rows] = await pool.query(`SELECT TOP 1 * FROM audits WHERE ${whereClause}`, values);
    if (rows.length === 0) return null;
    return new Audit(rows[0]);
  }

  static async find(query = {}) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    let sql = "SELECT * FROM audits";
    let values = [];

    if (keys.length > 0) {
      const whereClause = keys.map(key => `${key === 'user' ? '[user]' : key} = ?`).join(" AND ");
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
      const whereClause = keys.map(key => `${key === 'user' ? '[user]' : key} = ?`).join(" AND ");
      sql += ` WHERE ${whereClause}`;
      values = keys.map(key => query[key]);
    }

    const [rows] = await pool.query(sql, values);
    return rows[0].count;
  }

  async save() {
    this.updatedAt = new Date(); // Manually update timestamp

    const fields = [
      "user", "action", "resourceType", "resourceId",
      "severity", "status", "ip", "userAgent", "details", "updatedAt"
    ];

    const setClause = fields.map(field => `${field === 'user' ? '[user]' : field} = ?`).join(", ");
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
