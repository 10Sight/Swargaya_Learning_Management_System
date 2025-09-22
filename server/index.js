import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import ENV from "./configs/env.config.js";
import logger from "./logger/winston.logger.js";
import connectDB from "./db/connectDB.js";
import morganMiddleware from "./logger/morgan.logger.js";
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
import batchRoutes from "./routes/batch.routes.js";
import enrollmentRoutes from "./routes/enrollment.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import resourceRoutes from "./routes/resource.routes.js";
import moduleRoutes from "./routes/module.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import lessonRoutes from "./routes/lesson.routes.js";
import cleanupOldFiles from './scripts/cleanup.js';

const app = express();
app.use(express.json());
app.use(cookieParser()); // Add cookie parser middleware
// app.use(morganMiddleware);

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"],
    credentials: true,
}));

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
app.use("/api/batches", batchRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/audits", auditRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/lessons", lessonRoutes);

app.listen(3000, async () => {
    await connectDB();
    logger.info(`http://localhost:${PORT}`);
});

// Start cleanup process
cleanupOldFiles();