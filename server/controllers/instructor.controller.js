import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/auth.model.js";
import Course from "../models/course.model.js";
import Department from "../models/department.model.js";
import AttemptedQuiz from "../models/attemptedQuiz.model.js";
import Quiz from "../models/quiz.model.js";
import Assignment from "../models/assignment.model.js";
import Submission from "../models/submission.model.js";
import Progress from "../models/progress.model.js";
import ENV from "../configs/env.config.js";
import { Readable } from 'node:stream';

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, ENV.JWT_ACCESS_SECRET, { expiresIn: ENV.JWT_ACCESS_EXPIRES_IN });
};

// @desc    Instructor login
// @route   POST /api/instructor/auth/login
// @access  Public
export const login = async (req, res) => {
  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find user and check if they are an instructor
    const user = await User.findOne({
      email,
      role: "INSTRUCTOR"
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials or not an instructor",
      });
    }

    // Check if user is active
    if (user.status !== "ACTIVE") {
      return res.status(401).json({
        success: false,
        message: "Account is not active. Please contact administrator.",
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Set token as cookie for middleware compatibility
    res.cookie('accessToken', token, {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        instructor: user,
        token,
      },
    });
  } catch (error) {
    console.error("Instructor login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// @desc    Get dashboard statistics for instructor
// @route   GET /api/instructor/dashboard/stats
// @access  Private (Instructor only)
export const getDashboardStats = async (req, res) => {
  try {
    const instructorId = req.user._id;

    // Get instructor's assigned departments
    const departments = await Department.find({ instructor: instructorId })
      .populate('course', 'title')
      .populate('students', 'fullName');

    // Get instructor's courses (courses assigned through departments)
    const assignedCourseIds = [...new Set(departments.map(department => department.course?._id).filter(Boolean))];
    const courses = await Course.find({
      _id: { $in: assignedCourseIds },
      status: 'PUBLISHED'
    });

    // Calculate statistics
    const totalStudents = [...new Set(departments.flatMap(department =>
      department.students.map(student => student._id.toString())
    ))].length;

    const activeDepartments = departments.filter(department => department.status === 'ONGOING').length;

    // Get recent activities (quiz attempts, assignment submissions)
    const recentQuizAttempts = await AttemptedQuiz.find({
      student: { $in: departments.flatMap(department => department.students) }
    })
      .populate('student', 'fullName')
      .populate('quiz', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    const recentSubmissions = await Submission.find({
      student: { $in: departments.flatMap(department => department.students) }
    })
      .populate('student', 'fullName')
      .populate('assignment', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    // Combine and format recent activities
    const recentActivities = [
      ...recentQuizAttempts.map(attempt => ({
        title: `Quiz Attempted: ${attempt.quiz?.title}`,
        description: `${attempt.student?.fullName} attempted a quiz`,
        createdAt: attempt.createdAt,
        type: 'quiz'
      })),
      ...recentSubmissions.map(submission => ({
        title: `Assignment Submitted: ${submission.assignment?.title}`,
        description: `${submission.student?.fullName} submitted an assignment`,
        createdAt: submission.createdAt,
        type: 'assignment'
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        courses: {
          total: courses.length,
          published: courses.length // Only published courses are shown
        },
        departments: {
          total: departments.length,
          active: activeDepartments
        },
        students: {
          total: totalStudents
        },
        recentActivities: {
          count: recentActivities.length,
          items: recentActivities
        }
      }
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
    });
  }
};

// @desc    Get assigned courses for instructor
// @route   GET /api/instructor/courses
// @access  Private (Instructor only)
export const getAssignedCourses = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { page = 1, limit = 10, search } = req.query;

    // Get instructor's assigned departments to find course IDs
    const departments = await Department.find({ instructor: instructorId }).populate('course');
    const assignedCourseIds = [...new Set(departments.map(department => department.course?._id).filter(Boolean))];

    if (assignedCourseIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          courses: [],
          totalPages: 0,
          currentPage: 1,
          total: 0
        }
      });
    }

    // Build query
    let query = {
      _id: { $in: assignedCourseIds },
      status: 'PUBLISHED' // Only published courses
    };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const courses = await Course.find(query)
      .populate('modules', 'title description')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Course.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        courses,
        totalPages,
        currentPage: parseInt(page),
        total
      }
    });
  } catch (error) {
    console.error("Get assigned courses error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching assigned courses",
    });
  }
};

