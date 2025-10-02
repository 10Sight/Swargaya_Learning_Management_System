import mongoose from "mongoose";

import AttemptedQuiz from "../models/attemptedQuiz.model.js";
import Quiz from "../models/quiz.model.js";
import Progress from "../models/progress.model.js";
import Module from "../models/module.model.js";
import Course from "../models/course.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { checkModuleAccessForAssessments } from "../utils/moduleCompletion.js";

export const attemptQuiz = asyncHandler(async (req, res) => {
    const { quizId, answers } = req.body;
    const userId = req.user._id;

    if(!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError("Invalid quiz ID", 400);
    }

    const quiz = await Quiz.findById(quizId).populate('course').populate('module');
    if(!quiz) {
        throw new ApiError("Quiz not found", 400);
    }
    
    // Validate access permissions
    if(quiz.module && quiz.type === "MODULE") {
        // Module quiz - check module completion
        const accessCheck = await checkModuleAccessForAssessments(userId, quiz.course._id, quiz.module._id);
        if(!accessCheck.hasAccess) {
            throw new ApiError(accessCheck.reason || "Access denied. Complete all lessons in the module first.", 403);
        }
    } else if(quiz.type === "COURSE") {
        // Course quiz - check if all modules are completed
        const course = await Course.findById(quiz.course._id).populate('modules');
        if(!course) {
            throw new ApiError("Course not found", 404);
        }

        const progress = await Progress.findOne({ 
            student: userId, 
            course: quiz.course._id 
        });

        if(!progress) {
            throw new ApiError("No progress found. Complete all modules first.", 403);
        }

        const totalModules = course.modules?.length || 0;
        const completedModules = progress.completedModules?.length || 0;
        
        if(completedModules < totalModules) {
            throw new ApiError(`Complete all ${totalModules} modules to access this course quiz. Currently completed: ${completedModules}`, 403);
        }
    }

    if(!answers || answers.length === 0) {
        throw new ApiError("Answers are required", 400);
    }

    let score = 0;
    quiz.questions.forEach((q, index) => {
        if(answers[index] && answers[index] === q.correctOption) {
            score++;
        }
    });

    // Calculate if passed
    const scorePercent = quiz.questions.length > 0 ? Math.round((score / quiz.questions.length) * 100) : 0;
    const passed = scorePercent >= (quiz.passingScore || 70);

    const attempt = await AttemptedQuiz.create({
        quiz: quizId,
        student: userId,
        answer: answers.map((ans, idx) => ({
            questionId: quiz.questions[idx]._id,
            selectedOptions: [ans || ""],
            isCorrect: answers[idx] === quiz.questions[idx].correctOption,
            marksObtained: answers[idx] === quiz.questions[idx].correctOption ? 1 : 0
        })),
        score,
        status: passed ? "PASSED" : "FAILED",
        completedAt: new Date(),
        attemptNumber: 1,
        timeTaken: 0
    });

    res.status(201)
        .json(new ApiResponse(201, attempt, "Quiz attempted successfully"));
});

export const getMyAttempts = asyncHandler(async (req, res) => {
    const attempts = await AttemptedQuiz.find({ student: req.user._id })
        .populate("quiz", "title course")
        .sort({ createdAt: -1 });

    res.json(new ApiResponse(200, attempts, "My attempts fetched successfully"));
});

export const getAttemptsQuiz = asyncHandler(async (req, res) => {
    const { quizId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError("Invalid quiz ID", 400);
    }

    const attempts = await AttemptedQuiz.find({ quiz: quizId })
        .populate("student", "fullName email")
        .sort({ createdAt: -1 });

    res.json(new ApiResponse(200, attempts, "Attempts for quiz fetched successfully"));
});

export const getAttemptById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if(!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError("Invalid attempt ID", 400);
    }

    const attempt = await AttemptedQuiz.findById(id)
        .populate("quiz", "title questions")
        .populate("student", "fullName email")

    if(!attempt) {
        throw new ApiError("Attempt not found", 404);
    }

    res.json(new ApiResponse(200, attempt, "Attempt fetched successfully"));
});

export const deleteAttempt = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if(!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError("Invalid attempt ID", 400);
    }

    const attempt = await AttemptedQuiz.findById(id);
    if(!attempt) {
        throw new ApiError("Attempt now found", 404);
    }

    await attempt.deleteOne();

    res.json(new ApiResponse(200, null, "Attempt deleted successfully"));
});

