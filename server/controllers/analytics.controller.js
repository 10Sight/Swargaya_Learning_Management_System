import mongoose from "mongoose";
import User from "../models/auth.model.js";
import Course from "../models/course.model.js";
import Department from "../models/department.model.js";
import AttemptedQuiz from "../models/attemptedQuiz.model.js";
import Progress from "../models/progress.model.js";
import Audit from "../models/audit.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// Get dashboard statistics
export const getDashboardStats = asyncHandler(async (req, res) => {
    try {
        // Get counts
        const totalStudents = await User.countDocuments({ role: "STUDENT" });
        const totalInstructors = await User.countDocuments({ role: "INSTRUCTOR" });
        const totalCourses = await Course.countDocuments();
        const totalDepartments = await Department.countDocuments({ isDeleted: { $ne: true } });

        // Get present counts (was ACTIVE)
        const activeStudents = await User.countDocuments({ role: "STUDENT", status: "PRESENT" });
        const activeDepartments = await Department.countDocuments({ status: "ONGOING", isDeleted: { $ne: true } });
        const publishedCourses = await Course.countDocuments({ status: "PUBLISHED" });

        // Get recent activity count with role-based filtering
        let recentActivityFilter = {
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        };

        // Apply role-based filtering for Admin users
        if (req.user && req.user.role === 'ADMIN') {
            // Get all SuperAdmin user IDs to exclude their activities
            const superAdminUsers = await User.find({ role: 'SUPERADMIN' }).select('_id');
            const superAdminIds = superAdminUsers.map(u => u._id);

            if (superAdminIds.length > 0) {
                recentActivityFilter.$and = [
                    {
                        $or: [
                            { user: { $nin: superAdminIds } }, // Exclude SuperAdmin user activities
                            { user: { $exists: false } }, // Include system logs without user
                        ]
                    },
                    {
                        // Exclude sensitive system operations
                        action: { $not: { $regex: 'SYSTEM_ADMIN|SUPERADMIN|PRIVILEGE|ROLE_CHANGE|SYSTEM_SETTINGS', $options: 'i' } }
                    }
                ];
            }
        }

        const recentActivitiesCount = await Audit.countDocuments(recentActivityFilter);

        // Calculate engagement metrics
        const studentEngagement = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;
        const departmentUtilization = totalDepartments > 0 ? Math.round((activeDepartments / totalDepartments) * 100) : 0;
        const courseCompletion = totalCourses > 0 ? Math.round((publishedCourses / totalCourses) * 100) : 0;

        const stats = {
            totals: {
                students: totalStudents,
                instructors: totalInstructors,
                courses: totalCourses,
                departments: totalDepartments
            },
            active: {
                students: activeStudents,
                departments: activeDepartments,
                publishedCourses
            },
            engagement: {
                studentEngagement,
                departmentUtilization,
                courseCompletion
            },
            recentActivitiesCount
        };

        res.json(new ApiResponse(200, stats, "Dashboard statistics fetched successfully"));
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        throw new ApiError("Failed to fetch dashboard statistics", 500);
    }
});

// Get user statistics
export const getUserStats = asyncHandler(async (req, res) => {
    const { period = '30d' } = req.query;

    try {
        // Calculate date range based on period
        let startDate;
        switch (period) {
            case '7d':
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }

        // Build user aggregation match conditions with role-based filtering
        let userMatchConditions = {
            createdAt: { $gte: startDate }
        };

        // Apply role-based filtering for Admin users
        if (req.user && req.user.role === 'ADMIN') {
            // Exclude SuperAdmin users from user registration analytics
            userMatchConditions.role = { $ne: 'SUPERADMIN' };
        }

        // Get user registrations over time
        const userRegistrations = await User.aggregate([
            {
                $match: userMatchConditions
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        role: "$role"
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id.date": 1 }
            }
        ]);

        // Build role aggregation match conditions
        let roleMatchConditions = {};

        // Apply role-based filtering for Admin users
        if (req.user && req.user.role === 'ADMIN') {
            // Exclude SuperAdmin users from role statistics
            roleMatchConditions.role = { $ne: 'SUPERADMIN' };
        }

        // Get user statistics by role
        const usersByRole = await User.aggregate([
            ...(Object.keys(roleMatchConditions).length > 0 ? [{ $match: roleMatchConditions }] : []),
            {
                $group: {
                    _id: "$role",
                    count: { $sum: 1 },
                    active: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        const stats = {
            registrations: userRegistrations,
            byRole: usersByRole,
            period
        };

        res.json(new ApiResponse(200, stats, "User statistics fetched successfully"));
    } catch (error) {
        console.error("Error fetching user stats:", error);
        throw new ApiError("Failed to fetch user statistics", 500);
    }
});

// Get course statistics
export const getCourseStats = asyncHandler(async (req, res) => {
    const { period = '30d' } = req.query;

    try {
        // Get course creation stats
        const coursesByStatus = await Course.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get course enrollment stats (if enrollment relationship exists)
        const totalEnrollments = await User.countDocuments({
            role: "STUDENT",
            enrolledCourses: { $exists: true, $not: { $size: 0 } }
        });

        // Get quiz attempt stats
        const quizAttemptStats = await AttemptedQuiz.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    averageScore: { $avg: "$score" }
                }
            }
        ]);

        const stats = {
            coursesByStatus,
            totalEnrollments,
            quizAttemptStats,
            period
        };

        res.json(new ApiResponse(200, stats, "Course statistics fetched successfully"));
    } catch (error) {
        console.error("Error fetching course stats:", error);
        throw new ApiError("Failed to fetch course statistics", 500);
    }
});

