import { pool } from "../db/connectDB.js";
import logger from "../logger/winston.logger.js";

class QuizAttempt {
    constructor(data) {
        this.id = data.id;
        this._id = data.id; // Compatibility

        this.quiz = data.quiz;
        this.student = data.student;

        // Deserialize answer JSON if it's a string
        this.answer = typeof data.answer === 'string' ? JSON.parse(data.answer) : (data.answer || []);

        this.score = data.score !== undefined ? data.score : 0;
        this.status = data.status || "IN_PROGRESS";
        this.startedAt = data.startedAt ? new Date(data.startedAt) : new Date();
        this.completedAt = data.completedAt ? new Date(data.completedAt) : null;
        this.attemptNumber = data.attemptNumber !== undefined ? data.attemptNumber : 1;
        this.timeTaken = data.timeTaken !== undefined ? data.timeTaken : 0;

        // Admin adjustment metadata
        this.manuallyAdjusted = !!data.manuallyAdjusted;
        this.adjustedBy = data.adjustedBy;
        this.adjustedAt = data.adjustedAt ? new Date(data.adjustedAt) : null;
        this.adjustmentNotes = data.adjustmentNotes;

        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    static async init() {
        const query = `
            IF OBJECT_ID(N'dbo.attempted_quizzes', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.attempted_quizzes (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    quiz VARCHAR(255) NOT NULL,
                    student VARCHAR(255) NOT NULL,
                    answer VARCHAR(MAX),
                    score INT DEFAULT 0,
                    status VARCHAR(50) DEFAULT 'IN_PROGRESS',
                    startedAt DATETIME,
                    completedAt DATETIME,
                    attemptNumber INT DEFAULT 1,
                    timeTaken INT DEFAULT 0,
                    manuallyAdjusted BIT DEFAULT 0,
                    adjustedBy VARCHAR(255),
                    adjustedAt DATETIME,
                    adjustmentNotes VARCHAR(MAX),
                    createdAt DATETIME DEFAULT GETDATE(),
                    updatedAt DATETIME DEFAULT GETDATE(),
                    CONSTRAINT unique_attempt UNIQUE (quiz, student, attemptNumber)
                );
            END
        `;
        try {
            await pool.query(query);
        } catch (error) {
            logger.error("Failed to initialize QuizAttempt table", error);
        }
    }

    static async create(data) {
        const attempt = new QuizAttempt(data);

        const fields = [
            "quiz", "student", "answer", "score", "status",
            "startedAt", "completedAt", "attemptNumber", "timeTaken",
            "manuallyAdjusted", "adjustedBy", "adjustedAt", "adjustmentNotes", "createdAt"
        ];

        if (!attempt.createdAt) attempt.createdAt = new Date();

        const values = fields.map(field => {
            let val = attempt[field];
            if (field === 'answer') return JSON.stringify(val);
            if (val === undefined) return null;
            return val;
        });

        const placeholders = fields.map(() => "?").join(",");
        const query = `INSERT INTO attempted_quizzes (${fields.join(",")}) VALUES (${placeholders}); SELECT SCOPE_IDENTITY() AS id;`;

        const [rows] = await pool.query(query, values);
        if (!rows || rows.length === 0) return null;
        return QuizAttempt.findById(rows[0].id);
    }

    static async findById(id) {
        const [rows] = await pool.query("SELECT * FROM attempted_quizzes WHERE id = ?", [id]);
        if (rows.length === 0) return null;
        return new QuizAttempt(rows[0]);
    }

    static async findOne(query) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        if (keys.length === 0) return null;

        const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
        const values = keys.map(key => query[key]);

        const [rows] = await pool.query(`SELECT TOP 1 * FROM attempted_quizzes WHERE ${whereClause}`, values);
        if (rows.length === 0) return null;
        return new QuizAttempt(rows[0]);
    }

    static async find(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT * FROM attempted_quizzes";
        let values = [];

        if (keys.length > 0) {
            const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
            sql += ` WHERE ${whereClause}`;
            values = keys.map(key => query[key]);
        }

        const [rows] = await pool.query(sql, values);
        return rows.map(row => new QuizAttempt(row));
    }

    static async countDocuments(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT COUNT(*) as count FROM attempted_quizzes";
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
            "quiz", "student", "answer", "score", "status",
            "startedAt", "completedAt", "attemptNumber", "timeTaken",
            "manuallyAdjusted", "adjustedBy", "adjustedAt", "adjustmentNotes", "updatedAt"
        ];

        const setClause = fields.map(field => `${field} = ?`).join(", ");
        const values = fields.map(field => {
            const val = this[field];
            if (field === 'answer') return JSON.stringify(val);
            return val;
        });
        values.push(this.id);

        await pool.query(`UPDATE attempted_quizzes SET ${setClause} WHERE id = ?`, values);
        return this;
    }
}

// Initialize table
QuizAttempt.init();

export default QuizAttempt;