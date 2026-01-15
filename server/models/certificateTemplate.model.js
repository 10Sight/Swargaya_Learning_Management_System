import { pool } from "../db/connectDB.js";
import logger from "../logger/winston.logger.js";

class CertificateTemplate {
    constructor(data) {
        this.id = data.id;
        this._id = data.id; // Compatibility

        this.name = data.name;
        this.description = data.description;
        this.template = data.template;
        this.styles = data.styles || "";
        this.placeholders = typeof data.placeholders === 'string' ? JSON.parse(data.placeholders) : (data.placeholders || []);
        this.isDefault = !!data.isDefault;
        this.isActive = data.isActive !== undefined ? !!data.isActive : true;
        this.createdBy = data.createdBy;
        this.updatedBy = data.updatedBy;

        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    static async init() {
        const query = `
            CREATE TABLE IF NOT EXISTS certificate_templates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                template LONGTEXT NOT NULL,
                styles LONGTEXT,
                placeholders TEXT,
                isDefault BOOLEAN DEFAULT FALSE,
                isActive BOOLEAN DEFAULT TRUE,
                createdBy VARCHAR(255) NOT NULL,
                updatedBy VARCHAR(255) NOT NULL,
                createdAt DATETIME,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;
        try {
            await pool.query(query);
        } catch (error) {
            logger.error("Failed to initialize CertificateTemplate table", error);
        }
    }

    static async create(data) {
        // Handle explicit default logic
        if (data.isDefault) {
            await pool.query("UPDATE certificate_templates SET isDefault = FALSE");
        }

        const template = new CertificateTemplate(data);

        const fields = [
            "name", "description", "template", "styles",
            "placeholders", "isDefault", "isActive",
            "createdBy", "updatedBy", "createdAt"
        ];

        if (!template.createdAt) template.createdAt = new Date();

        const values = fields.map(field => {
            let val = template[field];
            if (field === 'placeholders') return JSON.stringify(val);
            if (val === undefined) return null;
            return val;
        });

        const placeholders = fields.map(() => "?").join(",");
        const query = `INSERT INTO certificate_templates (${fields.join(",")}) VALUES (${placeholders})`;

        const [result] = await pool.query(query, values);
        return CertificateTemplate.findById(result.insertId);
    }

    static async findById(id) {
        const [rows] = await pool.query("SELECT * FROM certificate_templates WHERE id = ?", [id]);
        if (rows.length === 0) return null;
        return new CertificateTemplate(rows[0]);
    }

    static async findOne(query) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        if (keys.length === 0) return null;

        const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
        const values = keys.map(key => query[key]);

        const [rows] = await pool.query(`SELECT * FROM certificate_templates WHERE ${whereClause} LIMIT 1`, values);
        if (rows.length === 0) return null;
        return new CertificateTemplate(rows[0]);
    }

    static async find(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT * FROM certificate_templates";
        let values = [];

        if (keys.length > 0) {
            const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
            sql += ` WHERE ${whereClause}`;
            values = keys.map(key => query[key]);
        }

        const [rows] = await pool.query(sql, values);
        return rows.map(row => new CertificateTemplate(row));
    }

    static async countDocuments(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT COUNT(*) as count FROM certificate_templates";
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
        // Handle default logic if this is being set to default
        if (this.isDefault) {
            await pool.query("UPDATE certificate_templates SET isDefault = FALSE WHERE id != ?", [this.id]);
        }

        const fields = [
            "name", "description", "template", "styles",
            "placeholders", "isDefault", "isActive",
            "createdBy", "updatedBy"
        ];

        const setClause = fields.map(field => `${field} = ?`).join(", ");
        const values = fields.map(field => {
            let val = this[field];
            if (field === 'placeholders') return JSON.stringify(val);
            return val;
        });
        values.push(this.id);

        await pool.query(`UPDATE certificate_templates SET ${setClause} WHERE id = ?`, values);
        return this;
    }

    // Compatibility helper for "constructor.updateMany" pattern if used elsewhere
    static async updateMany(filter, update) {
        // Simplified implementation for the specific use case of resetting defaults
        // If more complex mongo query emulation is needed, this would need expansion.
        if (update.$set && update.$set.isDefault === false) {
            let sql = "UPDATE certificate_templates SET isDefault = FALSE";
            let values = [];

            // Simple ID exclusion filter support
            if (filter._id && filter._id.$ne) {
                sql += " WHERE id != ?";
                values.push(filter._id.$ne);
            }

            return await pool.query(sql, values);
        }
        throw new Error("updateMany not fully implemented for SQL model compatibility");
    }
}

// Initialize table
CertificateTemplate.init();

export default CertificateTemplate;
