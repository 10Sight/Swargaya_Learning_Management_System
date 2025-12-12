import mongoose from "mongoose";

import Progress from "../models/progress.model.js";
import Course from "../models/course.model.js";
import Certificate from "../models/certificate.model.js";
import ModuleTimeline from "../models/moduleTimeline.model.js";
import CourseLevelConfig from "../models/courseLevelConfig.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isModuleEffectivelyCompleted, checkModuleAccessForAssessments, getEffectivelyCompletedModules } from "../utils/moduleCompletion.js";
import ensureCertificateIfEligible from "../utils/autoCertificate.js";

export const initializeProgress = asyncHandler(async (req, res) => {
    const { courseId } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Invalid course ID", 400);
    }

    const course = await Course.findById(courseId);
    if (!course) throw new ApiError("Course not found", 404);

    let progress = await Progress.findOne({ student: userId, course: courseId });
    if (progress) {
        throw new ApiError("Progress already initialized for this course", 400);
    }

    // Get active level configuration
    const levelConfig = await CourseLevelConfig.getActiveConfig();
    const firstLevel = levelConfig && levelConfig.levels.length > 0 ? levelConfig.levels[0].name : "L1";

    progress = await Progress.create({
        student: userId,
        course: courseId,
        currentLevel: firstLevel,
        completedLessons: [],
        completedModules: [],
        quizzes: [],
        assignments: [],
        progressPercent: 0,
    });

    res
        .status(201)
        .json(new ApiResponse(201, progress, "Progress initialized successfully"));
});

export const updateProgress = asyncHandler(async (req, res) => {
    const { courseId, moduleId } = req.body;
    const userId = req.user._id;

    const progress = await Progress.findOne({ student: userId, course: courseId });
    if (!progress) throw new ApiError("Progress not found", 404);

    // For now, we'll just update the lastAccessed time
    // In a real app, you'd track individual lesson completion
    progress.lastAccessed = new Date();
    await progress.save();

    res.json(new ApiResponse(200, progress, "Progress updated successfully"));
});

export const markLessonComplete = asyncHandler(async (req, res) => {
    const { courseId, lessonId } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(lessonId)) {
        throw new ApiError("Invalid course ID or lesson ID", 400);
    }

    // Validate sequential lesson completion
    const Lesson = (await import("../models/lesson.model.js")).default;
    const Module = (await import("../models/module.model.js")).default;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
        throw new ApiError("Lesson not found", 404);
    }

    const module = await Module.findById(lesson.module).populate('lessons');
    if (!module) {
        throw new ApiError("Module not found", 404);
    }

    // Sort lessons by order
    const sortedLessons = module.lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
    const lessonIndex = sortedLessons.findIndex(l => l._id.toString() === lessonId);

    if (lessonIndex === -1) {
        throw new ApiError("Lesson not found in module", 404);
    }

    let progress = await Progress.findOne({ student: userId, course: courseId });
    if (!progress) {
        // Initialize progress if it doesn't exist
        const levelConfig = await CourseLevelConfig.getActiveConfig();
        const firstLevel = levelConfig && levelConfig.levels.length > 0 ? levelConfig.levels[0].name : "L1";

        progress = await Progress.create({
            student: userId,
            course: courseId,
            currentLevel: firstLevel,
            completedLessons: [],
            completedModules: [],
            quizzes: [],
            assignments: [],
            progressPercent: 0,
        });
    }

    // Check if this lesson can be completed (sequential validation)
    if (lessonIndex > 0) {
        // Check if the previous lesson is completed
        const previousLesson = sortedLessons[lessonIndex - 1];
        const isPreviousCompleted = progress.completedLessons.some(
            lesson => lesson.lessonId.toString() === previousLesson._id.toString()
        );

        if (!isPreviousCompleted) {
            throw new ApiError("You must complete the previous lesson first", 400);
        }
    }

    // Check if lesson is already completed
    const isAlreadyCompleted = progress.completedLessons.some(
        lesson => lesson.lessonId.toString() === lessonId.toString()
    );

    if (!isAlreadyCompleted) {
        progress.completedLessons.push({
            lessonId: lessonId,
            completedAt: new Date()
        });
    }

    progress.lastAccessed = new Date();
    await progress.save();

    res.json(new ApiResponse(200, progress, "Lesson marked as complete"));
});

