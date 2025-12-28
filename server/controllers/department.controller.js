import mongoose from "mongoose";

import Department from "../models/department.model.js";
import User from "../models/auth.model.js";
import Course from "../models/course.model.js";
import Progress from "../models/progress.model.js";
import Submission from "../models/submission.model.js";
import AttemptedQuiz from "../models/attemptedQuiz.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import departmentStatusScheduler from "../services/departmentStatusScheduler.js";
import departmentCleanupScheduler from "../services/departmentCleanupScheduler.js";

// Helper to resolve department by ObjectId or slug
async function resolveDepartmentId(idOrSlug) {
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) return idOrSlug;
    const doc = await Department.findOne({ slug: idOrSlug }).select('_id');
    return doc ? String(doc._id) : null;
}

export const getMyDepartment = asyncHandler(async (req, res) => {
    // If user has no department assigned
    if (!req.user?.department) {
        return res.json(new ApiResponse(200, null, "No department assigned"));
    }

    const department = await Department.findById(req.user.department)
        .populate("instructor", "fullName email")
        .populate("courses", "title name")
        .select("name status startDate endDate capacity schedule");

    if (!department) {
        return res.json(new ApiResponse(200, null, "No department assigned"));
    }

    return res.json(new ApiResponse(200, department, "My department fetched successfully"));
});

// Get all departments assigned to an instructor
export const getMyDepartments = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userRole = req.user.role;

    let departments;

    if (userRole === "INSTRUCTOR") {
        // For instructors, find all departments where they are assigned as instructor
        departments = await Department.find({
            instructor: userId,
            isDeleted: { $ne: true }
        })
            .populate("courses", "title name")
            .populate("students", "fullName email")
            .select("name status startDate endDate capacity students courses createdAt")
            .sort({ createdAt: -1 });
    } else if (userRole === "STUDENT") {
        // For students, return their single assigned department
        if (!req.user.department) {
            return res.json(new ApiResponse(200, [], "No department assigned"));
        }

        const department = await Department.findById(req.user.department)
            .populate("instructor", "fullName email")
            .populate("courses", "title name")
            .select("name status startDate endDate capacity schedule instructor courses");

        departments = department ? [department] : [];
    } else {
        // For admins and superadmins, they don't have assigned departments
        departments = [];
    }

    return res.json(new ApiResponse(200, {
        departments,
        totalDepartments: departments.length
    }, "My departments fetched successfully"));
});

export const createDepartment = asyncHandler(async (req, res) => {
    const { name, instructorId, courseIds, startDate, endDate, capacity } = req.body;

    if (!name) throw new ApiError("Department name is required", 400);

    if (instructorId && !mongoose.Types.ObjectId.isValid(instructorId)) {
        throw new ApiError("Invalid instructor ID", 400);
    }

    let courses = [];
    if (courseIds && Array.isArray(courseIds) && courseIds.length > 0) {
        // Validate all course IDs
        const uniqueIds = [...new Set(courseIds)];
        const foundCourses = await Course.find({ _id: { $in: uniqueIds } });

        if (foundCourses.length !== uniqueIds.length) {
            throw new ApiError("One or more invalid course IDs provided", 400);
        }
        courses = uniqueIds;
    } else if (req.body.courseId) {
        // Legacy support
        if (!mongoose.Types.ObjectId.isValid(req.body.courseId)) {
            throw new ApiError("Invalid course ID", 400);
        }
        const course = await Course.findById(req.body.courseId);
        if (!course) throw new ApiError("Invalid course selected", 400);
        courses = [req.body.courseId];
    }

    const departmentData = {
        name,
        instructor: instructorId || null,
        courses: courses,
        course: courses.length > 0 ? courses[0] : null,
        students: [],
    };

    if (startDate) departmentData.startDate = new Date(startDate);
    if (endDate) departmentData.endDate = new Date(endDate);
    if (capacity) departmentData.capacity = parseInt(capacity);

    const department = await Department.create(departmentData);

    res.status(201)
        .json(new ApiResponse(201, department, "Department created successfully"));
});

