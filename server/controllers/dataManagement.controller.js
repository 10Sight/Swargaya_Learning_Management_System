import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import archiver from "archiver";
import { promisify } from "util";
import { exec } from "child_process";
import User from "../models/auth.model.js";
import Course from "../models/course.model.js";
import Department from "../models/department.model.js";
import Progress from "../models/progress.model.js";
import Audit from "../models/audit.model.js";
import Quiz from "../models/quiz.model.js";
import Assignment from "../models/assignment.model.js";
import Certificate from "../models/certificate.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const execAsync = promisify(exec);

// === DATABASE BACKUP OPERATIONS ===

// Create database backup
export const createDatabaseBackup = asyncHandler(async (req, res) => {
    try {
        const { includeFiles = false, compression = true, encryption = false, description } = req.body;

        const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const backupDir = path.join(process.cwd(), 'backups');
        const backupPath = path.join(backupDir, backupId);

        // Create backup directory if it doesn't exist
        try {
            await fs.access(backupDir);
        } catch {
            await fs.mkdir(backupDir, { recursive: true });
        }

        // Create backup metadata
        const backupMetadata = {
            id: backupId,
            createdAt: new Date(),
            createdBy: req.user._id,
            description: description || `Database backup created at ${new Date().toISOString()}`,
            includeFiles,
            compression,
            encryption,
            status: 'in_progress',
            size: 0,
            collections: {},
            version: process.env.APP_VERSION || '1.0.0'
        };

        // Export database collections
        const collections = {
            users: await User.find({}).lean(),
            courses: await Course.find({}).lean(),
            departments: await Department.find({}).lean(),
            progress: await Progress.find({}).lean(),
            audits: await Audit.find({}).lean(),
            quizzes: await Quiz.find({}).lean(),
            assignments: await Assignment.find({}).lean(),
            certificates: await Certificate.find({}).lean()
        };

        // Count documents in each collection
        for (const [collectionName, data] of Object.entries(collections)) {
            backupMetadata.collections[collectionName] = data.length;
        }

        // Create backup file
        const backupData = {
            metadata: backupMetadata,
            data: collections,
            timestamp: new Date().toISOString()
        };

        let backupFilePath = `${backupPath}.json`;

        // Write backup data
        await fs.writeFile(backupFilePath, JSON.stringify(backupData, null, 2));

        // Compress if requested
        if (compression) {
            const compressedPath = `${backupPath}.zip`;
            const archive = archiver('zip', { zlib: { level: 9 } });
            const output = await import('fs').then(fs => fs.createWriteStream(compressedPath));

            await new Promise((resolve, reject) => {
                output.on('close', resolve);
                output.on('error', reject);
                archive.on('error', reject);

                archive.pipe(output);
                archive.file(backupFilePath, { name: `${backupId}.json` });
                archive.finalize();
            });

            // Remove uncompressed file
            await fs.unlink(backupFilePath);
            backupFilePath = compressedPath;
        }

        // Get file size
        const stats = await fs.stat(backupFilePath);
        backupMetadata.size = stats.size;
        backupMetadata.status = 'completed';
        backupMetadata.filePath = backupFilePath;

        // Save backup metadata to database (you might want to create a Backup model)
        // For now, we'll store it in the audit log
        const auditLogger = (await import("../utils/auditLogger.js")).default;
        await auditLogger({
            action: 'CREATE_BACKUP',
            userId: req.user._id,
            details: backupMetadata,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json(new ApiResponse(200, {
            backupId,
            metadata: backupMetadata,
            message: 'Database backup created successfully'
        }, 'Backup created successfully'));

    } catch (error) {
        throw new ApiError('Failed to create database backup', 500);
    }
});

// Get backup history
export const getBackupHistory = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get backup records from audit logs
        const backupRecords = await Audit.find({
            action: 'CREATE_BACKUP'
        })
            .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('userId', 'fullName email')
            .lean();

        const totalBackups = await Audit.countDocuments({
            action: 'CREATE_BACKUP'
        });

        // Check if backup files still exist
        const backupsWithStatus = await Promise.all(
            backupRecords.map(async (record) => {
                let fileExists = false;
                let fileSize = 0;

                if (record.details?.filePath) {
                    try {
                        const stats = await fs.stat(record.details.filePath);
                        fileExists = true;
                        fileSize = stats.size;
                    } catch (error) {
                        // File doesn't exist
                    }
                }

                return {
                    ...record,
                    fileExists,
                    fileSize,
                    backup: record.details
                };
            })
        );

        res.json(new ApiResponse(200, {
            backups: backupsWithStatus,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalBackups / parseInt(limit)),
                totalBackups,
                limit: parseInt(limit)
            }
        }, 'Backup history fetched successfully'));

    } catch (error) {
        throw new ApiError('Failed to fetch backup history', 500);
    }
});

