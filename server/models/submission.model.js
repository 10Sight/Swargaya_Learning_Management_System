import { pool } from "../db/connectDB.js";
import logger from "../logger/winston.logger.js";

class Submission {
    constructor(data) {
        this.id = data.id;
        this._id = data.id; // Compatibility

        this.assignment = data.assignment;
        this.student = data.student;
        this.fileUrl = data.fileUrl;
        this.attachments = typeof data.attachments === 'string' ? JSON.parse(data.attachments) : (data.attachments || []);
        this.grade = data.grade !== undefined ? data.grade : null;
        this.feedback = data.feedback;
        this.submittedAt = data.submittedAt ? new Date(data.submittedAt) : new Date();
        this.isLate = data.isLate !== undefined ? !!data.isLate : false;
        this.resubmissionCount = data.resubmissionCount !== undefined ? data.resubmissionCount : 0;
        this.status = data.status || 'SUBMITTED';
        this.gradedAt = data.gradedAt ? new Date(data.gradedAt) : null;
        this.gradedBy = data.gradedBy || null;

        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    static async init() {
        const query = `
            CREATE TABLE IF NOT EXISTS submissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                assignment VARCHAR(255) NOT NULL,
                student VARCHAR(255) NOT NULL,
                fileUrl TEXT,
                attachments TEXT,
                grade DECIMAL(5, 2) DEFAULT NULL,
                feedback TEXT,
                submittedAt DATETIME,
                isLate BOOLEAN DEFAULT FALSE,
                resubmissionCount INT DEFAULT 0,
                status VARCHAR(50) DEFAULT 'SUBMITTED',
                gradedAt DATETIME,
                gradedBy VARCHAR(255),
                createdAt DATETIME,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_submission (assignment, student),
                INDEX idx_assignment (assignment),
                INDEX idx_student (student)
            )
        `;
        try {
            await pool.query(query);
        } catch (error) {
            logger.error("Failed to initialize Submission table", error);
        }
    }

    static async create(data) {
        const submission = new Submission(data);

        const fields = [
            "assignment", "student", "fileUrl", "attachments",
            "grade", "feedback", "submittedAt", "isLate",
            "resubmissionCount", "status", "gradedAt", "gradedBy", "createdAt"
        ];

        if (!submission.createdAt) submission.createdAt = new Date();

        const values = fields.map(field => {
            let val = submission[field];
            if (field === 'attachments') return JSON.stringify(val);
            if (val === undefined) return null;
            return val;
        });

        const placeholders = fields.map(() => "?").join(",");
        const query = `INSERT INTO submissions (${fields.join(",")}) VALUES (${placeholders})`;

        const [result] = await pool.query(query, values);
        return Submission.findById(result.insertId);
    }

    static async findById(id) {
        const [rows] = await pool.query("SELECT * FROM submissions WHERE id = ?", [id]);
        if (rows.length === 0) return null;
        return new Submission(rows[0]);
    }

    static async findOne(query) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        if (keys.length === 0) return null;

        const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
        const values = keys.map(key => query[key]);

        const [rows] = await pool.query(`SELECT * FROM submissions WHERE ${whereClause} LIMIT 1`, values);
        if (rows.length === 0) return null;
        return new Submission(rows[0]);
    }

    static async find(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT * FROM submissions";
        let values = [];

        if (keys.length > 0) {
            const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
            sql += ` WHERE ${whereClause}`;
            values = keys.map(key => query[key]);
        }

        const [rows] = await pool.query(sql, values);
        return rows.map(row => new Submission(row));
    }

    static async countDocuments(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT COUNT(*) as count FROM submissions";
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
            "assignment", "student", "fileUrl", "attachments",
            "grade", "feedback", "submittedAt", "isLate",
            "resubmissionCount", "status", "gradedAt", "gradedBy"
        ];

        const setClause = fields.map(field => `${field} = ?`).join(", ");
        const values = fields.map(field => {
            let val = this[field];
            if (field === 'attachments') return JSON.stringify(val);
            return val;
        });
        values.push(this.id);

        await pool.query(`UPDATE submissions SET ${setClause} WHERE id = ?`, values);
        return this;
    }
}

// Initialize table
Submission.init();

export default Submission;