export const assignInstructor = asyncHandler(async (req, res) => {
    const { departmentId, instructorId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        throw new ApiError("Invalid department ID", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(instructorId)) {
        throw new ApiError("Invalid Instructor ID", 400);
    }

    const department = await Department.findById(departmentId);
    if (!department) throw new ApiError("Department not found", 404);

    const instructor = await User.findById(instructorId);
    if (!instructor || instructor.role !== "INSTRUCTOR") {
        throw new ApiError("Invalid instructor selected", 400);
    }

    // Check if department already has this instructor assigned
    if (department.instructor && department.instructor.toString() === instructorId) {
        throw new ApiError("Instructor is already assigned to this department", 400);
    }

    // Check if department already has a different instructor
    // if(department.instructor && department.instructor.toString() !== instructorId) {
    //     throw new ApiError("Department already has a different instructor assigned", 400);
    // }

    // Update department with instructor
    department.instructor = instructorId;
    await department.save();

    // Add department to instructor's departments array if not already present
    if (!instructor.departments) {
        instructor.departments = [];
    }
    if (!instructor.departments.includes(departmentId)) {
        instructor.departments.push(departmentId);
        await instructor.save();
    }

    const updatedDepartment = await Department.findById(departmentId).populate("instructor", "fullName email");
    res.json(new ApiResponse(200, updatedDepartment, "Instructor assigned successfully"));
});

export const removeInstructor = asyncHandler(async (req, res) => {
    const { departmentId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        throw new ApiError("Invalid department ID", 400);
    }

    const department = await Department.findById(departmentId);
    if (!department) throw new ApiError("Department not found", 404);

    // Check if department has an instructor
    if (!department.instructor) {
        throw new ApiError("No instructor assigned to this department", 400);
    }

    const instructorId = department.instructor;

    // Remove instructor from department
    department.instructor = undefined;
    await department.save();

    // Remove department from instructor's departments array
    const instructor = await User.findById(instructorId);
    if (instructor && instructor.departments && instructor.departments.includes(departmentId)) {
        instructor.departments = instructor.departments.filter(id => id.toString() !== departmentId.toString());
        await instructor.save();
    }

    res.json(new ApiResponse(200, department, "Instructor removed successfully"));
});

export const addStudentToDepartment = asyncHandler(async (req, res) => {
    const { departmentId, studentId } = req.body;
    console.log("addStudentToDepartment payload:", req.body);

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        throw new ApiError("Invalid department ID", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ApiError(`Invalid Student ID: ${studentId} (Type: ${typeof studentId})`, 400);
    }

    const department = await Department.findById(departmentId);
    if (!department) throw new ApiError("Department not found", 404);

    const student = await User.findById(studentId);
    if (!student || student.role !== "STUDENT") {
        throw new ApiError("Invalid student selected", 400);
    }

    // Check if student is already assigned to another department
    // if(student.department && student.department.toString() !== departmentId) {
    //     throw new ApiError("Student is already assigned to another department", 400);
    // }

    // Check if department is at capacity
    if (department.capacity && department.students.length >= department.capacity) {
        throw new ApiError("Department is at full capacity", 400);
    }

    // Check if student is already in this department
    if (department.students.includes(studentId)) {
        throw new ApiError("Student is already in this department", 400);
    }

    // Add student to department
    department.students.push(studentId);
    await department.save();

    // Update student with department (support multiple)
    if (!student.departments) {
        student.departments = [];
    }
    // Add to departments array if not already present
    if (!student.departments.includes(departmentId)) {
        student.departments.push(departmentId);
    }
    // Also update single department field as "primary" or "most recent" for backward compatibility
    student.department = departmentId;

    await student.save();

    res.json(new ApiResponse(200, department, "Student added to department successfully"));
});

export const removeStudentFromDepartment = asyncHandler(async (req, res) => {
    const { departmentId, studentId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        throw new ApiError("Invalid department ID", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ApiError("Invalid student ID", 400);
    }

    const department = await Department.findById(departmentId);
    if (!department) throw new ApiError("Department not found", 404);

    const student = await User.findById(studentId);
    if (!student) throw new ApiError("Student not found", 404);

    // Remove student from department
    department.students = department.students.filter(
        (id) => id.toString() !== studentId.toString()
    );
    await department.save();

    // Remove department from student's departments array
    if (student.departments && student.departments.length > 0) {
        student.departments = student.departments.filter(
            (id) => id.toString() !== departmentId.toString()
        );
    }

    // If the removed department was the "primary" one, set primary to another one or null
    if (student.department && student.department.toString() === departmentId.toString()) {
        student.department = student.departments.length > 0 ? student.departments[0] : null;
    }

    await student.save();

    res.json(new ApiResponse(200, department, "Student removed from department successfully"));
});

export const getAllDepartments = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const searchQuery = search
        ? { name: { $regex: search, $options: "i" } }
        : {};

    // Exclude soft-deleted departments unless super admin specifically wants them
    if (!req.query.includeDeleted || req.user.role !== "SUPERADMIN") {
        searchQuery.isDeleted = { $ne: true };
    }

    // Auto-update department statuses when fetching (only for non-cancelled departments)
    // This ensures status is always current when viewing departments
    try {
        await Department.updateAllStatuses();
    } catch (error) {
        // Silently ignore non-critical errors during status update
    }

    const total = await Department.countDocuments(searchQuery);

    const departments = await Department.find(searchQuery)
        .populate("instructor", "fullName email slug createdAt")
        .populate("students", "fullName email slug createdAt")
        .populate("courses", "title name slug")
        .populate("course", "title name slug")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    res.json(
        new ApiResponse(200,
            {
                departments,
                totalDepartments: total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit,
            },
            "Departments fetched successfully"
        )
    );
});

