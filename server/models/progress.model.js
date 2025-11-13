import { Schema, model } from "mongoose";
import Course from "./course.model.js";
import Module from "./module.model.js";

const progressSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    completedLessons: [
      {
        lessonId: { type: Schema.Types.ObjectId, required: true },
        completedAt: { type: Date, default: Date.now },
      },
    ],

    completedModules: [
      {
        moduleId: { type: Schema.Types.ObjectId, required: true },
        completedAt: { type: Date, default: Date.now },
      },
    ],

    quizzes: [
      {
        quiz: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
        score: { type: Number, default: 0 },
        isPassed: { type: Boolean, default: false },
        attemptedAt: { type: Date, default: Date.now },
      },
    ],

    assignments: [
      {
        assignment: { type: Schema.Types.ObjectId, ref: "Assignment", required: true },
        fileUrl: { type: String, required: true },
        grade: { type: Number, min: 0, max: 100 },
        submittedAt: { type: Date, default: Date.now },
      },
    ],

    currentLevel: {
      type: String,
      default: "L1"
      // Removed enum to support dynamic levels from CourseLevelConfig
    },

    // Admin-controlled level lock: when enabled, automatic promotions are disabled
    levelLockEnabled: {
      type: Boolean,
      default: false
    },
    // If set, currentLevel will be enforced to this value while lock is enabled
    lockedLevel: {
      type: String,
      default: null
      // Removed enum to support dynamic levels from CourseLevelConfig
    },

    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    lastAccessed: {
      type: Date,
      default: Date.now,
    },

    // Timeline-based module access control
    currentAccessibleModule: {
      type: Schema.Types.ObjectId,
      ref: "Module",
    },
    
    // Track timeline violations and demotions
    timelineViolations: [{
      module: {
        type: Schema.Types.ObjectId,
        ref: "Module",
        required: true,
      },
      deadline: {
        type: Date,
        required: true,
      },
      violatedAt: {
        type: Date,
        default: Date.now,
      },
      demotedFromModule: {
        type: Schema.Types.ObjectId,
        ref: "Module",
      },
      demotedToModule: {
        type: Schema.Types.ObjectId,
        ref: "Module",
      },
      reason: {
        type: String,
        default: 'TIMELINE_VIOLATION',
      },
    }],
    
    // Track notifications sent to student
    timelineNotifications: [{
      type: {
        type: String,
        enum: ['WARNING', 'DEMOTION', 'DEADLINE_REMINDER'],
        required: true,
      },
      module: {
        type: Schema.Types.ObjectId,
        ref: "Module",
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
      sentAt: {
        type: Date,
        default: Date.now,
      },
      read: {
        type: Boolean,
        default: false,
      },
    }],
  },
  { timestamps: true }
);

progressSchema.index({ student: 1, course: 1 }, { unique: true });
progressSchema.index({ course: 1 });
progressSchema.index({ student: 1 });
progressSchema.index({ "completedLessons.lessonId": 1 });
progressSchema.index({ "completedModules.moduleId": 1 });
progressSchema.index({ lastAccessed: 1 });
progressSchema.index({ currentAccessibleModule: 1 });
progressSchema.index({ "timelineViolations.module": 1 });
progressSchema.index({ "timelineNotifications.read": 1 });

progressSchema.methods.calculateProgress = async function () {
  const course = await Course.findById(this.course).lean();

  if (!course) return this.progressPercent;

  // Get total lessons by querying modules directly since course.modules contains only IDs
  let totalLessons = 0;
  let totalModules = 0;
  if (course.modules && course.modules.length > 0) {
    const modules = await Module.find({ 
      _id: { $in: course.modules },
      course: this.course 
    }).lean();
    totalModules = modules.length;
    totalLessons = modules.reduce(
      (count, mod) => count + (mod.lessons?.length || 0),
      0
    );
  }
 
  const completedLessons = this.completedLessons.length;
  const completedModules = this.completedModules.length;
 
  const lessonWeight = 0.7;
  const quizWeight = 0.2;
  const assignmentWeight = 0.1;
 
  // If no lessons are defined, approximate lessonProgress using modules
  let lessonProgress = 0;
  if (totalLessons > 0) {
    lessonProgress = (completedLessons / totalLessons) * 100;
  } else if (totalModules > 0) {
    lessonProgress = (completedModules / totalModules) * 100;
  }
 
  const passedQuizzes = this.quizzes.filter((q) => q.isPassed).length;
  const totalQuizzes = course.quizzes?.length || 0;
  const quizProgress = totalQuizzes > 0 ? (passedQuizzes / totalQuizzes) * 100 : 0;
 
  const submittedAssignments = this.assignments.length;
  const totalAssignments = course.assignments?.length || 0;
  const assignmentProgress = totalAssignments > 0 ? (submittedAssignments / totalAssignments) * 100 : 0;
 
  // Dynamically normalize weights based on available components
  const parts = [];
  const weights = [];
  if (totalLessons > 0 || totalModules > 0) { parts.push(lessonProgress); weights.push(lessonWeight); }
  if (totalQuizzes > 0) { parts.push(quizProgress); weights.push(quizWeight); }
  if (totalAssignments > 0) { parts.push(assignmentProgress); weights.push(assignmentWeight); }
  
  let totalProgress = 0;
  if (parts.length > 0) {
    const weighted = parts.reduce((sum, val, idx) => sum + val * weights[idx], 0);
    const weightSum = weights.reduce((a,b)=>a+b,0);
    totalProgress = weighted / (weightSum || 1);
  }
 
  this.progressPercent = Math.min(100, Math.round(totalProgress));
  return this.progressPercent;
};