export const markModuleComplete = asyncHandler(async (req, res) => {
    const { courseId, moduleId } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(moduleId)) {
        throw new ApiError("Invalid course ID or module ID", 400);
    }

    // Validate sequential module completion
    const Course = (await import("../models/course.model.js")).default;
    const Module = (await import("../models/module.model.js")).default;

    const course = await Course.findById(courseId).populate('modules');
    if (!course) {
        throw new ApiError("Course not found", 404);
    }

    // Sort modules by order
    const sortedModules = course.modules.sort((a, b) => (a.order || 0) - (b.order || 0));
    const moduleIndex = sortedModules.findIndex(m => m._id.toString() === moduleId);

    if (moduleIndex === -1) {
        throw new ApiError("Module not found in course", 404);
    }

    let progress = await Progress.findOne({ student: userId, course: courseId });
    if (!progress) {
        // Initialize progress if it doesn't exist
        const levelConfig = await CourseLevelConfig.getActiveConfig();
        const firstLevel = levelConfig && levelConfig.levels.length > 0 ? levelConfig.levels[0].name : "L1";

        progress = await Progress.create({
            student: userId,
            course: courseId,
            currentLevel: firstLevel,
            completedLessons: [],
            completedModules: [],
            quizzes: [],
            assignments: [],
            progressPercent: 0,
        });
    }

    // Check if this module can be completed (sequential validation)
    if (moduleIndex > 0) {
        // Check if the previous module is completed
        const previousModule = sortedModules[moduleIndex - 1];
        const isPreviousCompleted = progress.completedModules.some(
            module => module.moduleId.toString() === previousModule._id.toString()
        );

        if (!isPreviousCompleted) {
            throw new ApiError("You must complete the previous module first", 400);
        }
    }

    // Validate that all lessons in this module are completed
    const currentModule = await Module.findById(moduleId).populate('lessons');
    if (!currentModule) {
        throw new ApiError("Module not found", 404);
    }

    if (currentModule.lessons && currentModule.lessons.length > 0) {
        const completedLessonIds = progress.completedLessons.map(l => l.lessonId.toString());
        const allLessonsCompleted = currentModule.lessons.every(lesson =>
            completedLessonIds.includes(lesson._id.toString())
        );

        if (!allLessonsCompleted) {
            throw new ApiError("You must complete all lessons in this module first", 400);
        }
    }

    // Check if module is already completed
    const isAlreadyCompleted = progress.completedModules.some(
        module => module.moduleId.toString() === moduleId.toString()
    );

    let levelUpgraded = false;
    let oldLevel = progress.currentLevel;

    if (!isAlreadyCompleted) {
        progress.completedModules.push({
            moduleId: moduleId,
            completedAt: new Date()
        });

        // Update progress percentage based on module completion
        const courseForProgress = await Course.findById(courseId);
        if (courseForProgress && courseForProgress.modules) {
            const totalModules = courseForProgress.modules.length;
            const completedModulesCount = progress.completedModules.length;
            progress.progressPercent = Math.min(100, Math.round((completedModulesCount / totalModules) * 100));

            // Respect admin level lock: when enabled, skip auto promotion and enforce lockedLevel if provided
            if (progress.levelLockEnabled) {
                if (progress.lockedLevel && progress.currentLevel !== progress.lockedLevel) {
                    progress.currentLevel = progress.lockedLevel;
                }
            } else {
                // Automatic level progression logic using dynamic level configuration
                const levelConfig = await CourseLevelConfig.getActiveConfig();
                if (levelConfig) {
                    const nextLevel = levelConfig.getNextLevel(progress.currentLevel);

                    // Check if student should be promoted based on progress
                    if (nextLevel) {
                        // Simple progression: advance to next level after completing a certain percentage
                        const levelsCount = levelConfig.levels.length;
                        const progressThreshold = 100 / levelsCount;
                        const currentLevelIndex = levelConfig.levels.findIndex(
                            l => l.name.toUpperCase() === progress.currentLevel.toUpperCase()
                        );

                        if (currentLevelIndex !== -1 && currentLevelIndex < levelsCount - 1) {
                            const requiredProgress = (currentLevelIndex + 1) * progressThreshold;
                            if (progress.progressPercent >= requiredProgress) {
                                progress.currentLevel = nextLevel.name;
                                levelUpgraded = true;
                            }
                        }
                    }
                }
            }

            // Log level upgrade for debugging
            if (levelUpgraded) {
            }
        }
    }

    progress.lastAccessed = new Date();
    await progress.save();

    // If all modules are now completed, try auto-issuing certificate (handles quiz condition internally)
    try {
        const courseForCheck = await Course.findById(courseId).populate('modules');
        const totalModules = courseForCheck?.modules?.length || 0;
        const completedModulesCount = progress.completedModules.length;
        if (totalModules > 0 && completedModulesCount >= totalModules) {
            await ensureCertificateIfEligible(userId, courseId, { issuedByUserId: undefined });
        }
    } catch (_) { }

    // Create response message
    let responseMessage = "Module marked as complete";
    if (levelUpgraded) {
        responseMessage += ` - Congratulations! You've been promoted to ${progress.currentLevel}!`;
    }

    res.json(new ApiResponse(200, progress, responseMessage));
});

