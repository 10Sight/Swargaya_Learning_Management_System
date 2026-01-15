import { pool } from "../db/connectDB.js";
import logger from "../logger/winston.logger.js";

class ModuleTimeline {
  constructor(data) {
    this.id = data.id;
    this._id = data.id; // Compatibility

    this.course = data.course;
    this.module = data.module;
    this.department = data.department;
    this.deadline = data.deadline ? new Date(data.deadline) : null;
    this.gracePeriodHours = data.gracePeriodHours !== undefined ? data.gracePeriodHours : 24;
    this.isActive = data.isActive !== undefined ? !!data.isActive : true;
    this.enableWarnings = data.enableWarnings !== undefined ? !!data.enableWarnings : true;
    this.warningPeriods = typeof data.warningPeriods === 'string' ? JSON.parse(data.warningPeriods) : (data.warningPeriods || [168, 72, 24]);
    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;
    this.missedDeadlineStudents = typeof data.missedDeadlineStudents === 'string' ? JSON.parse(data.missedDeadlineStudents) : (data.missedDeadlineStudents || []);
    this.warningsSent = typeof data.warningsSent === 'string' ? JSON.parse(data.warningsSent) : (data.warningsSent || []);
    this.description = data.description;
    this.lastProcessedAt = data.lastProcessedAt ? new Date(data.lastProcessedAt) : null;

    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static async init() {
    const query = `
            CREATE TABLE IF NOT EXISTS module_timelines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                course VARCHAR(255) NOT NULL,
                module VARCHAR(255) NOT NULL,
                department VARCHAR(255) NOT NULL,
                deadline DATETIME NOT NULL,
                gracePeriodHours INT DEFAULT 24,
                isActive BOOLEAN DEFAULT TRUE,
                enableWarnings BOOLEAN DEFAULT TRUE,
                warningPeriods TEXT,
                createdBy VARCHAR(255) NOT NULL,
                updatedBy VARCHAR(255),
                missedDeadlineStudents TEXT,
                warningsSent TEXT,
                description TEXT,
                lastProcessedAt DATETIME,
                createdAt DATETIME,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_course_dept (course, department),
                INDEX idx_deadline_active (deadline, isActive),
                INDEX idx_dept_deadline (department, deadline),
                INDEX idx_lastProcessedAt (lastProcessedAt)
            )
        `;
    try {
      await pool.query(query);
    } catch (error) {
      logger.error("Failed to initialize ModuleTimeline table", error);
    }
  }

  static async create(data) {
    const timeline = new ModuleTimeline(data);

    const fields = [
      "course", "module", "department", "deadline",
      "gracePeriodHours", "isActive", "enableWarnings", "warningPeriods",
      "createdBy", "updatedBy", "missedDeadlineStudents", "warningsSent",
      "description", "lastProcessedAt", "createdAt"
    ];

    if (!timeline.createdAt) timeline.createdAt = new Date();

    const values = fields.map(field => {
      let val = timeline[field];
      if (['warningPeriods', 'missedDeadlineStudents', 'warningsSent'].includes(field)) {
        return JSON.stringify(val);
      }
      if (val === undefined) return null;
      return val;
    });

    const placeholders = fields.map(() => "?").join(",");
    const query = `INSERT INTO module_timelines (${fields.join(",")}) VALUES (${placeholders})`;

    const [result] = await pool.query(query, values);
    return ModuleTimeline.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query("SELECT * FROM module_timelines WHERE id = ?", [id]);
    if (rows.length === 0) return null;
    return new ModuleTimeline(rows[0]);
  }

  static async findOne(query) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined);
    if (keys.length === 0) return null;

    const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
    const values = keys.map(key => query[key]);

