import { pool } from "../db/connectDB.js";
import logger from "../logger/winston.logger.js";

class Resource {
    constructor(data) {
        this.id = data.id;
        this._id = data.id; // Compatibility

        this.courseId = data.courseId || null;
        this.moduleId = data.moduleId || null;
        this.lessonId = data.lessonId || null;
        this.scope = data.scope;
        this.title = data.title;
        // Handle type normalization
        this.type = data.type ? data.type.toLowerCase() : data.type;
        this.description = data.description;
        this.url = data.url;
        this.publicId = data.publicId || null;
        this.fileSize = data.fileSize !== undefined ? data.fileSize : null;
        this.format = data.format || null;
        this.fileName = data.fileName || null;
        this.createdBy = data.createdBy;

        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    validateScope() {
        if (this.scope === 'course' && !this.courseId) {
            throw new Error('Course ID is required for course-scoped resources');
        }
        if (this.scope === 'module' && !this.moduleId) {
            throw new Error('Module ID is required for module-scoped resources');
        }
        if (this.scope === 'lesson' && !this.lessonId) {
            throw new Error('Lesson ID is required for lesson-scoped resources');
        }

        const scopes = [this.courseId, this.moduleId, this.lessonId].filter(id => id);
        // Note: The original logic says "must belong to exactly one scope". 
        // But in Mongoose schema, fields are separate.
        // It's possible to pass all three IDs but set scope='module', then the others are ignored?
        // Actually, the original code validates `scopes.length !== 1`.
        // This implicitly prevents setting multiple IDs.
        // But what if a lesson resource *also* references course for easy lookup?
        // The original logic forbids it: "Ensure only one scope is set". 
        if (scopes.length !== 1) {
            throw new Error('Resource must belong to exactly one scope (course, module, or lesson)');
        }
    }

    static async init() {
        const query = `
            IF OBJECT_ID(N'dbo.resources', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.resources (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    courseId VARCHAR(255),
                    moduleId VARCHAR(255),
                    lessonId VARCHAR(255),
                    scope VARCHAR(50) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    description VARCHAR(MAX),
                    url VARCHAR(500) NOT NULL,
                    publicId VARCHAR(255),
                    fileSize INT,
                    format VARCHAR(50),
                    fileName VARCHAR(255),
                    createdBy VARCHAR(255) NOT NULL,
                    createdAt DATETIME DEFAULT GETDATE(),
                    updatedAt DATETIME DEFAULT GETDATE()
                );

                CREATE INDEX idx_scope ON dbo.resources(scope);
                CREATE INDEX idx_courseId ON dbo.resources(courseId);
                CREATE INDEX idx_moduleId ON dbo.resources(moduleId);
                CREATE INDEX idx_lessonId ON dbo.resources(lessonId);
            END
        `;
        try {
            await pool.query(query);
        } catch (error) {
            logger.error("Failed to initialize Resource table", error);
        }
    }

    static async create(data) {
        const resource = new Resource(data);
        resource.validateScope();

        const fields = [
            "courseId", "moduleId", "lessonId", "scope", "title",
            "type", "description", "url", "publicId", "fileSize",
            "format", "fileName", "createdBy", "createdAt"
        ];

        if (!resource.createdAt) resource.createdAt = new Date();

        const values = fields.map(field => {
            const val = resource[field];
            if (val === undefined) return null;
            return val;
        });

        const placeholders = fields.map(() => "?").join(",");
        const query = `INSERT INTO resources (${fields.join(",")}) VALUES (${placeholders})`;

        const [result] = await pool.query(query, values);
        return Resource.findById(result.insertId);
    }

    static async findById(id) {
        const [rows] = await pool.query("SELECT * FROM resources WHERE id = ?", [id]);
        if (rows.length === 0) return null;
        return new Resource(rows[0]);
    }

    static async findOne(query) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        if (keys.length === 0) return null;

        const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
        const values = keys.map(key => query[key]);

        const [rows] = await pool.query(`SELECT TOP 1 * FROM resources WHERE ${whereClause}`, values);
        if (rows.length === 0) return null;
        return new Resource(rows[0]);
    }

    static async find(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT * FROM resources";
        let values = [];

        if (keys.length > 0) {
            const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
            sql += ` WHERE ${whereClause}`;
            values = keys.map(key => query[key]);
        }

        const [rows] = await pool.query(sql, values);
        return rows.map(row => new Resource(row));
    }

    static async countDocuments(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT COUNT(*) as count FROM resources";
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
        // Normalize type again just in case changed
        this.type = this.type ? this.type.toLowerCase() : this.type;
        this.validateScope();

        this.updatedAt = new Date(); // Manually update timestamp

        const fields = [
            "courseId", "moduleId", "lessonId", "scope", "title",
            "type", "description", "url", "publicId", "fileSize",
            "format", "fileName", "createdBy", "updatedAt"
        ];

        const setClause = fields.map(field => `${field} = ?`).join(", ");
        const values = fields.map(field => this[field]);
        values.push(this.id);

        await pool.query(`UPDATE resources SET ${setClause} WHERE id = ?`, values);
        return this;
    }
}

// Initialize table
Resource.init();

export default Resource;