// New endpoint to get specific student attempts for admin
export const getStudentAttempts = asyncHandler(async (req, res) => {
    const { studentId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ApiError("Invalid student ID", 400);
    }

    const attempts = await AttemptedQuiz.find({ student: studentId })
        .populate({
            path: "quiz",
            select: "title questions passingScore",
            populate: {
                path: "course",
                select: "title"
            }
        })
        .sort({ createdAt: -1 });

    // Transform attempts to include additional computed fields
    const transformedAttempts = attempts.map(attempt => {
        const totalQuestions = attempt.quiz?.questions?.length || 0;
        const scorePercent = totalQuestions > 0 ? Math.round((attempt.score / totalQuestions) * 100) : 0;
        const passingScore = attempt.quiz?.passingScore || 70;
        const passed = scorePercent >= passingScore;

        return {
            ...attempt.toObject(),
            scorePercent,
            passed,
            totalQuestions,
            attemptedAt: attempt.createdAt
        };
    });

    res.json(new ApiResponse(200, transformedAttempts, "Student attempts fetched successfully"));
});

// New endpoint to start a quiz (check access and attempts)
export const startQuiz = asyncHandler(async (req, res) => {
    const { quizId } = req.params;
    const userId = req.user._id;

    if(!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError("Invalid quiz ID", 400);
    }

    const quiz = await Quiz.findById(quizId)
        .populate("course", "title")
        .populate("module", "title");
        
    if(!quiz) {
        throw new ApiError("Quiz not found", 404);
    }

    // Check if user has access to this quiz based on type
    if(quiz.module && quiz.type === "MODULE") {
        // Module quiz - check module completion
        const accessCheck = await checkModuleAccessForAssessments(userId, quiz.course._id, quiz.module._id);
        if(!accessCheck.hasAccess) {
            throw new ApiError(accessCheck.reason || "Access denied to this quiz. Complete all lessons in the module first.", 403);
        }
    } else if(quiz.type === "COURSE") {
        // Course quiz - check if all modules are completed
        const Progress = (await import("../models/progress.model.js")).default;
        const Course = (await import("../models/course.model.js")).default;
        
        const course = await Course.findById(quiz.course._id).populate('modules');
        if(!course) {
            throw new ApiError("Course not found", 404);
        }

        const progress = await Progress.findOne({ 
            student: userId, 
            course: quiz.course._id 
        });

        if(!progress) {
            throw new ApiError("No progress found. Complete all modules first.", 403);
        }

        const totalModules = course.modules?.length || 0;
        const completedModules = progress.completedModules?.length || 0;
        
        if(completedModules < totalModules) {
            throw new ApiError(`Complete all ${totalModules} modules to access this course quiz. Currently completed: ${completedModules}`, 403);
        }
    }

    // Count previous attempts for this quiz
    const previousAttempts = await AttemptedQuiz.countDocuments({
        quiz: quizId,
        student: userId
    });

    // Check if user has attempts remaining
    const attemptsAllowed = quiz.attemptsAllowed || 1;
    const attemptsRemaining = attemptsAllowed - previousAttempts;
    
    if(attemptsRemaining <= 0) {
        return res.json(new ApiResponse(200, {
            canAttempt: false,
            reason: "No attempts remaining",
            attemptsUsed: previousAttempts,
            attemptsAllowed,
            quiz: {
                _id: quiz._id,
                title: quiz.title,
                course: quiz.course,
                module: quiz.module
            }
        }, "No attempts remaining for this quiz"));
    }

    // Return quiz data for taking (without correct answers)
    const quizForTaking = {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        course: quiz.course,
        module: quiz.module,
        timeLimit: quiz.timeLimit,
        passingScore: quiz.passingScore,
        attemptsAllowed: quiz.attemptsAllowed,
        attemptsUsed: previousAttempts,
        attemptsRemaining,
        questions: quiz.questions.map((q, index) => ({
            questionNumber: index + 1,
            questionText: q.questionText,
            options: q.options.map(opt => ({ text: opt.text })), // Remove isCorrect
            marks: q.marks
        }))
    };

    res.json(new ApiResponse(200, {
        canAttempt: true,
        quiz: quizForTaking
    }, "Quiz ready to start"));
});