// Method to determine current accessible module based on completed modules and timeline
progressSchema.methods.updateCurrentAccessibleModule = async function() {
  try {
    const course = await Course.findById(this.course).populate('modules');
    if (!course || !course.modules || course.modules.length === 0) {
      return;
    }

    // Sort modules by order
    const sortedModules = course.modules.sort((a, b) => a.order - b.order);
    
    // Find the next incomplete module
    let nextModule = null;
    for (const module of sortedModules) {
      const isCompleted = this.completedModules.some(
        completed => completed.moduleId.toString() === module._id.toString()
      );
      
      if (!isCompleted) {
        nextModule = module;
        break;
      }
    }
    
    // If all modules are completed, set to null
    this.currentAccessibleModule = nextModule ? nextModule._id : null;
  } catch (error) {
    console.error('Error updating current accessible module:', error);
  }
};

// Method to demote student to previous module
progressSchema.methods.demoteToModule = async function(targetModuleId, reason = 'TIMELINE_VIOLATION') {
  try {
    // Remove completion records for modules after the target module
    const course = await Course.findById(this.course).populate('modules');
    if (!course) return;

    const targetModule = course.modules.find(m => m._id.toString() === targetModuleId.toString());
    if (!targetModule) return;

    // Get all modules that come after the target module
    const modulesToRemove = course.modules
      .filter(m => m.order > targetModule.order)
      .map(m => m._id.toString());

    // Remove completion records for these modules
    this.completedModules = this.completedModules.filter(
      completed => !modulesToRemove.includes(completed.moduleId.toString())
    );

    // Also remove lesson completions for lessons in these modules
    const ModuleModel = this.constructor.base.model('Module');
    const modulesData = await ModuleModel.find({
      _id: { $in: modulesToRemove }
    }).select('lessons');
    
    const lessonsToRemove = modulesData.reduce((acc, mod) => {
      return acc.concat(mod.lessons.map(l => l.toString()));
    }, []);

    this.completedLessons = this.completedLessons.filter(
      completed => !lessonsToRemove.includes(completed.lessonId.toString())
    );

    // Update current accessible module
    this.currentAccessibleModule = targetModuleId;
    
    return true;
  } catch (error) {
    console.error('Error demoting student:', error);
    return false;
  }
};

// Method to add timeline violation record
progressSchema.methods.addTimelineViolation = function(moduleId, deadline, demotedFromModuleId, demotedToModuleId) {
  this.timelineViolations.push({
    module: moduleId,
    deadline: deadline,
    violatedAt: new Date(),
    demotedFromModule: demotedFromModuleId,
    demotedToModule: demotedToModuleId,
    reason: 'TIMELINE_VIOLATION',
  });
};

// Method to add timeline notification
progressSchema.methods.addTimelineNotification = function(type, moduleId, message) {
  this.timelineNotifications.push({
    type: type,
    module: moduleId,
    message: message,
    sentAt: new Date(),
    read: false,
  });
};

// Method to get unread timeline notifications
progressSchema.methods.getUnreadTimelineNotifications = function() {
  return this.timelineNotifications.filter(notification => !notification.read);
};

// Method to mark notification as read
progressSchema.methods.markNotificationRead = function(notificationId) {
  const notification = this.timelineNotifications.id(notificationId);
  if (notification) {
    notification.read = true;
  }
};

progressSchema.pre("save", async function (next) {
  try {
    await this.calculateProgress();
    
    // Update current accessible module if not manually set
    if (this.isModified('completedModules') && !this.isModified('currentAccessibleModule')) {
      await this.updateCurrentAccessibleModule();
    }
    
    next();
  } catch (err) {
    next(err);
  }
});

export default model("Progress", progressSchema);