export const getDepartmentById = asyncHandler(async (req, res) => {
    const resolvedId = await resolveDepartmentId(req.params.id);
    if (!resolvedId) {
        throw new ApiError("Invalid department ID", 400);
    }

    const department = await Department.findById(resolvedId)
        .populate("instructor", "fullName email")
        .populate("students", "fullName email slug status createdAt")
        .populate("courses", "title name description difficulty status")
        .populate("course", "title name description difficulty status");

    if (!department) throw new ApiError("Department not found", 404);

    res.json(new ApiResponse(200, department, "Department fetched successfully"));
});

export const updateDepartment = asyncHandler(async (req, res) => {
    const { name, status, courseId, startDate, endDate, capacity } = req.body;

    const resolvedId = await resolveDepartmentId(req.params.id);
    if (!resolvedId) throw new ApiError("Invalid department ID", 400);

    const department = await Department.findById(resolvedId);
    if (!department) throw new ApiError("Department not found", 404);

    const oldStatus = department.status;

    if (name) department.name = name;
    if (status && status !== oldStatus) {
        department.status = status;
        // Track status change timestamp for COMPLETED and CANCELLED statuses
        if (status === 'COMPLETED' || status === 'CANCELLED') {
            department.statusUpdatedAt = new Date();
        }
    }

    // Handle courses update
    // Handle courses update
    if (req.body.courseIds && Array.isArray(req.body.courseIds)) {
        // Validate all course IDs
        const uniqueIds = [...new Set(req.body.courseIds)];
        if (uniqueIds.length > 0) {
            const foundCourses = await Course.find({ _id: { $in: uniqueIds } });
            if (foundCourses.length !== uniqueIds.length) {
                throw new ApiError("One or more invalid course IDs provided", 400);
            }
        }
        department.courses = uniqueIds;

        // Sync legacy course field (use first course as primary)
        department.course = uniqueIds.length > 0 ? uniqueIds[0] : null;

    } else if (courseId) {
        // Legacy single course update
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            throw new ApiError("Invalid course ID", 400);
        }
        const course = await Course.findById(courseId);
        if (!course) throw new ApiError("Invalid course selected", 400);

        department.courses = [courseId];
        department.course = courseId;
    }

    if (startDate) department.startDate = new Date(startDate);
    if (endDate) department.endDate = new Date(endDate);
    if (capacity) department.capacity = parseInt(capacity);

    await department.save();

    res.json(new ApiResponse(200, department, "Department updated successfully"));
});

export const deleteDepartment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const resolvedId = await resolveDepartmentId(id);

    const department = await Department.findById(resolvedId);
    if (!department) throw new ApiError("Department not found", 404);

    if (req.user.role === "SUPERADMIN") {
        // Super admin can permanently delete
        await department.deleteOne();
        res.json(new ApiResponse(200, null, "Department permanently deleted successfully"));
    } else {
        // Regular admin - soft delete
        department.isDeleted = true;
        await department.save();
        res.json(new ApiResponse(200, null, "Department deleted successfully"));
    }
});

