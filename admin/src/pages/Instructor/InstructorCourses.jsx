import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGetCoursesQuery } from "@/Redux/AllApi/CourseApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IconBook,
  IconSearch,
  IconExternalLink,
  IconLoader,
  IconRefresh,
  IconEye,
  IconFileText,
  IconUsers,
  IconCalendar,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SearchInput from "@/components/common/SearchInput";
import StatCard from "@/components/common/StatCard";

const InstructorCourses = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // API Hook - Only fetch published courses
  const {
    data: coursesData,
    isLoading,
    error: coursesError,
    refetch,
  } = useGetCoursesQuery(
    {
      page: currentPage,
      limit: 10,
      search: debouncedSearchTerm || "",
      status: "PUBLISHED", // Only get published courses
    },
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );

  const courses = coursesData?.data?.courses || [];
  const totalPages = coursesData?.data?.totalPages || 1;
  const totalCount = coursesData?.data?.total || 0;

  const handleCourseClick = (course) => {
    navigate(`/instructor/courses/${course.id || course._id}`);
  };

  const getDifficultyBadge = (difficulty) => {
    const difficultyMapping = {
      BEGGINER: "BEGINNER",
      BEGINNER: "BEGINNER",
      INTERMEDIATE: "INTERMEDIATE",
      ADVANCED: "ADVANCED",
    };

    const normalizedDifficulty = difficultyMapping[difficulty] || difficulty;

    const difficultyConfig = {
      BEGINNER: { variant: "success", label: "Beginner" },
      INTERMEDIATE: { variant: "warning", label: "Intermediate" },
      ADVANCED: { variant: "destructive", label: "Advanced" },
    };

    const config = difficultyConfig[normalizedDifficulty] || {
      variant: "secondary",
      label: difficulty,
    };

    return (
      <Badge variant={config.variant} className="w-fit">
        {config.label}
      </Badge>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32 mt-1" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-10 w-80" />
          </CardHeader>
        </Card>

        {/* Table Skeleton */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {[1, 2, 3, 4].map((i) => (
                    <TableHead key={i}>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((row) => (
                  <TableRow key={row}>
                    {[1, 2, 3, 4].map((cell) => (
                      <TableCell key={cell}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (coursesError) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4 p-4">
        <div className="text-[#dc2626] text-lg font-medium">
          Error loading courses
        </div>
        <p className="text-[#4b5563] text-center">
          {coursesError?.message || "Failed to fetch courses"}
        </p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <IconRefresh className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Available Courses"
          value={totalCount}
          description="Courses you can access"
          icon={IconBook}
          iconBgColor="bg-[#dbeafe]"
          iconColor="text-[#2563eb]"
          gradientFrom="from-[#eff6ff]"
          gradientTo="to-[#dbeafe]"
          borderColor="border-[#bfdbfe]"
          textColor="text-[#1e40af]"
          valueColor="text-[#1e3a8a]"
        />

        <StatCard
          title="Total Modules"
          value={courses.reduce(
            (total, course) => total + (course.modules?.length || 0),
            0
          )}
          description="Learning materials available"
          icon={IconFileText}
          iconBgColor="bg-[#f3e8ff]"
          iconColor="text-[#9333ea]"
          gradientFrom="from-[#faf5ff]"
          gradientTo="to-[#f3e8ff]"
          borderColor="border-[#e9d5ff]"
          textColor="text-[#6b21a8]"
          valueColor="text-[#581c87]"
        />

        <StatCard
          title="Enrolled Students"
          value={courses.reduce(
            (total, course) => total + (course.enrollments?.length || 0),
            0
          )}
          description="Across all courses"
          icon={IconUsers}
          iconBgColor="bg-[#dcfce7]"
          iconColor="text-[#16a34a]"
          gradientFrom="from-[#f0fdf4]"
          gradientTo="to-[#dcfce7]"
          borderColor="border-[#bbf7d0]"
          textColor="text-[#166534]"
          valueColor="text-[#14532d]"
        />
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <SearchInput
              placeholder="Search published courses..."
              value={searchTerm}
              onChange={setSearchTerm}
              className="w-full sm:w-96"
            />

            <div className="text-sm text-muted-foreground">
              {totalCount} published courses available
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[300px]">Course</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Modules</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.length > 0 ? (
                courses.map((course) => (
                  <TableRow
                    key={course.id || course._id}
                    className="group hover:bg-muted/30 cursor-pointer"
                    onClick={() => handleCourseClick(course)}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 border bg-[#dbeafe]">
                          <AvatarFallback className="bg-[#dbeafe] text-[#1e40af]">
                            <IconBook className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground line-clamp-1">
                              {course.title}
                            </p>
                            <IconExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {course.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{course.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {getDifficultyBadge(course.difficulty)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <IconFileText className="h-4 w-4 text-muted-foreground" />
                        <span>{course.modules?.length || 0} modules</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <div className="flex flex-col items-center space-y-3">
                      <IconBook className="h-12 w-12 text-muted-foreground/60" />
                      <p className="text-muted-foreground font-medium">
                        No published courses available
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm
                          ? "No courses match your search criteria"
                          : "Check back later for new courses"}
                      </p>
                      {searchTerm && (
                        <Button
                          variant="outline"
                          onClick={() => setSearchTerm("")}
                          className="mt-2"
                        >
                          Clear search
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {courses.length} of {totalCount} courses
          </p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </Button>
            <div className="flex items-center justify-center px-4 text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorCourses;