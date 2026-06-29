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
        this.operatorId = data.operatorId ?? null;

        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    static async init() {
        const createQuery = `
            IF OBJECT_ID(N'dbo.machines', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.machines (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    line VARCHAR(255) NOT NULL,
                    description VARCHAR(MAX),
                    isActive BIT DEFAULT 1,
                    operatorId INT NULL,
                    createdAt DATETIME DEFAULT GETDATE(),
                    updatedAt DATETIME DEFAULT GETDATE(),
                    CONSTRAINT unique_line_machine UNIQUE (name, line)
                );

                CREATE INDEX idx_line ON dbo.machines(line);
            END
        `;
        const migrateQuery = `
            IF COL_LENGTH(N'dbo.machines', N'operatorId') IS NULL
            BEGIN
                ALTER TABLE dbo.machines ADD operatorId INT NULL;
            END
        `;
        const createJunctionQuery = `
            IF OBJECT_ID(N'dbo.machine_operators', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.machine_operators (
                    machineId INT NOT NULL,
                    operatorId INT NOT NULL,
                    assignedAt DATETIME DEFAULT GETDATE(),
                    PRIMARY KEY (machineId, operatorId)
                );
                CREATE INDEX idx_mo_machineId ON dbo.machine_operators(machineId);
                CREATE INDEX idx_mo_operatorId ON dbo.machine_operators(operatorId);
            END
        `;
        const migrateToJunctionQuery = `
            INSERT INTO dbo.machine_operators (machineId, operatorId)
            SELECT m.id, m.operatorId
            FROM dbo.machines m
            WHERE m.operatorId IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM dbo.machine_operators mo
                  WHERE mo.machineId = m.id AND mo.operatorId = m.operatorId
              );
        `;
        try {
            await pool.query(createQuery);
            await pool.query(migrateQuery);
            await pool.query(createJunctionQuery);
            await pool.query(migrateToJunctionQuery);
        } catch (error) {
            logger.error("Failed to initialize Machine table", error);
        }
    }

    static async create(data) {
        const machine = new Machine(data);

        const fields = [
            "name", "line", "description", "isActive", "operatorId", "createdAt"
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

        const [rows] = await pool.query(`SELECT TOP 1 * FROM machines WHERE ${whereClause}`, values);
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
        this.updatedAt = new Date(); // Manually update timestamp

        const fields = [
            "name", "line", "description", "isActive", "operatorId", "updatedAt"
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