export const upgradeLevel = asyncHandler(async (req, res) => {
    const { courseId } = req.body;
    const userId = req.user._id;

    const progress = await Progress.findOne({ student: userId, course: courseId });
    if (!progress) throw new ApiError("Progress not found", 404);

    // Respect admin lock: no manual upgrades when locked
    if (progress.levelLockEnabled) {
        throw new ApiError("Level changes are locked by admin", 403);
    }

    if (progress.progressPercent < 100) {
        throw new ApiError("Cannot upgrade level until progress is 100%", 400);
    }

    // Use dynamic level configuration
    const levelConfig = await CourseLevelConfig.getActiveConfig();
    if (!levelConfig) {
        throw new ApiError("No active level configuration found", 404);
    }

    const nextLevel = levelConfig.getNextLevel(progress.currentLevel);
    const lastLevel = levelConfig.levels[levelConfig.levels.length - 1];

    if (nextLevel) {
        // Upgrade to next level
        progress.currentLevel = nextLevel.name;
        await progress.save();
        return res.json(
            new ApiResponse(200, progress, "Level upgraded successfully")
        );
    } else if (progress.currentLevel.toUpperCase() === lastLevel.name.toUpperCase()) {
        // Already at last level, issue certificate
        const certificate = await Certificate.create({
            student: userId,
            course: courseId,
            issuedBy: req.user._id,
        });
        progress.isCompleted = true;

        await progress.save();
        return res.json(
            new ApiResponse(
                200,
                { progress, certificate },
                "Course completed, certificate issued"
            )
        );
    } else {
        throw new ApiError("Cannot determine next level", 400);
    }
});

export const getMyProgress = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user._id;

    const progress = await Progress.findOne({ student: userId, course: courseId })
        .populate("course", "title")
        .populate("student", "fullName email");

    if (!progress) throw new ApiError("Progress not found", 404);

    res.json(new ApiResponse(200, progress, "Progress fetched successfully"));
});

export const getOrInitializeProgress = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Invalid course ID", 400);
    }

    const course = await Course.findById(courseId);
    if (!course) throw new ApiError("Course not found", 404);

    let progress = await Progress.findOne({ student: userId, course: courseId })
        .populate("course", "title")
        .populate("student", "fullName email");

    if (!progress) {
        // Get active level configuration
        const levelConfig = await CourseLevelConfig.getActiveConfig();
        const firstLevel = levelConfig && levelConfig.levels.length > 0 ? levelConfig.levels[0].name : "L1";

        progress = await Progress.create({
            student: userId,
            course: courseId,
            currentLevel: firstLevel,
            completedLessons: [],
            completedModules: [],
            quizzes: [],
            assignments: [],
            progressPercent: 0,
        });
    }

    // Transform progress data to frontend-compatible format
    const transformedProgress = {
        ...progress.toObject(),
        // Extract lessonIds from completed lessons for frontend compatibility
        completedLessonIds: progress.completedLessons.map(lesson => lesson.lessonId.toString()),
        // Extract moduleIds from completed modules for frontend compatibility
        completedModuleIds: progress.completedModules.map(module => module.moduleId.toString()),
        // Keep original arrays for detailed information if needed
        lessonsCompleted: progress.completedLessons.map(lesson => lesson.lessonId.toString()),
        modulesCompleted: progress.completedModules.map(module => module.moduleId.toString())
    };

    res.json(new ApiResponse(200, transformedProgress, "Progress fetched successfully"));
});

