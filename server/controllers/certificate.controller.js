import mongoose from "mongoose";

import Certificate from "../models/certificate.model.js";
import CertificateTemplate from "../models/certificateTemplate.model.js";
import Course from "../models/course.model.js";
import User from "../models/auth.model.js";
import Submission from "../models/submission.model.js";
import Assignment from "../models/assignment.model.js";
import AttemptedQuiz from "../models/attemptedQuiz.model.js";
import Progress from "../models/progress.model.js";
import Department from "../models/department.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const issueCertificate = asyncHandler(async (req, res) => {
    const { courseId, studentId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ApiError("Invalid course or student ID", 400);
    }

    const course = await Course.findById(courseId);
    if (!course) throw new ApiError("Course not found", 404);

    const student = await User.findById(studentId);
    if (!student) throw new ApiError("Student not found", 404);

    const existing = await Certificate.findOne({ student: studentId, course: courseId });
    if (existing) {
        throw new ApiError("Certificate already issued for this student & course", 400);
    }

    const certificate = await Certificate.create({
        student: studentId,
        course: courseId,
        issuedBy: req.user._id,
    });

    res.status(201)
        .json(new ApiResponse(201, certificate, "Certificate issued successfully"));
});

// Issue certificate with template
export const issueCertificateWithTemplate = asyncHandler(async (req, res) => {
    const { studentId, courseId, templateId, grade = 'PASS' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Invalid student or course ID", 400);
    }

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({ student: studentId, course: courseId });
    if (existingCertificate) {
        throw new ApiError("Certificate already exists for this student and course", 400);
    }

    const student = await User.findById(studentId).populate('department');
    if (!student) throw new ApiError("Student not found", 404);

    const course = await Course.findById(courseId);
    if (!course) throw new ApiError("Course not found", 404);

    // Get certificate template
    let template;
    if (templateId && mongoose.Types.ObjectId.isValid(templateId)) {
        template = await CertificateTemplate.findById(templateId);
        if (!template) {
            throw new ApiError("Certificate template not found", 404);
        }
    } else {
        template = await CertificateTemplate.findOne({ isDefault: true, isActive: true });
        if (!template) {
            template = await CertificateTemplate.findOne({ isActive: true }).sort({ createdAt: 1 });
        }
        if (!template) {
            throw new ApiError("No certificate template available", 404);
        }
    }

    // Get department and progress information
    const department = await Department.findById(student.department?._id)
        .populate('instructor', 'fullName');

    const progress = await Progress.findOne({ student: studentId, course: courseId });

    // Generate certificate data
    const certificateData = {
        studentName: student.fullName,
        courseName: course.title,
        departmentName: department?.name || 'N/A',
        instructorName: department?.instructor?.fullName || 'N/A',
        level: progress?.currentLevel || 'Beginner',
        issueDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        grade: grade
    };

    // Replace placeholders in template
    let certificateHTML = template.template;
    Object.keys(certificateData).forEach(key => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        certificateHTML = certificateHTML.replace(placeholder, certificateData[key]);
    });

    // Create certificate record
    const certificate = await Certificate.create({
        student: studentId,
        course: courseId,
        issuedBy: req.user._id,
        grade: grade,
        metadata: {
            ...certificateData,
            templateId: template._id.toString(),
            templateName: template.name,
            generatedHTML: certificateHTML,
            styles: template.styles
        }
    });

    const populatedCertificate = await Certificate.findById(certificate._id)
        .populate('student', 'fullName email')
        .populate('course', 'title description')
        .populate('issuedBy', 'fullName email');

    res.status(201).json(new ApiResponse(201, {
        certificate: populatedCertificate,
        template: {
            _id: template._id,
            name: template.name,
            html: certificateHTML,
            styles: template.styles
        }
    }, "Certificate issued successfully with template"));
});

