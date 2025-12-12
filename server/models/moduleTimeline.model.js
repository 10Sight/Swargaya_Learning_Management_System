import { Schema, model } from "mongoose";

const moduleTimelineSchema = new Schema(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    module: {
      type: Schema.Types.ObjectId,
      ref: "Module",
      required: true,
      index: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    // Deadline for completing this module
    deadline: {
      type: Date,
      required: true,
      index: true,
    },
    // Grace period (in hours) after deadline before demotion occurs
    gracePeriodHours: {
      type: Number,
      default: 24,
      min: 0,
    },
    // Whether timeline enforcement is active for this module
    isActive: {
      type: Boolean,
      default: true,
    },
    // Whether to send warnings before deadline
    enableWarnings: {
      type: Boolean,
      default: true,
    },
    // Warning periods (in hours before deadline)
    warningPeriods: {
      type: [Number],
      default: [168, 72, 24], // 7 days, 3 days, 1 day
    },
    // Admin who set this timeline
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Admin who last updated this timeline
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    // Tracking for students who missed deadline
    missedDeadlineStudents: [{
      student: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      missedAt: {
        type: Date,
        default: Date.now,
      },
      demotedAt: {
        type: Date,
      },
      previousModule: {
        type: Schema.Types.ObjectId,
        ref: "Module",
      },
      // Whether student was notified about demotion
      notified: {
        type: Boolean,
        default: false,
      },
    }],
    // Tracking for warnings sent
    warningsSent: [{
      student: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      warningType: {
        type: String,
        enum: ['7_DAYS', '3_DAYS', '1_DAY', 'OVERDUE'],
        required: true,
      },
      sentAt: {
        type: Date,
        default: Date.now,
      },
    }],
    // Optional description for admin reference
    description: {
      type: String,
      trim: true,
    },
    // Whether this timeline has been processed for enforcement
    lastProcessedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
moduleTimelineSchema.index({ course: 1, department: 1 });
moduleTimelineSchema.index({ deadline: 1, isActive: 1 });
moduleTimelineSchema.index({ department: 1, deadline: 1 });
moduleTimelineSchema.index({ "missedDeadlineStudents.student": 1 });
moduleTimelineSchema.index({ lastProcessedAt: 1 });

// Method to check if a student has missed the deadline
moduleTimelineSchema.methods.hasStudentMissedDeadline = function (studentId) {
  return this.missedDeadlineStudents.some(
    missed => missed.student.toString() === studentId.toString()
  );
};

// Method to add a student to missed deadline list
moduleTimelineSchema.methods.addMissedDeadlineStudent = function (studentId, previousModuleId) {
  if (!this.hasStudentMissedDeadline(studentId)) {
    this.missedDeadlineStudents.push({
      student: studentId,
      missedAt: new Date(),
      previousModule: previousModuleId,
    });
  }
};

// Method to mark student as demoted
moduleTimelineSchema.methods.markStudentDemoted = function (studentId) {
  const missedRecord = this.missedDeadlineStudents.find(
    missed => missed.student.toString() === studentId.toString()
  );
  if (missedRecord) {
    missedRecord.demotedAt = new Date();
  }
};

// Method to check if warning should be sent
moduleTimelineSchema.methods.shouldSendWarning = function (studentId, warningType) {
  if (!this.enableWarnings) return false;

  return !this.warningsSent.some(
    warning => warning.student.toString() === studentId.toString() &&
      warning.warningType === warningType
  );
};

// Method to record warning sent
moduleTimelineSchema.methods.recordWarningSent = function (studentId, warningType) {
  this.warningsSent.push({
    student: studentId,
    warningType: warningType,
    sentAt: new Date(),
  });
};

// Static method to get active timelines that need processing
moduleTimelineSchema.statics.getTimelinesToProcess = function () {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  return this.find({
    isActive: true,
    deadline: { $lte: now },
    $or: [
      { lastProcessedAt: { $exists: false } },
      { lastProcessedAt: { $lte: oneHourAgo } }
    ]
  }).populate(['course', 'module', 'department']);
};

// Static method to get upcoming warnings
moduleTimelineSchema.statics.getUpcomingWarnings = function () {
  const now = new Date();

  return this.find({
    isActive: true,
    enableWarnings: true,
    deadline: { $gt: now },
  }).populate(['course', 'module', 'department']);
};

export default model("ModuleTimeline", moduleTimelineSchema);
