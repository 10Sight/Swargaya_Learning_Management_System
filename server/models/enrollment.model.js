import { pool } from "../db/connectDB.js";
import logger from "../logger/winston.logger.js";

class Enrollment {
  constructor(data) {
    this.id = data.id;
    this._id = data.id; // Compatibility

    this.student = data.student;
    this.course = data.course;
    this.enrolledBy = data.enrolledBy;
    this.paymentStatus = data.paymentStatus || "PENDING";
    this.paymentMethod = data.paymentMethod || "FREE";
    this.enrolledAt = data.enrolledAt ? new Date(data.enrolledAt) : new Date();
    this.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    this.isActive = data.isActive !== undefined ? !!data.isActive : true;

    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async init() {
    const query = `
            IF OBJECT_ID(N'dbo.enrollments', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.enrollments (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    student VARCHAR(255) NOT NULL,
                    course VARCHAR(255) NOT NULL,
                    enrolledBy VARCHAR(255) NOT NULL,
                    paymentStatus VARCHAR(50) DEFAULT 'PENDING',
                    paymentMethod VARCHAR(50) DEFAULT 'FREE',
                    enrolledAt DATETIME,
                    expiresAt DATETIME,
                    isActive BIT DEFAULT 1,
                    createdAt DATETIME DEFAULT GETDATE(),
                    updatedAt DATETIME DEFAULT GETDATE(),
                    CONSTRAINT unique_enrollment UNIQUE (student, course)
                );
                
                CREATE INDEX idx_student ON dbo.enrollments(student);
                CREATE INDEX idx_course ON dbo.enrollments(course);
            END
        `;
    try {
      await pool.query(query);
    } catch (error) {
      logger.error("Failed to initialize Enrollment table", error);
    }
  }

  static async create(data) {
    const enrollment = new Enrollment(data);

    const fields = [
      "student", "course", "enrolledBy", "paymentStatus",
      "paymentMethod", "enrolledAt", "expiresAt", "isActive", "createdAt"
    ];

    if (!enrollment.createdAt) enrollment.createdAt = new Date();

    const values = fields.map(field => {
      const val = enrollment[field];
      if (val === undefined) return null;
      return val;
    });

    const placeholders = fields.map(() => "?").join(",");
    const query = `INSERT INTO enrollments (${fields.join(",")}) VALUES (${placeholders})`;

    const [result] = await pool.query(query, values);
    return Enrollment.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query("SELECT * FROM enrollments WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return new Enrollment(rows[0]);
  }

  static async findOne(query) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    if (keys.length === 0) return null;

    const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
    const values = keys.map(key => query[key]);

    const [rows] = await pool.query(`SELECT TOP 1 * FROM enrollments WHERE ${whereClause}`, values);
    if (rows.length === 0) return null;
    return new Enrollment(rows[0]);
  }

  static async find(query = {}) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    let sql = "SELECT * FROM enrollments";
    let values = [];

    if (keys.length > 0) {
      const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
      sql += ` WHERE ${whereClause}`;
      values = keys.map(key => query[key]);
    }

    const [rows] = await pool.query(sql, values);
    return rows.map(row => new Enrollment(row));
  }

  static async countDocuments(query = {}) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    let sql = "SELECT COUNT(*) as count FROM enrollments";
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
    this.updatedAt = new Date(); // Manually update timestamp

    const fields = [
      "student", "course", "enrolledBy", "paymentStatus",
      "paymentMethod", "enrolledAt", "expiresAt", "isActive", "updatedAt"
    ];

    const setClause = fields.map(field => `${field} = ?`).join(", ");
    const values = fields.map(field => {
      if (field === 'updatedAt') return this.updatedAt;
      return this[field];
    });
    values.push(this.id);

    await pool.query(`UPDATE enrollments SET ${setClause} WHERE id = ?`, values);
    return this;
  }
}

// Initialize table
Enrollment.init();

export default Enrollment;
