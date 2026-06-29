import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  IconUsers,
  IconCertificate,
  IconFolder,
  IconChartLine,
  IconShield,
  IconAlertTriangle,
  IconActivity,
  IconDatabase,
  IconEye,
  IconTrash,
  IconClock,
  IconTrendingUp,
  IconServer,
  IconBellRinging,
  IconFileAnalytics,
  IconUserCheck,
  IconUserX,
  IconBookmark,
  IconRefresh
} from "@tabler/icons-react";
import { useGetDashboardStatsQuery } from "@/Redux/AllApi/index";
import { useGetAllUsersQuery } from "@/Redux/AllApi/SuperAdminApi";
import { useGetAllAuditLogsQuery } from "@/Redux/AllApi/SuperAdminApi";
import { toast } from "sonner";

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  // API calls
  const {
    data: dashboardStatsData,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats
  } = useGetDashboardStatsQuery();

  const {
    data: usersData,
    isLoading: usersLoading
  } = useGetAllUsersQuery({ limit: 10 });

  const {
    data: auditData,
    isLoading: auditLoading
  } = useGetAllAuditLogsQuery({ limit: 5 });

  // Derived state from API data
  const systemStats = dashboardStatsData?.data || {
    totals: { students: 0, instructors: 0, courses: 0, departments: 0 },
    active: { students: 0, departments: 0, publishedCourses: 0 },
    engagement: { studentEngagement: 0, departmentUtilization: 0, courseCompletion: 0 },
    recentActivitiesCount: 0
  };

  const recentActivities = auditData?.data?.audits?.map(audit => ({
    id: audit._id,
    user: audit.user?.fullName || "Unknown User",
    action: audit.action,
    target: audit.details?.target || audit.resource || "System",
    time: new Date(audit.createdAt).toLocaleString(),
    severity: audit.severity || "info"
  })) || [];

  const quickActions = [
    {
      title: "Create User",
      description: "Add new user to system",
      icon: IconUsers,
      action: () => navigate("/superadmin/all-users"),
      color: "#3b82f6"
    },
    {
      title: "View Audit Logs",
      description: "Monitor system activities",
      icon: IconFileAnalytics,
      action: () => navigate("/superadmin/audit-logs"),
      color: "#a855f7"
    },
    {
      title: "System Settings",
      description: "Configure system parameters",
      icon: IconShield,
      action: () => navigate("/superadmin/system-settings"),
      color: "#22c55e"
    },
    {
      title: "Data Management",
      description: "Backup and restore data",
      icon: IconDatabase,
      action: () => navigate("/superadmin/data-management"),
      color: "#f97316"
    }
  ];

  const StatCard = ({ title, value, subtitle, icon: Icon, trend }) => (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center mt-2 text-sm ${trend.type === 'positive' ? 'text-[#16a34a]' : 'text-[#dc2626]'
                }`}>
                <IconTrendingUp className="w-4 h-4 mr-1" />
                <span>{trend.value} {trend.label}</span>
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            <Icon className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const QuickActionCard = ({ title, description, icon: Icon, action, color }) => (
    <div
      onClick={action}
      className="bg-[#ffffff] rounded-lg shadow-sm border border-[#e5e7eb] p-4 hover:shadow-md transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start space-x-3">
        <div
          className="text-[#ffffff] p-2 rounded-lg group-hover:scale-105 transition-transform"
          style={{ backgroundColor: color }}
        >
          <Icon className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-[#111827] group-hover:text-[#2563eb] transition-colors">
            {title}
          </h3>
          <p className="text-sm text-[#4b5563] mt-1">{description}</p>
        </div>
      </div>
    </div>
  );

  const ActivityItem = ({ activity }) => {
    const severityColors = {
      success: { text: '#16a34a', bg: '#f0fdf4', dot: '#22c55e' },
      warning: { text: '#ea580c', bg: '#fff7ed', dot: '#f97316' },
      error: { text: '#dc2626', bg: '#fef2f2', dot: '#ef4444' },
      info: { text: '#2563eb', bg: '#eff6ff', dot: '#3b82f6' }
    };

    const colors = severityColors[activity.severity] || severityColors.info;

    return (
      <div className="flex items-start space-x-3 py-3 border-b border-[#f3f4f6] last:border-b-0">
        <div
          className="w-2 h-2 rounded-full mt-2"
          style={{ backgroundColor: colors.dot }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#111827]">
            <span className="font-medium">{activity.user}</span>{' '}
            {activity.action}{' '}
            <span className="font-medium">{activity.target}</span>
          </p>
          <p className="text-xs text-[#6b7280] mt-1">{activity.time}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Super Admin Dashboard</h1>
          <p className="text-[#4b5563] mt-1">
            Welcome back, {user?.fullName || 'Administrator'}. Here's what's happening with your system today.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => refetchStats()}
            variant="outline"
            disabled={statsLoading}
            className="flex items-center space-x-2"
          >
            <IconRefresh className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Badge variant="outline" className="text-[#16a34a] border-[#bbf7d0] bg-[#f0fdf4]">
            <div className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse mr-1" />
            System Healthy
          </Badge>
        </div>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          <div className="col-span-4 flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]"></div>
          </div>
        ) : statsError ? (
          <div className="col-span-4 text-center py-8 text-[#dc2626]">
            Failed to load statistics
          </div>
        ) : (
          <>
            <StatCard
              title="Total Users"
              value={(systemStats.totals.students + systemStats.totals.instructors + systemStats.totals.courses).toLocaleString()}
              subtitle={`${systemStats.active.students} active students`}
              icon={IconUsers}
              trend={{ type: 'positive', value: `${systemStats.engagement.studentEngagement}%`, label: 'engagement rate' }}
            />
            <StatCard
              title="Total Courses"
              value={systemStats.totals.courses}
              subtitle={`${systemStats.active.publishedCourses} published`}
              icon={IconCertificate}
              trend={{ type: 'positive', value: `${systemStats.engagement.courseCompletion}%`, label: 'completion rate' }}
            />
            <StatCard
              title="Active Departments"
              value={systemStats.totals.departments}
              subtitle={`${systemStats.active.departments} currently active`}
              icon={IconFolder}
              trend={{ type: 'positive', value: `${systemStats.engagement.departmentUtilization || 0}%`, label: 'utilization rate' }}
            />
            <StatCard
              title="System Health"
              value="98.5%"
              subtitle="All systems operational"
              icon={IconActivity}
              trend={{ type: 'positive', value: '+0.5%', label: 'uptime improvement' }}
            />
          </>
        )}
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">System Overview</CardTitle>
              <Link
                to="/superadmin/system-monitoring"
                className="text-sm text-primary hover:underline font-medium"
              >
                View Details →
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Storage Usage</span>
                    <span className="text-sm font-semibold">85.2%</span>
                  </div>
                  <Progress value={85.2} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">API Response Time</span>
                    <span className="text-sm font-semibold">120ms</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <IconServer className="w-4 h-4 text-[#22c55e]" />
                    <span className="text-sm text-[#16a34a]">Excellent</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            <IconBellRinging className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quickActions.map((action, index) => (
                <QuickActionCard key={index} {...action} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities and System Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Recent Activities</CardTitle>
            <Link
              to="/superadmin/audit-logs"
              className="text-sm text-primary hover:underline font-medium"
            >
              View All →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto">
              {auditLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : recentActivities.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No recent activities
                </div>
              ) : (
                recentActivities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">User Statistics</CardTitle>
            <Link
              to="/superadmin/analytics-reports"
              className="text-sm text-primary hover:underline font-medium"
            >
              Detailed Report →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#f3f4f6' }}>
                <div className="flex items-center space-x-3">
                  <IconUserCheck className="w-5 h-5" style={{ color: '#16a34a' }} />
                  <span className="text-sm font-medium">Active Employees</span>
                </div>
                <Badge variant="outline">{systemStats.active.students}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#f3f4f6' }}>
                <div className="flex items-center space-x-3">
                  <IconUsers className="w-5 h-5" style={{ color: '#2563eb' }} />
                  <span className="text-sm font-medium">Total Trainers</span>
                </div>
                <Badge variant="outline">{systemStats.totals.instructors}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#f3f4f6' }}>
                <div className="flex items-center space-x-3">
                  <IconBookmark className="w-5 h-5" style={{ color: '#9333ea' }} />
                  <span className="text-sm font-medium">Total Employees</span>
                </div>
                <Badge variant="outline">{systemStats.totals.students}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#fef2f2' }}>
                <div className="flex items-center space-x-3">
                  <IconActivity className="w-5 h-5" style={{ color: '#dc2626' }} />
                  <span className="text-sm font-medium">Recent Activities</span>
                </div>
                <Badge variant="outline" style={{ color: '#dc2626', borderColor: '#fecaca' }}>{systemStats.recentActivitiesCount}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Management Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/superadmin/all-users"
          className="border rounded-lg p-6 transition-all duration-200 group"
          style={{
            background: 'linear-gradient(to bottom right, #eff6ff, #dbeafe)',
            borderColor: '#bfdbfe'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(to bottom right, #dbeafe, #bfdbfe)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(to bottom right, #eff6ff, #dbeafe)';
          }}
        >
          <div className="flex items-center space-x-4">
            <div
              className="text-[#ffffff] p-3 rounded-lg group-hover:scale-105 transition-transform"
              style={{ backgroundColor: '#2563eb' }}
            >
              <IconUsers className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-semibold text-[#111827] group-hover:text-[#1d4ed8]">User Management</h3>
              <p className="text-sm text-[#4b5563]">Manage all users and permissions</p>
            </div>
          </div>
        </Link>

        <Link
          to="/superadmin/courses"
          className="border rounded-lg p-6 transition-all duration-200 group"
          style={{
            background: 'linear-gradient(to bottom right, #f0fdf4, #dcfce7)',
            borderColor: '#bbf7d0'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(to bottom right, #dcfce7, #bbf7d0)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(to bottom right, #f0fdf4, #dcfce7)';
          }}
        >
          <div className="flex items-center space-x-4">
            <div
              className="text-[#ffffff] p-3 rounded-lg group-hover:scale-105 transition-transform"
              style={{ backgroundColor: '#16a34a' }}
            >
              <IconCertificate className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-semibold text-[#111827] group-hover:text-[#15803d]">Course Management</h3>
              <p className="text-sm text-[#4b5563]">Manage courses and content</p>
            </div>
          </div>
        </Link>

        <Link
          to="/superadmin/system-settings"
          className="border rounded-lg p-6 transition-all duration-200 group"
          style={{
            background: 'linear-gradient(to bottom right, #faf5ff, #f3e8ff)',
            borderColor: '#e9d5ff'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(to bottom right, #f3e8ff, #e9d5ff)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(to bottom right, #faf5ff, #f3e8ff)';
          }}
        >
          <div className="flex items-center space-x-4">
            <div
              className="text-[#ffffff] p-3 rounded-lg group-hover:scale-105 transition-transform"
              style={{ backgroundColor: '#9333ea' }}
            >
              <IconShield className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-semibold text-[#111827] group-hover:text-[#7e22ce]">System Settings</h3>
              <p className="text-sm text-[#4b5563]">Configure system parameters</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;


