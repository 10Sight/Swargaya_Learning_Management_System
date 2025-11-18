import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useGetCourseByIdQuery, useGetCourseAnalyticsQuery, useGetCourseStudentsQuery } from "@/Redux/AllApi/CourseApi";
import { useGetModulesByCourseQuery } from "@/Redux/AllApi/moduleApi";
import { useGetQuizzesByCourseQuery } from "@/Redux/AllApi/QuizApi";
import { useGetAllAssignmentsQuery } from "@/Redux/AllApi/AssignmentApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconArrowLeft,
  IconBook,
  IconFileText,
  IconClipboardList,
  IconHelpCircle,
  IconPaperclip,
  IconEye,
  IconEyeOff,
  IconCalendar,
  IconUsers,
  IconClock,
  IconLoader,
  IconExternalLink,
  IconEdit,
  IconPlus,
  IconChartPie,
  IconSchool,
  IconRefresh,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

// Import reusable components
import ModuleList from "@/components/course/ModuleList";
import QuizList from "@/components/course/QuizList";
import AssignmentList from "@/components/course/AssignmentList";
import ResourceList from "@/components/course/ResourceList";
import CourseStats from "@/components/course/CourseStats";

const CourseDetailPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  const basePath = React.useMemo(() => {
    const p = location.pathname || '';
    if (p.startsWith('/superadmin')) return '/superadmin';
    if (p.startsWith('/instructor')) return '/instructor';
    return '/admin';
  }, [location.pathname]);

  const {
    data: courseData,
    isLoading: courseLoading,
    error: courseError,
    refetch: refetchCourse,
  } = useGetCourseByIdQuery(courseId);

  const {
    data: modulesData,
    isLoading: modulesLoading,
    refetch: refetchModules,
  } = useGetModulesByCourseQuery(courseId);

  const {
    data: quizzesData,
    isLoading: quizzesLoading,
    refetch: refetchQuizzes,
  } = useGetQuizzesByCourseQuery(courseId);

  const {
    data: assignmentsData,
    isLoading: assignmentsLoading,
    refetch: refetchAssignments,
  } = useGetAllAssignmentsQuery({ courseId });

  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useGetCourseAnalyticsQuery(courseId);

  const {
    data: studentsData,
    isLoading: studentsLoading,
    refetch: refetchStudents,
  } = useGetCourseStudentsQuery(courseId);

  const course = courseData?.data || {};
  const modules = modulesData?.data || [];
  // Replace the current quizzes extraction line with:
  const quizzes = Array.isArray(quizzesData?.data) ? quizzesData.data : (quizzesData?.data?.quizzes || []);
  const assignments = assignmentsData?.data || [];

  const isLoading =
    courseLoading || modulesLoading || quizzesLoading || assignmentsLoading;

  const getStatusBadge = (status) => {
    const statusConfig = {
      PUBLISHED: { variant: "success", label: "Published", icon: IconEye },
      DRAFT: { variant: "secondary", label: "Draft", icon: IconEyeOff },
      ARCHIVED: { variant: "destructive", label: "Archived" },
    };

    const config = statusConfig[status] || {
      variant: "secondary",
      label: status,
    };
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        {IconComponent && <IconComponent className="h-3 w-3" />}
        {config.label}
      </Badge>
    );
  };

  const getDifficultyBadge = (difficulty) => {
    const difficultyConfig = {
      BEGINNER: { variant: "success", label: "Beginner" },
      INTERMEDIATE: { variant: "warning", label: "Intermediate" },
      ADVANCED: { variant: "destructive", label: "Advanced" },
    };

    const config = difficultyConfig[difficulty] || {
      variant: "secondary",
      label: difficulty,
    };

    return (
      <Badge variant={config.variant} className="w-fit">
        {config.label}
      </Badge>
    );
  };

  const getLevelBadge = (level) => {
    const colorMap = {
      L1: "bg-blue-100 text-blue-800 border-blue-200",
      L2: "bg-orange-100 text-orange-800 border-orange-200",
      L3: "bg-green-100 text-green-800 border-green-200",
    };

    const raw = typeof level === "string" ? level : (level != null ? `L${level}` : "L1");
    const color = colorMap[raw] || "bg-gray-100 text-gray-800 border-gray-200";

    return (
      <Badge className={`${color} font-medium text-xs px-2 py-1`}>
        {raw}
      </Badge>
    );
  };

  const handleRefetchAll = () => {
    refetchCourse();
    refetchModules();
    refetchQuizzes();
    refetchAssignments();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <IconArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-10 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (courseError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-600 text-lg font-medium">
          Error loading course
        </div>
        <p className="text-gray-600 text-center">
          {courseError?.message || "Failed to fetch course details"}
        </p>
        <div className="flex gap-2">
          <Button onClick={() => navigate(-1)} variant="outline">
            Go Back
          </Button>
          <Button onClick={handleRefetchAll} variant="default">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <IconArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {course.title}
            </h1>
            <p className="text-muted-foreground line-clamp-1">
              {course.description}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => navigate(`${basePath}/add-course`, { state: { editCourse: course } })}
            variant="outline"
            className="gap-2"
          >
            <IconEdit className="h-4 w-4" />
            Edit Course
          </Button>
          <Button
            onClick={() => navigate(`${basePath}/add-module/${courseId}`)}
            className="gap-2"
          >
            <IconPlus className="h-4 w-4" />
            Add Content
          </Button>
        </div>
      </div>

      {/* Stats */}
      <CourseStats
        course={course}
        modules={modules}
        quizzes={quizzes}
        assignments={assignments}
      />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-7 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="modules">Modules ({modules.length})</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes ({quizzes.length})</TabsTrigger>
          <TabsTrigger value="assignments">
            Assignments ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
              <CardDescription>
                Basic information about this course
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Title</p>
                  <p className="text-sm">{course.title}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Category</p>
                  <Badge variant="outline">{course.category}</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Level</p>
                  {getDifficultyBadge(course.difficulty || "BEGINNER")}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Status</p>
                  {getStatusBadge(course.status)}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Instructor</p>
                  <p className="text-sm">
                    {course.instructor?.name || "Not assigned"}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Created At</p>
                  <p className="text-sm">
                    {new Date(course.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Description</p>
                <p className="text-sm text-muted-foreground">
                  {course.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analyticsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-6 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Analytics Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-800">Student Progress</p>
                        <p className="text-xs text-blue-600">Average completion</p>
                      </div>
                      <div className="p-2 bg-blue-100 rounded-full">
                        <IconUsers className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-blue-900">
                      {analyticsData?.data?.progressStats?.averageProgress || 0}%
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">Assignment Grade</p>
                        <p className="text-xs text-green-600">Average score</p>
                      </div>
                      <div className="p-2 bg-green-100 rounded-full">
                        <IconClipboardList className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-900">
                      {analyticsData?.data?.submissionStats?.averageGrade || 0}%
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-800">Quiz Pass Rate</p>
                        <p className="text-xs text-purple-600">Success percentage</p>
                      </div>
                      <div className="p-2 bg-purple-100 rounded-full">
                        <IconHelpCircle className="h-4 w-4 text-purple-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-purple-900">
                      {analyticsData?.data?.quizStats?.passRate || 0}%
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-amber-800">Total Enrollments</p>
                        <p className="text-xs text-amber-600">Active students</p>
                      </div>
                      <div className="p-2 bg-amber-100 rounded-full">
                        <IconSchool className="h-4 w-4 text-amber-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-amber-900">
                      {analyticsData?.data?.courseInfo?.totalEnrollments || 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconClipboardList className="h-5 w-5" />
                      Recent Submissions
                    </CardTitle>
                    <CardDescription>
                      Latest assignment submissions from students
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analyticsData?.data?.recentActivity?.recentSubmissions?.length > 0 ? (
                      analyticsData.data.recentActivity.recentSubmissions.map((submission, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {submission.student?.fullName?.charAt(0) || 'S'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{submission.student?.fullName}</p>
                              <p className="text-xs text-muted-foreground">{submission.assignment?.title}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={submission.grade ? "success" : "secondary"}>
                              {submission.grade ? `${submission.grade}%` : "Pending"}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(submission.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <IconClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No recent submissions</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconHelpCircle className="h-5 w-5" />
                      Recent Quiz Attempts
                    </CardTitle>
                    <CardDescription>
                      Latest quiz attempts from students
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analyticsData?.data?.recentActivity?.recentQuizAttempts?.length > 0 ? (
                      analyticsData.data.recentActivity.recentQuizAttempts.map((attempt, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {attempt.student?.fullName?.charAt(0) || 'S'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{attempt.student?.fullName}</p>
                              <p className="text-xs text-muted-foreground">{attempt.quiz?.title}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={attempt.passed ? "success" : "destructive"}>
                              {attempt.passed ? <IconCheck className="h-3 w-3 mr-1" /> : <IconX className="h-3 w-3 mr-1" />}
                              {attempt.scorePercent}%
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(attempt.attemptedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <IconHelpCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No recent quiz attempts</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Enrolled Students</h2>
              <p className="text-sm text-muted-foreground">
                Track student progress and performance in this course
              </p>
            </div>
            <Button onClick={refetchStudents} variant="outline" disabled={studentsLoading}>
              <IconRefresh className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {studentsLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                {studentsData?.data?.students?.length > 0 ? (
                  <div className="space-y-4">
                    {studentsData.data.students.map((studentData, index) => {
                      const progressPercent = studentData.progressPercentage || 0;
                      return (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={studentData.student.avatar} />
                              <AvatarFallback>
                                {studentData.student.fullName?.charAt(0) || 'S'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium">{studentData.student.fullName}</p>
                                {getLevelBadge(studentData.currentLevel || "L1")}
                              </div>
                              <p className="text-sm text-muted-foreground">{studentData.student.email}</p>
                              <p className="text-xs text-muted-foreground">
                                Enrolled: {new Date(studentData.student.enrolledAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all ${
                                    progressPercent >= 75 ? 'bg-green-600' : 
                                    progressPercent >= 50 ? 'bg-yellow-500' : 
                                    progressPercent >= 25 ? 'bg-orange-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${progressPercent}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-12 text-right">
                                {progressPercent}%
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {studentData.completedModules}/{studentData.totalModules} modules
                            </p>
                            {studentData.lastActivity && (
                              <p className="text-xs text-muted-foreground">
                                Last: {new Date(studentData.lastActivity).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <IconUsers className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No students enrolled yet</p>
                    <p>Students will appear here once they enroll in this course</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="modules">
          <ModuleList
            modules={modules}
            courseId={courseId}
            onRefetch={refetchModules}
          />
        </TabsContent>

        <TabsContent value="quizzes">
          <QuizList
            quizzes={quizzes}
            courseId={courseId}
            modules={modules}
            onRefetch={refetchQuizzes}
            key={quizzes.length}
          />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentList
            assignments={assignments}
            courseId={courseId}
            modules={modules}
            onRefetch={refetchAssignments}
          />
        </TabsContent>

        <TabsContent value="resources">
          <ResourceList courseId={courseId} modules={modules} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CourseDetailPage;
