import mongoose from "mongoose";
import User from "../models/auth.model.js";
import Course from "../models/course.model.js";
import Batch from "../models/batch.model.js";
import AttemptedQuiz from "../models/attemptedQuiz.model.js";
import Progress from "../models/progress.model.js";
import Audit from "../models/audit.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get dashboard statistics
export const getDashboardStats = asyncHandler(async (req, res) => {
    try {
        // Get counts
        const totalStudents = await User.countDocuments({ role: "STUDENT" });
        const totalInstructors = await User.countDocuments({ role: "INSTRUCTOR" });
        const totalCourses = await Course.countDocuments();
        const totalBatches = await Batch.countDocuments();

        // Get active counts
        const activeStudents = await User.countDocuments({ role: "STUDENT", status: "ACTIVE" });
        const activeBatches = await Batch.countDocuments({ status: "ACTIVE" });
        const publishedCourses = await Course.countDocuments({ status: "PUBLISHED" });

        // Get recent activity count
        const recentActivitiesCount = await Audit.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        });

        // Calculate engagement metrics
        const studentEngagement = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;
        const batchUtilization = totalBatches > 0 ? Math.round((activeBatches / totalBatches) * 100) : 0;
        const courseCompletion = totalCourses > 0 ? Math.round((publishedCourses / totalCourses) * 100) : 0;

        const stats = {
            totals: {
                students: totalStudents,
                instructors: totalInstructors,
                courses: totalCourses,
                batches: totalBatches
            },
            active: {
                students: activeStudents,
                batches: activeBatches,
                publishedCourses
            },
            engagement: {
                studentEngagement,
                batchUtilization,
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

        // Get user registrations over time
        const userRegistrations = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate }
                }
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

        // Get user statistics by role
        const usersByRole = await User.aggregate([
            {
                $group: {
                    _id: "$role",
                    count: { $sum: 1 },
                    active: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0]
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

        // Get recent login activity from audit logs
        const loginActivity = await Audit.countDocuments({
            action: { $regex: /login/i },
            createdAt: { $gte: startDate }
        });

        const stats = {
            quizAttemptsOverTime,
            progressStats,
            loginActivity,
            period
        };

        res.json(new ApiResponse(200, stats, "Engagement statistics fetched successfully"));
    } catch (error) {
        console.error("Error fetching engagement stats:", error);
        throw new ApiError("Failed to fetch engagement statistics", 500);
    }
});

// Get system health overview
export const getSystemHealth = asyncHandler(async (req, res) => {
    try {
        // Get database collection sizes
        const collections = {
            users: await User.countDocuments(),
            courses: await Course.countDocuments(),
            batches: await Batch.countDocuments(),
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
            status: "ACTIVE",
            role: { $in: ["STUDENT", "INSTRUCTOR"] }
        });

        const systemHealth = {
            collections,
            recentErrors,
            activeUsers,
            status: recentErrors < 10 ? "healthy" : "warning", // Simple health check
            timestamp: new Date()
        };

        res.json(new ApiResponse(200, systemHealth, "System health data fetched successfully"));
    } catch (error) {
        console.error("Error fetching system health:", error);
        throw new ApiError("Failed to fetch system health data", 500);
    }
});