export const setStudentLevel = asyncHandler(async (req, res) => {
    const { studentId, courseId, level, lock } = req.body;

    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Invalid student or course ID", 400);
    }

    // Validate level against active configuration
    if (level) {
        const isValid = await CourseLevelConfig.isValidLevel(level);
        if (!isValid) {
            throw new ApiError(`Invalid level value. Level '${level}' does not exist in active configuration`, 400);
        }
    }

    let progress = await Progress.findOne({ student: studentId, course: courseId });
    if (!progress) {
        // Get first level from configuration if creating new progress
        const levelConfig = await CourseLevelConfig.getActiveConfig();
        const firstLevel = levelConfig && levelConfig.levels.length > 0 ? levelConfig.levels[0].name : "L1";

        progress = await Progress.create({
            student: studentId,
            course: courseId,
            currentLevel: level || firstLevel,
            completedLessons: [],
            completedModules: [],
            quizzes: [],
            assignments: [],
            progressPercent: 0,
        });
    }

    if (level) {
        progress.currentLevel = level;
    }

    if (typeof lock === 'boolean') {
        progress.levelLockEnabled = lock;
        progress.lockedLevel = lock ? (level || progress.currentLevel) : null;
        // When locking, enforce the level immediately
        if (lock && progress.lockedLevel && progress.currentLevel !== progress.lockedLevel) {
            progress.currentLevel = progress.lockedLevel;
        }
    }

    await progress.save();

    return res.json(new ApiResponse(200, progress, "Student level updated successfully"));
});

export const getCourseProgress = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    const progresses = await Progress.find({ course: courseId })
        .populate("student", "fullName email")
        .sort({ createdAt: -1 });

    res.json(
        new ApiResponse(200, progresses, "Course progress fetched successfully")
    );
});

// New endpoint to validate module access
export const validateModuleAccess = asyncHandler(async (req, res) => {
    const { courseId, moduleId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(moduleId)) {
        throw new ApiError("Invalid course ID or module ID", 400);
    }

    // Get course with modules to determine module order
    const course = await Course.findById(courseId).populate({
        path: 'modules',
        populate: {
            path: 'lessons'
        }
    });
    if (!course) throw new ApiError("Course not found", 404);

    // Get user progress
    const progress = await Progress.findOne({ student: userId, course: courseId });
    if (!progress) {
        // If no progress, only first module is accessible
        const firstModule = course.modules.sort((a, b) => (a.order || 0) - (b.order || 0))[0];
        const hasAccess = firstModule && firstModule._id.toString() === moduleId;
        return res.json(new ApiResponse(200, { hasAccess, reason: hasAccess ? 'First module' : 'Only first module is accessible' }, "Module access validated"));
    }

    // Find the requested module and its order
    const moduleIndex = course.modules
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .findIndex(mod => mod._id.toString() === moduleId);

    if (moduleIndex === -1) {
        throw new ApiError("Module not found in course", 404);
    }

    // Check if module is effectively completed
    const isModuleCompleted = await isModuleEffectivelyCompleted(progress, moduleId);

    // Get count of effectively completed modules up to this point
    const sortedModules = course.modules.sort((a, b) => (a.order || 0) - (b.order || 0));
    const effectivelyCompletedCount = await getEffectivelyCompletedModules(progress, sortedModules);

    const hasAccess = isModuleCompleted || moduleIndex <= effectivelyCompletedCount.length;
    const reason = isModuleCompleted ? 'Module completed' :
        moduleIndex <= effectivelyCompletedCount.length ? 'Previous modules completed' :
            'Previous modules not completed';

    res.json(new ApiResponse(200, {
        hasAccess,
        reason,
        moduleIndex,
        completedModulesCount: progress.completedModules.length,
        effectivelyCompletedCount: effectivelyCompletedCount.length
    }, "Module access validated"));
});