// Generate certificate preview
export const generateCertificatePreview = asyncHandler(async (req, res) => {
    const { studentId, courseId, templateId } = req.body;

    if (!studentId || !courseId) {
        throw new ApiError("Student ID and Course ID are required", 400);
    }

    // For preview, we can use sample data if student/course not found
    let student, course, department, progress;

    try {
        if (mongoose.Types.ObjectId.isValid(studentId)) {
            student = await User.findById(studentId).populate('department');
        }
        if (mongoose.Types.ObjectId.isValid(courseId)) {
            course = await Course.findById(courseId);
        }
        if (student?.department) {
            department = await Department.findById(student.department._id).populate('instructor', 'fullName');
        }
        if (student && course) {
            progress = await Progress.findOne({ student: studentId, course: courseId });
        }
    } catch (error) {
        // Continue with sample data if queries fail
    }

    // Get certificate template
    let template;
    if (templateId && mongoose.Types.ObjectId.isValid(templateId)) {
        template = await CertificateTemplate.findById(templateId);
    } else {
        template = await CertificateTemplate.findOne({ isDefault: true, isActive: true });
        if (!template) {
            template = await CertificateTemplate.findOne({ isActive: true }).sort({ createdAt: 1 });
        }
    }

    if (!template) {
        throw new ApiError("No certificate template available", 404);
    }

    // Generate preview data (use real data or sample data)
    const previewData = {
        studentName: student?.fullName || 'John Doe',
        courseName: course?.title || 'Sample Course',
        departmentName: department?.name || 'Sample Department',
        instructorName: department?.instructor?.fullName || 'Jane Smith',
        level: progress?.currentLevel || 'Intermediate',
        issueDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        grade: 'A+'
    };

    // Replace placeholders in template
    let previewHTML = template.template;
    Object.keys(previewData).forEach(key => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        previewHTML = previewHTML.replace(placeholder, previewData[key]);
    });

    res.json(new ApiResponse(200, {
        html: previewHTML,
        styles: template.styles,
        data: previewData,
        template: {
            _id: template._id,
            name: template.name,
            description: template.description
        }
    }, "Certificate preview generated successfully"));
});

export const getCertificateById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError("Invalid certificate ID", 400);
    }

    const certificate = await Certificate.findById(id)
        .populate("student", "fullName email")
        .populate("course", "title")
        .populate("issuedBy", "fullName email");

    if (!certificate) throw new ApiError("Certificate not found", 404);

    res.json(new ApiResponse(200, certificate, "Certificate fetched successfully"));
});

export const getStudentCertificates = asyncHandler(async (req, res) => {
    const studentId = req.user._id;

    const certificates = await Certificate.find({ student: studentId })
        .populate("student", "fullName email")
        .populate("course", "title description")
        .populate("issuedBy", "fullName email")
        .sort({ issueDate: -1 });

    res.json(new ApiResponse(200, certificates, "Certificates fetched successfully"));
});

export const getCourseCertificates = asyncHandler(async (req, res) => {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Invalid course ID", 400);
    }

    const certificates = await Certificate.find({ course: courseId })
        .populate("student", "fullName email")
        .populate("issuedBy", "fullName email")
        .sort({ issueDate: -1 });

    res.json(new ApiResponse(200, certificates, "Course certificates fetched successfully"));
});

export const revokeCertificate = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError("Invalid certificate ID", 400);
    }

    const certificate = await Certificate.findById(id);
    if (!certificate) throw new ApiError("Certificate not found", 404);

    await certificate.deleteOne();

    res.json(new ApiResponse(200, null, "Certificate revoked successfully"));
});

