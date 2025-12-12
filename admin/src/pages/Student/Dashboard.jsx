import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axiosInstance from "@/Helper/axiosInstance";
import AccountStatusWrapper from "../../components/student/AccountStatusWrapper";
import DownloadAppPopup from "../../components/student/DownloadAppPopup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BookOpen,
  Users,
  Trophy,
  Clock,
  CheckCircle2,
  PlayCircle,
  Calendar,
  BarChart3,
  FileText,
  Award,
  Target,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  GraduationCap,
  Star
} from "lucide-react";
import { useGetActiveConfigQuery } from "@/Redux/AllApi/CourseLevelConfigApi";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    department: null,
    courseContent: null,
    progress: null,
    recentActivity: [],
    upcomingDeadlines: []
  });
  const [error, setError] = useState(null);
  const [showDownloadPopup, setShowDownloadPopup] = useState(false);

  // Fetch active level configuration for dynamic level names/colors
  const { data: levelConfigData } = useGetActiveConfigQuery();
  const availableLevels = levelConfigData?.data?.levels || [
    { name: "L1", color: "#3B82F6", order: 0 },
    { name: "L2", color: "#F97316", order: 1 },
    { name: "L3", color: "#10B981", order: 2 },
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch department info and course content in parallel
        const [departmentRes, courseContentRes] = await Promise.allSettled([
          axiosInstance.get("/api/departments/me/my-department"),
          axiosInstance.get("/api/departments/me/course-content")
        ]);

        const department = departmentRes.status === 'fulfilled' ? departmentRes.value?.data?.data : null;
        const courseContent = courseContentRes.status === 'fulfilled' ? courseContentRes.value?.data?.data : null;

        setDashboardData({
          department,
          courseContent,
          progress: courseContent?.progress || null,
          recentActivity: [], // We can add this later
          upcomingDeadlines: [] // We can add this later
        });

        setError(null);
      } catch (err) {
        setError("Failed to load dashboard. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Service Worker registration and download popup logic
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            // Service worker registered successfully
          })
          .catch((registrationError) => {
            // Service worker registration failed
          });
      });
    }

    // Check if we should show download popup (only for students)
    if (user?.role === 'STUDENT' && !loading) {
      const shouldShowPopup = () => {
        // Don't show if user has opted out
        if (localStorage.getItem('downloadAppDontShow') === 'true') {
          return false;
        }

        // Don't show if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
          return false;
        }

        // Check if remind later time has passed
        const remindTime = localStorage.getItem('downloadAppRemindTime');
        if (remindTime && Date.now() < parseInt(remindTime)) {
          return false;
        }

        // Don't show if already shown in this session
        if (sessionStorage.getItem('downloadPopupShown')) {
          return false;
        }

        return true;
      };

      if (shouldShowPopup()) {
        // Show popup after a short delay to let the page load
        const timer = setTimeout(() => {
          setShowDownloadPopup(true);
          sessionStorage.setItem('downloadPopupShown', 'true');
        }, 3000); // 3 second delay

        return () => clearTimeout(timer);
      }
    }
  }, [user?.role, loading]);

  const calculateCourseProgress = () => {
    if (!dashboardData.courseContent?.course?.modules) return 0;
    const totalModules = dashboardData.courseContent.course.modules.length;
    const completedModules = dashboardData.progress?.completedModules?.length || 0;
    return totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
  };

  const getTotalLessons = () => {
    if (!dashboardData.courseContent?.course?.modules) return 0;
    return dashboardData.courseContent.course.modules.reduce(
      (total, module) => total + (module.lessons?.length || 0), 0
    );
  };

  const getCompletedLessons = () => {
    return dashboardData.progress?.completedLessons?.length || 0;
  };

  const getCurrentModule = () => {
    if (!dashboardData.courseContent?.course?.modules || !dashboardData.progress) return null;
    const completedCount = dashboardData.progress.completedModules?.length || 0;
    return dashboardData.courseContent.course.modules[completedCount] || null;
  };

  // Get dynamic level info from active configuration (fallback to defaults)
  const getLevelInfo = (levelName) => {
    const match = availableLevels.find(
      (l) => l.name?.toUpperCase() === levelName?.toUpperCase()
    );
    if (match) {
      // Choose a simple icon based on order (purely decorative)
      const icons = ["🌱", "🌿", "🌳", "⭐", "🚀", "🏆"];
      const icon = icons[match.order] ?? "⭐";
      return {
        name: match.name,
        colorHex: match.color || "#3B82F6",
        icon,
      };
    }
    // Fallback to first default if not found
    return { name: levelName || "L1", colorHex: "#3B82F6", icon: "🌱" };
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome Header Skeleton */}
        <Card className="w-full">
          <CardHeader className="space-y-3">
            <Skeleton className="h-6 sm:h-8 w-48 sm:w-64" />
            <Skeleton className="h-3 sm:h-4 w-32 sm:w-48" />
          </CardHeader>
        </Card>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="w-full">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress Card Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card className="w-full">
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 sm:h-6 w-24 sm:w-32" />
              <Skeleton className="h-3 sm:h-4 w-36 sm:w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-20 sm:h-32 w-full" />
            </CardContent>
          </Card>
          <Card className="w-full">
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 sm:h-6 w-24 sm:w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-16 sm:h-24 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
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

  const courseProgress = calculateCourseProgress();
  const totalLessons = getTotalLessons();
  const completedLessons = getCompletedLessons();
  const currentModule = getCurrentModule();
  const currentLevel = dashboardData.progress?.currentLevel || "L1";
  const levelInfo = getLevelInfo(currentLevel);

  return (
    <AccountStatusWrapper allowPending={false}>
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome Header */}
        <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-blue-200 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <CardHeader className="relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-200/30 to-transparent rounded-bl-full transform translate-x-8 -translate-y-8"></div>

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl text-blue-900 font-bold leading-tight">
                  Welcome back, {user?.fullName?.split(' ')[0] || 'Student'}! 👋
                </CardTitle>
                <CardDescription className="text-blue-700 text-sm sm:text-base mt-1 leading-relaxed">
                  Ready to continue your learning journey?
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                <Badge
                  className={`font-medium px-3 py-1.5 text-xs sm:text-sm rounded-full shadow-sm border`}
                  style={{ backgroundColor: `${levelInfo.colorHex}20`, color: levelInfo.colorHex, borderColor: levelInfo.colorHex }}
                >
                  <span className="mr-1">{levelInfo.icon}</span>
                  <span className="hidden sm:inline">{levelInfo.name}</span>
                  <span className="sm:hidden">{currentLevel}</span>
                </Badge>
                {dashboardData.department && (
                  <Badge variant="outline" className="bg-white/80 backdrop-blur-sm text-xs sm:text-sm px-3 py-1.5 rounded-full border-blue-200 text-blue-700">
                    <Users className="w-3 h-3 mr-1 sm:hidden" />
                    <span className="truncate max-w-24 sm:max-w-none">
                      {dashboardData.department.name}
                    </span>
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-l-4 border-l-blue-500" onClick={() => navigate('/student/course')}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Course Progress</p>
                  <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">{courseProgress}%</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {dashboardData.progress?.completedModules?.length || 0} of {dashboardData.courseContent?.course?.modules?.length || 0} modules
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-full shrink-0 group-hover:bg-blue-200 transition-colors duration-300">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-l-4 border-l-green-500" onClick={() => navigate('/student/course')}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Lessons Completed</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">{completedLessons}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    of {totalLessons} total lessons
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-full shrink-0 group-hover:bg-green-200 transition-colors duration-300">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-default border-l-4 border-l-purple-500">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Current Level</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xl sm:text-2xl font-bold text-purple-600">{currentLevel}</p>
                    <span className="text-sm">{levelInfo.icon}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {levelInfo.name}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-purple-100 rounded-full shrink-0 group-hover:bg-purple-200 transition-colors duration-300">
                  <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-l-4 border-l-orange-500" onClick={() => navigate('/student/department')}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Department Status</p>
                  <p className="text-lg sm:text-xl font-bold text-orange-600 mt-1 truncate">
                    {dashboardData.department?.status || 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {dashboardData.department?.name || 'No department'}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-orange-100 rounded-full shrink-0 group-hover:bg-orange-200 transition-colors duration-300">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course Overview & Current Module */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Course Progress */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Course Progress
              </CardTitle>
              <CardDescription className="text-sm">
                Track your learning journey and see what's coming next
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboardData.courseContent?.course ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{dashboardData.courseContent.course.title}</span>
                      <Badge variant="secondary">{courseProgress}% Complete</Badge>
                    </div>
                    <Progress value={courseProgress} className="h-3" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Modules:</span>
                      <span className="font-medium">
                        {dashboardData.progress?.completedModules?.length || 0} / {dashboardData.courseContent.course.modules?.length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Lessons:</span>
                      <span className="font-medium">
                        {completedLessons} / {totalLessons}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate('/student/course')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Continue Learning</span>
                    <span className="sm:hidden">Continue</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No course assigned yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">Contact your administrator for course enrollment.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Module */}
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                <span className="hidden sm:inline">Current Focus</span>
                <span className="sm:hidden">Next Up</span>
              </CardTitle>
              <CardDescription className="text-sm">
                Your next learning objective
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentModule ? (
                <div className="space-y-4">
                  <div className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-green-800 text-sm sm:text-base leading-tight line-clamp-2 flex-1 mr-2">
                        {currentModule.title}
                      </h3>
                      <Badge variant="outline" className="bg-green-100 text-green-700 text-xs px-2 py-1 whitespace-nowrap">
                        <span className="hidden sm:inline">Next Module</span>
                        <span className="sm:hidden">Next</span>
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-green-700 mb-4 leading-relaxed line-clamp-3">
                      {currentModule.description || "Continue your learning journey with this module."}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-green-600">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        <span>{currentModule.lessons?.length || 0} lessons</span>
                      </span>
                      {currentModule.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{currentModule.duration}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate('/student/course')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Start Module</span>
                    <span className="sm:hidden">Start</span>
                  </Button>
                </div>
              ) : dashboardData.courseContent?.course && courseProgress === 100 ? (
                <div className="text-center py-6 sm:py-8 space-y-4">
                  <div className="relative">
                    <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-500 mx-auto mb-4 animate-bounce" />
                    <div className="absolute inset-0 bg-yellow-200 rounded-full blur-xl opacity-30 animate-pulse"></div>
                  </div>
                  <h3 className="font-bold text-lg sm:text-xl mb-2 text-yellow-700">Congratulations! 🎉</h3>
                  <p className="text-muted-foreground mb-6 text-sm sm:text-base px-4">You've completed all course modules!</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                    <Button
                      onClick={() => navigate('/student/course')}
                      variant="outline"
                      className="flex-1 border-yellow-300 hover:bg-yellow-50"
                    >
                      <Award className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Final Assessments</span>
                      <span className="sm:hidden">Assessments</span>
                    </Button>
                    <Button
                      onClick={() => navigate(`/student/report/${dashboardData.courseContent.course._id}`)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Course Report</span>
                      <span className="sm:hidden">Report</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No current module available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Department Information */}
        {dashboardData.department && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Department Information
              </CardTitle>
              <CardDescription>
                Details about your learning group
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Department Name</p>
                  <p className="font-semibold break-words text-sm sm:text-base">{dashboardData.department.name}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Course</p>
                  <p className="font-semibold break-words text-sm sm:text-base">
                    {dashboardData.department.course?.title || dashboardData.department.course?.name || "N/A"}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Status</p>
                  <Badge
                    variant={dashboardData.department.status === 'ACTIVE' ? 'default' : 'secondary'}
                    className={`text-xs px-3 py-1 ${dashboardData.department.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                      }`}
                  >
                    {dashboardData.department.status}
                  </Badge>
                </div>
              </div>

              {(dashboardData.department.startDate || dashboardData.department.endDate) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
                  {dashboardData.department.startDate && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Start Date</p>
                        <p className="font-semibold text-sm sm:text-base">{formatDate(dashboardData.department.startDate)}</p>
                      </div>
                    </div>
                  )}

                  {dashboardData.department.endDate && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-full">
                        <Calendar className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">End Date</p>
                        <p className="font-semibold text-sm sm:text-base">{formatDate(dashboardData.department.endDate)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common tasks to help you stay on track
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/student/course')}
                className="h-auto p-3 sm:p-4 justify-start hover:shadow-md transition-all duration-300 hover:scale-105 group"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors duration-300">
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">Continue Course</p>
                    <p className="text-xs text-muted-foreground leading-tight">
                      <span className="hidden sm:inline">Resume where you left off</span>
                      <span className="sm:hidden">Resume learning</span>
                    </p>
                  </div>
                </div>
              </Button>

              {/* Show Course Report button if course is completed */}
              {dashboardData.courseContent?.course && courseProgress === 100 && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/student/report/${dashboardData.courseContent.course._id}`)}
                  className="h-auto p-3 sm:p-4 justify-start border-green-200 hover:bg-green-50 hover:shadow-md transition-all duration-300 hover:scale-105 group"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors duration-300">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-medium text-green-700 text-sm sm:text-base truncate">Course Report</p>
                      <p className="text-xs text-green-600 leading-tight">
                        <span className="hidden sm:inline">View & download certificate</span>
                        <span className="sm:hidden">Certificate ready</span>
                      </p>
                    </div>
                  </div>
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => navigate('/student/department')}
                className="h-auto p-3 sm:p-4 justify-start hover:shadow-md transition-all duration-300 hover:scale-105 group"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors duration-300">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">View Department</p>
                    <p className="text-xs text-muted-foreground leading-tight">
                      <span className="hidden sm:inline">Check department details</span>
                      <span className="sm:hidden">Department info</span>
                    </p>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate('/student/reports')}
                className="h-auto p-3 sm:p-4 justify-start hover:shadow-md transition-all duration-300 hover:scale-105 group"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors duration-300">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">View Reports</p>
                    <p className="text-xs text-muted-foreground leading-tight">
                      <span className="hidden sm:inline">Track your progress</span>
                      <span className="sm:hidden">Progress reports</span>
                    </p>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Download App Popup */}
      <DownloadAppPopup
        isOpen={showDownloadPopup}
        onClose={() => setShowDownloadPopup(false)}
        userRole={user?.role}
      />
    </AccountStatusWrapper>
  );
};

export default StudentDashboard;


