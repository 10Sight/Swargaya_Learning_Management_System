import { Schema, model } from "mongoose";
import Course from "./course.model.js";
import Module from "./module.model.js";

const progressSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
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
      enum: ["L1", "L2", "L3"],
      default: "L1"
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
  },
  { timestamps: true }
);

progressSchema.index({ student: 1, course: 1 }, { unique: true });
progressSchema.index({ course: 1 });
progressSchema.index({ student: 1 });
progressSchema.index({ "completedLessons.lessonId": 1 });
progressSchema.index({ "completedModules.moduleId": 1 });
progressSchema.index({ lastAccessed: 1 });

progressSchema.methods.calculateProgress = async function () {
  const course = await Course.findById(this.course).lean();

  if (!course) return this.progressPercent;

  // Get total lessons by querying modules directly since course.modules contains only IDs
  let totalLessons = 0;
  if (course.modules && course.modules.length > 0) {
    const modules = await Module.find({ 
      _id: { $in: course.modules },
      course: this.course 
    }).lean();
    
    totalLessons = modules.reduce(
      (count, mod) => count + (mod.lessons?.length || 0),
      0
    );
  }

  const completedLessons = this.completedLessons.length;

  const lessonWeight = 0.7;
  const quizWeight = 0.2;
  const assignmentWeight = 0.1;

  const lessonProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  const passedQuizzes = this.quizzes.filter((q) => q.isPassed).length;
  const totalQuizzes = course.quizzes?.length || 0;
  const quizProgress = totalQuizzes > 0 ? (passedQuizzes / totalQuizzes) * 100 : 0;

  const submittedAssignments = this.assignments.length;
  const totalAssignments = course.assignments?.length || 0;
  const assignmentProgress =
    totalAssignments > 0 ? (submittedAssignments / totalAssignments) * 100 : 0;

  const totalProgress =
    lessonProgress * lessonWeight +
    quizProgress * quizWeight +
    assignmentProgress * assignmentWeight;

  this.progressPercent = Math.min(100, Math.round(totalProgress));
  return this.progressPercent;
};

progressSchema.pre("save", async function (next) {
  try {
    await this.calculateProgress();
    next();
  } catch (err) {
    next(err);
  }
});

export default model("Progress", progressSchema);
