import mongoose from "mongoose";
import Certificate from "../models/certificate.model.js";
import CertificateTemplate from "../models/certificateTemplate.model.js";
import Course from "../models/course.model.js";
import Progress from "../models/progress.model.js";

// Lazy imports inside function to avoid circulars where possible

/**
 * Ensure a certificate exists for the student/course if they are eligible.
 * Eligibility: all modules completed AND all course quizzes have at least one PASSED attempt
 * - If no quizzes exist for the course, quizzes criterion is considered satisfied.
 * Returns: { created: boolean, certificate?: doc, reason?: string }
 */
export async function ensureCertificateIfEligible(studentId, courseId, opts = {}) {
  if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(courseId)) {
    return { created: false, reason: "Invalid student or course id" };
  }

  // Already has a certificate?
  const existing = await Certificate.findOne({ student: studentId, course: courseId });
  if (existing) return { created: false, certificate: existing, reason: "Exists" };

  const course = await Course.findById(courseId).populate('modules');
  if (!course) return { created: false, reason: "Course not found" };

  const progress = await Progress.findOne({ student: studentId, course: courseId });
  if (!progress) return { created: false, reason: "No progress" };

  const totalModules = course.modules?.length || 0;
  const completedModules = progress.completedModules?.length || 0;
  const modulesCompleted = totalModules > 0 && completedModules >= totalModules;

  // Ensure progress is up-to-date and require 100%
  try { await progress.calculateProgress(); } catch (_) { }
  const progressComplete = (progress.progressPercent >= 100);

  // Quizzes requirement: all quizzes in course have a PASSED attempt
  const Quiz = (await import('../models/quiz.model.js')).default;
  const AttemptedQuiz = (await import('../models/attemptedQuiz.model.js')).default;

  const quizzes = await Quiz.find({ course: courseId }).select('_id');
  const totalQuizzes = quizzes.length;
  let quizzesOk = true;
  if (totalQuizzes > 0) {
    const quizIds = quizzes.map(q => q._id);
    const passedAttempts = await AttemptedQuiz.find({
      student: studentId,
      status: 'PASSED',
      quiz: { $in: quizIds }
    }).select('quiz');
    const passedQuizSet = new Set(passedAttempts.map(a => String(a.quiz)));
    quizzesOk = quizIds.every(id => passedQuizSet.has(String(id)));
  }

  if (!(modulesCompleted && quizzesOk && progressComplete)) {
    return { created: false, reason: "Eligibility not met" };
  }

  // Determine issuer (instructor of student's department if available), else fallback to provided or student
  const User = (await import('../models/auth.model.js')).default;
  const Department = (await import('../models/department.model.js')).default;
  const student = await User.findById(studentId).populate('department');

  let issuedBy = opts.issuedByUserId;
  try {
    if (!issuedBy && student?.department?._id) {
      const department = await Department.findById(student.department._id).select('instructor');
      issuedBy = department?.instructor || issuedBy;
    }
  } catch (_) { }
  if (!issuedBy) issuedBy = studentId; // last resort

  // Attach minimal metadata or use default template to enrich
  let metadata = undefined;
  try {
    const template = await CertificateTemplate.findOne({ isDefault: true, isActive: true })
      || await CertificateTemplate.findOne({ isActive: true }).sort({ createdAt: 1 });
    if (template) {
      const certificateData = {
        studentName: student?.fullName || '',
        courseName: course?.title || '',
        departmentName: student?.department?.name || 'N/A',
        instructorName: 'N/A',
        level: progress?.currentLevel || 'L1',
        issueDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        grade: 'PASS'
      };
      let html = template.template || '';
      Object.keys(certificateData).forEach(k => {
        html = html.replace(new RegExp(`{{${k}}}`, 'g'), certificateData[k]);
      });
      metadata = {
        ...certificateData,
        templateId: template._id.toString(),
        templateName: template.name,
        generatedHTML: html,
        styles: template.styles
      };
    }
  } catch (_) { }

  const cert = await Certificate.create({
    student: studentId,
    course: courseId,
    issuedBy,
    grade: 'PASS',
    metadata,
  });

  return { created: true, certificate: cert };
}

export default ensureCertificateIfEligible;