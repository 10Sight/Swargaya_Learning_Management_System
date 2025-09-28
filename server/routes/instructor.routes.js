import express from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/authrization.middleware.js";
import {
  login,
  getDashboardStats,
  getAssignedCourses,
  getCourseDetails,
  getAssignedBatches,
  getBatchDetails,
  getBatchStudents,
  getStudentProgress,
  getBatchQuizAttempts,
  getQuizDetails,
  getStudentQuizAttempts,
  getBatchAssignmentSubmissions,
  getAssignmentDetails,
  getStudentAssignmentSubmissions,
} from "../controllers/instructor.controller.js";

const router = express.Router();

// Authentication routes
router.post("/auth/login", login);

// Protected routes (require instructor authentication)
router.use(verifyJWT);
router.use(authorizeRoles("INSTRUCTOR"));

// Dashboard routes
router.get("/dashboard/stats", getDashboardStats);

// Course routes - only published courses assigned to instructor
router.get("/courses", getAssignedCourses);
router.get("/courses/:courseId", getCourseDetails);

// Batch routes - only batches assigned to instructor
router.get("/batches", getAssignedBatches);
router.get("/batches/:batchId", getBatchDetails);
router.get("/batches/:batchId/students", getBatchStudents);

// Student progress tracking
router.get("/students/:studentId/progress", getStudentProgress);

// Quiz monitoring - read only
router.get("/batches/:batchId/quiz-attempts", getBatchQuizAttempts);
router.get("/quizzes/:quizId", getQuizDetails);
router.get("/students/:studentId/quiz-attempts/:quizId", getStudentQuizAttempts);

// Assignment monitoring - read only
router.get("/batches/:batchId/assignment-submissions", getBatchAssignmentSubmissions);
router.get("/assignments/:assignmentId", getAssignmentDetails);
router.get("/students/:studentId/assignment-submissions/:assignmentId", getStudentAssignmentSubmissions);

export default router;