// Restore from backup
export const restoreFromBackup = asyncHandler(async (req, res) => {
    try {
        const { backupId } = req.params;
        const { collections = [], confirmRestore = false } = req.body;

        if (!confirmRestore) {
            throw new ApiError('Restore confirmation required', 400);
        }

        // Find backup record
        const backupRecord = await Audit.findOne({
            action: 'CREATE_BACKUP',
            'details.id': backupId
        });

        if (!backupRecord) {
            throw new ApiError('Backup not found', 404);
        }

        const backupPath = backupRecord.details.filePath;

        // Check if backup file exists
        try {
            await fs.access(backupPath);
        } catch {
            throw new ApiError('Backup file not found', 404);
        }

        // Read backup data
        let backupContent;
        if (backupPath.endsWith('.zip')) {
            // Handle compressed backup (simplified - in production you'd use proper zip extraction)
            throw new ApiError('Compressed backup restore not yet implemented', 501);
        } else {
            const backupData = await fs.readFile(backupPath, 'utf8');
            backupContent = JSON.parse(backupData);
        }

        // Validate backup data
        if (!backupContent.data || !backupContent.metadata) {
            throw new ApiError('Invalid backup format', 400);
        }

        // Create restore transaction
        const session = await mongoose.startSession();

        try {
            await session.withTransaction(async () => {
                const collectionsToRestore = collections.length ? collections : Object.keys(backupContent.data);

                for (const collectionName of collectionsToRestore) {
                    if (!backupContent.data[collectionName]) continue;

                    let Model;
                    switch (collectionName) {
                        case 'users':
                            Model = User;
                            break;
                        case 'courses':
                            Model = Course;
                            break;
                        case 'departments':
                            Model = Department;
                            break;
                        case 'progress':
                            Model = Progress;
                            break;
                        case 'audits':
                            Model = Audit;
                            break;
                        case 'quizzes':
                            Model = Quiz;
                            break;
                        case 'assignments':
                            Model = Assignment;
                            break;
                        case 'certificates':
                            Model = Certificate;
                            break;
                        default:
                            continue;
                    }

                    // Clear existing data (WARNING: This is destructive!)
                    await Model.deleteMany({}, { session });

                    // Insert backup data
                    if (backupContent.data[collectionName].length > 0) {
                        await Model.insertMany(backupContent.data[collectionName], { session });
                    }
                }
            });

            // Log restore action
            const auditLogger = (await import("../utils/auditLogger.js")).default;
            await auditLogger({
                action: 'RESTORE_BACKUP',
                userId: req.user._id,
                details: {
                    backupId,
                    restoredCollections: collections,
                    backupCreatedAt: backupContent.metadata.createdAt
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.json(new ApiResponse(200, {
                message: 'Database restored successfully',
                backupId,
                restoredCollections: collections
            }, 'Restore completed successfully'));

        } catch (error) {
            throw new ApiError(`Restore failed: ${error.message}`, 500);
        } finally {
            await session.endSession();
        }

    } catch (error) {
        throw new ApiError(error.message || 'Failed to restore from backup', error.statusCode || 500);
    }
});

// Delete backup
export const deleteBackup = asyncHandler(async (req, res) => {
    try {
        const { backupId } = req.params;

        // Find backup record
        const backupRecord = await Audit.findOne({
            action: 'CREATE_BACKUP',
            'details.id': backupId
        });

        if (!backupRecord) {
            throw new ApiError('Backup not found', 404);
        }

        const backupPath = backupRecord.details.filePath;

        // Delete backup file
        try {
            await fs.unlink(backupPath);
        } catch (error) {
            // Backup file not found or already deleted
        }

        // Update audit record to mark as deleted
        backupRecord.details.deleted = true;
        backupRecord.details.deletedAt = new Date();
        backupRecord.details.deletedBy = req.user._id;
        await backupRecord.save();

        res.json(new ApiResponse(200, {
            message: 'Backup deleted successfully',
            backupId
        }, 'Backup deleted successfully'));

    } catch (error) {
        throw new ApiError(error.message || 'Failed to delete backup', error.statusCode || 500);
    }
});

// === DATA EXPORT OPERATIONS ===

// Export system data
export const exportSystemData = asyncHandler(async (req, res) => {
    try {
        const {
            collections = [],
            format = 'json',
            filters = {},
            includeMetadata = true,
            dateFrom,
            dateTo
        } = req.body;

        // Build date filter if provided
        const dateFilter = {};
        if (dateFrom || dateTo) {
            if (dateFrom) dateFilter.$gte = new Date(dateFrom);
            if (dateTo) dateFilter.$lte = new Date(dateTo);
        }

        const exportData = {};
        const metadata = {
            exportedAt: new Date(),
            exportedBy: req.user._id,
            format,
            filters,
            collections: collections.length ? collections : ['all'],
            version: process.env.APP_VERSION || '1.0.0'
        };

        // Define available collections
        const availableCollections = {
            users: User,
            courses: Course,
            departments: Department,
            progress: Progress,
            audits: Audit,
            quizzes: Quiz,
            assignments: Assignment,
            certificates: Certificate
        };

        const collectionsToExport = collections.length ? collections : Object.keys(availableCollections);

        for (const collectionName of collectionsToExport) {
            if (!availableCollections[collectionName]) continue;

            const Model = availableCollections[collectionName];
            let query = {};

            // Apply date filter if the collection has createdAt field
            if (Object.keys(dateFilter).length > 0) {
                query.createdAt = dateFilter;
            }

            // Apply specific filters
            if (filters[collectionName]) {
                query = { ...query, ...filters[collectionName] };
            }

            const data = await Model.find(query).lean();
            exportData[collectionName] = data;
            metadata[`${collectionName}Count`] = data.length;
        }

        // Prepare export response
        const exportResult = {
            ...(includeMetadata && { metadata }),
            data: exportData
        };

        // Log export action
        const auditLogger = (await import("../utils/auditLogger.js")).default;
        await auditLogger({
            action: 'EXPORT_DATA',
            userId: req.user._id,
            details: {
                collections: collectionsToExport,
                format,
                recordsExported: Object.values(exportData).reduce((sum, arr) => sum + arr.length, 0)
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Set appropriate headers for file download
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `lms_export_${timestamp}.${format}`;

        res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        if (format === 'json') {
            res.json(new ApiResponse(200, exportResult, 'Data exported successfully'));
        } else if (format === 'csv') {
            // Convert to CSV format (simplified implementation)
            let csvContent = '';
            for (const [collectionName, data] of Object.entries(exportData)) {
                if (data.length === 0) continue;

                csvContent += `\n--- ${collectionName.toUpperCase()} ---\n`;
                const headers = Object.keys(data[0]);
                csvContent += headers.join(',') + '\n';

                for (const record of data) {
                    const values = headers.map(header => {
                        const value = record[header];
                        return typeof value === 'object' ? JSON.stringify(value) : value;
                    });
                    csvContent += values.join(',') + '\n';
                }
            }

            res.send(csvContent);
        }

    } catch (error) {
        throw new ApiError('Failed to export data', 500);
    }
});

// === DATA IMPORT OPERATIONS ===

// Import system data
export const importSystemData = asyncHandler(async (req, res) => {
    try {
        const { mode = 'append', collections = [], validateData = true } = req.body;

        if (!req.file && !req.body.data) {
            throw new ApiError('No data file or data provided', 400);
        }

        let importData;

        if (req.file) {
            // Read uploaded file
            const fileContent = await fs.readFile(req.file.path, 'utf8');

            if (req.file.mimetype === 'application/json') {
                importData = JSON.parse(fileContent);
            } else {
                throw new ApiError('Unsupported file format. Only JSON files are supported', 400);
            }

            // Clean up uploaded file
            await fs.unlink(req.file.path);
        } else {
            importData = req.body.data;
        }

        // Validate import data structure
        if (!importData.data) {
            throw new ApiError('Invalid import data format', 400);
        }

        // Define model mapping
        const modelMapping = {
            users: User,
            courses: Course,
            departments: Department,
            progress: Progress,
            audits: Audit,
            quizzes: Quiz,
            assignments: Assignment,
            certificates: Certificate
        };

        const session = await mongoose.startSession();
        const importResults = {};

        try {
            await session.withTransaction(async () => {
                const collectionsToImport = collections.length ? collections : Object.keys(importData.data);

                for (const collectionName of collectionsToImport) {
                    if (!importData.data[collectionName] || !modelMapping[collectionName]) {
                        importResults[collectionName] = { skipped: true, reason: 'Collection not found' };
                        continue;
                    }

                    const Model = modelMapping[collectionName];
                    const data = importData.data[collectionName];

                    if (!Array.isArray(data) || data.length === 0) {
                        importResults[collectionName] = { skipped: true, reason: 'No data to import' };
                        continue;
                    }

                    // Validate data if requested
                    if (validateData) {
                        for (const record of data) {
                            try {
                                const validationResult = new Model(record);
                                await validationResult.validate();
                            } catch (validationError) {
                                throw new ApiError(`Validation failed for ${collectionName}: ${validationError.message}`, 400);
                            }
                        }
                    }

                    let imported = 0;
                    let updated = 0;
                    let errors = 0;

                    if (mode === 'replace') {
                        // Clear existing data
                        await Model.deleteMany({}, { session });
                        await Model.insertMany(data, { session });
                        imported = data.length;
                    } else {
                        // Append mode - handle duplicates
                        for (const record of data) {
                            try {
                                if (record._id) {
                                    // Try to update existing record
                                    const existing = await Model.findById(record._id).session(session);
                                    if (existing) {
                                        await Model.findByIdAndUpdate(record._id, record, { session, new: true });
                                        updated++;
                                    } else {
                                        await Model.create([record], { session });
                                        imported++;
                                    }
                                } else {
                                    // Create new record
                                    await Model.create([record], { session });
                                    imported++;
                                }
                            } catch (error) {
                                errors++;
                            }
                        }
                    }

                    importResults[collectionName] = {
                        imported,
                        updated,
                        errors,
                        total: data.length
                    };
                }
            });

            // Log import action
            const auditLogger = (await import("../utils/auditLogger.js")).default;
            await auditLogger({
                action: 'IMPORT_DATA',
                userId: req.user._id,
                details: {
                    mode,
                    collections: Object.keys(importResults),
                    results: importResults
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.json(new ApiResponse(200, {
                importResults,
                summary: {
                    totalImported: Object.values(importResults).reduce((sum, result) => sum + (result.imported || 0), 0),
                    totalUpdated: Object.values(importResults).reduce((sum, result) => sum + (result.updated || 0), 0),
                    totalErrors: Object.values(importResults).reduce((sum, result) => sum + (result.errors || 0), 0)
                }
            }, 'Data imported successfully'));

        } catch (error) {
            throw new ApiError(`Import failed: ${error.message}`, 500);
        } finally {
            await session.endSession();
        }

    } catch (error) {
        throw new ApiError(error.message || 'Failed to import data', error.statusCode || 500);
    }
});

// === DATA ANALYTICS OPERATIONS ===

// Get data statistics
export const getDataStatistics = asyncHandler(async (req, res) => {
    try {
        const collections = {
            users: User,
            courses: Course,
            departments: Department,
            progress: Progress,
            audits: Audit,
            quizzes: Quiz,
            assignments: Assignment,
            certificates: Certificate
        };

        const statistics = {};

        for (const [name, Model] of Object.entries(collections)) {
            const total = await Model.countDocuments();
            const recent = await Model.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            });

            statistics[name] = {
                total,
                recent,
                growth: total > 0 ? Math.round((recent / total) * 100) : 0
            };
        }

        // Calculate storage usage (approximated)
        const totalRecords = Object.values(statistics).reduce((sum, stat) => sum + stat.total, 0);
        const estimatedSize = totalRecords * 1024; // Rough estimate in bytes

        const summary = {
            totalCollections: Object.keys(collections).length,
            totalRecords,
            estimatedSize,
            recentActivity: Object.values(statistics).reduce((sum, stat) => sum + stat.recent, 0),
            lastUpdated: new Date()
        };

        res.json(new ApiResponse(200, {
            statistics,
            summary
        }, 'Data statistics fetched successfully'));

    } catch (error) {
        throw new ApiError('Failed to fetch data statistics', 500);
    }
});

// Get data operation history
export const getDataOperationHistory = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 20, operation = '', sortBy = 'createdAt', order = 'desc' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const query = {
            action: { $in: ['CREATE_BACKUP', 'RESTORE_BACKUP', 'EXPORT_DATA', 'IMPORT_DATA'] }
        };

        if (operation) {
            const actionMap = {
                backup: 'CREATE_BACKUP',
                restore: 'RESTORE_BACKUP',
                export: 'EXPORT_DATA',
                import: 'IMPORT_DATA'
            };
            if (actionMap[operation]) {
                query.action = actionMap[operation];
            }
        }

        const operations = await Audit.find(query)
            .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('userId', 'fullName email')
            .lean();

        const totalOperations = await Audit.countDocuments(query);

        res.json(new ApiResponse(200, {
            operations,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalOperations / parseInt(limit)),
                totalOperations,
                limit: parseInt(limit)
            }
        }, 'Data operation history fetched successfully'));

    } catch (error) {
        throw new ApiError('Failed to fetch operation history', 500);
    }
});

// Clean up old data
export const cleanupOldData = asyncHandler(async (req, res) => {
    try {
        const {
            cleanupAuditLogs = false,
            auditLogRetentionDays = 90,
            cleanupBackups = false,
            backupRetentionDays = 30,
            dryRun = true
        } = req.body;

        const results = {};

        if (cleanupAuditLogs) {
            const cutoffDate = new Date(Date.now() - auditLogRetentionDays * 24 * 60 * 60 * 1000);

            if (dryRun) {
                const count = await Audit.countDocuments({
                    createdAt: { $lt: cutoffDate }
                });
                results.auditLogs = {
                    toDelete: count,
                    deleted: 0,
                    dryRun: true
                };
            } else {
                const deleteResult = await Audit.deleteMany({
                    createdAt: { $lt: cutoffDate }
                });
                results.auditLogs = {
                    toDelete: deleteResult.deletedCount,
                    deleted: deleteResult.deletedCount,
                    dryRun: false
                };
            }
        }

        if (cleanupBackups) {
            const cutoffDate = new Date(Date.now() - backupRetentionDays * 24 * 60 * 60 * 1000);

            const oldBackups = await Audit.find({
                action: 'CREATE_BACKUP',
                createdAt: { $lt: cutoffDate }
            });

            let deletedFiles = 0;

            if (!dryRun) {
                for (const backup of oldBackups) {
                    if (backup.details?.filePath) {
                        try {
                            await fs.unlink(backup.details.filePath);
                            deletedFiles++;
                        } catch (error) {
                            // Failed to delete backup file
                        }
                    }
                }

                // Mark backup records as cleaned up
                await Audit.updateMany({
                    action: 'CREATE_BACKUP',
                    createdAt: { $lt: cutoffDate }
                }, {
                    $set: { 'details.cleanedUp': true, 'details.cleanedUpAt': new Date() }
                });
            }

            results.backups = {
                foundOldBackups: oldBackups.length,
                deletedFiles,
                dryRun
            };
        }

        res.json(new ApiResponse(200, {
            results,
            message: dryRun ? 'Cleanup dry run completed' : 'Cleanup completed successfully'
        }, 'Cleanup operation successful'));

    } catch (error) {
        throw new ApiError('Failed to cleanup old data', 500);
    }
});