// New endpoint to submit quiz and handle results
export const submitQuiz = asyncHandler(async (req, res) => {
    const { quizId, answers, timeTaken } = req.body;
    const userId = req.user._id;


    // Validate input payload
    if(!quizId) {
        throw new ApiError("Quiz ID is required", 400);
    }

    if(!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError("Invalid quiz ID format", 400);
    }

    if(!answers || !Array.isArray(answers)) {
        throw new ApiError("Answers must be provided as an array", 400);
    }

    // Validate timeTaken if provided
    if(timeTaken !== undefined && (typeof timeTaken !== 'number' || timeTaken < 0)) {
        throw new ApiError("Time taken must be a non-negative number", 400);
    }

    const quiz = await Quiz.findById(quizId)
        .populate("course")
        .populate("module");
        
    if(!quiz) {
        throw new ApiError("Quiz not found", 404);
    }

    // Validate quiz has questions
    if(!quiz.questions || quiz.questions.length === 0) {
        throw new ApiError("Quiz has no questions", 400);
    }


    // Validate answers array length matches quiz questions
    if(answers.length !== quiz.questions.length) {
        throw new ApiError(`Expected ${quiz.questions.length} answers, but received ${answers.length}`, 400);
    }

    // Validate each answer object structure
    for(let i = 0; i < answers.length; i++) {
        const answer = answers[i];
        if(answer && typeof answer === 'object' && answer.text !== undefined) {
            // Valid answer format: { text: "option text" } or null/undefined for unanswered
            continue;
        } else if(answer === null || answer === undefined) {
            // Allow null/undefined for unanswered questions
            continue;
        } else {
            throw new ApiError(`Invalid answer format at index ${i}. Expected object with 'text' property or null`, 400);
        }
    }

    // Check attempts remaining
    const previousAttempts = await AttemptedQuiz.countDocuments({
        quiz: quizId,
        student: userId
    });
    
    const attemptsAllowed = quiz.attemptsAllowed || 1;
    if(previousAttempts >= attemptsAllowed) {
        throw new ApiError("No attempts remaining for this quiz", 400);
    }

    // Calculate score with robust error handling
    let score = 0;
    let totalMarks = 0;
    const detailedAnswers = [];
    
    try {
        quiz.questions.forEach((question, index) => {
            // Validate question structure
            if(!question) {
                throw new Error(`Question at index ${index} is null or undefined`);
            }
            
            if(!question._id) {
                throw new Error(`Question at index ${index} missing _id property`);
            }
            
            if(!question.options || !Array.isArray(question.options)) {
                throw new Error(`Question at index ${index} has invalid or missing options`);
            }
            
            if(typeof question.marks !== 'number' || question.marks <= 0) {
                throw new Error(`Question at index ${index} has invalid marks value`);
            }
            
            const userAnswer = answers[index];
            const correctOption = question.options.find(opt => opt && opt.isCorrect === true);
            
            // Handle case where no correct option is marked (data integrity issue)
            if(!correctOption) {
                console.warn(`Question at index ${index} has no correct option marked`);
            }
            
            const isCorrect = userAnswer && correctOption && 
                              typeof userAnswer.text === 'string' && 
                              userAnswer.text === correctOption.text;
            
            totalMarks += question.marks;
            if(isCorrect) {
                score += question.marks;
            }
            
            detailedAnswers.push({
                questionNumber: index + 1,
                questionText: question.questionText || `Question ${index + 1}`,
                userAnswer: userAnswer && userAnswer.text ? userAnswer.text : null,
                correctAnswer: correctOption ? correctOption.text : null,
                isCorrect,
                marksObtained: isCorrect ? question.marks : 0,
                totalMarks: question.marks
            });
        });
    } catch(validationError) {
        console.error('Quiz validation error:', validationError.message);
        throw new ApiError(`Quiz data validation failed: ${validationError.message}`, 400);
    }

    // Calculate percentage
    const scorePercent = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const passed = scorePercent >= (quiz.passingScore || 70);
    
    // Create attempt record with safe data mapping
    let attempt;
    try {
        const attemptData = {
            quiz: quizId,
            student: userId,
            answer: answers.map((ans, idx) => {
                const question = quiz.questions[idx];
                const detailedAnswer = detailedAnswers[idx];
                
                // This should not happen due to earlier validation, but double-check
                if (!question || !question._id) {
                    throw new Error(`Question at index ${idx} is invalid`);
                }
                
                if (!detailedAnswer) {
                    throw new Error(`Detailed answer at index ${idx} is missing`);
                }
                
                return {
                    questionId: question._id,
                    selectedOptions: [ans && ans.text ? String(ans.text) : ""],
                    isCorrect: detailedAnswer.isCorrect || false,
                    marksObtained: detailedAnswer.marksObtained || 0
                };
            }),
            score: score || 0,
            status: passed ? "PASSED" : "FAILED",
            completedAt: new Date(),
            attemptNumber: previousAttempts + 1,
            timeTaken: timeTaken || 0
        };
        
        attempt = await AttemptedQuiz.create(attemptData);
    } catch(createError) {
        console.error('Error creating quiz attempt:', createError);
        throw new ApiError(`Failed to save quiz attempt: ${createError.message}`, 500);
    }

    // If quiz passed and it's linked to a module, check if we should unlock next module
    let nextModuleUnlocked = false;
    let levelUpgraded = false;
    let newLevel = null;
    
    if(passed && quiz.module && quiz.course) {
        try {
            // Get user's progress
            const progress = await Progress.findOne({
                student: userId,
                course: quiz.course._id
            });
            
            if(progress) {
                // Get course modules to find the next module
                const course = await Course.findById(quiz.course._id)
                    .populate({
                        path: 'modules',
                        options: { sort: { order: 1 } }
                    });
                
                if(course && course.modules) {
                    const currentModuleIndex = course.modules.findIndex(
                        m => String(m._id) === String(quiz.module._id)
                    );
                    
                    // Check if there's a next module to unlock
                    if(currentModuleIndex >= 0 && currentModuleIndex < course.modules.length - 1) {
                        const nextModule = course.modules[currentModuleIndex + 1];
                        const nextModuleId = String(nextModule._id);
                        
                        // Check if next module is not already completed
                        const isNextModuleCompleted = progress.completedModules.some(
                            mod => String(mod.moduleId || mod) === nextModuleId
                        );
                        
                        if(!isNextModuleCompleted) {
                            // Mark the current module as completed if not already
                            const currentModuleId = String(quiz.module._id);
                            const isCurrentModuleCompleted = progress.completedModules.some(
                                mod => String(mod.moduleId || mod) === currentModuleId
                            );
                            
                            if(!isCurrentModuleCompleted) {
                                progress.completedModules.push({
                                    moduleId: quiz.module._id,
                                    completedAt: new Date()
                                });
                                
                                // Update level based on completed modules
                                const completedCount = progress.completedModules.length;
                                let updatedLevel = "L1";
                                
                                if (completedCount >= 6) updatedLevel = "L3";
                                else if (completedCount >= 3) updatedLevel = "L2";
                                
                                if (updatedLevel !== progress.currentLevel) {
                                    levelUpgraded = true;
                                    newLevel = updatedLevel;
                                    progress.currentLevel = updatedLevel;
                                }
                                
                                await progress.save();
                            }
                            
                            nextModuleUnlocked = true;
                        }
                    }
                }
            }
        } catch(progressError) {
            console.error("Error updating progress:", progressError);
        }
    }
    
    // Calculate remaining attempts
    const attemptsUsed = previousAttempts + 1;
    const attemptsRemaining = attemptsAllowed - attemptsUsed;
    
    // Prepare result data
    const result = {
        attemptId: attempt._id,
        quiz: {
            _id: quiz._id,
            title: quiz.title,
            module: quiz.module,
            course: quiz.course,
            passingScore: quiz.passingScore
        },
        score,
        totalMarks,
        scorePercent,
        passed,
        attemptsUsed,
        attemptsAllowed,
        attemptsRemaining,
        canRetry: attemptsRemaining > 0,
        timeTaken: timeTaken || 0,
        detailedAnswers,
        nextModuleUnlocked,
        levelUpgraded,
        newLevel
    };
    
    let message = passed 
        ? "Quiz completed successfully! You passed." 
        : "Quiz completed. You did not pass.";
        
    if(nextModuleUnlocked) {
        message += " Next module unlocked!";
    }
    if(levelUpgraded) {
        message += ` Congratulations! Level upgraded to ${newLevel}!`;
    }

    res.json(new ApiResponse(200, result, message));
});