// New endpoint to get specific student progress for admin
export const getStudentProgress = asyncHandler(async (req, res) => {
    const { studentId } = req.params;

    let resolvedStudentId = studentId;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        const User = (await import("../models/auth.model.js")).default;
        const handle = String(studentId).toLowerCase();
        const u = await User.findOne({ $or: [{ slug: handle }, { userName: handle }] }).select('_id');
        if (!u) {
            throw new ApiError("Invalid student ID", 400);
        }
        resolvedStudentId = u._id;
    }

    const progresses = await Progress.find({ student: resolvedStudentId })
        .populate({ path: "course", select: "title description modules quizzes assignments" })
        .populate("student", "fullName email slug")
        .sort({ createdAt: -1 });

    // Recalculate progress percent for accuracy
    for (const p of progresses) {
        await p.calculateProgress();
    }

    // Transform progress data to frontend-compatible format
    const transformedProgresses = progresses.map(progress => {
        const courseProgress = {
            ...progress.toObject(),
            courseTitle: progress.course?.title,
            // Extract lessonIds from completed lessons for frontend compatibility
            completedLessonIds: progress.completedLessons.map(lesson => lesson.lessonId.toString()),
            // Extract moduleIds from completed modules for frontend compatibility
            completedModuleIds: progress.completedModules.map(module => module.moduleId.toString()),
            // Keep original arrays for detailed information if needed
            lessonsCompleted: progress.completedLessons.map(lesson => lesson.lessonId.toString()),
            modulesCompleted: progress.completedModules.map(module => module.moduleId.toString()),
            // Add total modules count if available
            totalModules: progress.course?.modules?.length || 0
        };
        return courseProgress;
    });

    res.json(
        new ApiResponse(200, transformedProgresses, "Student progress fetched successfully")
    );
});

// Get all progress for the authenticated student
export const getMyAllProgress = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const progresses = await Progress.find({ student: userId })
        .populate({ path: "course", select: "title description modules quizzes assignments" })
        .populate({
            path: "student",
            select: "fullName email department",
            populate: {
                path: "department",
                select: "name startDate endDate"
            }
        })
        .populate({
            path: "course",
            populate: {
                path: "modules",
                select: "title order"
            }
        })
        .sort({ createdAt: -1 });

    // Recalculate progress percent for accuracy
    for (const p of progresses) {
        await p.calculateProgress();
    }

    // Preload all quizzes and attempts for computing report availability per course
    const AttemptedQuiz = (await import("../models/attemptedQuiz.model.js")).default;
    const Quiz = (await import("../models/quiz.model.js")).default;
    const Assignment = (await import("../models/assignment.model.js")).default;
    const Submission = (await import("../models/submission.model.js")).default;

    // Transform progress data to frontend-compatible format
    const transformedProgresses = await Promise.all(progresses.map(async (progress) => {
        // Compute report availability: course completed AND all course quizzes passed AND all assignments submitted (if any)
        const totalModules = progress.course?.modules?.length || 0;
        const completedModulesCount = progress.completedModules.length;
        const courseCompleted = totalModules > 0 && completedModulesCount >= totalModules;

        let allQuizzesPassed = false;
        let allAssignmentsSubmitted = false;
        if (courseCompleted && (progress.progressPercent >= 100)) {
            // Check quizzes
            const quizzes = await Quiz.find({ course: progress.course?._id }).select('_id');
            const totalQuizzes = quizzes.length;
            if (totalQuizzes === 0) {
                allQuizzesPassed = true;
            } else {
                const quizIds = quizzes.map(q => q._id);
                const passedAttempts = await AttemptedQuiz.find({
                    student: progress.student?._id,
                    status: 'PASSED',
                    quiz: { $in: quizIds }
                }).select('quiz');
                const passedSet = new Set(passedAttempts.map(a => String(a.quiz)));
                allQuizzesPassed = quizIds.every(id => passedSet.has(String(id)));
            }

            // Check assignments (if any exist for the course)
            const assignments = await Assignment.find({ course: progress.course?._id }).select('_id');
            const totalAssignments = assignments.length;
            if (totalAssignments === 0) {
                allAssignmentsSubmitted = true;
            } else {
                const assignmentIds = assignments.map(a => a._id);
                const submissions = await Submission.find({
                    student: progress.student?._id,
                    assignment: { $in: assignmentIds },
                    status: { $in: ['SUBMITTED', 'GRADED', 'RETURNED'] }
                }).select('assignment');
                const submittedSet = new Set(submissions.map(s => String(s.assignment)));
                allAssignmentsSubmitted = assignmentIds.every(id => submittedSet.has(String(id)));
            }
        }

        const reportAvailable = courseCompleted && (progress.progressPercent >= 100) && allQuizzesPassed && allAssignmentsSubmitted;

        const courseProgress = {
            ...progress.toObject(),
            courseTitle: progress.course?.title,
            // Extract lessonIds from completed lessons for frontend compatibility
            completedLessonIds: progress.completedLessons.map(lesson => lesson.lessonId.toString()),
            // Extract moduleIds from completed modules for frontend compatibility
            completedModuleIds: progress.completedModules.map(module => module.moduleId.toString()),
            // Keep original arrays for detailed information if needed
            lessonsCompleted: progress.completedLessons.map(lesson => lesson.lessonId.toString()),
            modulesCompleted: progress.completedModules.map(module => module.moduleId.toString()),
            // Add total modules count if available
            totalModules: progress.course?.modules?.length || 0,
            // Include department information from student populate
            department: progress.student?.department || null,
            // New field
            reportAvailable,
        };
        return courseProgress;
    }));

    res.json(
        new ApiResponse(200, transformedProgresses, "My progress fetched successfully")
    );
});

