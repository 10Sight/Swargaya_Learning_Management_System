import { pool } from "../db/connectDB.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import ENV from "../configs/env.config.js";
import { slugify } from "../utils/slugify.js";

class User {
    constructor(data) {
        this.id = data.id;
        this._id = data.id; // Compatibility with Mongoose _id usage
        this.fullName = data.fullName;
        this.userName = data.userName;
        this.slug = data.slug;
        this.email = data.email;
        this.phoneNumber = data.phoneNumber;
        this.password = data.password;
        this.avatar = typeof data.avatar === 'string' ? JSON.parse(data.avatar) : (data.avatar || { publicId: "", url: "" });
        this.refreshToken = data.refreshToken;
        this.resetPasswordToken = data.resetPasswordToken;
        this.resetPasswordExpiry = data.resetPasswordExpiry ? new Date(data.resetPasswordExpiry) : null;
        this.role = data.role || "STUDENT";
        this.currentLevel = data.currentLevel || "L1";
        this.status = data.status || "PRESENT";
        this.isVerified = !!data.isVerified;
        this.enrolledCourses = typeof data.enrolledCourses === 'string' ? JSON.parse(data.enrolledCourses) : (data.enrolledCourses || []);
        this.createdCourses = typeof data.createdCourses === 'string' ? JSON.parse(data.createdCourses) : (data.createdCourses || []);
        this.lastLogin = data.lastLogin ? new Date(data.lastLogin) : null;
        this.loginHistory = typeof data.loginHistory === 'string' ? JSON.parse(data.loginHistory) : (data.loginHistory || []);
        this.isDeleted = !!data.isDeleted;
        this.department = data.department;
        this.departments = typeof data.departments === 'string' ? JSON.parse(data.departments) : (data.departments || []);
        this.unit = data.unit;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;

        // Internal tracking for password changes
        this._originalPassword = data.password;
    }

    static async init() {
        const query = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fullName VARCHAR(255) NOT NULL,
                userName VARCHAR(255) NOT NULL UNIQUE,
                slug VARCHAR(255) UNIQUE,
                email VARCHAR(255) NOT NULL UNIQUE,
                phoneNumber VARCHAR(50) NOT NULL,
                password VARCHAR(255) NOT NULL,
                avatar TEXT,
                refreshToken TEXT,
                resetPasswordToken VARCHAR(255),
                resetPasswordExpiry DATETIME,
                role VARCHAR(50) DEFAULT 'STUDENT',
                currentLevel VARCHAR(50) DEFAULT 'L1',
                status VARCHAR(50) DEFAULT 'PRESENT',
                isVerified BOOLEAN DEFAULT FALSE,
                enrolledCourses TEXT,
                createdCourses TEXT,
                lastLogin DATETIME,
                loginHistory TEXT,
                isDeleted BOOLEAN DEFAULT FALSE,
                department VARCHAR(255),
                departments TEXT,
                unit VARCHAR(50) NOT NULL,
                createdAt DATETIME,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;
        await pool.query(query);
    }

    static async create(userData) {
        if (userData.password) {
            userData.password = await bcrypt.hash(userData.password, 10);
        }

        // Generate unique slug
        let baseSlug = slugify(userData.userName || userData.fullName);
        let slug = baseSlug;
        let suffix = 1;
        while (true) {
            const [rows] = await pool.query("SELECT id FROM users WHERE slug = ?", [slug]);
            if (rows.length === 0) break;
            suffix++;
            slug = `${baseSlug}-${suffix}`;
        }
        userData.slug = slug;

        const fields = [
            "fullName", "userName", "slug", "email", "phoneNumber", "password",
            "avatar", "refreshToken", "role", "currentLevel", "status", "isVerified",
            "enrolledCourses", "createdCourses", "lastLogin", "loginHistory",
            "isDeleted", "department", "departments", "unit", "createdAt"
        ];

        // Apply defaults if fields are missing in userData
        const dataToInsert = { ...userData };
        if (!dataToInsert.createdAt) dataToInsert.createdAt = new Date();
        if (dataToInsert.status === undefined) dataToInsert.status = 'PRESENT';
        if (dataToInsert.role === undefined) dataToInsert.role = 'STUDENT';
        if (dataToInsert.isDeleted === undefined) dataToInsert.isDeleted = 0;
        if (dataToInsert.isVerified === undefined) dataToInsert.isVerified = 0;

        const values = fields.map(field => {
            let val = dataToInsert[field];
            if (['avatar', 'enrolledCourses', 'createdCourses', 'loginHistory', 'departments'].includes(field)) {
                return JSON.stringify(val || (field === 'avatar' ? {} : []));
            }
            if (val === undefined) return null;
            return val;
        });

        const placeholders = fields.map(() => "?").join(",");
        const query = `INSERT INTO users (${fields.join(",")}) VALUES (${placeholders})`;

        const [result] = await pool.query(query, values);
        return User.findById(result.insertId);
    }