// @desc    Get course details
// @route   GET /api/instructor/courses/:courseId
// @access  Private (Instructor only)
export const getCourseDetails = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { courseId } = req.params;

    // Verify instructor has access to this course
    const departments = await Department.find({
      instructor: instructorId,
      course: courseId
    });

    if (departments.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Course not assigned to you.",
      });
    }

    const course = await Course.findOne({
      _id: courseId,
      status: 'PUBLISHED'
    })
      .populate({
        path: 'modules',
        populate: {
          path: 'lessons',
          select: 'title description duration videoUrl'
        }
      });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or not published",
      });
    }

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error("Get course details error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching course details",
    });
  }
};

// @desc    Get assigned departments for instructor
// @route   GET /api/instructor/departments
// @access  Private (Instructor only)
export const getAssignedDepartments = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { page = 1, limit = 10, search } = req.query;

    // Build query
    let query = { instructor: instructorId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const departments = await Department.find(query)
      .populate('course', 'title category level')
      .populate('students', 'fullName email userName status')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Enhance departments with student progress data
    const departmentsWithProgress = await Promise.all(
      departments.map(async (department) => {
        const studentsWithProgress = await Promise.all(
          department.students.map(async (student) => {
            // Get progress for the course
            const progress = await Progress.findOne({
              student: student._id,
              course: department.course?._id
            });

            return {
              ...student.toObject(),
              progress: progress?.progressPercent || 0
            };
          })
        );

        return {
          ...department.toObject(),
          students: studentsWithProgress
        };
      })
    );

    const total = await Department.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        departments: departmentsWithProgress,
        totalPages,
        currentPage: parseInt(page),
        total
      }
    });
  } catch (error) {
    console.error("Get assigned departments error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching assigned departments",
    });
  }
};

// @desc    Get department details
// @route   GET /api/instructor/departments/:departmentId
// @access  Private (Instructor only)
export const getDepartmentDetails = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { departmentId } = req.params;

    const department = await Department.findOne({
      _id: departmentId,
      instructor: instructorId
    })
      .populate('course', 'title description category level')
      .populate('students', 'fullName email phoneNumber');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found or access denied",
      });
    }

    res.status(200).json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error("Get department details error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching department details",
    });
  }
};

// @desc    Get department students
// @route   GET /api/instructor/departments/:departmentId/students
// @access  Private (Instructor only)
export const getDepartmentStudents = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { departmentId } = req.params;

    const department = await Department.findOne({
      _id: departmentId,
      instructor: instructorId
    })
      .populate('students', 'fullName email slug phoneNumber userName status')
      .populate('course', 'title');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found or access denied",
      });
    }

    // Get additional student data (progress, quiz scores, assignment submissions)
    const studentsWithStats = await Promise.all(
      department.students.map(async (student) => {
        // Get progress for the course
        const progress = await Progress.findOne({
          student: student._id,
          course: department.course?._id
        });

        // Get quiz attempts for quizzes in this course
        const quizAttempts = await AttemptedQuiz.find({
          student: student._id
        }).populate({
          path: 'quiz',
          match: { course: department.course?._id }, // Only quizzes from this course
          select: 'title questions totalMarks'
        });

        // Filter out attempts where quiz is null (doesn't belong to this course)
        const relevantQuizAttempts = quizAttempts.filter(attempt => attempt.quiz);

        // Get assignment submissions for assignments in this course
        const submissions = await Submission.find({
          student: student._id
        }).populate({
          path: 'assignment',
          match: { course: department.course?._id }, // Only assignments from this course
          select: 'title maxScore course'
        });

        // Filter out submissions where assignment is null (doesn't belong to this course)
        const relevantSubmissions = submissions.filter(sub => sub.assignment);

        // Consider only completed attempts (exclude IN_PROGRESS)
        const completedAttempts = relevantQuizAttempts.filter(a => a.status && a.status !== 'IN_PROGRESS');

        // Calculate quiz average - use sum of question marks (no totalMarks field on quiz)
        const averageQuizScore = completedAttempts.length > 0
          ? completedAttempts.reduce((sum, attempt) => {
            const totalMarks = attempt.quiz?.questions?.reduce((acc, q) => acc + (q.marks || 1), 0) || 0;
            const percent = totalMarks > 0 ? (attempt.score / totalMarks) * 100 : 0;
            return sum + percent;
          }, 0) / completedAttempts.length
          : 0;

        // Get total quizzes available for this course
        const totalQuizzesInCourse = await Quiz.countDocuments({ course: department.course?._id });

        // Get total assignments available for this course
        const totalAssignmentsInCourse = await Assignment.countDocuments({ course: department.course?._id });

        return {
          ...student.toObject(),
          progress: progress?.progressPercent || 0,
          averageQuizScore: Math.round(averageQuizScore) || 0,
          completedQuizzes: completedAttempts.length,
          totalQuizzes: totalQuizzesInCourse,
          submittedAssignments: relevantSubmissions.length,
          totalAssignments: totalAssignmentsInCourse
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        department: {
          _id: department._id,
          name: department.name,
          course: department.course
        },
        students: studentsWithStats
      }
    });
  } catch (error) {
    console.error("Get department students error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching department students",
    });
  }
};

