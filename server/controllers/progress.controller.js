import mongoose from "mongoose";

import Progress from "../models/progress.model.js";
import Course from "../models/course.model.js";
import Certificate from "../models/certificate.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isModuleEffectivelyCompleted, checkModuleAccessForAssessments, getEffectivelyCompletedModules } from "../utils/moduleCompletion.js";

export const initializeProgress = asyncHandler(async (req, res) => {
    const { courseId } = req.body;
    const userId = req.user._id;

    if(!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Invalid course ID", 400);
    }

    const course = await Course.findById(courseId);
    if(!course) throw new ApiError("Course not found", 404);

    let progress = await Progress.findOne({ student: userId, course: courseId });
    if(progress) {
        throw new ApiError("Progress already initialized for this course", 400);
    }

    progress = await Progress.create({
        student: userId,
        course: courseId,
        currentLevel: "L1",
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
    if(!progress) throw new ApiError("Progress not found", 404);

    // For now, we'll just update the lastAccessed time
    // In a real app, you'd track individual lesson completion
    progress.lastAccessed = new Date();
    await progress.save();

    res.json(new ApiResponse(200, progress, "Progress updated successfully"));
});

export const markLessonComplete = asyncHandler(async (req, res) => {
    const { courseId, lessonId } = req.body;
    const userId = req.user._id;

    if(!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(lessonId)) {
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
    if(!progress) {
        // Initialize progress if it doesn't exist
        progress = await Progress.create({
            student: userId,
            course: courseId,
            currentLevel: "L1",
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

    if(!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(moduleId)) {
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
    if(!progress) {
        // Initialize progress if it doesn't exist
        progress = await Progress.create({
            student: userId,
            course: courseId,
            currentLevel: "L1",
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

    // let course;
    let levelUpgraded = false;
    let oldLevel = progress.currentLevel;

    if (!isAlreadyCompleted) {
        progress.completedModules.push({
            moduleId: moduleId,
            completedAt: new Date()
        });

        // Update progress percentage based on module completion
        course = await Course.findById(courseId);
        if (course && course.modules) {
            const totalModules = course.modules.length;
            const completedModulesCount = progress.completedModules.length;
            progress.progressPercent = Math.min(100, Math.round((completedModulesCount / totalModules) * 100));
            
            // Automatic level progression logic
            if (progress.currentLevel === "L1" && completedModulesCount >= 1) {
                // Upgrade to L2 after completing first module
                progress.currentLevel = "L2";
                levelUpgraded = true;
            } else if (progress.currentLevel === "L2" && progress.progressPercent >= 75) {
                // Upgrade to L3 after completing 75% of the course
                progress.currentLevel = "L3";
                levelUpgraded = true;
            }
            
            // Log level upgrade for debugging
            if (levelUpgraded) {
            }
        }
    }

    progress.lastAccessed = new Date();
    await progress.save();

    // Create response message
    let responseMessage = "Module marked as complete";
    if (levelUpgraded) {
        if (progress.currentLevel === "L2") {
            responseMessage += " - Congratulations! You've been promoted to Level 2!";
        } else if (progress.currentLevel === "L3") {
            responseMessage += " - Excellent! You've been promoted to Level 3!";
        }
    }

    res.json(new ApiResponse(200, progress, responseMessage));
});

export const upgradeLevel = asyncHandler(async (req, res) => {
    const { courseId } = req.body;
    const userId = req.user._id;

    const progress = await Progress.findOne({ student: userId, course: courseId });
    if(!progress) throw new ApiError("Progress not found", 404);

    if(progress.progressPercent < 100) {
        throw new ApiError("Cannot upgrade level until progress is 100%", 400);
    }

    if(progress.currentLevel === "L1") {
        progress.currentLevel = "L2";
    } else if(progress.currentLevel === "L2") {
        progress.currentLevel = "L3";
    } else if(progress.currentLevel === "L3") {
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
    }

    await progress.save();
    res.json(
        new ApiResponse(200, progress, "Level upgraded successfully")
    );
});

export const getMyProgress = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user._id;

    const progress = await Progress.findOne({ student: userId, course: courseId })
        .populate("course", "title")
        .populate("student", "fullName email");

    if(!progress) throw new ApiError("Progress not found", 404);

    res.json(new ApiResponse(200, progress, "Progress fetched successfully"));
});

export const getOrInitializeProgress = asyncHandler(async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user._id;

    if(!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Invalid course ID", 400);
    }

    const course = await Course.findById(courseId);
    if(!course) throw new ApiError("Course not found", 404);

    let progress = await Progress.findOne({ student: userId, course: courseId })
        .populate("course", "title")
        .populate("student", "fullName email");

    if(!progress) {
        progress = await Progress.create({
            student: userId,
            course: courseId,
            currentLevel: "L1",
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

    if(!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(moduleId)) {
        throw new ApiError("Invalid course ID or module ID", 400);
    }

    // Get course with modules to determine module order
    const course = await Course.findById(courseId).populate({
        path: 'modules',
        populate: {
            path: 'lessons'
        }
    });
    if(!course) throw new ApiError("Course not found", 404);

    // Get user progress
    const progress = await Progress.findOne({ student: userId, course: courseId });
    if(!progress) {
        // If no progress, only first module is accessible
        const firstModule = course.modules.sort((a, b) => (a.order || 0) - (b.order || 0))[0];
        const hasAccess = firstModule && firstModule._id.toString() === moduleId;
        return res.json(new ApiResponse(200, { hasAccess, reason: hasAccess ? 'First module' : 'Only first module is accessible' }, "Module access validated"));
    }

    // Find the requested module and its order
    const moduleIndex = course.modules
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .findIndex(mod => mod._id.toString() === moduleId);
    
    if(moduleIndex === -1) {
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

    if(!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ApiError("Invalid student ID", 400);
    }

    const progresses = await Progress.find({ student: studentId })
        .populate("course", "title description")
        .populate("student", "fullName email")
        .sort({ createdAt: -1 });

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