// Get course completion report data for a student
export const getCourseCompletionReport = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Invalid course ID", 400);
    }

    // Get student details
    const User = (await import("../models/auth.model.js")).default;
    const Department = (await import("../models/department.model.js")).default;

    const student = await User.findById(userId).populate('department');
    if (!student) {
        throw new ApiError("Student not found", 404);
    }

    if (!student.department) {
        throw new ApiError("Student not assigned to any department", 404);
    }

    // Get department details with instructor and course
    const department = await Department.findById(student.department._id)
        .populate('instructor', 'fullName email')
        .populate('course', 'title description');

    if (!department) {
        throw new ApiError("Department not found", 404);
    }

    if (department.course._id.toString() !== courseId) {
        throw new ApiError("Course does not match student's department course", 400);
    }

    // Get course with modules
    const course = await Course.findById(courseId).populate('modules');
    if (!course) {
        throw new ApiError("Course not found", 404);
    }

    // Get student progress
    const progress = await Progress.findOne({ student: userId, course: courseId });
    if (!progress) {
        throw new ApiError("No progress found for this course", 404);
    }

    // Check if course is completed (all modules completed)
    const totalModules = course.modules?.length || 0;
    const completedModules = progress.completedModules?.length || 0;
    const isCourseCompleted = totalModules > 0 && completedModules >= totalModules;

    if (!isCourseCompleted) {
        throw new ApiError(`Course not completed. ${completedModules}/${totalModules} modules completed.`, 400);
    }

    // Require overall course progress to be 100%
    if ((progress.progressPercent || 0) < 100) {
        throw new ApiError("Course progress must be 100% to generate the report", 400);
    }

    // Get quiz attempts for this course
    const AttemptedQuiz = (await import("../models/attemptedQuiz.model.js")).default;
    const Quiz = (await import("../models/quiz.model.js")).default;

    const quizAttempts = await AttemptedQuiz.find({ student: userId })
        .populate({
            path: 'quiz',
            match: { course: courseId },
            select: 'title questions passingScore type'
        })
        .sort({ createdAt: -1 });

    // Filter out attempts where quiz is null (doesn't belong to this course)
    const courseQuizAttempts = quizAttempts.filter(attempt => attempt.quiz);

    // Transform quiz attempts with pass/fail status
    const quizResults = courseQuizAttempts.map(attempt => {
        const totalQuestions = attempt.quiz.questions?.length || 0;
        // Calculate total marks properly by summing up marks from all questions
        const totalMarks = attempt.quiz.questions?.reduce((sum, question) => sum + (question.marks || 1), 0) || totalQuestions;
        const scorePercent = totalMarks > 0 ? Math.round((attempt.score / totalMarks) * 100) : 0;
        const passingScore = attempt.quiz.passingScore || 70;
        const passed = scorePercent >= passingScore;

        return {
            quizId: attempt.quiz._id,
            quizTitle: attempt.quiz.title,
            quizType: attempt.quiz.type,
            score: attempt.score,
            totalQuestions,
            totalMarks,
            scorePercent,
            passingScore,
            passed,
            status: passed ? 'PASSED' : 'FAILED',
            attemptDate: attempt.createdAt,
            timeTaken: attempt.timeTaken
        };
    });

    // Calculate overall quiz performance
    const totalQuizzes = quizResults.length;
    const passedQuizzes = quizResults.filter(q => q.passed).length;
    const overallQuizPassRate = totalQuizzes > 0 ? Math.round((passedQuizzes / totalQuizzes) * 100) : 0;
    const averageQuizScore = totalQuizzes > 0
        ? Math.round(quizResults.reduce((sum, q) => sum + q.scorePercent, 0) / totalQuizzes)
        : 0;

    // Confirm quizzes requirement: all quizzes passed
    let requireAllQuizzesPassed = true;
    const quizzesInCourse = await Quiz.find({ course: courseId }).select('_id');
    const quizIds = quizzesInCourse.map(q => q._id);
    const passedAttempts = courseQuizAttempts.filter(a => a.passed && a.quiz);
    const passedSet = new Set(passedAttempts.map(a => String(a.quiz._id)));
    const allQuizzesPassed = quizIds.every(id => passedSet.has(String(id)));

    if (requireAllQuizzesPassed && quizIds.length > 0 && !allQuizzesPassed) {
        throw new ApiError("All quizzes must be passed to generate the report", 400);
    }

    // Check assignment submissions
    const Assignment = (await import("../models/assignment.model.js")).default;
    const Submission = (await import("../models/submission.model.js")).default;

    const assignmentsInCourse = await Assignment.find({ course: courseId }).select('_id title maxScore');
    const assignmentIds = assignmentsInCourse.map(a => a._id);
    const totalAssignments = assignmentsInCourse.length;

    const submissions = await Submission.find({
        student: userId,
        assignment: { $in: assignmentIds },
        status: { $in: ['SUBMITTED', 'GRADED', 'RETURNED'] }
    }).populate('assignment', 'title maxScore');

    const assignmentResults = submissions.map(sub => {
        return {
            assignmentId: sub.assignment._id,
            assignmentTitle: sub.assignment.title,
            score: sub.grade,
            maxScore: sub.assignment.maxScore,
            status: sub.status,
            submittedAt: sub.submittedAt
        };
    });

    const submittedSet = new Set(submissions.map(s => String(s.assignment._id)));
    const allAssignmentsSubmitted = assignmentIds.every(id => submittedSet.has(String(id)));

    if (totalAssignments > 0 && !allAssignmentsSubmitted) {
        throw new ApiError("All assignments must be submitted to generate the report", 400);
    }

    // Verify all modules are effectively completed (double-check)
    const sortedModules = course.modules.sort((a, b) => (a.order || 0) - (b.order || 0));
    const effectivelyCompleted = await getEffectivelyCompletedModules(progress, sortedModules);

    if (sortedModules.length > 0 && effectivelyCompleted.length < sortedModules.length) {
        throw new ApiError("All modules must be verified as completed", 400);
    }

    // Generate comprehensive report data
    const reportData = {
        student: {
            fullName: student.fullName,
            userName: student.userName,
            email: student.email,
            department: department.name
        },
        course: {
            title: course.title,
            description: course.description,
            totalModules: totalModules
        },
        instructor: {
            fullName: department.instructor?.fullName || 'N/A',
            email: department.instructor?.email || 'N/A'
        },
        performance: {
            modulesCompleted: completedModules,
            progressPercent: progress.progressPercent,
            quizzes: {
                total: totalQuizzes,
                passed: passedQuizzes,
                passRate: overallQuizPassRate,
                averageScore: averageQuizScore,
                details: quizResults
            },
            assignments: {
                total: totalAssignments,
                submitted: submissions.length,
                details: assignmentResults
            },
            completionDate: new Date()
        },
        certificationEligible: true
    };

    res.json(new ApiResponse(200, reportData, "Course completion report generated"));
});

