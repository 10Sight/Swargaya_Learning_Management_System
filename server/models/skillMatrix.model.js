import { pool } from "../db/connectDB.js";
import logger from "../logger/winston.logger.js";

class SkillMatrix {
    constructor(data) {
        this.id = data.id;
        this._id = data.id; // Compatibility

        this.department = data.department;
        this.line = data.line;

        // Complex nested structures stored as JSON
        this.entries = typeof data.entries === 'string' ? JSON.parse(data.entries) : (data.entries || []);
        this.headerInfo = typeof data.headerInfo === 'string' ? JSON.parse(data.headerInfo) : (data.headerInfo || {
            formatNo: "F-HRM-03-001",
            revNo: "8",
            revDate: "03-06-2025",
            pageNo: "1"
        });
        this.footerInfo = typeof data.footerInfo === 'string' ? JSON.parse(data.footerInfo) : (data.footerInfo || {
            guidelines: "",
            legendNote: "",
            revisions: []
        });

        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    static async init() {
        const query = `
            IF OBJECT_ID(N'dbo.skill_matrices', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.skill_matrices (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    department VARCHAR(255) NOT NULL,
                    line VARCHAR(255) NOT NULL,
                    entries VARCHAR(MAX),
                    headerInfo VARCHAR(MAX),
                    footerInfo VARCHAR(MAX),
                    createdAt DATETIME DEFAULT GETDATE(),
                    updatedAt DATETIME DEFAULT GETDATE(),
                    CONSTRAINT unique_matrix_dept_line UNIQUE (department, line)
                );
                
                CREATE INDEX idx_department ON dbo.skill_matrices(department);
                CREATE INDEX idx_line ON dbo.skill_matrices(line);
            END
        `;
        try {
            await pool.query(query);
        } catch (error) {
            logger.error("Failed to initialize SkillMatrix table", error);
        }
    }

    static async create(data) {
        const matrix = new SkillMatrix(data);

        const fields = [
            "department", "line", "entries", "headerInfo", "footerInfo", "createdAt"
        ];

        if (!matrix.createdAt) matrix.createdAt = new Date();

        const values = fields.map(field => {
            let val = matrix[field];
            if (['entries', 'headerInfo', 'footerInfo'].includes(field)) {
                return JSON.stringify(val);
            }
            if (val === undefined) return null;
            return val;
        });

        const placeholders = fields.map(() => "?").join(",");
        const query = `INSERT INTO skill_matrices (${fields.join(",")}) VALUES (${placeholders})`;

        const [result] = await pool.query(query, values);
        return SkillMatrix.findById(result.insertId);
    }

    static async findById(id) {
        const [rows] = await pool.query("SELECT * FROM skill_matrices WHERE id = ?", [id]);
        if (rows.length === 0) return null;
        return new SkillMatrix(rows[0]);
    }

    static async findOne(query) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        if (keys.length === 0) return null;

        const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
        const values = keys.map(key => query[key]);

        const [rows] = await pool.query(`SELECT TOP 1 * FROM skill_matrices WHERE ${whereClause}`, values);
        if (rows.length === 0) return null;
        return new SkillMatrix(rows[0]);
    }

    static async find(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT * FROM skill_matrices";
        let values = [];

        if (keys.length > 0) {
            const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
            sql += ` WHERE ${whereClause}`;
            values = keys.map(key => query[key]);
        }

        const [rows] = await pool.query(sql, values);
        return rows.map(row => new SkillMatrix(row));
    }

    static async countDocuments(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT COUNT(*) as count FROM skill_matrices";
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
            "department", "line", "entries", "headerInfo", "footerInfo", "updatedAt"
        ];

        const setClause = fields.map(field => `${field} = ?`).join(", ");
        const values = fields.map(field => {
            let val = this[field];
            if (['entries', 'headerInfo', 'footerInfo'].includes(field)) {
                return JSON.stringify(val);
            }
            return val;
        });
        values.push(this.id);

        await pool.query(`UPDATE skill_matrices SET ${setClause} WHERE id = ?`, values);
        return this;
    }
}

// Initialize table
SkillMatrix.init();

export { SkillMatrix }; // Named export to match original file's export style if needed, or default
export default SkillMatrix;
