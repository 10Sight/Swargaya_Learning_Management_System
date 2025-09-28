import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axiosInstance from "@/Helper/axiosInstance";
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

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    batch: null,
    courseContent: null,
    progress: null,
    recentActivity: [],
    upcomingDeadlines: []
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch batch info and course content in parallel
        const [batchRes, courseContentRes] = await Promise.allSettled([
          axiosInstance.get("/api/batches/me/my-batch"),
          axiosInstance.get("/api/batches/me/course-content")
        ]);

        const batch = batchRes.status === 'fulfilled' ? batchRes.value?.data?.data : null;
        const courseContent = courseContentRes.status === 'fulfilled' ? courseContentRes.value?.data?.data : null;

        setDashboardData({
          batch,
          courseContent,
          progress: courseContent?.progress || null,
          recentActivity: [], // We can add this later
          upcomingDeadlines: [] // We can add this later
        });
        
        setError(null);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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

  const getLevelInfo = (level) => {
    const levels = {
      L1: { name: "Beginner", color: "bg-blue-100 text-blue-800", icon: "🌱" },
      L2: { name: "Intermediate", color: "bg-orange-100 text-orange-800", icon: "🌿" },
      L3: { name: "Advanced", color: "bg-green-100 text-green-800", icon: "🌳" }
    };
    return levels[level] || levels.L1;
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
      <div className="space-y-6">
        {/* Welcome Header Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
        </Card>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress Card Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
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
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-blue-900">
                Welcome back, {user?.fullName?.split(' ')[0] || 'Student'}! 👋
              </CardTitle>
              <CardDescription className="text-blue-700 text-base mt-1">
                Ready to continue your learning journey?
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${levelInfo.color} font-medium px-3 py-1`}>
                {levelInfo.icon} {levelInfo.name}
              </Badge>
              {dashboardData.batch && (
                <Badge variant="outline" className="bg-white/80">
                  {dashboardData.batch.name}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Course Progress</p>
                <p className="text-3xl font-bold text-blue-600">{courseProgress}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dashboardData.progress?.completedModules?.length || 0} of {dashboardData.courseContent?.course?.modules?.length || 0} modules
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lessons Completed</p>
                <p className="text-3xl font-bold text-green-600">{completedLessons}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  of {totalLessons} total lessons
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Level</p>
                <p className="text-2xl font-bold text-purple-600">{currentLevel}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {levelInfo.name}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Trophy className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Batch Status</p>
                <p className="text-xl font-bold text-orange-600">
                  {dashboardData.batch?.status || 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dashboardData.batch?.name || 'No batch'}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Overview & Current Module */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Course Progress
            </CardTitle>
            <CardDescription>
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
                  className="w-full" 
                  size="lg"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Continue Learning
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Current Focus
            </CardTitle>
            <CardDescription>
              Your next learning objective
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentModule ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-green-800">{currentModule.title}</h3>
                    <Badge variant="outline" className="bg-green-100 text-green-700 text-xs">
                      Next Module
                    </Badge>
                  </div>
                  <p className="text-sm text-green-700 mb-3">
                    {currentModule.description || "Continue your learning journey with this module."}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-green-600">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {currentModule.lessons?.length || 0} lessons
                    </span>
                    {currentModule.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {currentModule.duration}
                      </span>
                    )}
                  </div>
                </div>
                
                <Button 
                  onClick={() => navigate('/student/course')} 
                  variant="outline"
                  className="w-full"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Module
                </Button>
              </div>
            ) : dashboardData.courseContent?.course && courseProgress === 100 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Congratulations! 🎉</h3>
                <p className="text-muted-foreground mb-4">You've completed all course modules!</p>
                <Button onClick={() => navigate('/student/course')} variant="outline">
                  <Award className="h-4 w-4 mr-2" />
                  View Final Assessments
                </Button>
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

      {/* Batch Information */}
      {dashboardData.batch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Batch Information
            </CardTitle>
            <CardDescription>
              Details about your learning group
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Batch Name</p>
                <p className="font-semibold">{dashboardData.batch.name}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Course</p>
                <p className="font-semibold">
                  {dashboardData.batch.course?.title || dashboardData.batch.course?.name || "N/A"}
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={dashboardData.batch.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {dashboardData.batch.status}
                </Badge>
              </div>
            </div>
            
            {(dashboardData.batch.startDate || dashboardData.batch.endDate) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t">
                {dashboardData.batch.startDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                      <p className="font-semibold">{formatDate(dashboardData.batch.startDate)}</p>
                    </div>
                  </div>
                )}
                
                {dashboardData.batch.endDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">End Date</p>
                      <p className="font-semibold">{formatDate(dashboardData.batch.endDate)}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/student/course')}
              className="h-auto p-4 justify-start"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Continue Course</p>
                  <p className="text-xs text-muted-foreground">Resume where you left off</p>
                </div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/student/batch')}
              className="h-auto p-4 justify-start"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">View Batch</p>
                  <p className="text-xs text-muted-foreground">Check batch details</p>
                </div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/profile')}
              className="h-auto p-4 justify-start"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">View Profile</p>
                  <p className="text-xs text-muted-foreground">Update your information</p>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;