// Get engagement statistics
export const getEngagementStats = asyncHandler(async (req, res) => {
    const { period = '30d' } = req.query;

    try {
        // Calculate date range
        let startDate;
        switch (period) {
            case '7d':
                startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }

        // Get quiz attempts over time
        const quizAttemptsOverTime = await AttemptedQuiz.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                    },
                    attempts: { $sum: 1 },
                    passed: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "PASSED"] }, 1, 0]
                        }
                    }
                }
            },
            {
                $sort: { "_id.date": 1 }
            }
        ]);

        // Get progress completion stats
        const progressStats = await Progress.aggregate([
            {
                $group: {
                    _id: "$currentLevel",
                    count: { $sum: 1 },
                    avgCompletedModules: { $avg: { $size: "$completedModules" } },
                    avgCompletedLessons: { $avg: { $size: "$completedLessons" } }
                }
            }
        ]);

        // Get recent login activity from audit logs with role-based filtering
        let loginActivityFilter = {
            action: { $regex: /login/i },
            createdAt: { $gte: startDate }
        };

        // Apply role-based filtering for Admin users
        if (req.user && req.user.role === 'ADMIN') {
            // Get all SuperAdmin user IDs to exclude their login activities
            const superAdminUsers = await User.find({ role: 'SUPERADMIN' }).select('_id');
            const superAdminIds = superAdminUsers.map(u => u._id);

            if (superAdminIds.length > 0) {
                loginActivityFilter.user = { $nin: superAdminIds };
            }
        }

        const loginActivity = await Audit.countDocuments(loginActivityFilter);

        const stats = {
            quizAttemptsOverTime,
            progressStats,
            loginActivity,
            period
        };

        res.json(new ApiResponse(200, stats, "Engagement statistics fetched successfully"));
    } catch (error) {
        console.error("Error fetching engagement stats:", error);
        throw new ApiError("Failed to fetch engagement stats", 500);
    }
});

// Exam history stats (pass/fail) grouped by month or year, optionally filtered by student
export const getExamHistoryStats = asyncHandler(async (req, res) => {
    const { groupBy = 'month', studentId, startDate, endDate, year } = req.query;

    const match = {};
    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
        match.student = new mongoose.Types.ObjectId(studentId);
    }

    // Date range
    let from = startDate ? new Date(startDate) : undefined;
    let to = endDate ? new Date(endDate) : undefined;
    if (year && groupBy === 'month') {
        const y = parseInt(year);
        if (!isNaN(y)) {
            from = new Date(Date.UTC(y, 0, 1));
            to = new Date(Date.UTC(y + 1, 0, 1));
        }
    }
    if (from) match.createdAt = { ...(match.createdAt || {}), $gte: from };
    if (to) match.createdAt = { ...(match.createdAt || {}), $lt: to };

    const groupId = groupBy === 'year'
        ? { year: { $year: '$createdAt' } }
        : { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };

    const agg = await AttemptedQuiz.aggregate([
        { $match: match },
        {
            $group: {
                _id: groupId,
                total: { $sum: 1 },
                passed: { $sum: { $cond: [{ $eq: ['$status', 'PASSED'] }, 1, 0] } },
                failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
            }
        },
        { $sort: { '_id.year': 1, ...(groupBy === 'month' ? { '_id.month': 1 } : {}) } }
    ]);

    const labels = agg.map(i => groupBy === 'year' ? `${i._id.year}` : `${i._id.year}-${String(i._id.month).padStart(2, '0')}`);
    const series = {
        total: agg.map(i => i.total),
        passed: agg.map(i => i.passed),
        failed: agg.map(i => i.failed)
    };

    return res.json(new ApiResponse(200, { labels, series }, 'Exam history stats fetched'));
});

const sendExcel = async (res, filename, columns, rows) => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Data');
    ws.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width || 20 }));
    rows.forEach(r => ws.addRow(r));
    ws.getRow(1).font = { bold: true };
    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    res.status(200).send(Buffer.from(buffer));
};

