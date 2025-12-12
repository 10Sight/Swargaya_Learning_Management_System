import mongoose from "mongoose";
import User from "../models/auth.model.js";
import Course from "../models/course.model.js";
import Department from "../models/department.model.js";
import Enrollment from "../models/enrollment.model.js";
import Certificate from "../models/certificate.model.js";
import CertificateTemplate from "../models/certificateTemplate.model.js";
import Audit from "../models/audit.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import sendEmail from "../utils/mail.util.js";

// === BULK USER ENROLLMENT ===

// Bulk enroll users in courses/departments
export const bulkEnrollUsers = asyncHandler(async (req, res) => {
    try {
        const { userIds, courseIds = [], departmentId, enrollmentType = 'course', notify = true } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            throw new ApiError("User IDs are required", 400);
        }

        if (!courseIds.length && !departmentId) {
            throw new ApiError("Either course IDs or department ID is required", 400);
        }

        // Validate users exist
        const users = await User.find({ _id: { $in: userIds } });
        if (users.length !== userIds.length) {
            throw new ApiError("Some users not found", 404);
        }

        let department = null;
        let courses = [];

        // Validate department if provided
        if (departmentId) {
            department = await Department.findById(departmentId).populate('course'); // Department has single course
            if (!department) {
                throw new ApiError("Department not found", 404);
            }
            if (department.course) {
                courses = [department.course];
            }
        }

        // Validate courses if provided directly
        if (courseIds.length > 0 && !departmentId) {
            courses = await Course.find({ _id: { $in: courseIds } });
            if (courses.length !== courseIds.length) {
                throw new ApiError("Some courses not found", 404);
            }
        }

        const session = await mongoose.startSession();
        const results = {
            successful: [],
            failed: [],
            skipped: []
        };

        try {
            await session.withTransaction(async () => {
                for (const userId of userIds) {
                    for (const course of courses) {
                        try {
                            // Check if already enrolled
                            const existingEnrollment = await Enrollment.findOne({
                                userId,
                                courseId: course._id,
                                ...(departmentId && { departmentId })
                            });

                            if (existingEnrollment) {
                                results.skipped.push({
                                    userId,
                                    courseId: course._id,
                                    reason: 'Already enrolled'
                                });
                                continue;
                            }

                            // Create enrollment
                            const enrollment = new Enrollment({
                                userId,
                                courseId: course._id,
                                departmentId: departmentId || null,
                                enrolledBy: req.user._id,
                                enrollmentDate: new Date(),
                                status: 'active'
                            });

                            await enrollment.save({ session });

                            // Add user to department if specified
                            if (department) {
                                await Department.findByIdAndUpdate(
                                    departmentId,
                                    { $addToSet: { students: userId } },
                                    { session }
                                );
                            }

                            results.successful.push({
                                userId,
                                courseId: course._id,
                                enrollmentId: enrollment._id
                            });

                        } catch (error) {
                            results.failed.push({
                                userId,
                                courseId: course._id,
                                error: error.message
                            });
                        }
                    }
                }
            });

            // Send notifications if requested
            if (notify && results.successful.length > 0) {
                try {
                    const enrolledUsers = await User.find({
                        _id: { $in: results.successful.map(r => r.userId) }
                    });

                    for (const user of enrolledUsers) {
                        const userCourses = courses.filter(course =>
                            results.successful.some(r => r.userId.toString() === user._id.toString() && r.courseId.toString() === course._id.toString())
                        );

                        if (userCourses.length > 0) {
                            await sendEmail({
                                to: user.email,
                                subject: `Enrollment Confirmation - ${userCourses.length > 1 ? 'Multiple Courses' : userCourses[0].title}`,
                                template: 'bulk-enrollment',
                                data: {
                                    userName: user.fullName,
                                    courses: userCourses,
                                    departmentName: department?.name || null,
                                    loginUrl: process.env.FRONTEND_URL
                                }
                            });
                        }
                    }
                } catch (emailError) {
                    // Failed to send enrollment notifications
                }
            }

            // Log bulk operation
            const auditLogger = (await import("../utils/auditLogger.js")).default;
            await auditLogger({
                action: 'BULK_ENROLL_USERS',
                userId: req.user._id,
                details: {
                    userCount: userIds.length,
                    courseCount: courses.length,
                    departmentId,
                    results: {
                        successful: results.successful.length,
                        failed: results.failed.length,
                        skipped: results.skipped.length
                    }
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.json(new ApiResponse(200, {
                results,
                summary: {
                    total: userIds.length * courses.length,
                    successful: results.successful.length,
                    failed: results.failed.length,
                    skipped: results.skipped.length
                }
            }, 'Bulk enrollment completed'));

        } catch (error) {
            throw new ApiError(`Bulk enrollment failed: ${error.message}`, 500);
        } finally {
            await session.endSession();
        }

    } catch (error) {
        throw new ApiError(error.message || 'Failed to perform bulk enrollment', error.statusCode || 500);
    }
});

// === BULK EMAIL OPERATIONS ===

// Send bulk emails
export const bulkSendEmails = asyncHandler(async (req, res) => {
    try {
        const {
            recipients = [],
            recipientType = 'users', // 'users', 'roles', 'departments'
            userIds = [],
            roles = [],
            departmentIds = [],
            subject,
            content,
            template = null,
            templateData = {},
            scheduledFor = null
        } = req.body;

        if (!subject || !content) {
            throw new ApiError("Subject and content are required", 400);
        }

        let emailRecipients = [];

        // Build recipient list based on type
        if (recipientType === 'users' && userIds.length > 0) {
            const users = await User.find({
                _id: { $in: userIds },
                isEmailVerified: true
            }).select('email fullName');
            emailRecipients = users.map(user => ({
                email: user.email,
                name: user.fullName,
                userId: user._id
            }));
        } else if (recipientType === 'roles' && roles.length > 0) {
            const users = await User.find({
                role: { $in: roles },
                isEmailVerified: true
            }).select('email fullName role');
            emailRecipients = users.map(user => ({
                email: user.email,
                name: user.fullName,
                userId: user._id,
                role: user.role
            }));
        } else if (recipientType === 'departments' && departmentIds.length > 0) {
            const departments = await Department.find({ _id: { $in: departmentIds } }).populate({
                path: 'students',
                select: 'email fullName'
            });

            for (const department of departments) {
                for (const student of department.students) {
                    emailRecipients.push({
                        email: student.email,
                        name: student.fullName,
                        userId: student._id,
                        departmentId: department._id,
                        departmentName: department.name
                    });
                }
            }
        } else if (recipients.length > 0) {
            // Direct email addresses
            emailRecipients = recipients.map(email => ({ email, name: email }));
        }

        if (emailRecipients.length === 0) {
            throw new ApiError("No valid recipients found", 400);
        }

        // Remove duplicates
        emailRecipients = emailRecipients.filter((recipient, index, self) =>
            index === self.findIndex(r => r.email === recipient.email)
        );

        const results = {
            successful: [],
            failed: [],
            total: emailRecipients.length
        };

        // Send emails
        for (const recipient of emailRecipients) {
            try {
                const emailData = {
                    ...templateData,
                    recipientName: recipient.name,
                    recipientEmail: recipient.email
                };

                await sendEmail({
                    to: recipient.email,
                    subject,
                    ...(template ? { template, data: emailData } : { html: content, text: content.replace(/<[^>]*>/g, '') })
                });

                results.successful.push({
                    email: recipient.email,
                    name: recipient.name,
                    sentAt: new Date()
                });

            } catch (error) {
                results.failed.push({
                    email: recipient.email,
                    name: recipient.name,
                    error: error.message
                });
            }

            // Add small delay to prevent overwhelming the email service
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Log bulk email operation
        const auditLogger = (await import("../utils/auditLogger.js")).default;
        await auditLogger({
            action: 'BULK_SEND_EMAILS',
            userId: req.user._id,
            details: {
                recipientType,
                totalRecipients: results.total,
                subject,
                template,
                results: {
                    successful: results.successful.length,
                    failed: results.failed.length
                }
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json(new ApiResponse(200, {
            results,
            summary: {
                total: results.total,
                successful: results.successful.length,
                failed: results.failed.length,
                successRate: Math.round((results.successful.length / results.total) * 100)
            }
        }, 'Bulk email operation completed'));

    } catch (error) {
        throw new ApiError(error.message || 'Failed to send bulk emails', error.statusCode || 500);
    }
});

// === BULK CERTIFICATE GENERATION ===

// Generate certificates in bulk
export const bulkGenerateCertificates = asyncHandler(async (req, res) => {
    try {
        const {
            userIds = [],
            courseId,
            templateId,
            departmentId = null,
            criteria = 'completion', // 'completion', 'enrollment', 'custom'
            customCriteria = {}
        } = req.body;

        if (!courseId || !templateId) {
            throw new ApiError("Course ID and template ID are required", 400);
        }

        // Validate course and template
        const [course, template] = await Promise.all([
            Course.findById(courseId),
            CertificateTemplate.findById(templateId)
        ]);

        if (!course) throw new ApiError("Course not found", 404);
        if (!template) throw new ApiError("Certificate template not found", 404);

        let eligibleUsers = [];

        if (userIds.length > 0) {
            // Use provided user IDs
            eligibleUsers = await User.find({ _id: { $in: userIds } });
        } else {
            // Find eligible users based on criteria
            let query = {};

            if (criteria === 'completion') {
                // Users who completed the course
                const completedEnrollments = await Enrollment.find({
                    courseId,
                    status: 'completed',
                    ...(departmentId && { departmentId })
                }).populate('userId');
                eligibleUsers = completedEnrollments.map(e => e.userId);
            } else if (criteria === 'enrollment') {
                // All enrolled users
                const enrollments = await Enrollment.find({
                    courseId,
                    ...(departmentId && { departmentId })
                }).populate('userId');
                eligibleUsers = enrollments.map(e => e.userId);
            }
        }

        if (eligibleUsers.length === 0) {
            throw new ApiError("No eligible users found for certificate generation", 400);
        }

        const session = await mongoose.startSession();
        const results = {
            successful: [],
            failed: [],
            skipped: []
        };

        try {
            await session.withTransaction(async () => {
                for (const user of eligibleUsers) {
                    try {
                        // Check if certificate already exists
                        const existingCertificate = await Certificate.findOne({
                            userId: user._id,
                            courseId,
                            templateId
                        });

                        if (existingCertificate) {
                            results.skipped.push({
                                userId: user._id,
                                userName: user.fullName,
                                reason: 'Certificate already exists'
                            });
                            continue;
                        }

                        // Generate certificate
                        const certificate = new Certificate({
                            userId: user._id,
                            courseId,
                            templateId,
                            departmentId,
                            issuedBy: req.user._id,
                            issuedDate: new Date(),
                            certificateNumber: `CERT-${Date.now()}-${user._id.toString().slice(-6)}`,
                            status: 'issued',
                            metadata: {
                                userName: user.fullName,
                                courseName: course.title,
                                templateName: template.name,
                                generationType: 'bulk'
                            }
                        });

                        await certificate.save({ session });

                        results.successful.push({
                            userId: user._id,
                            userName: user.fullName,
                            certificateId: certificate._id,
                            certificateNumber: certificate.certificateNumber
                        });

                    } catch (error) {
                        results.failed.push({
                            userId: user._id,
                            userName: user.fullName,
                            error: error.message
                        });
                    }
                }
            });

            // Send notification emails
            try {
                for (const success of results.successful) {
                    const user = eligibleUsers.find(u => u._id.toString() === success.userId.toString());
                    if (user && user.email) {
                        await sendEmail({
                            to: user.email,
                            subject: `Certificate Available - ${course.title}`,
                            template: 'certificate-generated',
                            data: {
                                userName: user.fullName,
                                courseName: course.title,
                                certificateNumber: success.certificateNumber,
                                downloadUrl: `${process.env.FRONTEND_URL}/certificates/${success.certificateId}`
                            }
                        });
                    }
                }
            } catch (emailError) {
                // Failed to send certificate notifications
            }

            // Log bulk certificate generation
            const auditLogger = (await import("../utils/auditLogger.js")).default;
            await auditLogger({
                action: 'BULK_GENERATE_CERTIFICATES',
                userId: req.user._id,
                details: {
                    courseId,
                    templateId,
                    departmentId,
                    criteria,
                    totalUsers: eligibleUsers.length,
                    results: {
                        successful: results.successful.length,
                        failed: results.failed.length,
                        skipped: results.skipped.length
                    }
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.json(new ApiResponse(200, {
                results,
                summary: {
                    total: eligibleUsers.length,
                    successful: results.successful.length,
                    failed: results.failed.length,
                    skipped: results.skipped.length
                }
            }, 'Bulk certificate generation completed'));

        } catch (error) {
            throw new ApiError(`Bulk certificate generation failed: ${error.message}`, 500);
        } finally {
            await session.endSession();
        }

    } catch (error) {
        throw new ApiError(error.message || 'Failed to generate certificates in bulk', error.statusCode || 500);
    }
});

// === BULK OPERATION HISTORY ===

// Get bulk operation history
export const getBulkOperationHistory = asyncHandler(async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            operation = '',
            status = '',
            dateFrom,
            dateTo,
            sortBy = 'createdAt',
            order = 'desc'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build query
        const query = {
            action: { $in: ['BULK_ENROLL_USERS', 'BULK_SEND_EMAILS', 'BULK_GENERATE_CERTIFICATES'] }
        };

        if (operation) {
            const operationMap = {
                'enrollment': 'BULK_ENROLL_USERS',
                'email': 'BULK_SEND_EMAILS',
                'certificates': 'BULK_GENERATE_CERTIFICATES'
            };
            if (operationMap[operation]) {
                query.action = operationMap[operation];
            }
        }

        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) query.createdAt.$lte = new Date(dateTo);
        }

        const [operations, totalOperations] = await Promise.all([
            Audit.find(query)
                .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('userId', 'fullName email')
                .lean(),
            Audit.countDocuments(query)
        ]);

        // Enhance operations with readable information
        const enhancedOperations = operations.map(op => ({
            ...op,
            operationType: op.action.replace('BULK_', '').toLowerCase().replace('_', ' '),
            status: op.details?.results ? 'completed' : 'in_progress',
            summary: op.details?.results || null
        }));

        res.json(new ApiResponse(200, {
            operations: enhancedOperations,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalOperations / parseInt(limit)),
                totalOperations,
                limit: parseInt(limit)
            }
        }, 'Bulk operation history fetched successfully'));

    } catch (error) {
        throw new ApiError('Failed to fetch bulk operation history', 500);
    }
});
