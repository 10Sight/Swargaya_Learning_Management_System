import mongoose from "mongoose";

import Quiz from "../models/quiz.model.js";
import Course from "../models/course.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkModuleAccessForAssessments } from "../utils/moduleCompletion.js";

export const createQuiz = asyncHandler(async (req, res) => {
    const { courseId, moduleId, lessonId, scope, title, questions, passingScore, description, timeLimit, attemptsAllowed } = req.body;

    // Validate required fields
    if (!title || !questions || questions.length === 0) {
        throw new ApiError("Title and questions are required", 400);
    }

    // Validate scope
    if (scope && !['course', 'module', 'lesson'].includes(scope)) {
        throw new ApiError("Scope must be 'course', 'module', or 'lesson'", 400);
    }

    // Determine scope from provided parameters if not explicitly set
    const actualScope = scope || (lessonId ? 'lesson' : moduleId ? 'module' : 'course');
    
    // Validate course ID
    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Valid Course ID is required", 400);
    }
    
    const course = await Course.findById(courseId);
    if (!course) {
        throw new ApiError("Course not found", 404);
    }

    // Validate scope-specific requirements
    let parentEntity;
    let parentId;

    if (actualScope === 'course') {
        parentEntity = course;
        parentId = courseId;
    } else if (actualScope === 'module') {
        if (!moduleId || !mongoose.Types.ObjectId.isValid(moduleId)) {
            throw new ApiError("Valid Module ID is required for module-scoped quiz", 400);
        }
        const Module = (await import("../models/module.model.js")).default;
        parentEntity = await Module.findOne({ _id: moduleId, course: courseId });
        if (!parentEntity) {
            throw new ApiError("Module not found or does not belong to this course", 404);
        }
        parentId = moduleId;
    } else if (actualScope === 'lesson') {
        if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
            throw new ApiError("Valid Lesson ID is required for lesson-scoped quiz", 400);
        }
        if (!moduleId || !mongoose.Types.ObjectId.isValid(moduleId)) {
            throw new ApiError("Valid Module ID is required for lesson-scoped quiz", 400);
        }
        const Lesson = (await import("../models/lesson.model.js")).default;
        parentEntity = await Lesson.findById(lessonId);
        if (!parentEntity) {
            throw new ApiError("Lesson not found", 404);
        }
        parentId = lessonId;
    }

    let quizData = {
        scope: actualScope,
        title,
        description,
        questions,
        passingScore,
        timeLimit,
        attemptsAllowed,
        createdBy: req.user._id,
        // Legacy fields for backward compatibility
        course: courseId
    };

    // Set the appropriate ID based on scope
    if (actualScope === 'course') {
        quizData.courseId = parentId;
    } else if (actualScope === 'module') {
        quizData.courseId = courseId;
        quizData.moduleId = parentId;
        quizData.module = parentId; // Legacy field
    } else if (actualScope === 'lesson') {
        quizData.courseId = courseId;
        quizData.moduleId = moduleId;
        quizData.lessonId = parentId;
        quizData.module = moduleId; // Legacy field
    }

    const quiz = await Quiz.create(quizData);

    // Update parent entity with new quiz (if needed for legacy compatibility)
    course.quizzes.push(quiz._id);
    await course.save();

    res.status(201)
        .json(new ApiResponse(201, quiz, "Quiz created successfully"));
});

export const getAllQuizzes = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const searchQuery = search
        ? { title: { $regex: search, $options: "i" } }
        : {};

    if(req.query.courseId) {
        searchQuery.course = req.query.courseId;
    }

    const total = await Quiz.countDocuments(searchQuery);

    const quizzes = await Quiz.find(searchQuery)
        .populate("course", "title")
        .populate("module", "title")
        .populate("createdBy", "fullName email role")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    res.json(
        new ApiResponse(200, {
            quizzes,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit,
            },
        }, "Quizzes fetched successfully")
    );
});

export const getQuizById = asyncHandler(async (req, res) => {
    const key = req.params.id;

    let quiz = null;
    if (mongoose.Types.ObjectId.isValid(key)) {
        quiz = await Quiz.findById(key)
            .populate("course", "title")
            .populate("createdBy", "fullName email");
    }
    if (!quiz) {
        quiz = await Quiz.findOne({ slug: key })
            .populate("course", "title")
            .populate("createdBy", "fullName email");
    }

    if(!quiz) {
        throw new ApiError("Quiz not found", 404);
    }

    res.json(new ApiResponse(200, quiz, "Quiz fetched successfully"));
});

export const updateQuiz = asyncHandler(async (req, res) => {
    if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError("Invalid quiz ID", 400);
    }

    const { title, questions, description, passingScore, timeLimit, attemptsAllowed } = req.body;

    const quiz = await Quiz.findById(req.params.id);
    if(!quiz) {
        throw new ApiError("Quiz not found", 404);
    }

    if(title) quiz.title = title;
    if(questions && questions.length > 0) quiz.questions = questions;
    if(description !== undefined) quiz.description = description;
    if(passingScore !== undefined) quiz.passingScore = Number(passingScore);
    if(timeLimit !== undefined) quiz.timeLimit = timeLimit;
    if(attemptsAllowed !== undefined) quiz.attemptsAllowed = attemptsAllowed;

    await quiz.save();

    res.json(new ApiResponse(200, quiz, "Quiz updated successfully"));
});