    static async findOne(query) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        if (keys.length === 0) return null;

        const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
        const values = keys.map(key => query[key]);

        const [rows] = await pool.query(`SELECT * FROM users WHERE ${whereClause} LIMIT 1`, values);
        if (rows.length === 0) return null;
        return new User(rows[0]);
    }

    static async findById(id) {
        const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
        if (rows.length === 0) return null;
        return new User(rows[0]);
    }

    // Static compatibility alias for Mongoose's findById
    static async findOneById(id) {
        return this.findById(id);
    }

    static async find(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT * FROM users";
        let values = [];

        if (keys.length > 0) {
            const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
            sql += ` WHERE ${whereClause}`;
            values = keys.map(key => query[key]);
        }

        const [rows] = await pool.query(sql, values);
        return rows.map(row => new User(row));
    }

    static async countDocuments(query = {}) {
        const keys = Object.keys(query).filter(key => query[key] !== undefined);
        let sql = "SELECT COUNT(*) as count FROM users";
        let values = [];

        if (keys.length > 0) {
            const whereClause = keys.map(key => `${key} = ?`).join(" AND ");
            sql += ` WHERE ${whereClause}`;
            values = keys.map(key => query[key]);
        }

        const [rows] = await pool.query(sql, values);
        return rows[0].count;
    }

    static async exists(query) {
        const user = await this.findOne(query);
        return !!user;
    }

    async save() {
        // Hash password if modified
        if (this.password && this.password !== this._originalPassword) {
            this.password = await bcrypt.hash(this.password, 10);
        }

        const fields = [
            "fullName", "userName", "slug", "email", "phoneNumber", "password",
            "avatar", "refreshToken", "role", "currentLevel", "status", "isVerified",
            "enrolledCourses", "createdCourses", "lastLogin", "loginHistory",
            "isDeleted", "department", "departments", "unit", "resetPasswordToken", "resetPasswordExpiry"
        ];

        // Only update fields that are defined on the instance
        const definedFields = fields.filter(field => this[field] !== undefined);
        const setClause = definedFields.map(field => `${field} = ?`).join(", ");
        const values = definedFields.map(field => {
            const val = this[field];
            if (['avatar', 'enrolledCourses', 'createdCourses', 'loginHistory', 'departments'].includes(field)) {
                return typeof val === 'object' ? JSON.stringify(val) : val;
            }
            if (val instanceof Date) return val;
            return val;
        });
        values.push(this.id);

        await pool.query(`UPDATE users SET ${setClause} WHERE id = ?`, values);

        this._originalPassword = this.password;
        return this;
    }

    async comparePassword(password) {
        return await bcrypt.compare(password, this.password);
    }

    generateAccessToken() {
        return jwt.sign({ id: this.id }, ENV.JWT_ACCESS_SECRET, {
            expiresIn: ENV.JWT_ACCESS_EXPIRES_IN,
        });
    }

    generateRefreshToken() {
        return jwt.sign({ id: this.id }, ENV.JWT_REFRESH_SECRET, {
            expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
        });
    }

    async generatePasswordResetToken() {
        const resetToken = crypto.randomBytes(20).toString("hex");
        this.resetPasswordToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");
        this.resetPasswordExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
        // Note: Caller is expected to call save() after this, similar to Mongoose
        return resetToken;
    }
}

// Initialize table asynchronously
// Not awaiting here to avoid blocking import, but errors will be logged if it fails
User.init().catch(err => console.error("Failed to initialize User table:", err));

export default User;