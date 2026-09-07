import { pool } from "../db/connectDB.js";
import logger from "../logger/winston.logger.js";

// Baseline level assigned to a user before any recorded transition — matches
// the default `users.currentLevel` value and the lowest level defined in
// CourseLevelConfig's default seed ("L1").
const BASE_LEVEL = "L1";

class UserLevelHistory {
    constructor(data) {
        this.id = data.id;
        this._id = data.id; // Compatibility

        this.userId = data.userId;
        this.courseId = data.courseId ?? null;
        this.previousLevel = data.previousLevel ?? null;
        this.newLevel = data.newLevel;
        this.source = data.source;
        this.referenceId = data.referenceId ?? null;
        this.effectiveDate = data.effectiveDate ? new Date(data.effectiveDate) : new Date();
        this.metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : (data.metadata || null);

        this.createdAt = data.createdAt;
    }

    static async init() {
        const query = `
            IF OBJECT_ID(N'dbo.user_level_history', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.user_level_history (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    userId INT NOT NULL,
                    courseId INT NULL,
                    previousLevel VARCHAR(50) NULL,
                    newLevel VARCHAR(50) NOT NULL,
                    source VARCHAR(50) NOT NULL,
                    referenceId VARCHAR(255) NULL,
                    effectiveDate DATETIME NOT NULL,
                    metadata VARCHAR(MAX) NULL,
                    createdAt DATETIME DEFAULT GETDATE()
                );

                CREATE INDEX idx_ulh_user_date ON dbo.user_level_history(userId, effectiveDate DESC);
                CREATE INDEX idx_ulh_effective_date ON dbo.user_level_history(effectiveDate);
                CREATE INDEX idx_ulh_level ON dbo.user_level_history(newLevel);
            END
        `;
        try {
            await pool.query(query);
            await UserLevelHistory.backfill();
        } catch (error) {
            logger.error("Failed to initialize UserLevelHistory table", error);
        }
    }

    // Self-healing backfill: reconstructs history from existing data (users.createdAt
    // as an L1 baseline, plus certificates.level for every SKILL_UPGRADATION award) so
    // the ledger is queryable immediately, without waiting for new transitions to occur.
    // Runs only when the table is empty, so it re-heals itself if it's ever truncated,
    // but never duplicates rows once populated.
    static async backfill() {
        const [countRows] = await pool.query("SELECT COUNT(*) AS count FROM user_level_history");
        if (countRows[0].count > 0) return;

        try {
            await pool.query(`
                INSERT INTO dbo.user_level_history (userId, courseId, previousLevel, newLevel, source, referenceId, effectiveDate, metadata)
                SELECT id, NULL, NULL, ?, 'INITIAL_IMPORT', NULL, createdAt, NULL
                FROM dbo.users
            `, [BASE_LEVEL]);

            await pool.query(`
                INSERT INTO dbo.user_level_history (userId, courseId, previousLevel, newLevel, source, referenceId, effectiveDate, metadata)
                SELECT
                    TRY_CAST(student AS INT),
                    TRY_CAST(course AS INT),
                    LAG(level, 1, ?) OVER (PARTITION BY student ORDER BY COALESCE(issueDate, createdAt), id),
                    level,
                    'CERTIFICATE_ISSUED',
                    CAST(id AS VARCHAR(255)),
                    COALESCE(issueDate, createdAt),
                    NULL
                FROM dbo.certificates
                WHERE type = 'SKILL_UPGRADATION' AND level IS NOT NULL AND TRY_CAST(student AS INT) IS NOT NULL
            `, [BASE_LEVEL]);

            logger.info("UserLevelHistory: backfilled level history from users and certificates");
        } catch (error) {
            logger.error("Failed to backfill UserLevelHistory table", error);
        }
    }

    static async create(data) {
        const entry = new UserLevelHistory(data);

        const fields = [
            "userId", "courseId", "previousLevel", "newLevel",
            "source", "referenceId", "effectiveDate", "metadata"
        ];

        const values = fields.map(field => {
            let val = entry[field];
            if (field === 'metadata') return val ? JSON.stringify(val) : null;
            if (val === undefined) return null;
            return val;
        });

        const placeholders = fields.map(() => "?").join(",");
        const query = `INSERT INTO user_level_history (${fields.join(",")}) VALUES (${placeholders}); SELECT SCOPE_IDENTITY() AS id;`;

        const [rows] = await pool.query(query, values);
        return UserLevelHistory.findById(rows[0].id);
    }

    static async findById(id) {
        const [rows] = await pool.query("SELECT * FROM user_level_history WHERE id = ?", [id]);
        if (rows.length === 0) return null;
        return new UserLevelHistory(rows[0]);
    }

    static async find(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT * FROM user_level_history";
        let values = [];

        if (keys.length > 0) {
            const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
            sql += ` WHERE ${whereClause}`;
            values = keys.map(key => query[key]);
        }
        sql += " ORDER BY effectiveDate ASC, id ASC";

        const [rows] = await pool.query(sql, values);
        return rows.map(row => new UserLevelHistory(row));
    }
}

// Initialize table
UserLevelHistory.init();

export default UserLevelHistory;
