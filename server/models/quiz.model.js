import { pool } from "../db/connectDB.js";
import { slugify } from "../utils/slugify.js";
import logger from "../logger/winston.logger.js";

class Quiz {
    constructor(data) {
        this.id = data.id;
        this._id = data.id; // Compatibility

        this.title = data.title;
        this.slug = data.slug;
        this.description = data.description;
        this.questions = typeof data.questions === 'string' ? JSON.parse(data.questions) : (data.questions || []);
        this.passingScore = data.passingScore;
        this.timeLimit = data.timeLimit;
        this.createdBy = data.createdBy;
        this.isPublished = !!data.isPublished;
        this.attemptsAllowed = data.attemptsAllowed !== undefined ? data.attemptsAllowed : 1;
        this.skillUpgradation = !!data.skillUpgradation;

        // Resource linking & Legacy fields
        this.courseId = data.courseId || data.course;
        this.course = this.courseId;

        this.moduleId = data.moduleId || data.module;
        this.module = this.moduleId;

        this.lessonId = data.lessonId;

        this.type = data.type || this.calculateType();
        this.scope = data.scope || this.calculateScope();

        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
    }

    calculateType() {
        if (this.scope) return this.scope.toUpperCase();
        return this.module ? "MODULE" : "COURSE";
    }

    calculateScope() {
        if (this.lessonId || (this.type && this.type === "LESSON")) {
            return "lesson";
        } else if (this.moduleId || this.module) {
            return "module";
        } else {
            return "course";
        }
    }

    validateScope() {
        if (this.scope === 'course' && (this.moduleId || this.lessonId)) {
            throw new Error('Course-scoped quiz cannot have module or lesson IDs');
        }
        if (this.scope === 'module' && (!this.moduleId || this.lessonId)) {
            throw new Error('Module-scoped quiz must have moduleId and cannot have lessonId');
        }
        if (this.scope === 'lesson' && (!this.lessonId || !this.moduleId)) {
            throw new Error('Lesson-scoped quiz must have both moduleId and lessonId');
        }
    }

    static async init() {
        const query = `
            IF OBJECT_ID(N'dbo.quizzes', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.quizzes (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    slug VARCHAR(255),
                    description VARCHAR(MAX),
                    questions VARCHAR(MAX),
                    passingScore INT NOT NULL,
                    timeLimit INT,
                    createdBy VARCHAR(255) NOT NULL,
                    isPublished BIT DEFAULT 0,
                    attemptsAllowed INT DEFAULT 1,
                    skillUpgradation VARCHAR(MAX),
                    courseId VARCHAR(255),
                    course VARCHAR(255),
                    moduleId VARCHAR(255),
                    module VARCHAR(255),
                    lessonId VARCHAR(255),
                    type VARCHAR(50),
                    scope VARCHAR(50),
                    createdAt DATETIME DEFAULT GETDATE(),
                    updatedAt DATETIME DEFAULT GETDATE(),
                    CONSTRAINT unique_quiz_slug UNIQUE (slug)
                );

                CREATE INDEX idx_course ON dbo.quizzes(course);
                CREATE INDEX idx_module ON dbo.quizzes(module);
                CREATE INDEX idx_type ON dbo.quizzes(type);
                CREATE INDEX idx_scope ON dbo.quizzes(scope);
            END
        `;
        try {
            await pool.query(query);
        } catch (error) {
            logger.error("Failed to initialize Quiz table", error);
        }
    }

    static async create(data) {
        // Generate unique slug
        let baseSlug = slugify(data.title);
        let slug = baseSlug;
        let suffix = 1;
        while (true) {
            const [rows] = await pool.query("SELECT id FROM quizzes WHERE slug = ?", [slug]);
            if (rows.length === 0) break;
            suffix++;
            slug = `${baseSlug}-${suffix}`;
        }
        data.slug = slug;

        const quiz = new Quiz(data);
        quiz.validateScope();

        const fields = [
            "title", "slug", "description", "questions", "passingScore",
            "timeLimit", "createdBy", "isPublished", "attemptsAllowed",
            "skillUpgradation", "courseId", "course", "moduleId", "module",
            "lessonId", "type", "scope", "createdAt"
        ];

        if (!quiz.createdAt) quiz.createdAt = new Date();

        const values = fields.map(field => {
            let val = quiz[field];
            if (field === 'questions') return JSON.stringify(val);
            if (val === undefined) return null;
            return val;
        });

        const placeholders = fields.map(() => "?").join(",");
        const query = `INSERT INTO quizzes (${fields.map(f => f === 'index' ? '[index]' : f).join(",")}) VALUES (${placeholders}); SELECT SCOPE_IDENTITY() AS id;`;

        const [rows] = await pool.query(query, values);
        return Quiz.findById(rows[0].id);
    }

    static async findById(id) {
        const [rows] = await pool.query("SELECT * FROM quizzes WHERE id = ?", [id]);
        if (rows.length === 0) return null;
        return new Quiz(rows[0]);
    }

    static async findOne(query) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        if (keys.length === 0) return null;

        const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
        const values = keys.map(key => query[key]);

        const [rows] = await pool.query(`SELECT TOP 1 * FROM quizzes WHERE ${whereClause}`, values);
        if (rows.length === 0) return null;
        return new Quiz(rows[0]);
    }

    static async find(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined && key !== 'sort');
        let sql = "SELECT * FROM quizzes";
        let values = [];

        if (keys.length > 0) {
            const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
            sql += ` WHERE ${whereClause}`;
            values = keys.map(key => query[key]);
        }

        if (query.sort) {
            const sortKey = Object.keys(query.sort)[0];
            const sortOrder = query.sort[sortKey] === -1 ? 'DESC' : 'ASC';
            sql += ` ORDER BY ${sortKey} ${sortOrder}`;
        }

        const [rows] = await pool.query(sql, values);
        return rows.map(row => new Quiz(row));
    }

    static async countDocuments(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT COUNT(*) as count FROM quizzes";
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
        // Sync fields and validate
        if (this.courseId && !this.course) this.course = this.courseId;
        if (this.course && !this.courseId) this.courseId = this.course;
        if (this.moduleId && !this.module) this.module = this.moduleId;
        if (this.module && !this.moduleId) this.moduleId = this.module;

        this.scope = this.calculateScope();
        this.type = this.calculateType();
        this.validateScope();

        this.updatedAt = new Date(); // Manually update timestamp

        const fields = [
            "title", "slug", "description", "questions", "passingScore",
            "timeLimit", "createdBy", "isPublished", "attemptsAllowed",
            "skillUpgradation", "courseId", "course", "moduleId", "module",
            "lessonId", "type", "scope", "updatedAt"
        ];

        const setClause = fields.map(field => `${field} = ?`).join(", ");
        const values = fields.map(field => {
            let val = this[field];
            if (field === 'questions') return JSON.stringify(val);
            return val;
        });
        values.push(this.id);

        await pool.query(`UPDATE quizzes SET ${setClause} WHERE id = ?`, values);
        return this;
    }
}

// Initialize table
Quiz.init();

export default Quiz;
