import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import compression from "compression";
import cors from "cors";
import cookieParser from "cookie-parser";
import ENV from "./configs/env.config.js";
import logger from "./logger/winston.logger.js";
import connectDB from "./db/connectDB.js";
import socketIOService from "./utils/socketIO.js";
// import morganMiddleware from "./logger/morgan.logger.js";
// Routes
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.routes.js";
import courseRoutes from "./routes/course.routes.js";
import quizRoutes from "./routes/quiz.routes.js";
import attemptedQuizRoutes from "./routes/attemptedQuiz.routes.js";
import progressRoutes from "./routes/progress.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import submissionRoutes from "./routes/submission.routes.js";
import certificateRoutes from "./routes/certificate.routes.js";
import certificateTemplateRoutes from "./routes/certificateTemplate.routes.js";
import departmentRoutes from "./routes/department.routes.js";
import enrollmentRoutes from "./routes/enrollment.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import resourceRoutes from "./routes/resource.routes.js";
import moduleRoutes from "./routes/module.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import lessonRoutes from "./routes/lesson.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import instructorRoutes from "./routes/instructor.routes.js";
import systemSettingsRoutes from "./routes/systemSettings.routes.js";
import dataManagementRoutes from "./routes/dataManagement.routes.js";
import bulkOperationsRoutes from "./routes/bulkOperations.routes.js";
import rolesPermissionsRoutes from "./routes/rolesPermissions.routes.js";
import moduleTimelineRoutes from "./routes/moduleTimeline.routes.js";
import exportRoutes from "./routes/export.routes.js";
import courseLevelConfigRoutes from "./routes/courseLevelConfig.routes.js";
import languageRoutes from "./routes/language.routes.js";
import onJobTrainingRoutes from "./routes/onJobTraining.routes.js";
import timelineScheduler from "./services/timelineScheduler.js";
import departmentStatusScheduler from "./services/departmentStatusScheduler.js";
// import cleanupOldFiles from './scripts/cleanup.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["https://swargaya-learning-management-system.onrender.com", "https://learning-management-system-avwu.onrender.com", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"],
        credentials: true,
        methods: ["GET", "POST"]
    }
});

// Performance optimizations
app.use(compression()); // Enable gzip/deflate compression

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Increased limit for file uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser()); // Add cookie parser middleware