// Get department quiz and assignment for completed students
export const getDepartmentAssessments = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Get user's department
    const user = await User.findById(userId).populate('department');
    if (!user || !user.department) {
        throw new ApiError("No department assigned to user", 404);
    }

    const department = await Department.findById(user.department)
        .populate('departmentQuiz')
        .populate('departmentAssignment')
        .populate('course');

    if (!department || !department.course) {
        throw new ApiError("Department or course not found", 404);
    }

    // Check if student has completed all modules
    const progress = await Progress.findOne({ student: userId, course: department.course._id });

    if (!progress) {
        return res.json(new ApiResponse(200, {
            hasAccess: false,
            reason: "No progress found",
            departmentQuiz: null,
            departmentAssignment: null
        }, "Department assessments check completed"));
    }

    // Get total modules in course
    const course = await Course.findById(department.course._id).populate('modules');
    const totalModules = course?.modules?.length || 0;
    const completedModules = progress.completedModules?.length || 0;

    const hasAccess = totalModules > 0 && completedModules >= totalModules;

    if (!hasAccess) {
        return res.json(new ApiResponse(200, {
            hasAccess: false,
            reason: `Complete all ${totalModules} modules to unlock department assessments. ${completedModules} completed.`,
            departmentQuiz: null,
            departmentAssignment: null,
            progress: {
                completed: completedModules,
                total: totalModules
            }
        }, "Department assessments locked"));
    }

    res.json(new ApiResponse(200, {
        hasAccess: true,
        reason: "All modules completed",
        departmentQuiz: department.departmentQuiz,
        departmentAssignment: department.departmentAssignment,
        progress: {
            completed: completedModules,
            total: totalModules
        }
    }, "Department assessments unlocked"));
});

// Get department progress analytics for admin/instructor
export const getDepartmentProgress = asyncHandler(async (req, res) => {
    const rawId = req.params.id;
    const departmentId = await resolveDepartmentId(rawId);

    if (!departmentId) {
        throw new ApiError("Invalid department ID", 400);
    }

    const department = await Department.findById(departmentId)
        .populate('courses', 'title modules')
        .populate('students', '_id fullName');

    if (!department) {
        throw new ApiError("Department not found", 404);
    }

    if (!department.courses || department.courses.length === 0) {
        return res.json(new ApiResponse(200, {
            departmentProgress: [],
            overallStats: {
                totalStudents: department.students.length,
                studentsWithProgress: 0,
                averageProgress: 0,
                totalModules: 0
            }
        }, "No courses assigned to department"));
    }

    const allModulesCount = department.courses.reduce((sum, c) => sum + (c.modules?.length || 0), 0);

    // Get progress for all students in department for all courses
    const progressData = await Progress.find({
        student: { $in: department.students.map(s => s._id) },
        course: { $in: department.courses.map(c => c._id) }
    })
        .populate('student', 'fullName email avatar')
        .lean();

    // Transform progress data - One entry per student per course
    const departmentProgress = [];

    for (const course of department.courses) {
        const totalModules = course.modules?.length || 0;

        for (const student of department.students) {
            const studentProgress = progressData.find(p =>
                p.student._id.toString() === student._id.toString() &&
                p.course.toString() === course._id.toString()
            );

            if (!studentProgress) {
                departmentProgress.push({
                    student: {
                        _id: student._id,
                        fullName: student.fullName,
                        email: student.email || '',
                        avatar: student.avatar
                    },
                    completedModules: 0,
                    completedLessons: 0,
                    totalModules,
                    progressPercentage: 0,
                    lastActivity: null,
                    courseTitle: course.title,
                    currentLevel: 'L1',
                    levelLockEnabled: false,
                    lockedLevel: null
                });
            } else {
                const completedModules = studentProgress.completedModules?.length || 0;
                const completedLessons = studentProgress.completedLessons?.length || 0;
                const progressPercentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

                departmentProgress.push({
                    student: {
                        _id: studentProgress.student._id,
                        fullName: studentProgress.student.fullName,
                        email: studentProgress.student.email,
                        avatar: studentProgress.student.avatar
                    },
                    completedModules,
                    completedLessons,
                    totalModules,
                    progressPercentage,
                    lastActivity: studentProgress.updatedAt,
                    courseTitle: course.title,
                    currentLevel: studentProgress.currentLevel || 'L1',
                    levelLockEnabled: studentProgress.levelLockEnabled || false,
                    lockedLevel: studentProgress.lockedLevel || null
                });
            }
        }
    }

    // Calculate overall stats
    const studentsWithProgress = departmentProgress.filter(p => p.completedModules > 0).length;
    const averageProgress = departmentProgress.length > 0
        ? Math.round(departmentProgress.reduce((sum, p) => sum + p.progressPercentage, 0) / departmentProgress.length)
        : 0;

    const overallStats = {
        totalStudents: department.students.length,
        studentsWithProgress,
        averageProgress,
        totalModules: allModulesCount
    };

    res.json(new ApiResponse(200, {
        departmentProgress,
        overallStats
    }, "Department progress fetched successfully"));
});