// Get quiz attempts status for a specific quiz
export const getQuizAttemptStatus = asyncHandler(async (req, res) => {
    const { quizId } = req.params;
    const userId = req.user._id;

    if(!mongoose.Types.ObjectId.isValid(quizId)) {
        throw new ApiError("Invalid quiz ID", 400);
    }

    const quiz = await Quiz.findById(quizId, "title attemptsAllowed passingScore");
    if(!quiz) {
        throw new ApiError("Quiz not found", 404);
    }

    const attempts = await AttemptedQuiz.find({
        quiz: quizId,
        student: userId
    }).sort({ createdAt: -1 });

    const attemptsAllowed = quiz.attemptsAllowed || 1;
    const attemptsUsed = attempts.length;
    const attemptsRemaining = attemptsAllowed - attemptsUsed;
    
    // Check if user has passed in any attempt
    const bestAttempt = attempts.length > 0 ? attempts.reduce((best, current) => {
        return current.score > best.score ? current : best;
    }, attempts[0]) : null;
    
    const hasPassed = bestAttempt && bestAttempt.score >= (quiz.passingScore || 70);

    res.json(new ApiResponse(200, {
        quiz: {
            _id: quiz._id,
            title: quiz.title,
            attemptsAllowed,
            passingScore: quiz.passingScore
        },
        attemptsUsed,
        attemptsAllowed,
        attemptsRemaining,
        canAttempt: attemptsRemaining > 0,
        hasPassed,
        bestScore: bestAttempt ? bestAttempt.score : null,
        attempts: attempts.map(att => ({
            _id: att._id,
            score: att.score,
            createdAt: att.createdAt,
            timeTaken: att.timeTaken
        }))
    }, "Quiz attempt status fetched successfully"));
});