    const [rows] = await pool.query(`SELECT * FROM module_timelines WHERE ${whereClause} LIMIT 1`, values);
    if (rows.length === 0) return null;
    return new ModuleTimeline(rows[0]);
  }

  static async find(query = {}) {
    const keys = Object.keys(query).filter(key => query[key] !== undefined && !['deadline', '$or', 'lastProcessedAt'].includes(key));

    // Basic SELECT
    let sql = "SELECT * FROM module_timelines";
    let values = [];
    let conditions = [];

    // Direct equality
    if (keys.length > 0) {
      conditions.push(...keys.map(key => `${key} = ?`));
      values.push(...keys.map(key => query[key]));
    }

    // Handle deadline comparisons (e.g. deadline: { $lte: now })
    if (query.deadline && query.deadline.$lte) {
      conditions.push("deadline <= ?");
      values.push(query.deadline.$lte);
    } else if (query.deadline && query.deadline.$gt) {
      conditions.push("deadline > ?");
      values.push(query.deadline.$gt);
    }

    // Handle OR logic for lastProcessedAt
    if (query.$or) {
      const orConditions = query.$or.map(cond => {
        if (cond.lastProcessedAt && cond.lastProcessedAt.$exists === false) return "lastProcessedAt IS NULL";
        if (cond.lastProcessedAt && cond.lastProcessedAt.$lte) {
          values.push(cond.lastProcessedAt.$lte);
          return "lastProcessedAt <= ?";
        }
        return "1=0";
      });
      if (orConditions.length > 0) {
        conditions.push(`(${orConditions.join(" OR ")})`);
      }
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    const [rows] = await pool.query(sql, values);
    return rows.map(row => new ModuleTimeline(row));
  }

  // Instance Methods
  hasStudentMissedDeadline(studentId) {
    return this.missedDeadlineStudents.some(
      missed => missed.student == studentId // loose equality for string/int IDs
    );
  }

  addMissedDeadlineStudent(studentId, previousModuleId) {
    if (!this.hasStudentMissedDeadline(studentId)) {
      this.missedDeadlineStudents.push({
        student: studentId,
        missedAt: new Date(),
        previousModule: previousModuleId,
      });
    }
  }

  markStudentDemoted(studentId) {
    const missedRecord = this.missedDeadlineStudents.find(
      missed => missed.student == studentId
    );
    if (missedRecord) {
      missedRecord.demotedAt = new Date();
    }
  }

  shouldSendWarning(studentId, warningType) {
    if (!this.enableWarnings) return false;
    return !this.warningsSent.some(
      warning => warning.student == studentId && warning.warningType === warningType
    );
  }

  recordWarningSent(studentId, warningType) {
    this.warningsSent.push({
      student: studentId,
      warningType: warningType,
      sentAt: new Date(),
    });
  }

  async save() {
    const fields = [
      "course", "module", "department", "deadline",
      "gracePeriodHours", "isActive", "enableWarnings", "warningPeriods",
      "createdBy", "updatedBy", "missedDeadlineStudents", "warningsSent",
      "description", "lastProcessedAt"
    ];

    const setClause = fields.map(field => `${field} = ?`).join(", ");
    const values = fields.map(field => {
      let val = this[field];
      if (['warningPeriods', 'missedDeadlineStudents', 'warningsSent'].includes(field)) {
        return JSON.stringify(val);
      }
      return val;
    });
    values.push(this.id);

    await pool.query(`UPDATE module_timelines SET ${setClause} WHERE id = ?`, values);
    return this;
  }

  // Static Helpers
  static async getTimelinesToProcess() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    return this.find({
      isActive: true,
      deadline: { $lte: now },
      $or: [
        { lastProcessedAt: { $exists: false } }, // handled by find as IS NULL
        { lastProcessedAt: { $lte: oneHourAgo } }
      ]
    });
    // Note: Population logic removed as it requires SQL joins or separate queries, 
    // which should be handled by the service layer or by adding specific method with JOINS.
  }

  static async getUpcomingWarnings() {
    const now = new Date();
    return this.find({
      isActive: true,
      enableWarnings: true,
      deadline: { $gt: now },
    });
  }
}

// Initialize table
ModuleTimeline.init();

export default ModuleTimeline;