// @desc    Get student progress
// @route   GET /api/instructor/students/:studentId/progress
// @access  Private (Instructor only)
export const getStudentProgress = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { studentId } = req.params;
    const { courseId } = req.query;

    // Verify instructor has access to this student (through departments)
    const department = await Department.findOne({
      instructor: instructorId,
      students: studentId,
      ...(courseId && { course: courseId })
    });

    if (!department) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Student not in your department.",
      });
    }

    const progress = await Progress.findOne({
      student: studentId,
      course: courseId || department.course
    })
      .populate('completedLessons', 'title')
      .populate('course', 'title');

    res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error("Get student progress error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching student progress",
    });
  }
};

// @desc    Get department quiz attempts
// @route   GET /api/instructor/departments/:departmentId/quiz-attempts
// @access  Private (Instructor only)
export const getDepartmentQuizAttempts = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { departmentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Verify instructor owns this department and populate course for filtering
    const department = await Department.findOne({
      _id: departmentId,
      instructor: instructorId
    }).populate('course', '_id');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found or access denied",
      });
    }

    // Find attempts for students in this department, with quizzes from the department's course
    const attempts = await AttemptedQuiz.find({
      student: { $in: department.students }
    })
      .populate('student', 'fullName userName email')
      .populate({
        path: 'quiz',
        select: 'title description questions course',
        match: { course: department.course._id } // Only quizzes from this course
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter out attempts where quiz is null (doesn't belong to course) and transform data
    const filteredAttempts = attempts
      .filter(attempt => attempt.quiz) // Remove attempts with null quiz
      .map(attempt => {
        // Calculate total score from quiz questions
        const totalScore = attempt.quiz.questions?.reduce((sum, q) => sum + (q.marks || 1), 0) || 0;

        return {
          _id: attempt._id,
          student: attempt.student,
          quiz: {
            _id: attempt.quiz._id,
            title: attempt.quiz.title,
            description: attempt.quiz.description,
            questions: attempt.quiz.questions
          },
          score: attempt.score || 0,
          totalScore, // Add calculated totalScore
          status: attempt.status,
          startedAt: attempt.startedAt,
          submittedAt: attempt.completedAt, // Map completedAt to submittedAt for frontend
          timeTaken: attempt.timeTaken,
          createdAt: attempt.createdAt,
          updatedAt: attempt.updatedAt
        };
      });

    // Count filtered attempts for correct pagination
    const totalFilteredAttempts = await AttemptedQuiz.aggregate([
      { $match: { student: { $in: department.students } } },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quiz',
          foreignField: '_id',
          as: 'quizData'
        }
      },
      { $match: { 'quizData.course': department.course._id } },
      { $count: 'total' }
    ]);

    const total = totalFilteredAttempts.length > 0 ? totalFilteredAttempts[0].total : 0;
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        attempts: filteredAttempts,
        totalPages,
        currentPage: parseInt(page),
        total
      }
    });
  } catch (error) {
    console.error("Get department quiz attempts error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quiz attempts",
    });
  }
};

// @desc    Get quiz details
// @route   GET /api/instructor/quizzes/:quizId
// @access  Private (Instructor only)
export const getQuizDetails = async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId)
      .populate('module', 'title course')
      .populate({
        path: 'module',
        populate: {
          path: 'course',
          select: 'title'
        }
      });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    res.status(200).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error("Get quiz details error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quiz details",
    });
  }
};

