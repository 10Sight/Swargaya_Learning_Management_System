import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGetAllInstructorsQuery, useGetAllStudentsQuery } from '@/Redux/AllApi/InstructorApi';
import { useGetAllDepartmentsQuery } from '@/Redux/AllApi/DepartmentApi';
import { useGetCoursesQuery } from '@/Redux/AllApi/CourseApi';
import { useGetAllAuditsQuery } from '@/Redux/AllApi/AuditApi';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  IconUsers,
  IconSchool,
  IconCalendar,
  IconBook,
  IconTrendingUp,
  IconActivity,
  IconPlus,
  IconEye,
  IconSettings,
  IconChartBar,
  IconUserCheck,
  IconBook2,
  IconClipboardCheck,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";

// Reusable StatCard component
const StatCard = ({ title, value, description, icon: Icon, iconBgColor, iconColor, isLoading, trend, linkTo }) => {
  const CardWrapper = linkTo ? Link : 'div';
  const cardProps = linkTo ? { to: linkTo, className: "block" } : {};

  return (
    <CardWrapper {...cardProps}>
      <Card className={`border border-[#e5e7eb] shadow-sm transition-all hover:shadow-md ${linkTo ? 'hover:border-[#bfdbfe] cursor-pointer' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-[#4b5563]">
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
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold text-[#111827]">{value}</div>
              {trend && (
                <div className={`flex items-center text-xs ${trend.type === 'positive' ? 'text-[#16a34a]' : trend.type === 'negative' ? 'text-[#dc2626]' : 'text-[#6b7280]'
                  }`}>
                  <IconTrendingUp className="h-3 w-3 mr-1" />
                  {trend.value}
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        </CardContent>
      </Card>
    </CardWrapper>
  );
};

// Quick Action Card component
const QuickActionCard = ({ title, description, icon: Icon, linkTo, color = "blue" }) => {
  const colorClasses = {
    blue: { bg: 'bg-[#eff6ff]', text: 'text-[#2563eb]', border: 'border-[#bfdbfe]' },
    green: { bg: 'bg-[#f0fdf4]', text: 'text-[#16a34a]', border: 'border-[#bbf7d0]' },
    purple: { bg: 'bg-[#faf5ff]', text: 'text-[#9333ea]', border: 'border-[#e9d5ff]' },
    orange: { bg: 'bg-[#fff7ed]', text: 'text-[#ea580c]', border: 'border-[#fed7aa]' },
    red: { bg: 'bg-[#fef2f2]', text: 'text-[#dc2626]', border: 'border-[#fecaca]' }
  };

  return (
    <Link to={linkTo}>
      <Card className={`${colorClasses[color].border} border-2 hover:shadow-md transition-all cursor-pointer group`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${colorClasses[color].bg}`}>
              <Icon className={`h-5 w-5 ${colorClasses[color].text}`} />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-[#111827] group-hover:text-[#374151]">{title}</h3>
              <p className="text-sm text-[#6b7280]">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

const Home = () => {
  // API calls for all stats
  const { data: studentsData, isLoading: studentsLoading } = useGetAllStudentsQuery();
  const { data: instructorsData, isLoading: instructorsLoading } = useGetAllInstructorsQuery();
  const { data: departmentsData, isLoading: departmentsLoading } = useGetAllDepartmentsQuery();
  const { data: coursesData, isLoading: coursesLoading } = useGetCoursesQuery({
    page: 1,
    limit: 1000, // Get all courses for count
    search: "",
    category: "",
    status: ""
  });
  const { data: auditsData, isLoading: auditsLoading } = useGetAllAuditsQuery({
    page: 1,
    limit: 10
  });

  // Extract counts from API responses
  const totalStudents = studentsData?.data?.totalUsers || 0;
  const totalInstructors = instructorsData?.data?.totalUsers || 0;
  const totalDepartments = departmentsData?.data?.totalDepartments || 0;
  const totalCourses = coursesData?.data?.total || 0;
  const recentActivities = auditsData?.data?.audits || [];

  // Calculate additional statistics
  const activeStudents = useMemo(() => {
    if (!studentsData?.data?.users) return 0;
    return studentsData.data.users.filter(student => student.status === 'ACTIVE').length;
  }, [studentsData]);

  const activeDepartments = useMemo(() => {
    if (!departmentsData?.data?.departments) return 0;
    return departmentsData.data.departments.filter(department => department.status === 'COMPLETED').length;
  }, [departmentsData]);

  const publishedCourses = useMemo(() => {
    if (!coursesData?.data?.courses) return 0;
    return coursesData.data.courses.filter(course => course.status === 'PUBLISHED').length;
  }, [coursesData]);

  // Calculate engagement metrics
  const studentEngagement = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;
  const departmentUtilization = totalDepartments > 0 ? Math.round((activeDepartments / totalDepartments) * 100) : 0;
  const courseCompletion = totalCourses > 0 ? Math.round((publishedCourses / totalCourses) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#2563eb] to-[#1e40af] text-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Welcome to Admin Dashboard</h1>
        <p className="text-[#dbeafe]">Manage your learning management system efficiently</p>
      </div>

      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Employees"
          value={totalStudents}
          description="All registered employees"
          icon={IconUsers}
          iconBgColor="bg-[#dbeafe]"
          iconColor="text-[#2563eb]"
          isLoading={studentsLoading}
          linkTo="/admin/employees"
          trend={{ type: 'positive', value: `${activeStudents} active` }}
        />

        <StatCard
          title="Total Trainers"
          value={totalInstructors}
          description="Teaching staff members"
          icon={IconSchool}
          iconBgColor="bg-[#dcfce7]"
          iconColor="text-[#16a34a]"
          isLoading={instructorsLoading}
          linkTo="/admin/trainers"
        />

        <StatCard
          title="Total Departments"
          value={totalDepartments}
          description="Learning groups"
          icon={IconCalendar}
          iconBgColor="bg-[#f3e8ff]"
          iconColor="text-[#9333ea]"
          isLoading={departmentsLoading}
          linkTo="/admin/departments"
          trend={{ type: 'positive', value: `${activeDepartments} active` }}
        />

        <StatCard
          title="Total Courses"
          value={totalCourses}
          description="Available courses"
          icon={IconBook}
          iconBgColor="bg-[#ffedd5]"
          iconColor="text-[#ea580c]"
          isLoading={coursesLoading}
          linkTo="/admin/courses"
          trend={{ type: 'positive', value: `${publishedCourses} published` }}
        />
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#4b5563]">Employee Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-[#111827]">{studentEngagement}%</span>
              <IconUserCheck className="h-5 w-5 text-[#2563eb]" />
            </div>
            <Progress value={studentEngagement} className="mb-2" />
            <p className="text-xs text-[#6b7280]">Active employees participating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#4b5563]">Department Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-[#111827]">{departmentUtilization}%</span>
              <IconSchool className="h-5 w-5 text-[#9333ea]" />
            </div>
            <Progress value={departmentUtilization} className="mb-2" />
            <p className="text-xs text-[#6b7280]">Active learning groups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#4b5563]">Course Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-[#111827]">{courseCompletion}%</span>
              <IconBook2 className="h-5 w-5 text-[#16a34a]" />
            </div>
            <Progress value={courseCompletion} className="mb-2" />
            <p className="text-xs text-[#6b7280]">Published and available</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconActivity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest system events</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/analytics">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {auditsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.slice(0, 5).map((activity, index) => (
                  <div key={activity._id || index} className="flex items-start space-x-3">
                    <div className="h-2 w-2 bg-[#2563eb] rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#111827] truncate">
                        {activity.action || 'System activity'}
                      </p>
                      <p className="text-xs text-[#6b7280]">
                        {activity.user?.fullName || 'System'} • {new Date(activity.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.action?.split(' ')[0] || 'Activity'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-[#6b7280] py-8">
                <IconActivity className="h-8 w-8 mx-auto mb-2 text-[#9ca3af]" />
                <p>No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconSettings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <QuickActionCard
                title="Add New Course"
                description="Create a new learning course"
                icon={IconPlus}
                linkTo="/admin/add-course"
                color="blue"
              />

              <QuickActionCard
                title="Manage Departments"
                description="View and organize departments"
                icon={IconCalendar}
                linkTo="/admin/departments"
                color="purple"
              />

              <QuickActionCard
                title="View Reports"
                description="Analytics and insights"
                icon={IconChartBar}
                linkTo="/admin/analytics"
                color="green"
              />

              <QuickActionCard
                title="Employee Management"
                description="Manage employee accounts"
                icon={IconUsers}
                linkTo="/admin/employees"
                color="orange"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconClipboardCheck className="h-5 w-5" />
            System Overview
          </CardTitle>
          <CardDescription>Key performance indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-[#16a34a]">{activeStudents}</div>
              <div className="text-sm text-[#6b7280]">Active Employees</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[#2563eb]">{activeDepartments}</div>
              <div className="text-sm text-[#6b7280]">Running Departments</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[#9333ea]">{publishedCourses}</div>
              <div className="text-sm text-[#6b7280]">Published Courses</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[#ea580c]">{recentActivities.length}</div>
              <div className="text-sm text-[#6b7280]">Recent Activities</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;