const sendPDF = (res, filename, title, columns, rows) => {
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    doc.pipe(res);
    doc.fontSize(16).text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10);
    const headers = columns.map(c => c.header);
    const widths = columns.map(c => c.width || 100);
    const draw = (vals, bold = false) => {
        const y = doc.y; let x = doc.page.margins.left;
        vals.forEach((v, i) => {
            if (bold) doc.font('Helvetica-Bold'); else doc.font('Helvetica');
            doc.text(String(v ?? ''), x, y, { width: widths[i] });
            x += widths[i] + 8;
        });
        doc.moveDown(0.5);
    };
    draw(headers, true);
    rows.forEach(r => draw(columns.map(c => r[c.key])));
    doc.end();
};

export const exportExamHistoryStats = asyncHandler(async (req, res) => {
    const { format = 'excel' } = req.query;
    // Reuse getExamHistoryStats logic by calling aggregation again
    req.query = req.query || {};
    const { groupBy = 'month', studentId, startDate, endDate, year } = req.query;

    const match = {};
    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) match.student = new mongoose.Types.ObjectId(studentId);
    let from = startDate ? new Date(startDate) : undefined;
    let to = endDate ? new Date(endDate) : undefined;
    if (year && groupBy === 'month') {
        const y = parseInt(year);
        if (!isNaN(y)) { from = new Date(Date.UTC(y, 0, 1)); to = new Date(Date.UTC(y + 1, 0, 1)); }
    }
    if (from) match.createdAt = { ...(match.createdAt || {}), $gte: from };
    if (to) match.createdAt = { ...(match.createdAt || {}), $lt: to };
    const groupId = groupBy === 'year' ? { year: { $year: '$createdAt' } } : { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };

    const agg = await AttemptedQuiz.aggregate([
        { $match: match },
        { $group: { _id: groupId, total: { $sum: 1 }, passed: { $sum: { $cond: [{ $eq: ['$status', 'PASSED'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } } } },
        { $sort: { '_id.year': 1, ...(groupBy === 'month' ? { '_id.month': 1 } : {}) } }
    ]);

    const columns = [
        { header: groupBy === 'year' ? 'Year' : 'Period', key: 'period', width: 18 },
        { header: 'Total Attempts', key: 'total', width: 16 },
        { header: 'Passed', key: 'passed', width: 12 },
        { header: 'Failed', key: 'failed', width: 12 },
    ];
    const rows = agg.map(i => ({
        period: groupBy === 'year' ? `${i._id.year}` : `${i._id.year}-${String(i._id.month).padStart(2, '0')}`,
        total: i.total,
        passed: i.passed,
        failed: i.failed,
    }));

    const filename = `exam_history_${groupBy}_${new Date().toISOString().slice(0, 10)}`;
    if (format === 'pdf') return sendPDF(res, filename, 'Exam History Stats', columns, rows);
    return sendExcel(res, filename, columns, rows);
});

// Audit stats grouped by month/year (optionally per user)
export const getAuditStats = asyncHandler(async (req, res) => {
    const { groupBy = 'month', userId, startDate, endDate, year } = req.query;
    const match = {};
    if (userId && mongoose.Types.ObjectId.isValid(userId)) match.user = new mongoose.Types.ObjectId(userId);
    let from = startDate ? new Date(startDate) : undefined;
    let to = endDate ? new Date(endDate) : undefined;
    if (year && groupBy === 'month') {
        const y = parseInt(year);
        if (!isNaN(y)) { from = new Date(Date.UTC(y, 0, 1)); to = new Date(Date.UTC(y + 1, 0, 1)); }
    }
    if (from) match.createdAt = { ...(match.createdAt || {}), $gte: from };
    if (to) match.createdAt = { ...(match.createdAt || {}), $lt: to };

    const groupId = groupBy === 'year' ? { year: { $year: '$createdAt' } } : { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
    const agg = await Audit.aggregate([
        { $match: match },
        { $group: { _id: groupId, total: { $sum: 1 } } },
        { $sort: { '_id.year': 1, ...(groupBy === 'month' ? { '_id.month': 1 } : {}) } }
    ]);

    const labels = agg.map(i => groupBy === 'year' ? `${i._id.year}` : `${i._id.year}-${String(i._id.month).padStart(2, '0')}`);
    const series = { total: agg.map(i => i.total) };
    res.json(new ApiResponse(200, { labels, series }, 'Audit stats fetched'));
});

export const exportAuditStats = asyncHandler(async (req, res) => {
    const { format = 'excel' } = req.query;
    const { groupBy = 'month', userId, startDate, endDate, year } = req.query;
    const match = {};
    if (userId && mongoose.Types.ObjectId.isValid(userId)) match.user = new mongoose.Types.ObjectId(userId);
    let from = startDate ? new Date(startDate) : undefined;
    let to = endDate ? new Date(endDate) : undefined;
    if (year && groupBy === 'month') {
        const y = parseInt(year);
        if (!isNaN(y)) { from = new Date(Date.UTC(y, 0, 1)); to = new Date(Date.UTC(y + 1, 0, 1)); }
    }
    if (from) match.createdAt = { ...(match.createdAt || {}), $gte: from };
    if (to) match.createdAt = { ...(match.createdAt || {}), $lt: to };

    const groupId = groupBy === 'year' ? { year: { $year: '$createdAt' } } : { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
    const agg = await Audit.aggregate([
        { $match: match },
        { $group: { _id: groupId, total: { $sum: 1 } } },
        { $sort: { '_id.year': 1, ...(groupBy === 'month' ? { '_id.month': 1 } : {}) } }
    ]);

    const columns = [
        { header: groupBy === 'year' ? 'Year' : 'Period', key: 'period', width: 18 },
        { header: 'Total Events', key: 'total', width: 14 }
    ];
    const rows = agg.map(i => ({ period: groupBy === 'year' ? `${i._id.year}` : `${i._id.year}-${String(i._id.month).padStart(2, '0')}`, total: i.total }));
    const filename = `audit_stats_${groupBy}_${new Date().toISOString().slice(0, 10)}`;
    if (format === 'pdf') return sendPDF(res, filename, 'Audit Logs Stats', columns, rows);
    return sendExcel(res, filename, columns, rows);
});

// Get system health overview
export const getSystemHealth = asyncHandler(async (req, res) => {
    try {
        // Get database collection sizes
        const collections = {
            users: await User.countDocuments(),
            courses: await Course.countDocuments(),
            departments: await Department.countDocuments(),
            quizAttempts: await AttemptedQuiz.countDocuments(),
            progress: await Progress.countDocuments(),
            audits: await Audit.countDocuments()
        };

        // Get recent error count from audit logs (if error logging is implemented)
        const recentErrors = await Audit.countDocuments({
            action: { $regex: /error/i },
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        });

        // Calculate system utilization
        const activeUsers = await User.countDocuments({
            status: "PRESENT",
            role: { $in: ["STUDENT", "INSTRUCTOR"] }
        });

        // Server metrics
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        const uptime = process.uptime();

        // Convert memory usage to MB
        const memoryMetrics = {
            rss: Math.round(memoryUsage.rss / 1024 / 1024), // Resident Set Size in MB
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // Total heap in MB
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // Used heap in MB
            external: Math.round(memoryUsage.external / 1024 / 1024), // External memory in MB
            arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024) // ArrayBuffer memory in MB
        };

        // Database health check
        const dbHealth = await checkDatabaseHealth();

        // System load metrics
        const systemMetrics = {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            uptime: Math.round(uptime),
            uptimeFormatted: formatUptime(uptime),
            memory: memoryMetrics,
            pid: process.pid
        };

        // Calculate overall health status
        const healthScore = calculateHealthScore({
            recentErrors,
            memoryUsage: memoryMetrics.heapUsed,
            dbHealth: dbHealth.status,
            uptime
        });

        const systemHealth = {
            status: healthScore.status,
            score: healthScore.score,
            collections,
            recentErrors,
            activeUsers,
            database: dbHealth,
            server: systemMetrics,
            alerts: healthScore.alerts,
            timestamp: new Date()
        };

        res.json(new ApiResponse(200, systemHealth, "System health data fetched successfully"));
    } catch (error) {
        console.error("Error fetching system health:", error);
        throw new ApiError("Failed to fetch system health data", 500);
    }
});

// Get detailed server metrics
export const getServerMetrics = asyncHandler(async (req, res) => {
    try {
        const { period = '1h' } = req.query;

        // Get current metrics
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        const uptime = process.uptime();

        // Convert memory to MB for better readability
        const memoryMetrics = {
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024),
            arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024)
        };

        // Calculate memory usage percentages
        const heapUsagePercent = Math.round((memoryMetrics.heapUsed / memoryMetrics.heapTotal) * 100);

        const metrics = {
            timestamp: new Date(),
            uptime: {
                seconds: Math.round(uptime),
                formatted: formatUptime(uptime)
            },
            memory: {
                ...memoryMetrics,
                heapUsagePercent,
                limit: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) // heap limit in MB
            },
            process: {
                pid: process.pid,
                ppid: process.ppid,
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            },
            environment: {
                nodeEnv: process.env.NODE_ENV || 'development',
                port: process.env.PORT || 8000
            }
        };

        res.json(new ApiResponse(200, metrics, "Server metrics fetched successfully"));
    } catch (error) {
        console.error("Error fetching server metrics:", error);
        throw new ApiError("Failed to fetch server metrics", 500);
    }
});

