import { pool } from "../db/connectDB.js";
import logger from "../logger/winston.logger.js";

class Certificate {
    constructor(data) {
        this.id = data.id;
        this._id = data.id; // Compatibility

        this.student = data.student;
        this.course = data.course;
        this.issuedBy = data.issuedBy;
        this.grade = data.grade || 'PASS';
        this.issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
        this.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
        this.fileUrl = data.fileUrl;
        this.status = data.status || 'ACTIVE';
        this.type = data.type || 'COURSE_COMPLETION';
        this.level = data.level;
        this.metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : (data.metadata || {});

        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    static async init() {
        const query = `
            CREATE TABLE IF NOT EXISTS certificates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student VARCHAR(255) NOT NULL,
                course VARCHAR(255) NOT NULL,
                issuedBy VARCHAR(255) NOT NULL,
                grade VARCHAR(10) DEFAULT 'PASS',
                issueDate DATETIME,
                expiryDate DATETIME,
                fileUrl TEXT,
                status VARCHAR(20) DEFAULT 'ACTIVE',
                type VARCHAR(50) DEFAULT 'COURSE_COMPLETION',
                level VARCHAR(50),
                metadata TEXT,
                createdAt DATETIME,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_student (student),
                INDEX idx_course (course)
            )
        `;
        try {
            await pool.query(query);
        } catch (error) {
            logger.error("Failed to initialize Certificate table", error);
        }
    }

    static async create(data) {
        const cert = new Certificate(data);

        const fields = [
            "student", "course", "issuedBy", "grade", "issueDate",
            "expiryDate", "fileUrl", "status", "type", "level", "metadata", "createdAt"
        ];

        if (!cert.createdAt) cert.createdAt = new Date();

        const values = fields.map(field => {
            let val = cert[field];
            if (field === 'metadata') return JSON.stringify(val);
            if (val === undefined) return null;
            return val;
        });

        const placeholders = fields.map(() => "?").join(",");
        const query = `INSERT INTO certificates (${fields.join(",")}) VALUES (${placeholders})`;

        const [result] = await pool.query(query, values);
        return Certificate.findById(result.insertId);
    }

    static async findById(id) {
        const [rows] = await pool.query("SELECT * FROM certificates WHERE id = ?", [id]);
        if (rows.length === 0) return null;
        return new Certificate(rows[0]);
    }

    static async findOne(query) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        if (keys.length === 0) return null;

        const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
        const values = keys.map(key => query[key]);

        const [rows] = await pool.query(`SELECT * FROM certificates WHERE ${whereClause} LIMIT 1`, values);
        if (rows.length === 0) return null;
        return new Certificate(rows[0]);
    }

    static async find(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT * FROM certificates";
        let values = [];

        if (keys.length > 0) {
            const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
            sql += ` WHERE ${whereClause}`;
            values = keys.map(key => query[key]);
        }

        const [rows] = await pool.query(sql, values);
        return rows.map(row => new Certificate(row));
    }

    static async countDocuments(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT COUNT(*) as count FROM certificates";
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
            "student", "course", "issuedBy", "grade", "issueDate",
            "expiryDate", "fileUrl", "status", "type", "level", "metadata"
        ];

        const setClause = fields.map(field => `${field} = ?`).join(", ");
        const values = fields.map(field => {
            let val = this[field];
            if (field === 'metadata') return JSON.stringify(val);
            return val;
        });
        values.push(this.id);

        await pool.query(`UPDATE certificates SET ${setClause} WHERE id = ?`, values);
        return this;
    }
}

// Initialize table
Certificate.init();

export default Certificate;