export const deleteQuiz = asyncHandler(async (req, res) => {
    if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError("Invalid quiz ID", 400);
    }

    const quiz = await Quiz.findById(req.params.id);
    if(!quiz) {
        throw new ApiError("Quiz not found", 404);
    }

    await Course.findByIdAndUpdate(quiz.course, {
        $pull: { quizzes: quiz._id },
    });

    await quiz.deleteOne();

    res.json(new ApiResponse(200, null, "Quiz deleted successfully"));
});

// Get quizzes accessible to a student for a specific module
export const getAccessibleQuizzes = asyncHandler(async (req, res) => {
    const { courseId: rawCourseId, moduleId: rawModuleId } = req.params;
    const userId = req.user._id;

    // Resolve course and module identifiers (accept ObjectId or slug)
    let courseId = rawCourseId;
    if (!mongoose.Types.ObjectId.isValid(rawCourseId)) {
        const c = await Course.findOne({ slug: String(rawCourseId).toLowerCase() }).select('_id');
        if (!c) throw new ApiError("Invalid course ID", 400);
        courseId = c._id;
    }

    let moduleId = rawModuleId;
    if (!mongoose.Types.ObjectId.isValid(rawModuleId)) {
        const Module = (await import("../models/module.model.js")).default;
        const m = await Module.findOne({ slug: String(rawModuleId).toLowerCase(), course: courseId }).select('_id');
        if (!m) throw new ApiError("Invalid module ID", 400);
        moduleId = m._id;
    }

    // Check if user has access to assessments for this module (effective completion)
    const accessCheck = await checkModuleAccessForAssessments(userId, courseId, moduleId);
    
    if (!accessCheck.hasAccess) {
        // Return empty array with access information
        return res.json(new ApiResponse(200, {
            quizzes: [],
            accessInfo: {
                hasAccess: false,
                reason: accessCheck.reason
            }
        }, "Module quizzes locked - complete all lessons to unlock"));
    }

    // User has access, fetch quizzes based on onlyModule parameter
    const onlyModule = String(req.query.onlyModule || '').toLowerCase() === 'true';
    let filter;
    
    if (onlyModule) {
        // First try to find quizzes specifically assigned to this module
        filter = { course: courseId, module: moduleId };

        const moduleOnlyQuizzes = await Quiz.find(filter)
            .populate("course", "title")
            .populate("module", "title")
            .sort({ createdAt: -1 });

        // If module has specific content, return it
        if (moduleOnlyQuizzes.length > 0) {
            return res.json(new ApiResponse(200, {
                quizzes: moduleOnlyQuizzes,
                accessInfo: {
                    hasAccess: true,
                    reason: accessCheck.reason
                }
            }, "Accessible quizzes (module-specific) fetched successfully"));
        }

        // Fallback: if no module-specific content, return course-wide items
        filter = { 
            course: courseId,
            $or: [
                { module: null },
                { module: { $exists: false } }
            ]
        };

        const fallbackQuizzes = await Quiz.find(filter)
            .populate("course", "title")
            .populate("module", "title")
            .sort({ createdAt: -1 });
        return res.json(new ApiResponse(200, {
            quizzes: fallbackQuizzes,
            accessInfo: {
                hasAccess: true,
                reason: accessCheck.reason
            }
        }, "Accessible quizzes (course-wide fallback) fetched successfully"));
    } else {
        // Return both module-specific and course-wide quizzes
        filter = { 
            course: courseId, 
            $or: [ 
                { module: moduleId }, 
                { module: null }, 
                { module: { $exists: false } }
            ] 
        };

        const quizzes = await Quiz.find(filter)
            .populate("course", "title")
            .populate("module", "title")
            .sort({ createdAt: -1 });

        return res.json(new ApiResponse(200, {
            quizzes,
            accessInfo: {
                hasAccess: true,
                reason: accessCheck.reason
            }
        }, "Accessible quizzes fetched successfully"));
    }
});

