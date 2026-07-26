import fs from "fs/promises";
import path from "path";
import sql from "mssql";
import connectDB, { pool, buildConfig } from "../db/connectDB.js";
import ENV from "../configs/env.config.js";

// Import all models mainly to ensure tables init or for referencing names if needed,
// but for bulk generic ops, simple SQL is often cleaner.
import User from "../models/auth.model.js";
import Course from "../models/course.model.js";
import Department from "../models/department.model.js";
import Progress from "../models/progress.model.js";
import Audit from "../models/audit.model.js";
import Quiz from "../models/quiz.model.js";
import Assignment from "../models/assignment.model.js";
import Certificate from "../models/certificate.model.js";
// Additional migrated models
import Enrollment from "../models/enrollment.model.js";
import AttemptedQuiz from "../models/attemptedQuiz.model.js";
import CourseLevelConfig from "../models/courseLevelConfig.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Map collection/entity names to Table names
const ENTITY_TABLE_MAP = {
    users: 'users',
    courses: 'courses',
    departments: 'departments',
    progress: 'progress',
    audits: 'audits',
    quizzes: 'quizzes',
    assignments: 'assignments',
    certificates: 'certificates',
    enrollments: 'enrollments',
    attempted_quizzes: 'attempted_quizzes',
    course_level_configs: 'course_level_configs'
};

// Map collection names to Models for validation/schema awareness if needed
// (Models in SQL are mostly wrappers, might not support bulk validate same way)

// === DATABASE BACKUP OPERATIONS ===
// Backups are produced by a scheduled SQL Server job that writes daily .bak
// files to ENV.BACKUP_DIR — this app only lists and restores them.

const isValidBackupFilename = (name) => /^[\w\-. ]+\.bak$/i.test(name);

// Get backup history (lists .bak files from the backup directory)
export const getBackupHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const backupDir = ENV.BACKUP_DIR;

    let files;
    try {
        files = await fs.readdir(backupDir);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.json(new ApiResponse(200, {
                backups: [],
                pagination: { currentPage: Number(page), totalPages: 0, totalBackups: 0, limit: Number(limit) }
            }, 'Backup directory not found'));
        }
        console.error('Failed to read backup directory:', error);
        throw new ApiError('Failed to read backup directory', 500);
    }

    const bakFiles = files.filter((f) => f.toLowerCase().endsWith('.bak'));

    const backups = await Promise.all(bakFiles.map(async (filename) => {
        const stats = await fs.stat(path.join(backupDir, filename));
        return {
            _id: filename,
            backup: { id: filename, size: stats.size },
            createdAt: stats.mtime,
            fileExists: true
        };
    }));

    backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalBackups = backups.length;
    const offset = (Number(page) - 1) * Number(limit);
    const paginatedBackups = backups.slice(offset, offset + Number(limit));

    res.json(new ApiResponse(200, {
        backups: paginatedBackups,
        pagination: {
            currentPage: Number(page),
            totalPages: Math.max(1, Math.ceil(totalBackups / Number(limit))),
            totalBackups,
            limit: Number(limit)
        }
    }, 'Backup history fetched successfully'));
});

