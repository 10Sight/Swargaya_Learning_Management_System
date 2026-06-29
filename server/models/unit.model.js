import { pool } from "../db/connectDB.js";
import logger from "../logger/winston.logger.js";

class Unit {
    constructor(data) {
        this.id = data.id;
        this._id = data.id;
        this.title = data.title;
        this.location = data.location || null;
        this.headName = data.headName || null;
        this.headContactDetail = data.headContactDetail || null;
        this.isActive = data.isActive !== undefined ? !!data.isActive : true;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        // Assigned admin details (populated by Unit.find via OUTER APPLY)
        this.adminName = data.adminName || null;
        this.adminUserName = data.adminUserName || null;
        this.adminContact = data.adminContact || null;
        this.adminEmail = data.adminEmail || null;
    }

    static async init() {
        const createTable = `
            IF OBJECT_ID(N'dbo.units', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.units (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    title NVARCHAR(255) NOT NULL,
                    location NVARCHAR(255) NULL,
                    headName NVARCHAR(255) NULL,
                    headContactDetail NVARCHAR(255) NULL,
                    isActive BIT DEFAULT 1,
                    createdAt DATETIME DEFAULT GETDATE(),
                    updatedAt DATETIME DEFAULT GETDATE(),
                    CONSTRAINT uq_unit_title UNIQUE (title)
                );
            END
        `;
        try {
            await pool.query(createTable);
            await Unit._seed();
        } catch (error) {
            logger.error("Failed to initialize Unit table", error);
        }
    }

    static async _seed() {
        const [rows] = await pool.query("SELECT COUNT(*) as cnt FROM units");
        if (rows[0].cnt > 0) return;

        const defaults = ["UNIT 1", "UNIT 2", "UNIT 3", "UNIT 4", "UNIT 5"];
        for (const title of defaults) {
            await pool.query(
                "INSERT INTO units (title, isActive, createdAt, updatedAt) VALUES (?, 1, GETDATE(), GETDATE())",
                [title]
            );
        }
        logger.info("Units table seeded with default UNIT 1 through UNIT 5");
    }

    static async create(data) {
        const { title, location, headName, headContactDetail } = data;
        const [result] = await pool.query(
            "INSERT INTO units (title, location, headName, headContactDetail, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, GETDATE(), GETDATE())",
            [title, location || null, headName || null, headContactDetail || null]
        );
        return Unit.findById(result.insertId);
    }

    static async findById(id) {
        const [rows] = await pool.query("SELECT * FROM units WHERE id = ?", [id]);
        if (rows.length === 0) return null;
        return new Unit(rows[0]);
    }

    static async findOne(query) {
        const keys = Object.keys(query).filter((k) => query[k] !== undefined);
        if (keys.length === 0) return null;
        const whereClause = keys.map((k) => `${k} = ?`).join(" AND ");
        const values = keys.map((k) => query[k]);
        const [rows] = await pool.query(`SELECT TOP 1 * FROM units WHERE ${whereClause}`, values);
        if (rows.length === 0) return null;
        return new Unit(rows[0]);
    }

    static async find(query = {}) {
        const keys = Object.keys(query).filter((k) => query[k] !== undefined);
        let sql = `
            SELECT u.*,
                   a.fullName    AS adminName,
                   a.userName    AS adminUserName,
                   a.phoneNumber AS adminContact,
                   a.email       AS adminEmail
            FROM units u
            OUTER APPLY (
                SELECT TOP 1 fullName, userName, phoneNumber, email
                FROM users
                WHERE unit = u.title AND role = 'ADMIN' AND isDeleted = 0
                ORDER BY id DESC
            ) a
        `;
        let values = [];
        if (keys.length > 0) {
            sql += ` WHERE ${keys.map((k) => `u.${k} = ?`).join(" AND ")}`;
            values = keys.map((k) => query[k]);
        }
        sql += " ORDER BY u.id ASC";
        const [rows] = await pool.query(sql, values);
        return rows.map((r) => new Unit(r));
    }

    // Check if a title exists (used for auth/user validation)
    static async exists(query) {
        const keys = Object.keys(query).filter((k) => query[k] !== undefined);
        if (keys.length === 0) return false;
        const whereClause = keys.map((k) => `${k} = ?`).join(" AND ");
        const values = keys.map((k) => query[k]);
        const [rows] = await pool.query(`SELECT COUNT(*) as cnt FROM units WHERE ${whereClause}`, values);
        return rows[0].cnt > 0;
    }

    async save() {
        this.updatedAt = new Date();
        const fields = ["title", "location", "headName", "headContactDetail", "isActive", "updatedAt"];
        const setClause = fields.map((f) => `${f} = ?`).join(", ");
        const values = fields.map((f) => this[f]);
        values.push(this.id);
        await pool.query(`UPDATE units SET ${setClause} WHERE id = ?`, values);
        return this;
    }
}

Unit.init();

export default Unit;
