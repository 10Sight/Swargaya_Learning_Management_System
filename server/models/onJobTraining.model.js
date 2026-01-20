import { pool } from "../db/connectDB.js";
import logger from "../logger/winston.logger.js";

class OnJobTraining {
    constructor(data) {
        this.id = data.id;
        this._id = data.id; // Compatibility

        this.student = data.student;
        this.name = data.name || "Level-1 Practical Evaluation of On the Job Training";
        this.department = data.department;
        this.line = data.line;
        this.machine = data.machine;
        this.entries = typeof data.entries === 'string' ? JSON.parse(data.entries) : (data.entries || []);
        this.scoring = typeof data.scoring === 'string' ? JSON.parse(data.scoring) : (data.scoring || {});
        this.totalMarks = data.totalMarks !== undefined ? data.totalMarks : 36;
        this.totalMarksObtained = data.totalMarksObtained;
        this.totalPercentage = data.totalPercentage;
        this.result = data.result || "Pending";
        this.guidelines = data.guidelines;
        this.remarks = data.remarks;
        this.createdBy = data.createdBy;
        this.updatedBy = data.updatedBy;

        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    static async init() {
        const query = `
            IF OBJECT_ID(N'dbo.on_job_trainings', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.on_job_trainings (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    student VARCHAR(255) NOT NULL,
                    name VARCHAR(255) DEFAULT 'Level-1 Practical Evaluation of On the Job Training',
                    department VARCHAR(255) NOT NULL,
                    line VARCHAR(255) NOT NULL,
                    machine VARCHAR(255) NOT NULL,
                    entries VARCHAR(MAX),
                    scoring VARCHAR(MAX),
                    totalMarks DECIMAL(10, 2) DEFAULT 36,
                    totalMarksObtained DECIMAL(10, 2),
                    totalPercentage DECIMAL(5, 2),
                    result VARCHAR(50) DEFAULT 'Pending',
                    guidelines VARCHAR(MAX),
                    remarks VARCHAR(MAX),
                    createdBy VARCHAR(255),
                    updatedBy VARCHAR(255),
                    createdAt DATETIME DEFAULT GETDATE(),
                    updatedAt DATETIME DEFAULT GETDATE()
                );
                
                CREATE INDEX idx_student ON dbo.on_job_trainings(student);
                CREATE INDEX idx_department ON dbo.on_job_trainings(department);
            END
        `;
        try {
            await pool.query(query);
        } catch (error) {
            logger.error("Failed to initialize OnJobTraining table", error);
        }
    }

    static async create(data) {
        const ojt = new OnJobTraining(data);

        const fields = [
            "student", "name", "department", "line", "machine",
            "entries", "scoring", "totalMarks", "totalMarksObtained",
            "totalPercentage", "result", "guidelines", "remarks",
            "createdBy", "updatedBy", "createdAt"
        ];

        if (!ojt.createdAt) ojt.createdAt = new Date();

        const values = fields.map(field => {
            let val = ojt[field];
            if (['entries', 'scoring'].includes(field)) {
                return JSON.stringify(val);
            }
            if (val === undefined) return null;
            return val;
        });

        const placeholders = fields.map(() => "?").join(",");
        const query = `INSERT INTO on_job_trainings (${fields.join(",")}) VALUES (${placeholders})`;

        const [result] = await pool.query(query, values);
        return OnJobTraining.findById(result.insertId);
    }

    static async findById(id) {
        const [rows] = await pool.query("SELECT * FROM on_job_trainings WHERE id = ?", [id]);
        if (rows.length === 0) return null;
        return new OnJobTraining(rows[0]);
    }

    static async findOne(query) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        if (keys.length === 0) return null;

        const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
        const values = keys.map(key => query[key]);

        const [rows] = await pool.query(`SELECT TOP 1 * FROM on_job_trainings WHERE ${whereClause}`, values);
        if (rows.length === 0) return null;
        return new OnJobTraining(rows[0]);
    }

    static async find(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT * FROM on_job_trainings";
        let values = [];

        if (keys.length > 0) {
            const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
            sql += ` WHERE ${whereClause}`;
            values = keys.map(key => query[key]);
        }

        const [rows] = await pool.query(sql, values);
        return rows.map(row => new OnJobTraining(row));
    }

    static async countDocuments(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT COUNT(*) as count FROM on_job_trainings";
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
            "student", "name", "department", "line", "machine",
            "entries", "scoring", "totalMarks", "totalMarksObtained",
            "totalPercentage", "result", "guidelines", "remarks",
            "createdBy", "updatedBy", "updatedAt"
        ];

        const setClause = fields.map(field => `${field} = ?`).join(", ");
        const values = fields.map(field => {
            let val = this[field];
            if (['entries', 'scoring'].includes(field)) {
                return JSON.stringify(val);
            }
            return val;
        });
        values.push(this.id);

        await pool.query(`UPDATE on_job_trainings SET ${setClause} WHERE id = ?`, values);
        return this;
    }
}

// Initialize table
OnJobTraining.init();

export default OnJobTraining;