// Restore the database directly from a .bak file
export const restoreFromBackup = asyncHandler(async (req, res) => {
    const { backupId } = req.params;
    const { confirmRestore = false } = req.body;

    if (!confirmRestore) throw new ApiError('Restore confirmation required', 400);

    const filename = path.basename(backupId || '');
    if (!isValidBackupFilename(filename)) {
        throw new ApiError('Invalid backup file name', 400);
    }

    const backupDir = ENV.BACKUP_DIR;
    const backupPath = path.join(backupDir, filename);

    // Defense in depth against path traversal, on top of the filename regex check above
    if (path.dirname(backupPath) !== path.resolve(backupDir)) {
        throw new ApiError('Invalid backup file path', 400);
    }

    try {
        await fs.access(backupPath);
    } catch {
        throw new ApiError('Backup file not found', 404);
    }

    const dbName = ENV.DB_NAME;

    // The database being restored can't stay open on the app's own pool
    try {
        await pool.end();
    } catch (error) {
        console.error('Error closing main pool before restore:', error.message);
    }

    let masterPool;
    try {
        masterPool = await new sql.ConnectionPool(buildConfig('master')).connect();

        await masterPool.request().query(`ALTER DATABASE [${dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE`);

        await masterPool.request()
            .input('backupPath', sql.NVarChar, backupPath)
            .query(`RESTORE DATABASE [${dbName}] FROM DISK = @backupPath WITH REPLACE`);
    } catch (error) {
        console.error('Restore failed:', error);
        throw new ApiError(`Restore failed: ${error.message}`, 500);
    } finally {
        // Always try to bring the database back to multi-user, even if the restore itself failed
        if (masterPool) {
            try {
                await masterPool.request().query(`ALTER DATABASE [${dbName}] SET MULTI_USER`);
            } catch (error) {
                console.error('Error restoring multi-user mode:', error.message);
            }
            await masterPool.close().catch(() => { });
        }

        try {
            await connectDB();
        } catch (error) {
            console.error('Error reconnecting main pool after restore:', error.message);
        }
    }

    await Audit.create({
        user: req.user.id,
        action: 'RESTORE_BACKUP',
        details: { backupId: filename, filePath: backupPath, restoredAt: new Date() },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.json(new ApiResponse(200, {
        message: 'Database restored successfully',
        backupId: filename
    }, 'Restore completed'));
});

// Delete backup
export const deleteBackup = asyncHandler(async (req, res) => {
    const { backupId } = req.params;

    const [rows] = await pool.query("SELECT * FROM audits WHERE action = 'CREATE_BACKUP' AND JSON_EXTRACT(details, '$.id') = ?", [backupId]);
    const record = rows[0];

    if (!record) throw new ApiError('Backup not found', 404);

    let details = record.details;
    if (typeof details === 'string') details = JSON.parse(details);

    if (details.filePath) {
        try {
            await fs.unlink(details.filePath);
        } catch (e) { }
    }

    details.deleted = true;
    details.deletedAt = new Date();
    details.deletedBy = req.user.id;

    // Update audit info
    await pool.query("UPDATE audits SET details = ? WHERE id = ?", [JSON.stringify(details), record.id]);

    res.json(new ApiResponse(200, { backupId }, 'Backup deleted successfully'));
});

// === DATA EXPORT ===

export const exportSystemData = asyncHandler(async (req, res) => {
    const {
        collections = [],
        format = 'json',
        dateFrom,
        dateTo
    } = req.body;

    const exportData = {};
    const keysToExport = collections.length ? collections : Object.keys(ENTITY_TABLE_MAP);

    for (const key of keysToExport) {
        const tableName = ENTITY_TABLE_MAP[key];
        if (!tableName) continue;

        let sql = `SELECT * FROM ${tableName}`;
        let params = [];
        let clauses = [];

        // Check if table has createdAt for filtering
        // We assume most do. If not, catch error or check schema.
        // Simplified: try apply date filter, if fails, we consume error or skip filtering for that table?
        // Better: assume standard tables have createdAt if relevant.
        // We'll append WHERE logic conditionally
        if (dateFrom || dateTo) {
            // Basic Check if 'createdAt' column exists could be done or rely on try/catch
            // For now assume all main entities have createdAt
            if (dateFrom) { clauses.push("createdAt >= ?"); params.push(new Date(dateFrom)); }
            if (dateTo) { clauses.push("createdAt <= ?"); params.push(new Date(dateTo)); }
        }

        if (clauses.length > 0) sql += " WHERE " + clauses.join(" AND ");

        try {
            const [rows] = await pool.query(sql, params);
            exportData[key] = rows;
        } catch (e) {
            // Likely table missing or column missing
            console.warn(`Skipped export for ${key}: ${e.message}`);
        }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `lms_export_${timestamp}.${format}`;

    if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(new ApiResponse(200, { data: exportData }, 'Exported'));
    } else if (format === 'csv') {
        let csvContent = '';
        for (const [key, data] of Object.entries(exportData)) {
            if (!data || data.length === 0) continue;
            csvContent += `\n--- ${key.toUpperCase()} ---\n`;
            const headers = Object.keys(data[0]);
            csvContent += headers.join(',') + '\n';
            data.forEach(row => {
                const vals = headers.map(h => {
                    const v = row[h];
                    if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
                    return JSON.stringify(v); // handle commas in strings
                });
                csvContent += vals.join(',') + '\n';
            });
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
    }
});

// Import System Data
export const importSystemData = asyncHandler(async (req, res) => {
    const { mode = 'append', collections = [] } = req.body;

    let importData;
    if (req.file) {
        const content = await fs.readFile(req.file.path, 'utf8');
        importData = JSON.parse(content);
        await fs.unlink(req.file.path).catch(() => { });
    } else {
        importData = req.body.data;
    }

    if (!importData || !importData.data) throw new ApiError('Invalid data', 400);

    const conn = await pool.getConnection();
    const results = {};

    try {
        await conn.beginTransaction();

        const keys = collections.length ? collections : Object.keys(importData.data);

        for (const key of keys) {
            const tableName = ENTITY_TABLE_MAP[key];
            if (!tableName) continue;

            const data = importData.data[key];
            if (!Array.isArray(data) || data.length === 0) continue;

            if (mode === 'replace') {
                await conn.query(`DELETE FROM ${tableName}`);
            }

            let imported = 0;
            let errors = 0;

            for (const record of data) {
                // Insert or Update logic
                // Simple insert first for append
                try {
                    // Construct INSERT SET ?
                    // This is complex for generic without known schema columns.
                    // Strategy: use keys from record
                    const cols = Object.keys(record);
                    const vals = Object.values(record).map(v => (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v);

                    // Prepare placeholders
                    const sql = `INSERT INTO ${tableName} (${cols.map(c => `\`${c}\``).join(',')}) VALUES (${cols.map(() => '?').join(',')})`;

                    // With REPLACE mode, we want standard INSERT? 
                    // Or ON DUPLICATE KEY UPDATE?
                    // If 'append', usually generic INSERT.
                    // If 'replace' entire table, generic INSERT.
                    await conn.query(sql, vals);
                    imported++;
                } catch (e) {
                    errors++;
                    // Ignore specific dupe errors?
                }
            }
            results[key] = { imported, errors };
        }

        await conn.commit();
        res.json(new ApiResponse(200, { results }, 'Import completed'));
    } catch (e) {
        await conn.rollback();
        throw new ApiError(`Import failed: ${e.message}`, 500);
    } finally {
        conn.release();
    }
});

// Stats
export const getDataStatistics = asyncHandler(async (req, res) => {
    const stats = {};

    for (const [key, tableName] of Object.entries(ENTITY_TABLE_MAP)) {
        const [rows] = await pool.query(`SELECT COUNT(*) as total FROM ${tableName}`);
        // Recent?
        // SELECT COUNT(*) FROM table WHERE createdAt >= ...
        // Requires checking schema or wrapping try catch
        let recent = 0;
        try {
            const [recRows] = await pool.query(`SELECT COUNT(*) as c FROM ${tableName} WHERE createdAt >= DATEADD(day, -7, GETDATE())`);
            recent = recRows[0].c;
        } catch (e) { }

        stats[key] = {
            total: rows[0].total,
            recent
        };
    }

    res.json(new ApiResponse(200, { statistics: stats }, 'Fetched stats'));
});

export const getDataOperationHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const [rows] = await pool.query(
        "SELECT a.*, u.fullName FROM audits a LEFT JOIN users u ON a.user = u.id WHERE action IN ('CREATE_BACKUP','RESTORE_BACKUP','EXPORT_DATA','IMPORT_DATA') ORDER BY createdAt DESC LIMIT ? OFFSET ?",
        [Number(limit), Number(offset)]
    );

    const [c] = await pool.query("SELECT COUNT(*) as total FROM audits WHERE action IN ('CREATE_BACKUP','RESTORE_BACKUP','EXPORT_DATA','IMPORT_DATA')");

    res.json(new ApiResponse(200, { operations: rows, total: c[0].total }, 'History fetched'));
});

export const cleanupOldData = asyncHandler(async (req, res) => {
    const { cleanupAuditLogs, auditLogRetentionDays = 90, cleanupBackups, backupRetentionDays = 30, dryRun = true } = req.body;

    const results = {};

    if (cleanupAuditLogs) {
        const sql = "SELECT COUNT(*) as count FROM audits WHERE createdAt < DATEADD(day, -?, GETDATE())";
        const [rows] = await pool.query(sql, [auditLogRetentionDays]);
        results.auditLogs = { toDelete: rows[0].count };

        if (!dryRun) {
            await pool.query("DELETE FROM audits WHERE createdAt < DATEADD(day, -?, GETDATE())", [auditLogRetentionDays]);
            results.auditLogs.deleted = rows[0].count;
        }
    }

    // Backups logic similar, involves checking Audit logs for 'CREATE_BACKUP' and iterating files
    // Implemented simplified

    res.json(new ApiResponse(200, { results }, 'Cleanup run'));
});