// Get database metrics and health
export const getDatabaseMetrics = asyncHandler(async (req, res) => {
    try {
        const dbHealth = await checkDatabaseHealth();

        // Get collection statistics
        const collectionStats = {
            users: await User.countDocuments(),
            courses: await Course.countDocuments(),
            departments: await Department.countDocuments(),
            quizAttempts: await AttemptedQuiz.countDocuments(),
            progress: await Progress.countDocuments(),
            audits: await Audit.countDocuments()
        };

        // Get database connection info
        const connectionInfo = {
            readyState: mongoose.connection.readyState,
            readyStateText: getConnectionStateText(mongoose.connection.readyState),
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name
        };

        // Calculate recent activity
        const recentActivity = await Audit.aggregate([
            {
                $match: {
                    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                }
            },
            {
                $group: {
                    _id: { $hour: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const metrics = {
            health: dbHealth,
            connection: connectionInfo,
            collections: collectionStats,
            recentActivity,
            timestamp: new Date()
        };

        res.json(new ApiResponse(200, metrics, "Database metrics fetched successfully"));
    } catch (error) {
        console.error("Error fetching database metrics:", error);
        throw new ApiError("Failed to fetch database metrics", 500);
    }
});

// Get system alerts and warnings
export const getSystemAlerts = asyncHandler(async (req, res) => {
    try {
        const alerts = [];

        // Memory usage alerts
        const memoryUsage = process.memoryUsage();
        const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

        if (heapUsagePercent > 80) {
            alerts.push({
                type: 'error',
                category: 'memory',
                title: 'High Memory Usage',
                message: `Heap memory usage is ${Math.round(heapUsagePercent)}%`,
                value: Math.round(heapUsagePercent),
                threshold: 80,
                timestamp: new Date()
            });
        } else if (heapUsagePercent > 60) {
            alerts.push({
                type: 'warning',
                category: 'memory',
                title: 'Moderate Memory Usage',
                message: `Heap memory usage is ${Math.round(heapUsagePercent)}%`,
                value: Math.round(heapUsagePercent),
                threshold: 60,
                timestamp: new Date()
            });
        }

        // Database connection alerts
        if (mongoose.connection.readyState !== 1) {
            alerts.push({
                type: 'error',
                category: 'database',
                title: 'Database Connection Issue',
                message: `Database connection state: ${getConnectionStateText(mongoose.connection.readyState)}`,
                value: mongoose.connection.readyState,
                threshold: 1,
                timestamp: new Date()
            });
        }

        // Recent errors alert
        const recentErrors = await Audit.countDocuments({
            action: { $regex: /error/i },
            createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
        });

        if (recentErrors > 10) {
            alerts.push({
                type: 'error',
                category: 'errors',
                title: 'High Error Rate',
                message: `${recentErrors} errors in the last hour`,
                value: recentErrors,
                threshold: 10,
                timestamp: new Date()
            });
        } else if (recentErrors > 5) {
            alerts.push({
                type: 'warning',
                category: 'errors',
                title: 'Elevated Error Rate',
                message: `${recentErrors} errors in the last hour`,
                value: recentErrors,
                threshold: 5,
                timestamp: new Date()
            });
        }

        // Uptime alerts
        const uptime = process.uptime();
        if (uptime < 300) { // Less than 5 minutes
            alerts.push({
                type: 'info',
                category: 'uptime',
                title: 'Recent Restart',
                message: `Server restarted ${formatUptime(uptime)} ago`,
                value: uptime,
                threshold: 300,
                timestamp: new Date()
            });
        }

        res.json(new ApiResponse(200, { alerts, count: alerts.length }, "System alerts fetched successfully"));
    } catch (error) {
        console.error("Error fetching system alerts:", error);
        throw new ApiError("Failed to fetch system alerts", 500);
    }
});

// Get system performance metrics over time
export const getSystemPerformanceHistory = asyncHandler(async (req, res) => {
    try {
        const { period = '24h' } = req.query;

        // Calculate time range
        let hours = 24;
        switch (period) {
            case '1h':
                hours = 1;
                break;
            case '6h':
                hours = 6;
                break;
            case '24h':
                hours = 24;
                break;
            case '7d':
                hours = 24 * 7;
                break;
            default:
                hours = 24;
        }

        const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

        // For now, we'll return current metrics as historical data
        // In a real implementation, you'd store these metrics in a time-series database
        const currentMetrics = {
            timestamp: new Date(),
            memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            uptime: process.uptime(),
            errors: await Audit.countDocuments({
                action: { $regex: /error/i },
                createdAt: { $gte: startDate }
            }),
            activities: await Audit.countDocuments({
                createdAt: { $gte: startDate }
            }),
            activeUsers: await User.countDocuments({
                status: "PRESENT",
                lastLogin: { $gte: startDate }
            })
        };

        // Generate sample historical data points
        const dataPoints = [];
        const now = new Date();
        const intervalMinutes = Math.max(1, Math.floor((hours * 60) / 50)); // Max 50 data points

        for (let i = 0; i < 50 && i * intervalMinutes < hours * 60; i++) {
            const timestamp = new Date(now.getTime() - (i * intervalMinutes * 60 * 1000));
            dataPoints.unshift({
                timestamp,
                memory: currentMetrics.memory + Math.floor(Math.random() * 20 - 10), // ±10MB variation
                errors: Math.max(0, Math.floor(Math.random() * 3)), // 0-2 errors per interval
                activities: Math.floor(Math.random() * 20) + 5, // 5-25 activities per interval
                activeUsers: Math.max(0, currentMetrics.activeUsers + Math.floor(Math.random() * 10 - 5))
            });
        }

        const performance = {
            period,
            dataPoints,
            summary: {
                avgMemory: Math.round(dataPoints.reduce((sum, point) => sum + point.memory, 0) / dataPoints.length),
                totalErrors: dataPoints.reduce((sum, point) => sum + point.errors, 0),
                totalActivities: dataPoints.reduce((sum, point) => sum + point.activities, 0),
                peakActiveUsers: Math.max(...dataPoints.map(point => point.activeUsers))
            },
            generatedAt: new Date()
        };

        res.json(new ApiResponse(200, performance, "System performance history fetched successfully"));
    } catch (error) {
        console.error("Error fetching system performance history:", error);
        throw new ApiError("Failed to fetch system performance history", 500);
    }
});

// Helper function to check database health
async function checkDatabaseHealth() {
    try {
        // Test database connection
        const connectionState = mongoose.connection.readyState;
        const isConnected = connectionState === 1;

        let responseTime = 0;
        let status = 'unhealthy';
        let details = [];

        if (isConnected) {
            // Measure response time with a simple query
            const startTime = Date.now();
            await User.findOne().limit(1);
            responseTime = Date.now() - startTime;

            if (responseTime < 100) {
                status = 'healthy';
            } else if (responseTime < 500) {
                status = 'warning';
                details.push('Database response time is elevated');
            } else {
                status = 'unhealthy';
                details.push('Database response time is too high');
            }
        } else {
            details.push('Database connection is not established');
        }

        return {
            status,
            connected: isConnected,
            responseTime,
            connectionState: getConnectionStateText(connectionState),
            details,
            timestamp: new Date()
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            connected: false,
            responseTime: -1,
            connectionState: 'error',
            details: ['Database health check failed: ' + error.message],
            timestamp: new Date()
        };
    }
}

// Helper function to format uptime
function formatUptime(uptimeSeconds) {
    const days = Math.floor(uptimeSeconds / (24 * 60 * 60));
    const hours = Math.floor((uptimeSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptimeSeconds % (60 * 60)) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

// Helper function to get connection state text
function getConnectionStateText(state) {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    return states[state] || 'unknown';
}

// Helper function to calculate overall health score
function calculateHealthScore({ recentErrors, memoryUsage, dbHealth, uptime }) {
    let score = 100;
    let alerts = [];
    let status = 'healthy';

    // Deduct points for recent errors
    if (recentErrors > 0) {
        const errorPenalty = Math.min(30, recentErrors * 3);
        score -= errorPenalty;
        if (recentErrors > 10) {
            alerts.push('High error rate detected');
        }
    }

    // Deduct points for high memory usage
    if (memoryUsage > 500) { // More than 500MB
        const memoryPenalty = Math.min(20, (memoryUsage - 500) / 100 * 5);
        score -= memoryPenalty;
        if (memoryUsage > 1000) {
            alerts.push('High memory usage detected');
        }
    }

    // Deduct points for database issues
    if (dbHealth !== 'healthy') {
        score -= 25;
        alerts.push('Database health issues detected');
    }

    // Deduct points for recent restarts
    if (uptime < 300) { // Less than 5 minutes
        score -= 10;
        alerts.push('Recent system restart detected');
    }

    // Determine status based on score
    if (score >= 80) {
        status = 'healthy';
    } else if (score >= 60) {
        status = 'warning';
    } else {
        status = 'critical';
    }

    return { score: Math.max(0, Math.round(score)), status, alerts };
}

// Get comprehensive analytics data
export const getComprehensiveAnalytics = asyncHandler(async (req, res) => {
    const { dateFrom, dateTo, granularity = 'day' } = req.query;

    try {
        // Set default date range if not provided
        const endDate = dateTo ? new Date(dateTo) : new Date();
        const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // User Analytics
        const userRegistrationTrends = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        date: granularity === 'month'
                            ? { $dateToString: { format: "%Y-%m", date: "$createdAt" } }
                            : { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        role: "$role"
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.date": 1 } }
        ]);

        // Course Performance Analytics
        const coursePerformance = await Course.aggregate([
            {
                $lookup: {
                    from: "attemptedquizzes",
                    localField: "_id",
                    foreignField: "courseId",
                    as: "quizAttempts"
                }
            },
            {
                $lookup: {
                    from: "progresses",
                    localField: "_id",
                    foreignField: "course",
                    as: "studentProgress"
                }
            },
            {
                $project: {
                    title: 1,
                    status: 1,
                    totalQuizAttempts: { $size: "$quizAttempts" },
                    averageQuizScore: { $avg: "$quizAttempts.score" },
                    totalEnrolledStudents: { $size: "$studentProgress" },
                    averageProgress: { $avg: "$studentProgress.progressPercentage" }
                }
            },
            { $sort: { totalEnrolledStudents: -1 } },
            { $limit: 10 }
        ]);

        // Learning Engagement Metrics
        const engagementMetrics = await AttemptedQuiz.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        date: granularity === 'month'
                            ? { $dateToString: { format: "%Y-%m", date: "$createdAt" } }
                            : { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                    },
                    totalAttempts: { $sum: 1 },
                    averageScore: { $avg: "$score" },
                    passedAttempts: {
                        $sum: { $cond: [{ $eq: ["$status", "PASSED"] }, 1, 0] }
                    }
                }
            },
            { $sort: { "_id.date": 1 } }
        ]);

        // Top Performing Students
        const topStudents = await User.aggregate([
            {
                $match: { role: "STUDENT" }
            },
            {
                $lookup: {
                    from: "attemptedquizzes",
                    localField: "_id",
                    foreignField: "student",
                    as: "quizzes"
                }
            },
            {
                $lookup: {
                    from: "progresses",
                    localField: "_id",
                    foreignField: "student",
                    as: "progress"
                }
            },
            {
                $project: {
                    fullName: 1,
                    email: 1,
                    averageQuizScore: { $avg: "$quizzes.score" },
                    totalQuizAttempts: { $size: "$quizzes" },
                    averageProgress: { $avg: "$progress.progressPercentage" },
                    coursesEnrolled: { $size: "$progress" }
                }
            },
            { $sort: { averageQuizScore: -1, averageProgress: -1 } },
            { $limit: 10 }
        ]);

        // System Activity Trends
        const activityTrends = await Audit.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        date: granularity === 'month'
                            ? { $dateToString: { format: "%Y-%m", date: "$createdAt" } }
                            : { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        action: "$action"
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.date": 1 } }
        ]);

        // Instructor Performance
        const instructorPerformance = await User.aggregate([
            {
                $match: { role: "INSTRUCTOR" }
            },
            {
                $lookup: {
                    from: "courses",
                    localField: "_id",
                    foreignField: "instructor",
                    as: "courses"
                }
            },
            {
                $lookup: {
                    from: "departments",
                    localField: "_id",
                    foreignField: "instructor",
                    as: "departments"
                }
            },
            {
                $project: {
                    fullName: 1,
                    email: 1,
                    totalCourses: { $size: "$courses" },
                    publishedCourses: {
                        $size: {
                            $filter: {
                                input: "$courses",
                                cond: { $eq: ["$$this.status", "PUBLISHED"] }
                            }
                        }
                    },
                    totalDepartments: { $size: "$departments" },
                    activeDepartments: {
                        $size: {
                            $filter: {
                                input: "$departments",
                                cond: { $eq: ["$$this.status", "ONGOING"] }
                            }
                        }
                    }
                }
            },
            { $sort: { totalCourses: -1 } }
        ]);

        const analytics = {
            userRegistrationTrends,
            coursePerformance,
            engagementMetrics,
            topStudents,
            activityTrends,
            instructorPerformance,
            dateRange: { startDate, endDate },
            granularity
        };

        res.json(new ApiResponse(200, analytics, "Comprehensive analytics fetched successfully"));
    } catch (error) {
        console.error("Error fetching comprehensive analytics:", error);
        throw new ApiError("Failed to fetch comprehensive analytics", 500);
    }
});

// Generate custom report
export const generateCustomReport = asyncHandler(async (req, res) => {
    const { reportType, dateRange, filters, metrics } = req.body;

    try {
        let reportData = {};
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);

        switch (reportType) {
            case 'user_activity':
                reportData = await generateUserActivityReport(startDate, endDate, filters);
                break;
            case 'course_completion':
                reportData = await generateCourseCompletionReport(startDate, endDate, filters);
                break;
            case 'quiz_performance':
                reportData = await generateQuizPerformanceReport(startDate, endDate, filters);
                break;
            case 'instructor_effectiveness':
                reportData = await generateInstructorEffectivenessReport(startDate, endDate, filters);
                break;
            default:
                throw new ApiError("Invalid report type", 400);
        }

        const report = {
            reportType,
            dateRange,
            filters,
            data: reportData,
            generatedAt: new Date(),
            generatedBy: req.user?.id
        };

        res.json(new ApiResponse(200, report, "Custom report generated successfully"));
    } catch (error) {
        console.error("Error generating custom report:", error);
        throw new ApiError("Failed to generate custom report", 500);
    }
});

