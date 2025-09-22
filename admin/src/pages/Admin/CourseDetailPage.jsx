import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetCourseByIdQuery } from "@/Redux/AllApi/CourseApi";
import { useGetModulesByCourseQuery } from "@/Redux/AllApi/moduleApi";
import { useGetAllQuizzesQuery } from "@/Redux/AllApi/QuizApi";
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
  const [activeTab, setActiveTab] = useState("overview");

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
  } = useGetAllQuizzesQuery({ courseId });

  const {
    data: assignmentsData,
    isLoading: assignmentsLoading,
    refetch: refetchAssignments,
  } = useGetAllAssignmentsQuery({ courseId });

  const course = courseData?.data || {};
  const modules = modulesData?.data || [];
  // Replace the current quizzes extraction line with:
  const quizzes = quizzesData?.data?.quizzes || [];
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
            onClick={() => navigate(`/admin/courses`)}
            variant="outline"
            className="gap-2"
          >
            <IconEdit className="h-4 w-4" />
            Edit Course
          </Button>
          <Button
            onClick={() => navigate(`/admin/add-module/${courseId}`)}
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
        <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
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
                  {getDifficultyBadge(course.difficulty || "BEGGINER")}
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
            onRefetch={refetchQuizzes}
            key={quizzes.length}
          />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentList
            assignments={assignments}
            courseId={courseId}
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