// Get course-level quizzes accessible to a student
export const getCourseQuizzes = asyncHandler(async (req, res) => {
    const { courseId: rawCourseId } = req.params;
    const userId = req.user._id;

    let courseId = rawCourseId;
    if(!mongoose.Types.ObjectId.isValid(rawCourseId)) {
        const c = await Course.findOne({ slug: String(rawCourseId).toLowerCase() }).select('_id');
        if (!c) {
            throw new ApiError("Invalid course ID", 400);
        }
        courseId = c._id;
    }

    // Check if user has completed all modules in the course
    const Progress = (await import("../models/progress.model.js")).default;
    const Course = (await import("../models/course.model.js")).default;
    
    const course = await Course.findById(courseId).populate('modules');
    if(!course) {
        throw new ApiError("Course not found", 404);
    }

    const progress = await Progress.findOne({ 
        student: userId, 
        course: courseId 
    });

    if(!progress) {
        return res.json(new ApiResponse(200, {
            quizzes: [],
            accessInfo: {
                hasAccess: false,
                reason: "No progress found for this course"
            }
        }, "Course quizzes locked - complete all modules to unlock"));
    }

    // Check if all modules are completed
    const totalModules = course.modules?.length || 0;
    const completedModules = progress.completedModules?.length || 0;
    
    if(totalModules === 0) {
        return res.json(new ApiResponse(200, {
            quizzes: [],
            accessInfo: {
                hasAccess: false,
                reason: "No modules found in this course"
            }
        }, "Course quizzes locked - no modules found"));
    }

    if(completedModules < totalModules) {
        return res.json(new ApiResponse(200, {
            quizzes: [],
            accessInfo: {
                hasAccess: false,
                reason: `Complete all ${totalModules} modules to unlock course quizzes. Currently completed: ${completedModules}`
            }
        }, "Course quizzes locked - complete all modules to unlock"));
    }

    // User has access, fetch course-level quizzes
    const quizzes = await Quiz.find({ 
        course: courseId, 
        type: "COURSE",
        $or: [
            { module: null },
            { module: { $exists: false } }
        ]
    })
        .populate("course", "title")
        .populate("module", "title")
        .sort({ createdAt: -1 });

    return res.json(new ApiResponse(200, {
        quizzes,
        accessInfo: {
            hasAccess: true,
            reason: "All modules completed"
        }
    }, "Course quizzes fetched successfully"));
});

// Get quizzes by course scope (similar to resources)
export const getQuizzesByCourse = asyncHandler(async (req, res) => {
    const rawCourseId = req.params?.courseId ?? req.body?.courseId;

    if (!rawCourseId || rawCourseId === 'undefined' || rawCourseId === 'null') {
        return res.status(400).json(new ApiResponse(400, [], "Course identifier is required"));
    }

    let courseId = rawCourseId;
    if (!mongoose.Types.ObjectId.isValid(rawCourseId)) {
        const course = await Course.findOne({ slug: rawCourseId }).select('_id');
        if (!course) {
            return res.status(404).json(new ApiResponse(404, [], "Course not found"));
        }
        courseId = course._id;
    }

    try {
        // Return all quizzes attached to this course (legacy and new fields), regardless of scope/type
        const quizzes = await Quiz.find({ $or: [ { courseId }, { course: courseId } ] })
            .populate('createdBy', 'fullName email role')
            .populate('course', 'title slug')
            .populate('module', 'title slug')
            .sort({ createdAt: -1 });

        return res.json(
            new ApiResponse(200, quizzes, "Quizzes retrieved successfully")
        );
    } catch (err) {
        return res.status(500).json(new ApiResponse(500, [], "Error fetching quizzes"));
    }
});

// Get quizzes by module scope (similar to resources)
export const getQuizzesByModule = asyncHandler(async (req, res) => {
    const rawModuleId = req.params?.moduleId ?? req.body?.moduleId;

    if (!rawModuleId || rawModuleId === 'undefined' || rawModuleId === 'null') {
        return res.status(400).json(new ApiResponse(400, [], "Module ID is required"));
    }

    if (!mongoose.Types.ObjectId.isValid(rawModuleId)) {
        return res.status(400).json(new ApiResponse(400, [], "Invalid module ID format"));
    }

    try {
        const quizzes = await Quiz.find({ moduleId: rawModuleId, scope: 'module' })
            .populate('createdBy', 'name email')
            .populate('course', 'title')
            .populate('module', 'title')
            .sort({ createdAt: -1 });

        return res.json(
            new ApiResponse(200, quizzes, "Quizzes retrieved successfully")
        );
    } catch (err) {
        return res.status(500).json(new ApiResponse(500, [], "Error fetching quizzes"));
    }
});

// Get quizzes by lesson scope (similar to resources)
export const getQuizzesByLesson = asyncHandler(async (req, res) => {
    const rawLessonId = req.params?.lessonId ?? req.body?.lessonId;

    if (!rawLessonId || rawLessonId === 'undefined' || rawLessonId === 'null') {
        return res.status(400).json(new ApiResponse(400, [], "Lesson ID is required"));
    }

    if (!mongoose.Types.ObjectId.isValid(rawLessonId)) {
        return res.status(400).json(new ApiResponse(400, [], "Invalid lesson ID format"));
    }

    try {
        const quizzes = await Quiz.find({ lessonId: rawLessonId, scope: 'lesson' })
            .populate('createdBy', 'name email')
            .populate('course', 'title')
            .populate('module', 'title')
            .sort({ createdAt: -1 });

        return res.json(
            new ApiResponse(200, quizzes, "Quizzes retrieved successfully")
        );
    } catch (err) {
        return res.status(500).json(new ApiResponse(500, [], "Error fetching quizzes"));
    }
});