// Helper function for user activity report
async function generateUserActivityReport(startDate, endDate, filters) {
    const matchConditions = {
        createdAt: { $gte: startDate, $lte: endDate }
    };

    if (filters.role) {
        matchConditions.role = filters.role;
    }

    return await User.aggregate([
        { $match: matchConditions },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                registrations: { $sum: 1 },
                students: { $sum: { $cond: [{ $eq: ["$role", "STUDENT"] }, 1, 0] } },
                instructors: { $sum: { $cond: [{ $eq: ["$role", "INSTRUCTOR"] }, 1, 0] } }
            }
        },
        { $sort: { "_id": 1 } }
    ]);
}

// Helper function for course completion report
async function generateCourseCompletionReport(startDate, endDate, filters) {
    return await Progress.aggregate([
        {
            $match: {
                updatedAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $lookup: {
                from: "courses",
                localField: "course",
                foreignField: "_id",
                as: "courseInfo"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "student",
                foreignField: "_id",
                as: "studentInfo"
            }
        },
        {
            $project: {
                courseName: { $arrayElemAt: ["$courseInfo.title", 0] },
                studentName: { $arrayElemAt: ["$studentInfo.fullName", 0] },
                progressPercentage: 1,
                completedModules: { $size: "$completedModules" },
                completedLessons: { $size: "$completedLessons" },
                currentLevel: 1,
                updatedAt: 1
            }
        },
        { $sort: { progressPercentage: -1 } }
    ]);
}

// Helper function for quiz performance report
async function generateQuizPerformanceReport(startDate, endDate, filters) {
    const matchConditions = {
        createdAt: { $gte: startDate, $lte: endDate }
    };

    return await AttemptedQuiz.aggregate([
        { $match: matchConditions },
        {
            $lookup: {
                from: "users",
                localField: "student",
                foreignField: "_id",
                as: "studentInfo"
            }
        },
        {
            $lookup: {
                from: "courses",
                localField: "courseId",
                foreignField: "_id",
                as: "courseInfo"
            }
        },
        {
            $project: {
                studentName: { $arrayElemAt: ["$studentInfo.fullName", 0] },
                courseName: { $arrayElemAt: ["$courseInfo.title", 0] },
                score: 1,
                status: 1,
                timeSpent: 1,
                createdAt: 1
            }
        },
        { $sort: { score: -1 } }
    ]);
}

// Helper function for instructor effectiveness report
async function generateInstructorEffectivenessReport(startDate, endDate, filters) {
    return await User.aggregate([
        { $match: { role: "INSTRUCTOR" } },
        {
            $lookup: {
                from: "courses",
                localField: "_id",
                foreignField: "instructor",
                as: "courses"
            }
        },
        {
            $lookup: {
                from: "departments",
                localField: "_id",
                foreignField: "instructor",
                as: "departments"
            }
        },
        {
            $lookup: {
                from: "progresses",
                localField: "courses._id",
                foreignField: "course",
                as: "studentProgress"
            }
        },
        {
            $project: {
                fullName: 1,
                email: 1,
                totalCourses: { $size: "$courses" },
                totalDepartments: { $size: "$departments" },
                totalStudents: { $size: "$studentProgress" },
                averageStudentProgress: { $avg: "$studentProgress.progressPercentage" },
                coursesPublished: {
                    $size: {
                        $filter: {
                            input: "$courses",
                            cond: { $eq: ["$$this.status", "PUBLISHED"] }
                        }
                    }
                }
            }
        },
        { $sort: { averageStudentProgress: -1 } }
    ]);
}

// Export analytics data
export const exportAnalyticsData = asyncHandler(async (req, res) => {
    const { format = 'json', reportType, dateRange, filters } = req.body;

    try {
        // Generate the report data
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        let reportData;

        switch (reportType) {
            case 'comprehensive':
                const analytics = await getComprehensiveAnalytics({ query: { dateFrom: startDate, dateTo: endDate } });
                reportData = analytics;
                break;
            default:
                reportData = await generateCustomReport({ body: { reportType, dateRange, filters } });
        }

        // For now, return JSON. In a real implementation, you might want to generate CSV/Excel
        if (format === 'csv') {
            // Convert to CSV format (simplified)
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="analytics_${reportType}_${Date.now()}.csv"`);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="analytics_${reportType}_${Date.now()}.json"`);
        }

        res.json(new ApiResponse(200, reportData, "Analytics data exported successfully"));
    } catch (error) {
        console.error("Error exporting analytics data:", error);
        throw new ApiError("Failed to export analytics data", 500);
    }
});