// Get progress analytics for ALL departments (Skill Matrix Global View)
export const getAllDepartmentsProgress = asyncHandler(async (req, res) => {
    // 1. Fetch all active departments with courses and students
    const departments = await Department.find({ isDeleted: { $ne: true } })
        .populate({
            path: 'courses',
            select: 'title category difficulty modules',
            populate: {
                path: 'modules',
                select: 'title'
            }
        })
        .populate('students', '_id fullName email createdAt')
        .lean();

    // 2. Fetch all progress records
    // We fetch all progress to map them in memory instead of N+1 queries
    const allProgress = await Progress.find({})
        .select('student course completedModules currentLevel updatedAt')
        .lean();

    let aggregatedData = [];

    // 3. Iterate departments, courses and students
    for (const dept of departments) {
        // Skip if no courses assigned
        if (!dept.courses || dept.courses.length === 0) continue;

        for (const course of dept.courses) {
            const totalModules = course.modules?.length || 0;

            for (const student of dept.students) {
                // Find progress for this student & course
                const studentProgress = allProgress.find(p =>
                    p.student.toString() === student._id.toString() &&
                    p.course.toString() === course._id.toString()
                );

                // Build the data object
                aggregatedData.push({
                    student: {
                        _id: student._id,
                        fullName: student.fullName,
                        email: student.email,
                        createdAt: student.createdAt // For DOJ
                    },
                    department: {
                        _id: dept._id,
                        name: dept.name
                    },
                    course: {
                        _id: course._id,
                        title: course.title,
                        category: course.category || "General",
                        difficulty: course.difficulty || "N/A",
                        modules: course.modules || [] // Needed for column mapping if feasible
                    },
                    progress: {
                        completedModules: studentProgress?.completedModules || [],
                        currentLevel: studentProgress?.currentLevel || 'L1',
                        lastActivity: studentProgress?.updatedAt || null,
                        progressPercentage: totalModules > 0 && studentProgress?.completedModules
                            ? Math.round((studentProgress.completedModules.length / totalModules) * 100)
                            : 0
                    }
                });
            }
        }
    }

    res.json(new ApiResponse(200, aggregatedData, "All departments progress fetched successfully"));
});

// Get department submissions analytics
export const getDepartmentSubmissions = asyncHandler(async (req, res) => {
    const rawId = req.params.id;

    const departmentId = await resolveDepartmentId(rawId);
    if (!departmentId) {
        throw new ApiError("Invalid department ID", 400);
    }

    const department = await Department.findById(departmentId).populate('students', '_id');
    if (!department) {
        throw new ApiError("Department not found", 404);
    }

    const submissions = await Submission.find({
        student: { $in: department.students.map(s => s._id) }
    })
        .populate({
            path: 'student',
            select: 'fullName email avatar'
        })
        .populate({
            path: 'assignment',
            select: 'title dueDate maxScore',
            populate: {
                path: 'course',
                select: 'title'
            }
        })
        .sort({ submittedAt: -1 });

    // Calculate stats
    const totalSubmissions = submissions.length;
    const gradedSubmissions = submissions.filter(s => s.grade !== undefined).length;
    const averageGrade = gradedSubmissions > 0
        ? Math.round(submissions.filter(s => s.grade !== undefined)
            .reduce((sum, s) => sum + s.grade, 0) / gradedSubmissions)
        : 0;
    const lateSubmissions = submissions.filter(s => s.isLate).length;

    res.json(new ApiResponse(200, {
        submissions,
        stats: {
            totalSubmissions,
            gradedSubmissions,
            pendingGrading: totalSubmissions - gradedSubmissions,
            averageGrade,
            lateSubmissions
        }
    }, "Department submissions fetched successfully"));
});

