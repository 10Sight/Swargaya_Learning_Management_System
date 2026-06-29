import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
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
      <Card
        className={`shadow-sm transition-all hover:shadow-md ${linkTo ? 'cursor-pointer' : ''}`}
        style={{
          border: '1px solid #e5e7eb',
          borderColor: linkTo ? '#e5e7eb' : '#e5e7eb' // Base value
        }}
        onMouseEnter={(e) => {
          if (linkTo) {
            e.currentTarget.style.borderColor = '#bfdbfe';
          }
        }}
        onMouseLeave={(e) => {
          if (linkTo) {
            e.currentTarget.style.borderColor = '#e5e7eb';
          }
        }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium" style={{ color: '#4b5563' }}>
            {title}
          </CardTitle>
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center`}
            style={{ backgroundColor: iconBgColor }}
          >
            <Icon className={`h-5 w-5`} style={{ color: iconColor }} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold" style={{ color: '#111827' }}>{value}</div>
              {trend && (
                <div
                  className={`flex items-center text-xs`}
                  style={{ color: trend.type === 'positive' ? '#16a34a' : trend.type === 'negative' ? '#dc2626' : '#6b7280' }}
                >
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
    blue: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    green: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
    purple: { bg: '#faf5ff', text: '#9333ea', border: '#e9d5ff' },
    orange: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
    red: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' }
  };

  return (
    <Link to={linkTo}>
      <Card
        className={`hover:shadow-md transition-all cursor-pointer group`}
        style={{
          border: `2px solid ${colorClasses[color].border}`
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg`}
              style={{ backgroundColor: colorClasses[color].bg }}
            >
              <Icon
                className={`h-5 w-5`}
                style={{ color: colorClasses[color].text }}
              />
            </div>
            <div className="flex-1">
              <h3 className="font-medium" style={{ color: '#111827' }}>{title}</h3>
              <p className="text-sm" style={{ color: '#6b7280' }}>{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

const Home = () => {
  const currentUser = useSelector((state) => state.auth?.user);
  const isAdmin = currentUser?.role === 'ADMIN';
  const unitFilter = isAdmin ? (currentUser?.unit || "") : "";

  // API calls for all stats
  const { data: studentsData, isLoading: studentsLoading } = useGetAllStudentsQuery({ limit: 1000, unit: unitFilter });
  const { data: instructorsData, isLoading: instructorsLoading } = useGetAllInstructorsQuery({ limit: 1000, unit: unitFilter });
  const { data: departmentsData, isLoading: departmentsLoading } = useGetAllDepartmentsQuery({ limit: 1000, unit: unitFilter });
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
    return studentsData.data.users.filter(student => student.status === 'ACTIVE' || student.status === 'PRESENT').length;
  }, [studentsData]);

  const activeDepartments = useMemo(() => {
    if (!departmentsData?.data?.departments) return 0;
    return departmentsData.data.departments.filter(department => department.status === 'ONGOING' || department.status === 'ACTIVE').length;
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
      <div
        className="text-white p-6 rounded-lg shadow-lg"
        style={{ background: 'linear-gradient(to right, #2563eb, #1e40af)' }}
      >
        <h1 className="text-2xl font-bold mb-2">Welcome to Admin Dashboard</h1>
        <p style={{ color: '#dbeafe' }}>Manage your learning management system efficiently</p>
      </div>

      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Employees"
          value={totalStudents}
          description="All registered employees"
          icon={IconUsers}
          iconBgColor="#dbeafe"
          iconColor="#2563eb"
          isLoading={studentsLoading}
          linkTo="/admin/employees"
          trend={{ type: 'positive', value: `${activeStudents} active` }}
        />

        <StatCard
          title="Total Trainers"
          value={totalInstructors}
          description="Teaching staff members"
          icon={IconSchool}
          iconBgColor="#dcfce7"
          iconColor="#16a34a"
          isLoading={instructorsLoading}
          linkTo="/admin/trainers"
        />

        <StatCard
          title="Total Departments"
          value={totalDepartments}
          description="Learning groups"
          icon={IconCalendar}
          iconBgColor="#f3e8ff"
          iconColor="#9333ea"
          isLoading={departmentsLoading}
          linkTo="/admin/departments"
          trend={{ type: 'positive', value: `${activeDepartments} active` }}
        />

        <StatCard
          title="Total Courses"
          value={totalCourses}
          description="Available courses"
          icon={IconBook}
          iconBgColor="#ffedd5"
          iconColor="#ea580c"
          isLoading={coursesLoading}
          linkTo="/admin/courses"
          trend={{ type: 'positive', value: `${publishedCourses} published` }}
        />
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: '#4b5563' }}>Employee Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold" style={{ color: '#111827' }}>{studentEngagement}%</span>
              <IconUserCheck className="h-5 w-5" style={{ color: '#2563eb' }} />
            </div>
            <Progress value={studentEngagement} className="mb-2" />
            <p className="text-xs" style={{ color: '#6b7280' }}>Active employees participating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: '#4b5563' }}>Department Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold" style={{ color: '#111827' }}>{departmentUtilization}%</span>
              <IconSchool className="h-5 w-5" style={{ color: '#9333ea' }} />
            </div>
            <Progress value={departmentUtilization} className="mb-2" />
            <p className="text-xs" style={{ color: '#6b7280' }}>Active learning groups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium" style={{ color: '#4b5563' }}>Course Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold" style={{ color: '#111827' }}>{courseCompletion}%</span>
              <IconBook2 className="h-5 w-5" style={{ color: '#16a34a' }} />
            </div>
            <Progress value={courseCompletion} className="mb-2" />
            <p className="text-xs" style={{ color: '#6b7280' }}>Published and available</p>
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
                    <div
                      className="h-2 w-2 rounded-full mt-2 flex-shrink-0"
                      style={{ backgroundColor: '#2563eb' }}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: '#111827' }}>
                        {activity.action || 'System activity'}
                      </p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>
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
              <div className="text-center py-8" style={{ color: '#6b7280' }}>
                <IconActivity className="h-8 w-8 mx-auto mb-2" style={{ color: '#9ca3af' }} />
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
              <div className="text-lg font-bold" style={{ color: '#16a34a' }}>{activeStudents}</div>
              <div className="text-sm" style={{ color: '#6b7280' }}>Active Employees</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: '#2563eb' }}>{activeDepartments}</div>
              <div className="text-sm" style={{ color: '#6b7280' }}>Running Departments</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: '#9333ea' }}>{publishedCourses}</div>
              <div className="text-sm" style={{ color: '#6b7280' }}>Published Courses</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: '#ea580c' }}>{recentActivities.length}</div>
              <div className="text-sm" style={{ color: '#6b7280' }}>Recent Activities</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;