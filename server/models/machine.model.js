import { pool } from "../db/connectDB.js";
import logger from "../logger/winston.logger.js";

class Machine {
    constructor(data) {
        this.id = data.id;
        this._id = data.id; // Compatibility

        this.name = data.name;
        this.line = data.line;
        this.description = data.description;
        this.isActive = data.isActive !== undefined ? !!data.isActive : true;

        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    static async init() {
        const query = `
            CREATE TABLE IF NOT EXISTS machines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                line VARCHAR(255) NOT NULL,
                description TEXT,
                isActive BOOLEAN DEFAULT TRUE,
                createdAt DATETIME,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_line_machine (name, line),
                INDEX idx_line (line)
            )
        `;
        try {
            await pool.query(query);
        } catch (error) {
            logger.error("Failed to initialize Machine table", error);
        }
    }

    static async create(data) {
        const machine = new Machine(data);

        const fields = [
            "name", "line", "description", "isActive", "createdAt"
        ];

        if (!machine.createdAt) machine.createdAt = new Date();

        const values = fields.map(field => {
            const val = machine[field];
            if (val === undefined) return null;
            return val;
        });

        const placeholders = fields.map(() => "?").join(",");
        const query = `INSERT INTO machines (${fields.join(",")}) VALUES (${placeholders})`;

        const [result] = await pool.query(query, values);
        return Machine.findById(result.insertId);
    }

    static async findById(id) {
        const [rows] = await pool.query("SELECT * FROM machines WHERE id = ?", [id]);
        if (rows.length === 0) return null;
        return new Machine(rows[0]);
    }

    static async findOne(query) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        if (keys.length === 0) return null;

        const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
        const values = keys.map(key => query[key]);

        const [rows] = await pool.query(`SELECT * FROM machines WHERE ${whereClause} LIMIT 1`, values);
        if (rows.length === 0) return null;
        return new Machine(rows[0]);
    }

    static async find(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT * FROM machines";
        let values = [];

        if (keys.length > 0) {
            const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
            sql += ` WHERE ${whereClause}`;
            values = keys.map(key => query[key]);
        }

        const [rows] = await pool.query(sql, values);
        return rows.map(row => new Machine(row));
    }

    static async countDocuments(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT COUNT(*) as count FROM machines";
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
            "name", "line", "description", "isActive"
        ];

        const setClause = fields.map(field => `${field} = ?`).join(", ");
        const values = fields.map(field => this[field]);
        values.push(this.id);

        await pool.query(`UPDATE machines SET ${setClause} WHERE id = ?`, values);
        return this;
    }
}

// Initialize table
Machine.init();

export default Machine;