// @desc    Get student quiz attempts
// @route   GET /api/instructor/students/:studentId/quiz-attempts/:quizId
// @access  Private (Instructor only)
export const getStudentQuizAttempts = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { studentId, quizId } = req.params;

    // Verify instructor has access to this student
    const department = await Department.findOne({
      instructor: instructorId,
      students: studentId
    });

    if (!department) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Student not in your department.",
      });
    }

    const attempts = await AttemptedQuiz.find({
      student: studentId,
      quiz: quizId
    })
      .populate('quiz', 'title description questions')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: attempts
    });
  } catch (error) {
    console.error("Get student quiz attempts error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching student quiz attempts",
    });
  }
};

// @desc    Get department assignment submissions
// @route   GET /api/instructor/departments/:departmentId/assignment-submissions
// @access  Private (Instructor only)
export const getDepartmentAssignmentSubmissions = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { departmentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Verify instructor owns this department
    const department = await Department.findOne({
      _id: departmentId,
      instructor: instructorId
    }).populate('course', 'title');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found or access denied",
      });
    }

    // Get assignments for this course to filter submissions
    const courseAssignments = await Assignment.find({ course: department.course?._id }).select('_id');
    const assignmentIds = courseAssignments.map(assignment => assignment._id);

    const submissions = await Submission.find({
      student: { $in: department.students },
      assignment: { $in: assignmentIds } // Only submissions for assignments in this course
    })
      .populate('student', 'fullName userName email')
      .populate('assignment', 'title description dueDate maxScore course')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Submission.countDocuments({
      student: { $in: department.students },
      assignment: { $in: assignmentIds }
    });

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        submissions,
        totalPages,
        currentPage: parseInt(page),
        total
      }
    });
  } catch (error) {
    console.error("Get department assignment submissions error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching assignment submissions",
    });
  }
};

// @desc    Get assignment details
// @route   GET /api/instructor/assignments/:assignmentId
// @access  Private (Instructor only)
export const getAssignmentDetails = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await Assignment.findById(assignmentId)
      .populate('module', 'title course')
      .populate({
        path: 'module',
        populate: {
          path: 'course',
          select: 'title'
        }
      });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error("Get assignment details error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching assignment details",
    });
  }
};

// @desc    Get student assignment submissions
// @route   GET /api/instructor/students/:studentId/assignment-submissions/:assignmentId
// @access  Private (Instructor only)
export const getStudentAssignmentSubmissions = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { studentId, assignmentId } = req.params;

    // Verify instructor has access to this student
    const department = await Department.findOne({
      instructor: instructorId,
      students: studentId
    });

    if (!department) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Student not in your department.",
      });
    }

    const submissions = await Submission.find({
      student: studentId,
      assignment: assignmentId
    })
      .populate('assignment', 'title description dueDate maxScore')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error("Get student assignment submissions error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching student assignment submissions",
    });
  }
};

// @desc    Get submission details
// @route   GET /api/instructor/submissions/:submissionId
// @access  Private (Instructor only)
export const getSubmissionDetails = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { submissionId } = req.params;

    const submission = await Submission.findById(submissionId)
      .populate('student', 'fullName userName email')
      .populate({
        path: 'assignment',
        select: 'title description dueDate maxScore course',
        populate: {
          path: 'course',
          select: 'title'
        }
      })
      .populate('gradedBy', 'fullName');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // Verify instructor has access to this submission (through departments)
    const department = await Department.findOne({
      instructor: instructorId,
      students: submission.student._id,
      course: submission.assignment.course._id
    });

    if (!department) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Student not in your department.",
      });
    }

    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error("Get submission details error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching submission details",
    });
  }
};

