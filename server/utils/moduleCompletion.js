import mongoose from "mongoose";
import Progress from "../models/progress.model.js";
import Module from "../models/module.model.js";
import Lesson from "../models/lesson.model.js";

/**
 * Check if a module is effectively completed for a user
 * A module is considered effectively completed if:
 * 1. It is explicitly marked as completed in the progress record, OR
 * 2. All of its lessons are completed AND all available assessments are completed
 * 
 * @param {Object} progress - The progress record for the user and course
 * @param {string} moduleId - The module ID to check
 * @param {Array} moduleLessons - Array of lessons in the module (optional, will fetch if not provided)
 * @param {Array} moduleQuizzes - Array of quizzes for the module (optional, will fetch if not provided)
 * @param {Array} moduleAssignments - Array of assignments for the module (optional, will fetch if not provided)
 * @returns {Promise<boolean>} - True if module is effectively completed
 */
export const isModuleEffectivelyCompleted = async (progress, moduleId, moduleLessons = null, moduleQuizzes = null, moduleAssignments = null) => {
    if (!progress || !moduleId) return false;

    const moduleIdString = String(moduleId);

    // Check if module is explicitly completed
    const isExplicitlyCompleted = progress.completedModules.some(
        module => String(module.moduleId || module) === moduleIdString
    );
    
    if (isExplicitlyCompleted) return true;

    // If no lessons provided, fetch them
    if (!moduleLessons) {
        try {
            const module = await Module.findById(moduleId).populate('lessons');
            if (!module) return false;
            moduleLessons = module.lessons || [];
        } catch (error) {
            console.error("Error fetching module lessons:", error);
            return false;
        }
    }

    // If module has no lessons, it can't be completed through lesson completion
    if (!Array.isArray(moduleLessons) || moduleLessons.length === 0) {
        return false;
    }

    // Check if all lessons are completed
    const completedLessonIds = progress.completedLessons.map(lesson => 
        String(lesson.lessonId || lesson)
    );

    const allLessonsCompleted = moduleLessons.every(lesson => {
        const lessonId = String(lesson._id || lesson.id || lesson);
        return completedLessonIds.includes(lessonId);
    });

    if (!allLessonsCompleted) return false;

    // Now check assessments - fetch them if not provided
    if (!moduleQuizzes || !moduleAssignments) {
        try {
            const Quiz = (await import("../models/quiz.model.js")).default;
            const Assignment = (await import("../models/assignment.model.js")).default;
            
            if (!moduleQuizzes) {
                moduleQuizzes = await Quiz.find({ module: moduleId }) || [];
            }
            if (!moduleAssignments) {
                moduleAssignments = await Assignment.find({ module: moduleId }) || [];
            }
        } catch (error) {
            console.error("Error fetching module assessments:", error);
            // If we can't fetch assessments, assume none exist and proceed with lesson-only completion
            return allLessonsCompleted;
        }
    }

    // Check if all quizzes are completed (if any exist)
    if (moduleQuizzes && moduleQuizzes.length > 0) {
        const completedQuizzes = progress.quizzes || [];
        const allQuizzesCompleted = moduleQuizzes.every(quiz => {
            const quizId = String(quiz._id || quiz.id || quiz);
            return completedQuizzes.some(completedQuiz => 
                String(completedQuiz.quizId || completedQuiz) === quizId && 
                completedQuiz.passed === true
            );
        });
        if (!allQuizzesCompleted) return false;
    }

    // Check if all assignments are completed (if any exist)
    if (moduleAssignments && moduleAssignments.length > 0) {
        const completedAssignments = progress.assignments || [];
        const allAssignmentsCompleted = moduleAssignments.every(assignment => {
            const assignmentId = String(assignment._id || assignment.id || assignment);
            return completedAssignments.some(completedAssignment => 
                String(completedAssignment.assignmentId || completedAssignment) === assignmentId && 
                completedAssignment.submitted === true
            );
        });
        if (!allAssignmentsCompleted) return false;
    }

    return true;
};

/**
 * Check if a user has access to quizzes/assignments for a specific module
 * Access is granted if all lessons in the module are completed
 * 
 * @param {string} userId - The user ID
 * @param {string} courseId - The course ID
 * @param {string} moduleId - The module ID
 * @returns {Promise<Object>} - Object with hasAccess boolean and reason string
 */
export const checkModuleAccessForAssessments = async (userId, courseId, moduleId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(userId) || 
            !mongoose.Types.ObjectId.isValid(courseId) || 
            !mongoose.Types.ObjectId.isValid(moduleId)) {
            return { hasAccess: false, reason: "Invalid parameters" };
        }

        // Get user's progress for the course
        const progress = await Progress.findOne({ 
            student: userId, 
            course: courseId 
        });

        if (!progress) {
            return { hasAccess: false, reason: "No progress found for this course" };
        }

        // Check if all lessons in module are completed (not the full module)
        try {
            const module = await Module.findById(moduleId).populate('lessons');
            if (!module) {
                return { hasAccess: false, reason: "Module not found" };
            }

            const moduleLessons = module.lessons || [];
            if (moduleLessons.length === 0) {
                return { hasAccess: true, reason: "No lessons to complete" };
            }

            // Check if all lessons are completed
            const completedLessonIds = progress.completedLessons.map(lesson => 
                String(lesson.lessonId || lesson)
            );

            const allLessonsCompleted = moduleLessons.every(lesson => {
                const lessonId = String(lesson._id || lesson.id || lesson);
                return completedLessonIds.includes(lessonId);
            });

            if (allLessonsCompleted) {
                return { hasAccess: true, reason: "All lessons completed" };
            } else {
                return { 
                    hasAccess: false, 
                    reason: "Complete all lessons first to unlock assessments" 
                };
            }
        } catch (error) {
            console.error("Error fetching module lessons:", error);
            return { hasAccess: false, reason: "Error checking lesson completion" };
        }
    } catch (error) {
        console.error("Error checking module access:", error);
        return { hasAccess: false, reason: "Error checking access" };
    }
};

/**
 * Get the effective completion status for all modules in a course
 * 
 * @param {Object} progress - The progress record
 * @param {Array} modules - Array of course modules with populated lessons
 * @returns {Promise<Array>} - Array of module IDs that are effectively completed
 */
export const getEffectivelyCompletedModules = async (progress, modules) => {
    if (!progress || !Array.isArray(modules)) return [];

    const effectivelyCompletedModules = [];

    for (const module of modules) {
        const moduleId = module._id || module.id;
        const isCompleted = await isModuleEffectivelyCompleted(progress, moduleId, module.lessons);
        
        if (isCompleted) {
            effectivelyCompletedModules.push(String(moduleId));
        }
    }

    return effectivelyCompletedModules;
};
