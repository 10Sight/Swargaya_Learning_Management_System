import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axiosInstance from "@/Helper/axiosInstance";
import AccountStatusWrapper from "../../components/student/AccountStatusWrapper";
import StudentLevelRoadmap from "../../components/student/StudentLevelRoadmap";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BookOpen,
  Check,
  Lock,
  Clock,
  ArrowRight,
  AlertCircle,
  ClipboardList,
  Users,
  Award,
} from "lucide-react";
import { useGetActiveConfigQuery } from "@/Redux/AllApi/CourseLevelConfigApi";
import { useGetStudentCertificatesQuery } from "@/Redux/AllApi/CertificateApi";
import { BRAND } from "@/utils/brandColors";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    department: null,
    course: null,
    progress: null,
  });
  const [error, setError] = useState(null);

  const { data: levelConfigData } = useGetActiveConfigQuery();
  const availableLevels = levelConfigData?.data?.levels || [
    { name: "L1", order: 0 },
    { name: "L2", order: 1 },
    { name: "L3", order: 2 },
  ];

  const { data: certificatesData } = useGetStudentCertificatesQuery();
  const certificates = certificatesData?.data || [];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const [departmentRes, courseContentRes] = await Promise.allSettled([
          axiosInstance.get("/api/departments/me/my-department"),
          axiosInstance.get("/api/departments/me/course-content")
        ]);

        const department = departmentRes.status === 'fulfilled' ? departmentRes.value?.data?.data : null;
        const courseData = courseContentRes.status === 'fulfilled' ? courseContentRes.value?.data?.data : null;

        setDashboardData({
          department,
          course: courseData,
          progress: courseData?.progress || null,
        });

        setError(null);
      } catch {
        setError("Failed to load dashboard. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
  }, []);

  const calculateCourseProgress = () => {
    if (!dashboardData.course?.modules) return 0;
    const totalModules = dashboardData.course.modules.length;
    const completedModules = dashboardData.progress?.completedModules?.length || 0;
    return totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
  };

  const getTotalLessons = () => {
    if (!dashboardData.course?.modules) return 0;
    return dashboardData.course.modules.reduce(
      (total, module) => total + (module.lessons?.length || 0), 0
    );
  };

  const getCompletedLessons = () => dashboardData.progress?.completedLessons?.length || 0;

  const getCompletedLessonIds = () =>
    new Set(
      (dashboardData.progress?.completedLessons || []).map((l) =>
        String(l.lessonId || l._id || l)
      )
    );

  const getCurrentModule = () => {
    if (!dashboardData.course?.modules || !dashboardData.progress) return null;
    const completedCount = dashboardData.progress.completedModules?.length || 0;
    return dashboardData.course.modules[completedCount] || null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const courseProgress = calculateCourseProgress();
  const totalLessons = getTotalLessons();
  const completedLessons = getCompletedLessons();
  const totalModules = dashboardData.course?.modules?.length || 0;
  const completedModulesCount = dashboardData.progress?.completedModules?.length || 0;
  const currentModule = getCurrentModule();
  // Prefer the department-wide active level (reflects the course the student was just
  // switched to, e.g. right after a level-up) over the per-course progress level, which
  // defaults to "L1" until the student has any progress recorded on that specific course.
  const currentLevel = dashboardData.course?.activeLevel || dashboardData.progress?.currentLevel || "L1";
  const courseId = dashboardData.course?._id || dashboardData.course?.id;

  // The exact next lesson to resume: first lesson in the current module that isn't
  // marked complete yet, falling back to the module's first lesson.
  const nextLesson = (() => {
    if (!currentModule?.lessons?.length) return null;
    const completedIds = getCompletedLessonIds();
    return (
      currentModule.lessons.find((l) => !completedIds.has(String(l.id || l._id))) ||
      currentModule.lessons[0]
    );
  })();

  const handleContinueLearning = () => {
    if (nextLesson) {
      const lessonId = nextLesson.id || nextLesson._id;
      navigate(`/student/lesson/${lessonId}${courseId ? `?courseId=${courseId}` : ""}`);
    } else {
      navigate(courseId ? `/student/course?courseId=${courseId}` : '/student/course');
    }
  };

  const goToCourse = (id) => navigate(id ? `/student/course?courseId=${id}` : '/student/course');

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          <Skeleton className="h-64 w-full rounded-lg lg:col-span-3" />
          <Skeleton className="h-64 w-full rounded-lg lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <AccountStatusWrapper allowPending={false}>
      <div className="space-y-4 sm:space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
              {getGreeting()}, {user?.fullName?.split(' ')[0] || 'Student'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {dashboardData.course
                ? `${courseProgress}% through ${dashboardData.course.title}`
                : "Ready to continue your learning journey?"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: BRAND.redSoft, color: BRAND.red }}
            >
              Level {currentLevel}
            </span>
            {dashboardData.department && (
              <span
                className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium truncate max-w-[8rem] sm:max-w-none"
                style={{ backgroundColor: BRAND.blueSoft, borderColor: `${BRAND.blue}33`, color: BRAND.blue }}
              >
                {dashboardData.department.name}
              </span>
            )}
          </div>
        </div>

        {/* Resume panel */}
        {dashboardData.course && (
          <div
            className="rounded-lg text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6"
            style={{ background: `linear-gradient(135deg, ${BRAND.navy}, ${BRAND.blueDark})` }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wide font-medium" style={{ color: "#93C5E8" }}>
                {courseProgress >= 100 ? "Course complete" : "Up next"}
              </p>
              <p className="text-base sm:text-lg font-semibold mt-1 truncate">
                {courseProgress >= 100
                  ? "You've completed every module in this course"
                  : nextLesson?.title || currentModule?.title || "Start your first module"}
              </p>
              {courseProgress < 100 && (
                <p className="text-sm mt-1 truncate flex items-center gap-1.5" style={{ color: "#B9D9EE" }}>
                  {currentModule?.title}
                  {nextLesson?.duration && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {nextLesson.duration}
                    </span>
                  )}
                </p>
              )}
            </div>
            <Button
              onClick={handleContinueLearning}
              size="lg"
              className="shrink-0 text-white border-0 bg-[#D51C28] hover:bg-[#B8151F]"
            >
              {courseProgress >= 100 ? "Review course" : "Continue learning"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Level progression */}
        {dashboardData.course?.availableCourses?.length > 0 && (
          <StudentLevelRoadmap
            levels={availableLevels}
            availableCourses={dashboardData.course.availableCourses}
            currentLevel={currentLevel}
            onSelectCourse={goToCourse}
          />
        )}

        {/* KPI strip */}
        <div className="rounded-lg border border-slate-200 bg-white grid grid-cols-2 lg:grid-cols-4 divide-y divide-slate-100 lg:divide-y-0 lg:divide-x">
          <button
            onClick={() => goToCourse(courseId)}
            className="p-4 sm:p-5 text-left hover:bg-[#E3F4FC] transition-colors"
          >
            <p className="text-xs text-slate-500">Course progress</p>
            <p className="text-2xl font-semibold mt-1" style={{ color: BRAND.navy }}>{courseProgress}%</p>
            <p className="text-xs text-slate-400 mt-1">{completedModulesCount} of {totalModules} modules</p>
          </button>
          <button
            onClick={() => goToCourse(courseId)}
            className="p-4 sm:p-5 text-left hover:bg-[#E3F4FC] transition-colors"
          >
            <p className="text-xs text-slate-500">Lessons completed</p>
            <p className="text-2xl font-semibold mt-1" style={{ color: BRAND.navy }}>{completedLessons}</p>
            <p className="text-xs text-slate-400 mt-1">of {totalLessons} total</p>
          </button>
          <div className="p-4 sm:p-5 text-left">
            <p className="text-xs text-slate-500">Current level</p>
            <p className="text-2xl font-semibold mt-1" style={{ color: BRAND.red }}>{currentLevel}</p>
            <p className="text-xs text-slate-400 mt-1">Account-wide</p>
          </div>
          <button
            onClick={() => navigate('/student/department')}
            className="p-4 sm:p-5 text-left hover:bg-[#E3F4FC] transition-colors"
          >
            <p className="text-xs text-slate-500">Department status</p>
            <p className="text-2xl font-semibold mt-1 truncate" style={{ color: BRAND.navy }}>
              {dashboardData.department?.status || 'N/A'}
            </p>
            <p className="text-xs text-slate-400 mt-1 truncate">{dashboardData.department?.name || 'No department'}</p>
          </button>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Left column */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            {dashboardData.course ? (
              <div className="rounded-lg border border-slate-200 bg-white">
                <div className="p-4 sm:p-5 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold truncate" style={{ color: BRAND.navy }}>{dashboardData.course.title}</h3>
                    <span className="text-xs text-slate-500 shrink-0">{courseProgress}% complete</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${courseProgress}%`, backgroundColor: BRAND.blue }} />
                  </div>
                </div>
                {dashboardData.course.modules?.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {dashboardData.course.modules.map((module, idx) => {
                      const isDone = idx < completedModulesCount;
                      const isCurrent = idx === completedModulesCount;
                      const isLocked = idx > completedModulesCount;
                      return (
                        <button
                          key={module.id || module._id || idx}
                          type="button"
                          disabled={isLocked}
                          onClick={() => goToCourse(courseId)}
                          className="w-full flex items-center gap-3 p-3 sm:p-4 text-left hover:bg-slate-50 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                        >
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0 border"
                            style={
                              isDone
                                ? { backgroundColor: BRAND.navy, borderColor: BRAND.navy, color: "#fff" }
                                : isCurrent
                                ? { borderColor: BRAND.red, color: BRAND.red, backgroundColor: "#fff" }
                                : { borderColor: "#e2e8f0", color: "#cbd5e1", backgroundColor: "#fff" }
                            }
                          >
                            {isDone ? <Check className="w-3.5 h-3.5" /> : isLocked ? <Lock className="w-3 h-3" /> : idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isLocked ? "text-slate-400" : "text-slate-900"}`}>
                              {module.title}
                            </p>
                            <p className="text-xs text-slate-500">{module.lessons?.length || 0} lessons</p>
                          </div>
                          {isCurrent && (
                            <span className="text-[11px] font-medium shrink-0" style={{ color: BRAND.red }}>
                              In progress
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 p-4 sm:p-5">No modules in this course yet.</p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
                <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600">No course assigned yet.</p>
                <p className="text-xs text-slate-400 mt-1">Contact your administrator for course enrollment.</p>
              </div>
            )}

            {dashboardData.course?.availableCourses?.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white">
                <div className="p-4 sm:p-5 border-b border-slate-100">
                  <h3 className="text-sm font-semibold" style={{ color: BRAND.navy }}>Department courses</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Every course assigned to your department, by level</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {dashboardData.course.availableCourses.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-3 sm:p-4">
                      <span
                        className="text-xs font-semibold border rounded w-9 py-1 text-center shrink-0"
                        style={{ borderColor: `${BRAND.blue}55`, color: BRAND.blue, backgroundColor: BRAND.blueSoft }}
                      >
                        {c.level}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900 truncate">{c.title}</p>
                          {c.statusLabel === 'COMPLETED' && (
                            <span className="text-[11px] font-medium shrink-0" style={{ color: BRAND.blue }}>Completed</span>
                          )}
                          {String(c.id) === String(courseId) && c.statusLabel === 'ACTIVE' && (
                            <span className="text-[11px] font-medium shrink-0" style={{ color: BRAND.red }}>Current</span>
                          )}
                        </div>
                        <div className="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden max-w-[180px]">
                          <div className="h-full rounded-full" style={{ width: `${c.progressPercentage}%`, backgroundColor: BRAND.blue }} />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={c.isLocked}
                        onClick={() => goToCourse(c.id)}
                        className="shrink-0 disabled:opacity-50"
                        style={c.isLocked ? {} : { borderColor: BRAND.blue, color: BRAND.blue }}
                      >
                        {c.isLocked ? <Lock className="w-3.5 h-3.5" /> : 'Open'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
              <h3 className="text-sm font-semibold mb-1" style={{ color: BRAND.navy }}>Certificates</h3>
              <p className="text-xs text-slate-500 mb-3">Achievements you've earned so far</p>
              {certificates.length > 0 ? (
                <>
                  <div className="divide-y divide-slate-100">
                    {certificates.slice(0, 3).map((cert) => (
                      <div key={cert.id || cert._id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: BRAND.blueSoft }}
                        >
                          <Award className="w-4 h-4" style={{ color: BRAND.blue }} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {cert.course?.title || 'Course certificate'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {cert.level ? `${cert.level} · ` : ''}{formatDate(cert.issueDate)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate('/student/certificates')}
                    className="text-xs font-semibold mt-3"
                    style={{ color: BRAND.blue }}
                  >
                    View all certificates
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-500">No certificates earned yet.</p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-2">
              <p className="text-sm font-semibold px-2.5 pt-2 pb-1" style={{ color: BRAND.navy }}>Quick actions</p>
              <button
                onClick={() => goToCourse(courseId)}
                className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-[#E3F4FC] text-left transition-colors"
              >
                <BookOpen className="w-4 h-4 shrink-0" style={{ color: BRAND.blue }} />
                <span className="text-sm text-slate-700">Resume course</span>
              </button>
              <button
                onClick={() => navigate('/student/department')}
                className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-[#E3F4FC] text-left transition-colors"
              >
                <Users className="w-4 h-4 shrink-0" style={{ color: BRAND.blue }} />
                <span className="text-sm text-slate-700">View department</span>
              </button>
              <button
                onClick={() => navigate('/student/on-job-training')}
                className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-[#E3F4FC] text-left transition-colors"
              >
                <ClipboardList className="w-4 h-4 shrink-0" style={{ color: BRAND.blue }} />
                <span className="text-sm text-slate-700">On-the-job training log</span>
              </button>
            </div>
          </div>
        </div>

        {/* Department information */}
        {dashboardData.department && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: BRAND.navy }}>Department information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500">Department</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5 break-words">{dashboardData.department.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Course</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5 break-words">
                  {dashboardData.course?.title || dashboardData.department.course?.title || dashboardData.department.course?.name || dashboardData.department.courses?.[0]?.title || dashboardData.department.courses?.[0]?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">{dashboardData.department.status}</p>
              </div>
              {(dashboardData.department.startDate || dashboardData.department.endDate) && (
                <div>
                  <p className="text-xs text-slate-500">Duration</p>
                  <p className="text-sm font-medium text-slate-900 mt-0.5">
                    {formatDate(dashboardData.department.startDate)} – {formatDate(dashboardData.department.endDate)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AccountStatusWrapper>
  );
};

export default StudentDashboard;
