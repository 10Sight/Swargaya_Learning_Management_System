import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axiosInstance from "@/Helper/axiosInstance";
import AccountStatusWrapper from "../../components/student/AccountStatusWrapper";
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
    course: null,
    progress: null,
    recentActivity: [],
    upcomingDeadlines: []
  });
  const [error, setError] = useState(null);

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
        const courseData = courseContentRes.status === 'fulfilled' ? courseContentRes.value?.data?.data : null;

        setDashboardData({
          department,
          course: courseData, // courseData IS the course object with nested modules
          progress: courseData?.progress || null,
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

  // Service Worker registration
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

  const getCompletedLessons = () => {
    return dashboardData.progress?.completedLessons?.length || 0;
  };

  const getCurrentModule = () => {
    if (!dashboardData.course?.modules || !dashboardData.progress) return null;
    const completedCount = dashboardData.progress.completedModules?.length || 0;
    return dashboardData.course.modules[completedCount] || null;
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
        <Card
          className="border shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
          style={{
            background: 'linear-gradient(to bottom right, #eff6ff, #eef2ff, #faf5ff)',
            borderColor: '#bfdbfe'
          }}
        >
          <CardHeader className="relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#bfdbfe]/30 to-transparent rounded-bl-full transform translate-x-8 -translate-y-8"></div>

            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold leading-tight" style={{ color: '#1e3a8a' }}>
                  Welcome back, {user?.fullName?.split(' ')[0] || 'Student'}! 👋
                </CardTitle>
                <CardDescription className="text-sm sm:text-base mt-1 leading-relaxed" style={{ color: '#1d4ed8' }}>
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
                  <Badge variant="outline" className="backdrop-blur-sm text-xs sm:text-sm px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', borderColor: '#bfdbfe', color: '#1d4ed8' }}>
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
          <Card
            className="group hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-l-4"
            style={{ borderLeftColor: '#3b82f6' }}
            onClick={() => navigate('/student/course')}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Course Progress</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1" style={{ color: '#2563eb' }}>{courseProgress}%</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {dashboardData.progress?.completedModules?.length || 0} of {dashboardData.course?.modules?.length || 0} modules
                  </p>
                </div>
                <div
                  className="p-2 sm:p-3 rounded-full shrink-0 transition-colors duration-300"
                  style={{ backgroundColor: '#dbeafe' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#bfdbfe' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#dbeafe' }}
                >
                  <Target className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: '#2563eb' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="group hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-l-4"
            style={{ borderLeftColor: '#22c55e' }}
            onClick={() => navigate('/student/course')}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Lessons Completed</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1" style={{ color: '#16a34a' }}>{completedLessons}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    of {totalLessons} total lessons
                  </p>
                </div>
                <div
                  className="p-2 sm:p-3 rounded-full shrink-0 transition-colors duration-300"
                  style={{ backgroundColor: '#dcfce7' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#bbf7d0' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#dcfce7' }}
                >
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: '#16a34a' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="group hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-default border-l-4"
            style={{ borderLeftColor: '#a855f7' }}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Current Level</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xl sm:text-2xl font-bold" style={{ color: '#9333ea' }}>{currentLevel}</p>
                    <span className="text-sm">{levelInfo.icon}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {levelInfo.name}
                  </p>
                </div>
                <div
                  className="p-2 sm:p-3 rounded-full shrink-0 transition-colors duration-300"
                  style={{ backgroundColor: '#f3e8ff' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e9d5ff' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f3e8ff' }}
                >
                  <Trophy className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: '#9333ea' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="group hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer border-l-4"
            style={{ borderLeftColor: '#f97316' }}
            onClick={() => navigate('/student/department')}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Department Status</p>
                  <p className="text-lg sm:text-xl font-bold mt-1 truncate" style={{ color: '#ea580c' }}>
                    {dashboardData.department?.status || 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {dashboardData.department?.name || 'No department'}
                  </p>
                </div>
                <div
                  className="p-2 sm:p-3 rounded-full shrink-0 transition-colors duration-300"
                  style={{ backgroundColor: '#ffedd5' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fed7aa' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffedd5' }}
                >
                  <Users className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: '#ea580c' }} />
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
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-[#2563eb]" />
                Course Progress
              </CardTitle>
              <CardDescription className="text-sm">
                Track your learning journey and see what's coming next
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboardData.course ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{dashboardData.course.title}</span>
                      <Badge variant="secondary">{courseProgress}% Complete</Badge>
                    </div>
                    <Progress value={courseProgress} className="h-3" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Modules:</span>
                      <span className="font-medium">
                        {dashboardData.progress?.completedModules?.length || 0} / {dashboardData.course.modules?.length || 0}
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
                    className="w-full"
                    style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1d4ed8' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2563eb' }}
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
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-[#16a34a]" />
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
                  <div className="p-4 sm:p-6 bg-gradient-to-br from-[#f0fdf4] to-[#ecfdf5] border border-[#bbf7d0] rounded-lg shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-[#166534] text-sm sm:text-base leading-tight line-clamp-2 flex-1 mr-2">
                        {currentModule.title}
                      </h3>
                      <Badge variant="outline" className="bg-[#dcfce7] text-[#15803d] text-xs px-2 py-1 whitespace-nowrap">
                        <span className="hidden sm:inline">Next Module</span>
                        <span className="sm:hidden">Next</span>
                      </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-[#15803d] mb-4 leading-relaxed line-clamp-3">
                      {currentModule.description || "Continue your learning journey with this module."}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-[#16a34a]">
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
                    className="w-full text-white"
                    style={{ backgroundColor: '#16a34a' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#15803d' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#16a34a' }}
                    size="lg"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Start Module</span>
                    <span className="sm:hidden">Start</span>
                  </Button>
                </div>
              ) : dashboardData.course && courseProgress === 100 ? (
                <div className="text-center py-6 sm:py-8 space-y-4">
                  <div className="relative">
                    <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-[#eab308] mx-auto mb-4 animate-bounce" />
                    <div className="absolute inset-0 bg-[#fef08a] rounded-full blur-xl opacity-30 animate-pulse"></div>
                  </div>
                  <h3 className="font-bold text-lg sm:text-xl mb-2 text-[#a16207]">Congratulations! 🎉</h3>
                  <p className="text-muted-foreground mb-6 text-sm sm:text-base px-4">You've completed all course modules!</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                    <Button
                      onClick={() => navigate('/student/course')}
                      variant="outline"
                      className="flex-1 border-[#fde047] hover:bg-[#fefce8]"
                    >
                      <Award className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Final Assessments</span>
                      <span className="sm:hidden">Assessments</span>
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
                <Users className="h-5 w-5 text-[#2563eb]" />
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
                    {dashboardData.department.course?.title || dashboardData.department.course?.name || dashboardData.department.courses?.[0]?.title || dashboardData.department.courses?.[0]?.name || "N/A"}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Status</p>
                  <Badge
                    variant={dashboardData.department.status === 'ACTIVE' ? 'default' : 'secondary'}
                    className={`text-xs px-3 py-1 ${dashboardData.department.status === 'ACTIVE'
                      ? 'bg-[#dcfce7] text-[#166534]'
                      : 'bg-[#f3f4f6] text-[#1f2937]'
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
                      <div className="p-2 bg-[#dbeafe] rounded-full">
                        <Calendar className="h-4 w-4 text-[#2563eb]" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">Start Date</p>
                        <p className="font-semibold text-sm sm:text-base">{formatDate(dashboardData.department.startDate)}</p>
                      </div>
                    </div>
                  )}

                  {dashboardData.department.endDate && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#fee2e2] rounded-full">
                        <Calendar className="h-4 w-4 text-[#dc2626]" />
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
              <Star className="h-5 w-5 text-[#eab308]" />
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
                  <div
                    className="p-2 rounded-lg transition-colors duration-300"
                    style={{ backgroundColor: '#dbeafe' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#bfdbfe' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#dbeafe' }}
                  >
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#2563eb' }} />
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



              <Button
                variant="outline"
                onClick={() => navigate('/student/department')}
                className="h-auto p-3 sm:p-4 justify-start hover:shadow-md transition-all duration-300 hover:scale-105 group"
              >
                <div className="flex items-center gap-3 w-full">
                  <div
                    className="p-2 rounded-lg transition-colors duration-300"
                    style={{ backgroundColor: '#ffedd5' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fed7aa' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffedd5' }}
                  >
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#ea580c' }} />
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


            </div>
          </CardContent>
        </Card>
      </div>


    </AccountStatusWrapper>
  );
};

export default StudentDashboard;