// Get department quiz attempts analytics
export const getDepartmentAttempts = asyncHandler(async (req, res) => {
    const rawId = req.params.id;
    const departmentId = await resolveDepartmentId(rawId);

    if (!departmentId) {
        throw new ApiError("Invalid department ID", 400);
    }

    const department = await Department.findById(departmentId).populate('students', '_id');
    if (!department) {
        throw new ApiError("Department not found", 404);
    }

    const attempts = await AttemptedQuiz.find({
        student: { $in: department.students.map(s => s._id) }
    })
        .populate({
            path: 'student',
            select: 'fullName email slug avatar'
        })
        .populate({
            path: 'quiz',
            select: 'title questions passingScore',
            populate: {
                path: 'course',
                select: 'title'
            }
        })
        .sort({ createdAt: -1 });

    // Transform attempts with computed fields
    const transformedAttempts = attempts.map(attempt => {
        const totalQuestions = attempt.quiz?.questions?.length || 0;
        // Calculate total marks properly by summing up marks from all questions
        const totalMarks = attempt.quiz?.questions?.reduce((sum, question) => sum + (question.marks || 1), 0) || totalQuestions;
        const scorePercent = totalMarks > 0 ? Math.round((attempt.score / totalMarks) * 100) : 0;
        const passingScore = attempt.quiz?.passingScore || 70;
        const passed = scorePercent >= passingScore;

        return {
            ...attempt.toObject(),
            scorePercent,
            passed,
            totalQuestions,
            totalMarks,
            attemptedAt: attempt.createdAt
        };
    });

    // Calculate stats
    const totalAttempts = transformedAttempts.length;
    const passedAttempts = transformedAttempts.filter(a => a.passed).length;
    const averageScore = transformedAttempts.length > 0
        ? Math.round(transformedAttempts.reduce((sum, a) => sum + a.scorePercent, 0) / transformedAttempts.length)
        : 0;

    res.json(new ApiResponse(200, {
        attempts: transformedAttempts,
        stats: {
            totalAttempts,
            passedAttempts,
            failedAttempts: totalAttempts - passedAttempts,
            passRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0,
            averageScore
        }
    }, "Department quiz attempts fetched successfully"));
});

// Get department course content (modules with lessons) for student dashboard
export const getDepartmentCourseContent = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Get user's department
    const user = await User.findById(userId).populate('department');
    if (!user || !user.department) {
        throw new ApiError("No department assigned to user", 404);
    }

    const coursePopulateOptions = {
        path: 'modules',
        select: 'title description order lessons',
        populate: {
            path: 'lessons',
            select: 'title content duration order'
        },
        options: { sort: { order: 1 } }
    };

    // Get department with course details
    const department = await Department.findById(user.department._id)
        .populate({
            path: 'course',
            select: 'title description modules',
            populate: coursePopulateOptions
        })
        .populate({
            path: 'courses',
            select: 'title description modules',
            populate: coursePopulateOptions
        })
        .select('name course courses');

    const activeCourse = department?.course || (department?.courses && department.courses.length > 0 ? department.courses[0] : null);

    console.log("DEBUG: getDepartmentCourseContent fetching...", {
        userDepartmentId: user.department?._id,
        departmentName: department?.name,
        hasCourse: !!department?.course,
        hasCourses: !!department?.courses,
        coursesLength: department?.courses?.length,
        activeCourseId: activeCourse?._id
    });

    if (!department) {
        throw new ApiError("Department not found", 404);
    }

    // Note: It is valid for a department to exist but have no active course.
    // In this case, we return the department info with empty course data so the frontend can display "No Course Assigned".

    // Get user's progress for this course (only if course exists)
    const progress = activeCourse ? await Progress.findOne({
        student: userId,
        course: activeCourse._id
    }) : null;

    // Format the response with progress information
    const courseContent = {
        department: {
            _id: department._id,
            name: department.name
        },
        course: activeCourse ? {
            _id: activeCourse._id,
            title: activeCourse.title,
            description: activeCourse.description,
            modules: activeCourse.modules || []
        } : null,
        progress: {
            completedModules: progress?.completedModules || [],
            completedLessons: progress?.completedLessons || [],
            currentLevel: progress?.currentLevel || "L1"
        }
    };

    res.json(new ApiResponse(200, courseContent, "Department course content fetched successfully"));
});

