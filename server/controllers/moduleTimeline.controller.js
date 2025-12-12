import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import ModuleTimeline from "../models/moduleTimeline.model.js";
import Progress from "../models/progress.model.js";
import Course from "../models/course.model.js";
import Module from "../models/module.model.js";
import Department from "../models/department.model.js";
import User from "../models/auth.model.js";

// Create or update module timeline
export const createOrUpdateTimeline = asyncHandler(async (req, res) => {
  const {
    courseId,
    moduleId,
    departmentId,
    deadline,
    gracePeriodHours = 24,
    enableWarnings = true,
    warningPeriods = [168, 72, 24],
    description,
  } = req.body;

  const { timelineId } = req.params; // For PUT requests

  if (!courseId || !moduleId || !departmentId || !deadline) {
    throw new ApiError("Course ID, Module ID, Department ID, and deadline are required", 400);
  }

  // Basic ObjectId validation to fail fast on obviously invalid input
  const isValidObjectId = (id) => {
    return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
  };

  if (!isValidObjectId(courseId)) {
    throw new ApiError("Invalid course ID format", 400);
  }
  if (!isValidObjectId(moduleId)) {
    throw new ApiError("Invalid module ID format", 400);
  }
  if (!isValidObjectId(departmentId)) {
    throw new ApiError("Invalid department ID format", 400);
  }

  // Parse and validate deadline
  const parsedDeadline = new Date(deadline);
  if (Number.isNaN(parsedDeadline.getTime())) {
    throw new ApiError("Invalid deadline date", 400);
  }

  // Normalize warning periods: ensure array of positive numbers
  const normalizedWarningPeriods = Array.isArray(warningPeriods)
    ? warningPeriods
      .map((p) => Number(p))
      .filter((p) => Number.isFinite(p) && p > 0)
    : [168, 72, 24];

  // Validate that the course, module, and department exist
  const [course, module, department] = await Promise.all([
    Course.findById(courseId).select("_id modules"),
    Module.findById(moduleId).select("_id"),
    Department.findById(departmentId).select("_id"),
  ]);

  if (!course) throw new ApiError("Course not found", 404);
  if (!module) throw new ApiError("Module not found", 404);
  if (!department) throw new ApiError("Department not found", 404);

  // Check if module belongs to the course (need to compare ObjectIds as strings)
  const moduleBelongsToCourse = Array.isArray(course.modules)
    && course.modules.some((m) => m.toString() === moduleId.toString());

  if (!moduleBelongsToCourse) {
    throw new ApiError("Module does not belong to the specified course", 400);
  }

  // Check if timeline already exists for this module and department
  let timeline;

  if (timelineId) {
    // PUT request - find specific timeline by ID
    timeline = await ModuleTimeline.findById(timelineId);
    if (!timeline) {
      throw new ApiError("Timeline not found", 404);
    }
  } else {
    // POST request - find by course, module, department combination
    timeline = await ModuleTimeline.findOne({
      course: courseId,
      module: moduleId,
      department: departmentId,
    });
  }

  if (timeline) {
    // Update existing timeline
    timeline.deadline = parsedDeadline;
    timeline.gracePeriodHours = gracePeriodHours;
    timeline.enableWarnings = enableWarnings;
    timeline.warningPeriods = normalizedWarningPeriods;
    timeline.description = description;
    timeline.updatedBy = req.user._id;
    timeline.lastProcessedAt = null; // Reset processing flag

    await timeline.save();
  } else {
    // Create new timeline
    timeline = await ModuleTimeline.create({
      course: courseId,
      module: moduleId,
      department: departmentId,
      deadline: parsedDeadline,
      gracePeriodHours,
      enableWarnings,
      warningPeriods: normalizedWarningPeriods,
      description,
      createdBy: req.user._id,
    });
  }

  await timeline.populate(["course", "module", "department"]);

  res.status(200).json(
    new ApiResponse(200, timeline, "Module timeline set successfully"),
  );
});

// Get timelines for a course and department
export const getTimelinesForDepartment = asyncHandler(async (req, res) => {
  const { courseId, departmentId } = req.params;

  if (!courseId || !departmentId) {
    throw new ApiError("Course ID and Department ID are required", 400);
  }

  const timelines = await ModuleTimeline.find({
    course: courseId,
    department: departmentId,
    isActive: true
  })
    .populate('module', 'title description order')
    .populate('course', 'title')
    .populate('department', 'name')
    .sort({ 'module.order': 1 });

  res.status(200).json(
    new ApiResponse(200, timelines, "Timelines retrieved successfully")
  );
});