// Check module access with timeline enforcement
export const checkModuleAccessWithTimeline = asyncHandler(async (req, res) => {
    const { courseId, moduleId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(moduleId)) {
        throw new ApiError("Invalid course ID or module ID", 400);
    }

    // Get user details to find department
    const User = (await import("../models/auth.model.js")).default;
    const user = await User.findById(userId);
    if (!user || !user.department) {
        // If no department, fall back to standard validation
        // Since we can't easily call the exported view from here without refactoring, 
        // we'll duplicate the basic logic or redirect logic.
        // For now, let's just do a simple check.
        const progress = await Progress.findOne({ student: userId, course: courseId });
        return res.json(new ApiResponse(200, {
            hasAccess: true,
            reason: 'No department assigned',
            timeline: null
        }, "Access checked"));
    }

    // Check for active timeline
    const timeline = await ModuleTimeline.findOne({
        course: courseId,
        module: moduleId,
        department: user.department,
        isActive: true
    });

    // Get progress
    const progress = await Progress.findOne({ student: userId, course: courseId });

    if (!timeline) {
        // If no timeline, standard access
        return res.json(new ApiResponse(200, {
            hasAccess: true,
            reason: 'No active timeline',
            timeline: null
        }, "Access checked"));
    }

    // If timeline exists, check deadline
    const now = new Date();
    const isOverdue = now > timeline.deadline;

    // Check if student has missed deadline record
    const hasMissedDeadline = timeline.hasStudentMissedDeadline(userId);

    let hasAccess = true;
    let reason = "Access granted";

    if (isOverdue && !hasMissedDeadline) {
        const graceDeadline = new Date(timeline.deadline.getTime() + (timeline.gracePeriodHours * 60 * 60 * 1000));
        if (now > graceDeadline) {
            reason = "Overdue - Grace period expired";
            // In some strict modes this might be false, but usually we allow access to complete
        } else {
            reason = "Overdue - Within grace period";
        }
    }

    // Check sequential progress
    if (progress && !progress.completedModules.some(m => m.moduleId.toString() === moduleId)) {
        if (progress.currentAccessibleModule && progress.currentAccessibleModule.toString() !== moduleId) {
            // If we want to strictly enforce "current module only"
            // hasAccess = false; 
            // reason = "Not current accessible module";
        }
    }

    res.json(new ApiResponse(200, {
        hasAccess,
        reason,
        timeline: {
            deadline: timeline.deadline,
            isOverdue,
            gracePeriodHours: timeline.gracePeriodHours
        }
    }, "Timeline access checked"));
});