// Check student eligibility for certificate (Instructor only)
export const checkCertificateEligibility = asyncHandler(async (req, res) => {
    const { studentId, courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Invalid student or course ID", 400);
    }

    // Get student and course details
    const student = await User.findById(studentId).populate('department');
    if (!student) throw new ApiError("Student not found", 404);

    const course = await Course.findById(courseId).populate('modules');
    if (!course) throw new ApiError("Course not found", 404);

    // Check if student is enrolled in instructor's department for this course
    if (!student.department) {
        throw new ApiError("Student not assigned to any department", 400);
    }

    const department = await Department.findById(student.department._id);
    if (department.course.toString() !== courseId || department.instructor.toString() !== req.user._id.toString()) {
        throw new ApiError("You are not authorized to issue certificates for this student", 403);
    }

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({ student: studentId, course: courseId });
    if (existingCertificate) {
        return res.json(new ApiResponse(200, {
            eligible: false,
            reason: "Certificate already issued",
            certificate: existingCertificate
        }, "Certificate eligibility checked"));
    }

    // Check progress completion
    const progress = await Progress.findOne({ student: studentId, course: courseId });
    if (!progress) {
        return res.json(new ApiResponse(200, {
            eligible: false,
            reason: "No progress found for this course",
            requirements: {
                courseCompletion: false,
                quizPassed: false,
                assignmentsGraded: false
            }
        }, "Certificate eligibility checked"));
    }

    // Check course completion (all modules completed)
    const totalModules = course.modules?.length || 0;
    const completedModules = progress.completedModules?.length || 0;
    const courseCompleted = totalModules > 0 && completedModules >= totalModules;

    // Check quiz attempts and pass status
    const quizAttempts = await AttemptedQuiz.find({ student: studentId })
        .populate({
            path: 'quiz',
            match: { course: courseId },
            select: 'title questions passingScore'
        });

    const courseQuizAttempts = quizAttempts.filter(attempt => attempt.quiz);
    const passedQuizzes = courseQuizAttempts.filter(attempt => {
        const totalQuestions = attempt.quiz.questions?.length || 0;
        const scorePercent = totalQuestions > 0 ? (attempt.score / totalQuestions) * 100 : 0;
        const passingScore = attempt.quiz.passingScore || 70;
        return scorePercent >= passingScore;
    });

    // Check if course has any quizzes - if no quizzes exist, consider it passed
    const Quiz = (await import('../models/quiz.model.js')).default;
    const totalQuizzesInCourse = await Quiz.countDocuments({ course: courseId });
    const hasQuizzes = totalQuizzesInCourse > 0;
    const quizPassed = !hasQuizzes || (courseQuizAttempts.length > 0 && passedQuizzes.length > 0);

    // Check assignment submissions and grading
    const assignments = await Assignment.find({ course: courseId });
    const submissions = await Submission.find({
        student: studentId,
        assignment: { $in: assignments.map(a => a._id) }
    }).populate('assignment', 'title maxScore');

    const gradedSubmissions = submissions.filter(sub => sub.grade !== null && sub.grade !== undefined);
    // If course has no assignments, consider it passed. 
    // If has assignments, all assignments must have submissions and all submissions must be graded.
    const assignmentsGraded = assignments.length === 0 ||
        (assignments.length === submissions.length && gradedSubmissions.length === submissions.length);

    const eligible = courseCompleted && quizPassed && assignmentsGraded;

    res.json(new ApiResponse(200, {
        eligible,
        reason: eligible ? "Student is eligible for certificate" : "Student does not meet all requirements",
        requirements: {
            courseCompletion: courseCompleted,
            quizPassed,
            assignmentsGraded
        },
        details: {
            progress: {
                completedModules,
                totalModules,
                progressPercent: progress.progressPercent,
                currentLevel: progress.currentLevel
            },
            quizzes: {
                totalAttempts: courseQuizAttempts.length,
                passedQuizzes: passedQuizzes.length
            },
            assignments: {
                totalSubmissions: submissions.length,
                gradedSubmissions: gradedSubmissions.length,
                submissions: submissions.map(sub => ({
                    assignment: sub.assignment.title,
                    grade: sub.grade,
                    maxScore: sub.assignment.maxScore,
                    isGraded: sub.grade !== null && sub.grade !== undefined
                }))
            }
        }
    }, "Certificate eligibility checked"));
});