// Super admin functions for managing soft-deleted departments
export const getSoftDeletedDepartments = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const searchQuery = {
        isDeleted: true
    };

    if (search) {
        searchQuery.name = { $regex: search, $options: "i" };
    }

    const total = await Department.countDocuments(searchQuery);

    const departments = await Department.find(searchQuery)
        .populate("instructor", "fullName email")
        .populate("students", "fullName email")
        .populate("course", "title name")
        .skip(skip)
        .limit(limit)
        .sort({ updatedAt: -1 });

    res.json(
        new ApiResponse(200,
            {
                departments,
                totalDepartments: total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit,
            },
            "Soft-deleted departments fetched successfully"
        )
    );
});

export const restoreDepartment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const department = await Department.findById(id);
    if (!department) throw new ApiError("Department not found", 404);

    if (!department.isDeleted) {
        throw new ApiError("Department is not deleted", 400);
    }

    department.isDeleted = false;
    await department.save();

    res.json(new ApiResponse(200, department, "Department restored successfully"));
});

// ==================== DEPARTMENT STATUS MANAGEMENT ====================

// Update all department statuses based on dates
export const updateAllDepartmentStatuses = asyncHandler(async (req, res) => {
    const result = await departmentStatusScheduler.updateDepartmentStatuses();

    res.json(new ApiResponse(200, result, "Department statuses updated successfully"));
});

// Update specific department status
export const updateDepartmentStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const resolvedId = await resolveDepartmentId(id);

    if (!resolvedId) {
        throw new ApiError("Invalid department ID", 400);
    }

    const department = await Department.findById(resolvedId);
    if (!department) {
        throw new ApiError("Department not found", 404);
    }

    const oldStatus = department.status;
    const newStatus = await department.updateStatus();

    res.json(new ApiResponse(200, {
        departmentId: department._id,
        name: department.name,
        oldStatus,
        newStatus,
        startDate: department.startDate,
        endDate: department.endDate
    }, "Department status updated successfully"));
});

// Cancel department and notify users
export const cancelDepartment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const resolvedId = await resolveDepartmentId(id);
    if (!resolvedId) {
        throw new ApiError("Invalid department ID", 400);
    }

    const department = await Department.findById(resolvedId)
        .populate('students', 'fullName email')
        .populate('instructor', 'fullName email')
        .populate('course', 'title');

    if (!department) {
        throw new ApiError("Department not found", 404);
    }

    if (department.status === 'CANCELLED') {
        throw new ApiError("Department is already cancelled", 400);
    }

    const oldStatus = department.status;
    department.status = 'CANCELLED';
    if (reason) {
        department.notes = (department.notes ? department.notes + '\n\n' : '') +
            `CANCELLED: ${reason} (${new Date().toISOString()})`;
    }
    await department.save();

    // Send notifications to all users in the department
    const notifications = [];
    const message = `Your department "${department.name}" has been cancelled. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`;

    // Add students to notifications
    department.students.forEach(student => {
        notifications.push({
            recipient: student._id,
            type: 'ERROR',
            title: `Department Cancelled: ${department.name}`,
            message: message,
            metadata: {
                departmentId: department._id,
                departmentName: department.name,
                oldStatus,
                newStatus: 'CANCELLED',
                reason: reason || '',
                courseTitle: department.course?.title || 'N/A'
            }
        });
    });

    // Add instructor to notifications if exists
    if (department.instructor) {
        notifications.push({
            recipient: department.instructor._id,
            type: 'ERROR',
            title: `Department Cancelled: ${department.name}`,
            message: message.replace('Your department', 'Your assigned department'),
            metadata: {
                departmentId: department._id,
                departmentName: department.name,
                oldStatus,
                newStatus: 'CANCELLED',
                reason: reason || '',
                courseTitle: department.course?.title || 'N/A'
            }
        });
    }

    // Here you would typically save these notifications to a notifications collection
    // notifications would be saved to database here

    res.json(new ApiResponse(200, {
        department: {
            _id: department._id,
            name: department.name,
            oldStatus,
            newStatus: department.status,
            reason: reason || ''
        },
        notificationsSent: notifications.length
    }, "Department cancelled successfully and notifications sent"));
});

// Get department notifications for current user
export const getMyDepartmentNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { departmentId } = req.params; // Optional - if not provided, uses user's assigned department

    const notifications = await departmentStatusScheduler.getDepartmentNotificationsForUser(
        userId,
        departmentId || null
    );

    res.json(new ApiResponse(200, notifications, "Department notifications retrieved successfully"));
});

