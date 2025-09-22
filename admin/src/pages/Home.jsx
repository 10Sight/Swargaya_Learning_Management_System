import React from 'react';
import { useGetAllInstructorsQuery, useGetAllStudentsQuery } from '@/Redux/AllApi/InstructorApi';
import { useGetAllBatchesQuery } from '@/Redux/AllApi/BatchApi';
import { useGetCoursesQuery } from '@/Redux/AllApi/CourseApi';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  IconUsers,
  IconSchool,
  IconCalendar,
  IconBook,
  IconLoader
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";

// Reusable StatCard component
const StatCard = ({ title, value, description, icon: Icon, iconBgColor, iconColor, isLoading }) => {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className={`h-8 w-8 rounded-full ${iconBgColor} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold text-gray-900">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  );
};

const Home = () => {
  // API calls for all stats
  const { data: studentsData, isLoading: studentsLoading } = useGetAllStudentsQuery();
  const { data: instructorsData, isLoading: instructorsLoading } = useGetAllInstructorsQuery();
  const { data: batchesData, isLoading: batchesLoading } = useGetAllBatchesQuery();
  const { data: coursesData, isLoading: coursesLoading } = useGetCoursesQuery({
    page: 1,
    limit: 1000, // Get all courses for count
    search: "",
    category: "",
    status: ""
  });

  // Extract counts from API responses based on the structure you provided
  const totalStudents = studentsData?.data?.totalUsers || 0;
  const totalInstructors = instructorsData?.data?.totalUsers || 0;
  const totalBatches = batchesData?.data?.totalBatches || 0;
  const totalCourses = coursesData?.data?.total || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={totalStudents}
          description="All registered students"
          icon={IconUsers}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          isLoading={studentsLoading}
        />

        <StatCard
          title="Total Instructors"
          value={totalInstructors}
          description="Teaching staff members"
          icon={IconSchool}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          isLoading={instructorsLoading}
        />

        <StatCard
          title="Total Batches"
          value={totalBatches}
          description="Active learning groups"
          icon={IconCalendar}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          isLoading={batchesLoading}
        />

        <StatCard
          title="Total Courses"
          value={totalCourses}
          description="Available learning materials"
          icon={IconBook}
          iconBgColor="bg-orange-100"
          iconColor="text-orange-600"
          isLoading={coursesLoading}
        />
      </div>

      {/* Additional dashboard content can be added here */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500 py-8">
              Activity feed will be displayed here
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500 py-8">
              Quick action buttons will be displayed here
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;