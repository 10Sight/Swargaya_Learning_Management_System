import { pool } from "../db/connectDB.js";
import logger from "../logger/winston.logger.js";

class AttemptExtensionRequest {
  constructor(data) {
    this.id = data.id;
    this._id = data.id; // Compatibility

    this.quiz = data.quiz;
    this.student = data.student;
    this.reason = data.reason;
    this.status = data.status || 'PENDING';
    this.reviewedBy = data.reviewedBy;
    this.reviewedAt = data.reviewedAt ? new Date(data.reviewedAt) : null;
    this.extraAttemptsGranted = data.extraAttemptsGranted !== undefined ? data.extraAttemptsGranted : 1;

    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async init() {
    const query = `
            CREATE TABLE IF NOT EXISTS attempt_extension_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                quiz VARCHAR(255) NOT NULL,
                student VARCHAR(255) NOT NULL,
                reason TEXT,
                status VARCHAR(50) DEFAULT 'PENDING',
                reviewedBy VARCHAR(255),
                reviewedAt DATETIME,
                extraAttemptsGranted INT DEFAULT 1,
                createdAt DATETIME,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_quiz_student_status (quiz, student, status)
            )
        `;
    try {
      await pool.query(query);
    } catch (error) {
      logger.error("Failed to initialize AttemptExtensionRequest table", error);
    }
  }

  static async create(data) {
    const request = new AttemptExtensionRequest(data);

    const fields = [
      "quiz", "student", "reason", "status",
      "reviewedBy", "reviewedAt", "extraAttemptsGranted", "createdAt"
    ];

    if (!request.createdAt) request.createdAt = new Date();

    const values = fields.map(field => {
      const val = request[field];
      if (val === undefined) return null;
      return val;
    });

    const placeholders = fields.map(() => "?").join(",");
    const query = `INSERT INTO attempt_extension_requests (${fields.join(",")}) VALUES (${placeholders})`;

    const [result] = await pool.query(query, values);
    return AttemptExtensionRequest.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query("SELECT * FROM attempt_extension_requests WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return new AttemptExtensionRequest(rows[0]);
  }

  static async findOne(query) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    if (keys.length === 0) return null;

    const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
    const values = keys.map(key => query[key]);

    const [rows] = await pool.query(`SELECT * FROM attempt_extension_requests WHERE ${whereClause} LIMIT 1`, values);
    if (rows.length === 0) return null;
    return new AttemptExtensionRequest(rows[0]);
  }

  static async find(query = {}) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    let sql = "SELECT * FROM attempt_extension_requests";
    let values = [];

    if (keys.length > 0) {
      const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
      sql += ` WHERE ${whereClause}`;
      values = keys.map(key => query[key]);
    }

    const [rows] = await pool.query(sql, values);
    return rows.map(row => new AttemptExtensionRequest(row));
  }

  static async countDocuments(query = {}) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    let sql = "SELECT COUNT(*) as count FROM attempt_extension_requests";
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
      "quiz", "student", "reason", "status",
      "reviewedBy", "reviewedAt", "extraAttemptsGranted"
    ];

    const setClause = fields.map(field => `${field} = ?`).join(", ");
    const values = fields.map(field => this[field]);
    values.push(this.id);

    await pool.query(`UPDATE attempt_extension_requests SET ${setClause} WHERE id = ?`, values);
    return this;
  }
}

// Initialize table
AttemptExtensionRequest.init();

export default AttemptExtensionRequest;