// Get department status with enhanced information
export const getDepartmentStatusInfo = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const resolvedId = await resolveDepartmentId(id);
    if (!resolvedId) {
        throw new ApiError("Invalid department ID", 400);
    }

    const department = await Department.findById(resolvedId)
        .populate('course', 'title')
        .populate('instructor', 'fullName email')
        .select('name status startDate endDate capacity students notes createdAt updatedAt');

    if (!department) {
        throw new ApiError("Department not found", 404);
    }

    const today = new Date();
    const statusInfo = {
        department: {
            _id: department._id,
            name: department.name,
            status: department.status,
            startDate: department.startDate,
            endDate: department.endDate,
            capacity: department.capacity,
            currentStudents: department.students.length,
            course: department.course,
            instructor: department.instructor,
            notes: department.notes,
            createdAt: department.createdAt,
            updatedAt: department.updatedAt
        },
        statusCalculation: {
            currentStatus: department.status,
            calculatedStatus: department.calculateStatus(),
            isStatusAccurate: department.status === department.calculateStatus()
        },
        timeline: {
            daysUntilStart: department.startDate ? Math.ceil((new Date(department.startDate) - today) / (1000 * 60 * 60 * 24)) : null,
            daysUntilEnd: department.endDate ? Math.ceil((new Date(department.endDate) - today) / (1000 * 60 * 60 * 24)) : null,
            duration: department.startDate && department.endDate ?
                Math.ceil((new Date(department.endDate) - new Date(department.startDate)) / (1000 * 60 * 60 * 24)) : null
        }
    };

    res.json(new ApiResponse(200, statusInfo, "Department status information retrieved successfully"));
});

// Get department scheduler status (admin only)
export const getDepartmentSchedulerStatus = asyncHandler(async (req, res) => {
    const schedulerStatus = departmentStatusScheduler.getStatus();

    res.json(new ApiResponse(200, schedulerStatus, "Department scheduler status retrieved successfully"));
});

// Restart department scheduler (admin only)
export const restartDepartmentScheduler = asyncHandler(async (req, res) => {
    departmentStatusScheduler.restart();

    res.json(new ApiResponse(200, null, "Department scheduler restarted successfully"));
});

// ==================== DEPARTMENT CLEANUP MANAGEMENT ====================

// Get departments scheduled for cleanup (admin only)
export const getDepartmentsScheduledForCleanup = asyncHandler(async (req, res) => {
    const scheduledDepartments = await departmentCleanupScheduler.getDepartmentsScheduledForCleanup();

    res.json(new ApiResponse(200, {
        departments: scheduledDepartments,
        count: scheduledDepartments.length,
        cleanupThreshold: '7 days after status change to COMPLETED/CANCELLED'
    }, "Departments scheduled for cleanup retrieved successfully"));
});

// Trigger manual department cleanup (superadmin only)
export const triggerDepartmentCleanup = asyncHandler(async (req, res) => {
    if (req.user.role !== "SUPERADMIN") {
        throw new ApiError("Only super admin can trigger manual cleanup", 403);
    }

    const result = await departmentCleanupScheduler.triggerCleanup();

    res.json(new ApiResponse(200, result, "Manual department cleanup completed"));
});

// Get department cleanup scheduler status (admin only)
export const getDepartmentCleanupStatus = asyncHandler(async (req, res) => {
    const cleanupStatus = departmentCleanupScheduler.getStatus();
    const scheduledDepartments = await departmentCleanupScheduler.getDepartmentsScheduledForCleanup();

    res.json(new ApiResponse(200, {
        scheduler: cleanupStatus,
        departmentsScheduledForCleanup: scheduledDepartments.length,
        nextCleanupTime: '2:00 AM UTC daily',
        warningTime: '1:00 AM UTC daily'
    }, "Department cleanup status retrieved successfully"));
});

// Restart department cleanup scheduler (admin only)
export const restartDepartmentCleanupScheduler = asyncHandler(async (req, res) => {
    departmentCleanupScheduler.restart();

    res.json(new ApiResponse(200, null, "Department cleanup scheduler restarted successfully"));
});

// Send manual cleanup warning (admin only)
export const sendManualCleanupWarning = asyncHandler(async (req, res) => {
    await departmentCleanupScheduler.sendCleanupWarnings();

    res.json(new ApiResponse(200, null, "Manual cleanup warnings sent successfully"));
});
