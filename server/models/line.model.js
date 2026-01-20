import { pool } from "../db/connectDB.js";
import logger from "../logger/winston.logger.js";

class Line {
    constructor(data) {
        this.id = data.id;
        this._id = data.id; // Compatibility

        this.name = data.name;
        this.department = data.department;
        this.description = data.description;
        this.isActive = data.isActive !== undefined ? !!data.isActive : true;

        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    static async init() {
        const query = `
            IF OBJECT_ID(N'dbo.lines', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.[lines] (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    department VARCHAR(255) NOT NULL,
                    description VARCHAR(MAX),
                    isActive BIT DEFAULT 1,
                    createdAt DATETIME DEFAULT GETDATE(),
                    updatedAt DATETIME DEFAULT GETDATE(),
                    CONSTRAINT unique_dept_line UNIQUE (name, department)
                );
                
                CREATE INDEX idx_department ON dbo.[lines](department);
            END
        `;
        try {
            await pool.query(query);
        } catch (error) {
            logger.error("Failed to initialize Line table", error);
        }
    }

    static async create(data) {
        const line = new Line(data);

        const fields = [
            "name", "department", "description", "isActive", "createdAt"
        ];

        if (!line.createdAt) line.createdAt = new Date();

        const values = fields.map(field => {
            const val = line[field];
            if (val === undefined) return null;
            return val;
        });

        const placeholders = fields.map(() => "?").join(",");
        const query = `INSERT INTO [lines] (${fields.join(",")}) VALUES (${placeholders})`;

        const [result] = await pool.query(query, values);
        return Line.findById(result.insertId);
    }

    static async findById(id) {
        const [rows] = await pool.query("SELECT * FROM [lines] WHERE id = ?", [id]);
        if (rows.length === 0) return null;
        return new Line(rows[0]);
    }

    static async findOne(query) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        if (keys.length === 0) return null;

        const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
        const values = keys.map(key => query[key]);

        const [rows] = await pool.query(`SELECT TOP 1 * FROM [lines] WHERE ${whereClause}`, values);
        if (rows.length === 0) return null;
        return new Line(rows[0]);
    }

    static async find(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT * FROM [lines]";
        let values = [];

        if (keys.length > 0) {
            const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
            sql += ` WHERE ${whereClause}`;
            values = keys.map(key => query[key]);
        }

        const [rows] = await pool.query(sql, values);
        return rows.map(row => new Line(row));
    }

    static async countDocuments(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT COUNT(*) as count FROM [lines]";
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
            "name", "department", "description", "isActive", "updatedAt"
        ];

        const setClause = fields.map(field => `${field} = ?`).join(", ");
        const values = fields.map(field => this[field]);
        values.push(this.id);

        await pool.query(`UPDATE [lines] SET ${setClause} WHERE id = ?`, values);
        return this;
    }
}

// Initialize table
Line.init();

export default Line;