// @desc    Grade a submission
// @route   PATCH /api/instructor/submissions/:submissionId/grade
// @access  Private (Instructor only)
export const gradeInstructorSubmission = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;

    if (grade !== undefined && (isNaN(grade) || grade < 0)) {
      return res.status(400).json({
        success: false,
        message: "Grade must be a non-negative number",
      });
    }

    const submission = await Submission.findById(submissionId)
      .populate({
        path: 'assignment',
        select: 'maxScore course'
      });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // Verify instructor has access to this submission
    const department = await Department.findOne({
      instructor: instructorId,
      students: submission.student,
      course: submission.assignment.course
    });

    if (!department) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Student not in your department.",
      });
    }

    // Validate grade against assignment max score
    if (grade !== undefined && submission.assignment.maxScore && grade > submission.assignment.maxScore) {
      return res.status(400).json({
        success: false,
        message: `Grade cannot exceed maximum score of ${submission.assignment.maxScore}`,
      });
    }

    // Update submission
    submission.grade = grade;
    submission.feedback = feedback;
    submission.status = 'GRADED';
    submission.gradedAt = new Date();
    submission.gradedBy = instructorId;

    await submission.save();

    // Populate the updated submission for response
    await submission.populate([
      { path: 'student', select: 'fullName userName email' },
      { path: 'assignment', select: 'title maxScore' },
      { path: 'gradedBy', select: 'fullName' }
    ]);

    res.status(200).json({
      success: true,
      message: "Submission graded successfully",
      data: submission
    });
  } catch (error) {
    console.error("Grade submission error:", error);
    res.status(500).json({
      success: false,
      message: "Error grading submission",
    });
  }
};

// @desc    Download submission file
// @route   GET /api/instructor/submissions/:submissionId/files/:fileIndex
// @access  Private (Instructor only)
export const downloadSubmissionFile = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { submissionId, fileIndex } = req.params;

    const submission = await Submission.findById(submissionId)
      .populate({
        path: 'assignment',
        select: 'course'
      });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    // Verify instructor has access
    const department = await Department.findOne({
      instructor: instructorId,
      students: submission.student,
      course: submission.assignment.course
    });

    if (!department) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Handle legacy fileUrl or new attachments
    if (fileIndex === 'legacy' && submission.fileUrl) {
      // Proxy legacy Cloudinary (or other external) file through our server to avoid CORS issues
      try {
        const fileUrl = submission.fileUrl;
        const response = await fetch(fileUrl, { redirect: 'follow' });
        if (!response.ok) {
          return res.status(response.status).json({ success: false, message: `Upstream fetch failed with status ${response.status}` });
        }

        // Derive filename from Content-Disposition or URL path
        const cd = response.headers.get('content-disposition');
        const ct = response.headers.get('content-type') || 'application/octet-stream';
        const cl = response.headers.get('content-length');
        let filename = 'submission-file';
        if (cd) {
          const m = cd.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
          const raw = m?.[1] || m?.[2];
          if (raw) filename = decodeURIComponent(raw);
        } else {
          try {
            const u = new URL(fileUrl);
            const last = u.pathname.split('/').filter(Boolean).pop();
            if (last) filename = decodeURIComponent(last);
          } catch { }
        }

        res.setHeader('Content-Type', ct);
        if (cl) res.setHeader('Content-Length', cl);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        if (response.body && typeof Readable.fromWeb === 'function') {
          // Node 18+ supports Readable.fromWeb
          return Readable.fromWeb(response.body).pipe(res);
        }

        // Fallback: buffer the response (less ideal for large files)
        const arrayBuffer = await response.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
      } catch (err) {
        console.error('Legacy file proxy error:', err);
        return res.status(500).json({ success: false, message: 'Error fetching legacy file' });
      }
    }

    if (submission.attachments && submission.attachments.length > 0) {
      const index = parseInt(fileIndex);
      if (isNaN(index) || index < 0 || index >= submission.attachments.length) {
        return res.status(400).json({
          success: false,
          message: "Invalid file index",
        });
      }

      const fileInfo = submission.attachments[index];

      // For new file system, check if file exists and serve it
      const path = await import('path');
      const fs = await import('fs');

      if (fs.existsSync(fileInfo.filePath)) {
        res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.originalName}"`);
        res.setHeader('Content-Type', fileInfo.mimeType);
        return res.sendFile(path.resolve(fileInfo.filePath));
      } else {
        return res.status(404).json({
          success: false,
          message: "File not found on server",
        });
      }
    }

    // If no files found at all
    return res.status(404).json({
      success: false,
      message: "No files found in submission",
    });

  } catch (error) {
    console.error("Download file error:", error);
    res.status(500).json({
      success: false,
      message: "Error downloading file",
    });
  }
};