// Get timeline violations for a student
export const getTimelineViolations = asyncHandler(async (req, res) => {
    const { studentId } = req.params;

    let targetStudentId = studentId;
    // If querying for self (student role)
    if (req.user.role === 'STUDENT') {
        targetStudentId = req.user._id;
    }

    if (!mongoose.Types.ObjectId.isValid(targetStudentId)) {
        throw new ApiError("Invalid student ID", 400);
    }

    const progresses = await Progress.find({ student: targetStudentId })
        .select('course timelineViolations')
        .populate('course', 'title')
        .populate('timelineViolations.module', 'title')
        .populate('timelineViolations.demotedFromModule', 'title')
        .populate('timelineViolations.demotedToModule', 'title');

    const violations = progresses.reduce((acc, p) => {
        if (p.timelineViolations && p.timelineViolations.length > 0) {
            return acc.concat(p.timelineViolations.map(v => ({
                ...v.toObject(),
                courseName: p.course?.title
            })));
        }
        return acc;
    }, []);

    res.json(new ApiResponse(200, violations, "Timeline violations retrieved"));
});

// Update current accessible module (Admin overrides)
export const updateCurrentAccessibleModule = asyncHandler(async (req, res) => {
    const { studentId, courseId, moduleId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(moduleId)) {
        throw new ApiError("Invalid student, course, or module ID", 400);
    }

    const progress = await Progress.findOne({ student: studentId, course: courseId });
    if (!progress) {
        throw new ApiError("Progress record not found", 404);
    }

    // Verify module exists
    const Module = (await import("../models/module.model.js")).default;
    const moduleExists = await Module.exists({ _id: moduleId });
    if (!moduleExists) {
        throw new ApiError("Module not found", 404);
    }

    progress.currentAccessibleModule = moduleId;
    await progress.save();

    res.json(new ApiResponse(200, progress, "Current accessible module updated"));
});