// CORS with caching for preflight
const corsOptions = {
    origin: ["https://swargaya-learning-management-system.onrender.com", "https://learning-management-system-avwu.onrender.com", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"],
    credentials: true,
    optionsSuccessStatus: 200, // For legacy browser support
    maxAge: 86400, // Cache preflight for 24 hours
};
app.use(cors(corsOptions));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// GLOBAL DEBUG LOGGER - TOP OF STACK
app.use((req, res, next) => {
    console.log(`[DEBUG_GLOBAL] Request: ${req.method} ${req.url}`);
    next();
});

const PORT = ENV.PORT;

app.get("/", (req, res) => {
    res.send("This is Backend");
});

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Server is running",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.use("/api/v1/auth/", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/attempts", attemptedQuizRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/certificate-templates", certificateTemplateRoutes);
// Debug logging middleware - MOVED UP
app.use((req, res, next) => {
    // Only log API requests to reduce noise
    if (req.url.startsWith('/api')) {
        console.log(`[DEBUG] Incoming API Request: ${req.method} ${req.url}`);
    }
    next();
});

console.log("Mounting department routes...", departmentRoutes ? "Router found (type: " + typeof departmentRoutes + ")" : "Router MISSING");

// Test route to verify server is reachable at this path
app.get("/api/test-departments", (req, res) => {
    console.log("[DEBUG] Hit test-departments route");
    res.send("Departments API is reachable");
});

app.use("/api/departments", (req, res, next) => {
    console.log(`[DEBUG] Entering /api/departments mount for: ${req.url}`);
    next();
}, departmentRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/audits", auditRoutes);
// Mount lesson routes before modules to ensure /api/modules/:moduleId/lessons resolves correctly
app.use("/api", lessonRoutes);
// Also mount lesson routes at /api/lessons for backward compatibility
app.use("/api/lessons", lessonRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/instructor", instructorRoutes);
app.use("/system/settings", systemSettingsRoutes);
app.use("/api/data-management", dataManagementRoutes);
app.use("/api/bulk-operations", bulkOperationsRoutes);
app.use("/api/roles-permissions", rolesPermissionsRoutes);
app.use("/api/module-timelines", moduleTimelineRoutes);
app.use("/api/exports", exportRoutes);
app.use("/api/course-level-config", courseLevelConfigRoutes);
app.use("/api/languages", languageRoutes);
console.log("[DEBUG] Mounting /api/on-job-training route...");
app.use("/api/on-job-training", onJobTrainingRoutes);

import machineRoutes from "./routes/machine.routes.js";
app.use("/api/machines", machineRoutes);

import lineRoutes from "./routes/line.routes.js";
app.use("/api/lines", lineRoutes);

import skillMatrixRoutes from "./routes/skillMatrix.route.js";
app.use("/api/skill-matrix", skillMatrixRoutes);

// Initialize Socket.IO service
socketIOService.initialize(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.id}`);

    // Handle user authentication and room joining
    socket.on('authenticate', (userData) => {
        socket.userId = userData.userId;
        socket.userRole = userData.role;
        socket.userName = userData.name;

        // Auto-join user to their departments/courses
        if (userData.departments && Array.isArray(userData.departments)) {
            userData.departments.forEach(departmentId => {
                socket.join(`department-${departmentId}`);
                logger.info(`User ${userData.name} joined department room: department-${departmentId}`);
            });
        }

        // Join user-specific room for direct notifications
        socket.join(`user-${userData.userId}`);

        // Notify user of successful connection
        socket.emit('authenticated', {
            message: 'Successfully connected to real-time notifications',
            connectedUsers: socketIOService.getConnectedUsersCount()
        });
    });

    // Handle manual room joining
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        logger.info(`User ${socket.id} joined room: ${roomId}`);
        socket.to(roomId).emit('user-joined', {
            userId: socket.userId,
            userName: socket.userName,
            roomId
        });
    });

    // Handle leaving rooms
    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        logger.info(`User ${socket.id} left room: ${roomId}`);
        socket.to(roomId).emit('user-left', {
            userId: socket.userId,
            userName: socket.userName,
            roomId
        });
    });

    // Handle quiz events
    socket.on('quiz-started', (data) => {
        socketIOService.notifyQuizStarted(data.departmentId, data.quizData);
    });

    socket.on('quiz-submitted', (data) => {
        socketIOService.notifyQuizSubmitted(data.departmentId, {
            ...data.submissionData,
            studentName: socket.userName
        });
    });

    // Handle assignment events
    socket.on('assignment-created', (data) => {
        socketIOService.notifyAssignmentCreated(data.departmentId, data.assignmentData);
    });

    socket.on('assignment-submitted', (data) => {
        socketIOService.notifyAssignmentSubmitted(data.departmentId, {
            ...data.submissionData,
            studentName: socket.userName
        });
    });

    // Handle general notifications
    socket.on('send-notification', (data) => {
        socketIOService.emitToRoom(data.targetRoom, 'notification', {
            message: data.message,
            type: data.type,
            timestamp: new Date(),
            from: socket.userName || data.from
        });
    });

    // Handle typing indicators (for chat features)
    socket.on('typing', (data) => {
        socket.to(data.roomId).emit('user-typing', {
            userId: socket.userId,
            userName: socket.userName,
            roomId: data.roomId
        });
    });

    socket.on('stop-typing', (data) => {
        socket.to(data.roomId).emit('user-stopped-typing', {
            userId: socket.userId,
            userName: socket.userName,
            roomId: data.roomId
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        logger.info(`User disconnected: ${socket.id} (${socket.userName || 'Unknown'})`);
    });
});

// Make io and socketIOService accessible to other parts of the application
app.set('socketio', io);
app.set('socketIOService', socketIOService);

// Global Error Handler (must be after all routes)
app.use((err, req, res, next) => {

    // Default error values
    let statusCode = err.statuscode || err.status || 500;
    let message = err.message || 'Internal Server Error';
    let success = false;

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map(e => e.message).join(', ');
    } else if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
    } else if (err.code === 11000) {
        statusCode = 400;
        message = 'Duplicate field value';
    }

    // Send JSON error response
    res.status(statusCode).json({
        success,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Handle 404 for unmatched API routes (fixed pattern)
// Handle 404 for unmatched API routes (fixed pattern)
app.use('/api', (req, res) => {
    console.log(`[DEBUG_404] 404 Handler reached for: ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `API route ${req.originalUrl} not found`
    });
});

const startServer = async () => {
    try {

        await connectDB();

        // Initialize schedulers after DB connection
        timelineScheduler.init();
        departmentStatusScheduler.init();

        server.listen(PORT, () => {
            logger.info(`Server with Socket.IO running at http://localhost:${PORT}`);
        });

        // Graceful shutdown handling
        process.on('SIGINT', () => {
            timelineScheduler.stop();
            departmentStatusScheduler.stop();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            timelineScheduler.stop();
            departmentStatusScheduler.stop();
            process.exit(0);
        });

    } catch (error) {
        process.exit(1);
    }
};
startServer();
// cleanupOldFiles();
