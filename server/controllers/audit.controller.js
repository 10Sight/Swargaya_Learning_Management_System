import { pool } from "../db/connectDB.js";
import Audit from "../models/audit.model.js";
import User from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Helper to populate user details
const populateAuditUser = async (audit) => {
    if (!audit) return null;
    if (audit.user) {
        // If user is just an ID
        if (typeof audit.user !== 'object' || !audit.user.fullName) {
            const u = await User.findById(audit.user);
            if (u) {
                audit.user = { id: u.id, fullName: u.fullName, email: u.email, role: u.role };
            }
        }
    }
    return audit;
};

export const getAllAudits = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const filters = [];
    const params = [];

    // Role-based filtering: Admin users cannot see SuperAdmin activities
    let superAdminIds = [];
    if (req.user && req.user.role === 'ADMIN') {
        const superAdmins = await User.find({ role: 'SUPERADMIN' });
        superAdminIds = superAdmins.map(u => u.id);
    }

    // User filter
    if (req.query.userId) {
        // Check if looks like ID (number or string depending on DB, assuming int ID for SQL user but string input)
        // If it's a number-like string, try ID match
        let isId = !isNaN(parseInt(req.query.userId));

        if (isId) {
            const targetId = parseInt(req.query.userId);
            if (req.user && req.user.role === 'ADMIN' && superAdminIds.includes(targetId)) {
                filters.push("1=0"); // Block access
            } else {
                filters.push("[user] = ?");
                params.push(targetId);
            }
        } else {
            // Search by email or name
            const [users] = await pool.query(
                "SELECT id FROM users WHERE (email LIKE ? OR fullName LIKE ?)",
                [`%${req.query.userId}%`, `%${req.query.userId}%`]
            );

            let allowedUserIds = users.map(u => u.id);
            if (req.user && req.user.role === 'ADMIN') {
                allowedUserIds = allowedUserIds.filter(id => !superAdminIds.includes(id));
            }

            if (allowedUserIds.length > 0) {
                filters.push(`[user] IN (${allowedUserIds.join(',')})`);
            } else {
                filters.push("1=0");
            }
        }
    } else if (req.user && req.user.role === 'ADMIN' && superAdminIds.length > 0) {
        // Exclude SuperAdmins
        filters.push(`([user] NOT IN (${superAdminIds.join(',')}) OR [user] IS NULL)`);
    }

    // Additional filtering for Admin - sensitive ops
    if (req.user && req.user.role === 'ADMIN') {
        // Complex logic: (user exists) OR (user null AND action NOT SENSITIVE)
        // In SQL: (user IS NOT NULL) OR (user IS NULL AND action NOT REGEXP ...)
        // Check sensitive actions using LIKE instead of REGEXP (T-SQL)
        const sensitiveActions = ['SYSTEM_ADMIN', 'SUPERADMIN', 'PRIVILEGE', 'ROLE_CHANGE', 'SYSTEM_SETTINGS'];
        const sensitiveChecks = sensitiveActions.map(act => `action NOT LIKE '%${act}%'`).join(' AND ');

        filters.push(`(
            [user] IS NOT NULL 
            OR 
            ([user] IS NULL AND (${sensitiveChecks}))
        )`);
    }

    // Action filter
    if (req.query.action) {
        filters.push("action LIKE ?");
        params.push(`%${req.query.action}%`);
    }

    // Search filter
    if (req.query.search) {
        const term = `%${req.query.search}%`;
        filters.push(`(action LIKE ? OR resourceType LIKE ? OR ip LIKE ?)`);
        params.push(term, term, term);
    }

    // Date range
    if (req.query.dateFrom) {
        filters.push("createdAt >= ?");
        params.push(new Date(req.query.dateFrom));
    }
    if (req.query.dateTo) {
        filters.push("createdAt <= ?");
        params.push(new Date(req.query.dateTo));
    }

    // IP
    if (req.query.ipAddress) {
        filters.push("ip LIKE ?");
        params.push(`%${req.query.ipAddress}%`);
    }

    // User Agent
    if (req.query.userAgent) {
        filters.push("userAgent LIKE ?");
        params.push(`%${req.query.userAgent}%`);
    }

    // Severity
    if (req.query.severity) {
        filters.push("severity = ?");
        params.push(req.query.severity.toLowerCase());
    }

    const whereClause = filters.length > 0 ? "WHERE " + filters.join(" AND ") : "";

    // Count total
    const [countRows] = await pool.query(`SELECT COUNT(*) as count FROM audits ${whereClause}`, params);
    const total = countRows[0].count;

    // Sorting
    const sortBy = req.query.sortBy || 'createdAt';
    // Validate sort column to prevent SQL injection
    // Validate sort column to prevent SQL injection
    const allowedSorts = ['createdAt', 'action', 'severity', 'user', 'ip'];
    let safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';
    if (safeSortBy === 'user') safeSortBy = '[user]';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

    const [rows] = await pool.query(
        `SELECT * FROM audits ${whereClause} ORDER BY ${safeSortBy} ${order} OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
        [...params, offset, limit]
    );

    let audits = rows.map(r => new Audit(r));
    audits = await Promise.all(audits.map(populateAuditUser));

    res.json(
        new ApiResponse(
            200,
            {
                audits,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit),
                    limit,
                },
            },
            "Audit logs fetched successfully"
        )
    );
});

export const getAuditById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    let audit = await Audit.findById(id);
    if (!audit) throw new ApiError("Audit log not found", 404);

    audit = await populateAuditUser(audit);

    // Role-based access check
    if (req.user && req.user.role === 'ADMIN') {
        if (audit.user && audit.user.role === 'SUPERADMIN') {
            throw new ApiError("Access denied: You don't have permission to view this audit log", 403);
        }

        if (!audit.user && audit.action &&
            /SYSTEM_ADMIN|SUPERADMIN|PRIVILEGE|ROLE_CHANGE|SYSTEM_SETTINGS/i.test(audit.action)) {
            throw new ApiError("Access denied: You don't have permission to view this audit log", 403);
        }
    }

    res.json(new ApiResponse(200, audit, "Audit log fetched successfully"));
});

export const deleteAudit = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const audit = await Audit.findById(id);
    if (!audit) throw new ApiError("Audit log not found", 404);

    const { pool } = await import("../db/connectDB.js");
    await pool.query("DELETE FROM audits WHERE id = ?", [id]);

    res.json(new ApiResponse(200, null, "Audit log deleted successfully"));
});