// Get all timelines (admin view)
export const getAllTimelines = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {
    isActive: true
  };

  // Add filters if provided
  if (req.query.courseId) filter.course = req.query.courseId;
  if (req.query.departmentId) filter.department = req.query.departmentId;
  if (req.query.overdue === 'true') {
    filter.deadline = { $lt: new Date() };
  }

  const [timelines, total] = await Promise.all([
    ModuleTimeline.find(filter)
      .populate('course', 'title')
      .populate('module', 'title order')
      .populate('department', 'name')
      .populate('createdBy', 'fullName')
      .sort({ deadline: 1 })
      .skip(skip)
      .limit(limit),
    ModuleTimeline.countDocuments(filter)
  ]);

  const totalPages = Math.ceil(total / limit);

  res.status(200).json(
    new ApiResponse(200, {
      timelines,
      pagination: {
        current: page,
        pages: totalPages,
        total,
        limit
      }
    }, "All timelines retrieved successfully")
  );
});

// Delete/deactivate timeline
export const deleteTimeline = asyncHandler(async (req, res) => {
  const { timelineId } = req.params;

  const timeline = await ModuleTimeline.findById(timelineId);
  if (!timeline) {
    throw new ApiError("Timeline not found", 404);
  }

  // Soft delete by marking as inactive
  timeline.isActive = false;
  timeline.updatedBy = req.user._id;
  await timeline.save();

  res.status(200).json(
    new ApiResponse(200, null, "Timeline deactivated successfully")
  );
});

// Get timeline status for students in a department
export const getTimelineStatus = asyncHandler(async (req, res) => {
  const { courseId, departmentId } = req.params;

  // Get all active timelines for this course and department
  const timelines = await ModuleTimeline.find({
    course: courseId,
    department: departmentId,
    isActive: true
  })
    .populate('module', 'title order')
    .sort({ 'module.order': 1 });

  // Get all students in the department
  const department = await Department.findById(departmentId).populate('students', 'fullName email');
  if (!department) {
    throw new ApiError("Department not found", 404);
  }

  // Get progress for all students
  const progressRecords = await Progress.find({
    course: courseId,
    student: { $in: department.students.map(s => s._id) }
  }).populate('student', 'fullName email');

  // Build status report
  const statusReport = timelines.map(timeline => {
    const moduleStatus = {
      module: timeline.module,
      deadline: timeline.deadline,
      gracePeriodHours: timeline.gracePeriodHours,
      isOverdue: new Date() > timeline.deadline,
      students: []
    };

    department.students.forEach(student => {
      const studentProgress = progressRecords.find(p =>
        p.student._id.toString() === student._id.toString()
      );

      const isCompleted = studentProgress?.completedModules.some(
        cm => cm.moduleId.toString() === timeline.module._id.toString()
      );

      const hasMissedDeadline = timeline.hasStudentMissedDeadline(student._id);
      const hasViolation = studentProgress?.timelineViolations.some(
        tv => tv.module.toString() === timeline.module._id.toString()
      );

      moduleStatus.students.push({
        student: {
          _id: student._id,
          fullName: student.fullName,
          email: student.email
        },
        isCompleted,
        completedAt: isCompleted ?
          studentProgress.completedModules.find(cm =>
            cm.moduleId.toString() === timeline.module._id.toString()
          )?.completedAt : null,
        hasMissedDeadline,
        hasViolation,
        status: isCompleted ? 'COMPLETED' :
          hasMissedDeadline ? 'MISSED_DEADLINE' :
            moduleStatus.isOverdue ? 'OVERDUE' : 'IN_PROGRESS'
      });
    });

    return moduleStatus;
  });

  res.status(200).json(
    new ApiResponse(200, statusReport, "Timeline status retrieved successfully")
  );
});

// Process timeline enforcement (background job endpoint)
export const processTimelineEnforcement = asyncHandler(async (req, res) => {
  const now = new Date();

  // Get timelines that need processing
  const timelinesToProcess = await ModuleTimeline.getTimelinesToProcess();

  let processedCount = 0;
  let demotionCount = 0;
  const errors = [];

  for (const timeline of timelinesToProcess) {
    try {
      // Get students in this department who haven't completed the module
      const departmentStudents = await User.find({
        _id: { $in: timeline.department.students },
        role: 'STUDENT'
      });

      const progressRecords = await Progress.find({
        course: timeline.course._id,
        student: { $in: departmentStudents.map(s => s._id) }
      });

      for (const progress of progressRecords) {
        // Check if student has completed this module
        const hasCompleted = progress.completedModules.some(
          cm => cm.moduleId.toString() === timeline.module._id.toString()
        );

        if (!hasCompleted && !timeline.hasStudentMissedDeadline(progress.student)) {
          // Check if grace period has passed
          const graceDeadline = new Date(
            timeline.deadline.getTime() + (timeline.gracePeriodHours * 60 * 60 * 1000)
          );

          if (now > graceDeadline) {
            // Find the previous module to demote to
            const course = await Course.findById(timeline.course._id).populate('modules');
            const sortedModules = course.modules.sort((a, b) => a.order - b.order);
            const currentModuleIndex = sortedModules.findIndex(
              m => m._id.toString() === timeline.module._id.toString()
            );

            if (currentModuleIndex > 0) {
              const previousModule = sortedModules[currentModuleIndex - 1];

              // Demote student
              const demoted = await progress.demoteToModule(previousModule._id);

              if (demoted) {
                // Record timeline violation
                progress.addTimelineViolation(
                  timeline.module._id,
                  timeline.deadline,
                  timeline.module._id,
                  previousModule._id
                );

                // Add notification
                progress.addTimelineNotification(
                  'DEMOTION',
                  timeline.module._id,
                  `You have been moved back to "${previousModule.title}" due to missing the deadline for "${timeline.module.title}".`
                );

                await progress.save();

                // Track in timeline
                timeline.addMissedDeadlineStudent(progress.student, previousModule._id);
                timeline.markStudentDemoted(progress.student);

                demotionCount++;
              }
            }
          }
        }
      }

      // Update processing timestamp
      timeline.lastProcessedAt = now;
      await timeline.save();
      processedCount++;

    } catch (error) {
      errors.push({
        timelineId: timeline._id,
        error: error.message
      });
    }
  }

  res.status(200).json(
    new ApiResponse(200, {
      processedCount,
      demotionCount,
      errors: errors.length > 0 ? errors : undefined
    }, `Timeline enforcement processed. ${demotionCount} students demoted.`)
  );
});

// Send timeline warnings (background job endpoint)
export const sendTimelineWarnings = asyncHandler(async (req, res) => {
  const now = new Date();

  // Get upcoming timelines that might need warnings
  const upcomingTimelines = await ModuleTimeline.getUpcomingWarnings();

  let warningsSent = 0;
  const errors = [];

  for (const timeline of upcomingTimelines) {
    try {
      const timeUntilDeadline = timeline.deadline.getTime() - now.getTime();
      const hoursUntilDeadline = timeUntilDeadline / (1000 * 60 * 60);

      // Check each warning period
      for (const warningHours of timeline.warningPeriods) {
        if (hoursUntilDeadline <= warningHours && hoursUntilDeadline > (warningHours - 1)) {
          const warningType = warningHours === 168 ? '7_DAYS' :
            warningHours === 72 ? '3_DAYS' :
              warningHours === 24 ? '1_DAY' : 'CUSTOM';

          // Get students who need this warning
          const departmentStudents = await User.find({
            _id: { $in: timeline.department.students },
            role: 'STUDENT'
          });

          const progressRecords = await Progress.find({
            course: timeline.course._id,
            student: { $in: departmentStudents.map(s => s._id) }
          });

          for (const progress of progressRecords) {
            // Check if student has completed module
            const hasCompleted = progress.completedModules.some(
              cm => cm.moduleId.toString() === timeline.module._id.toString()
            );

            if (!hasCompleted && timeline.shouldSendWarning(progress.student, warningType)) {
              // Send warning
              const warningMessage = `Reminder: You have ${Math.ceil(hoursUntilDeadline)} hours left to complete "${timeline.module.title}" before the deadline.`;

              progress.addTimelineNotification(
                'WARNING',
                timeline.module._id,
                warningMessage
              );

              await progress.save();

              // Record warning sent
              timeline.recordWarningSent(progress.student, warningType);
              warningsSent++;
            }
          }
        }
      }

      await timeline.save();

    } catch (error) {
      errors.push({
        timelineId: timeline._id,
        error: error.message
      });
    }
  }

  res.status(200).json(
    new ApiResponse(200, {
      warningsSent,
      errors: errors.length > 0 ? errors : undefined
    }, `Timeline warnings processed. ${warningsSent} warnings sent.`)
  );
});

// Get timeline notifications for current student
export const getMyTimelineNotifications = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const { courseId } = req.params;

  const progress = await Progress.findOne({
    student: studentId,
    course: courseId
  }).populate('timelineNotifications.module', 'title');

  if (!progress) {
    throw new ApiError("Progress record not found", 404);
  }

  const notifications = progress.timelineNotifications
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
    .slice(0, 50); // Limit to 50 most recent

  res.status(200).json(
    new ApiResponse(200, notifications, "Timeline notifications retrieved successfully")
  );
});

// Mark notification as read
export const markNotificationRead = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const { courseId, notificationId } = req.params;

  const progress = await Progress.findOne({
    student: studentId,
    course: courseId
  });

  if (!progress) {
    throw new ApiError("Progress record not found", 404);
  }

  progress.markNotificationRead(notificationId);
  await progress.save();

  res.status(200).json(
    new ApiResponse(200, null, "Notification marked as read")
  );
});
