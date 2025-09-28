import React from 'react'
import { Link } from 'react-router-dom'
import { useGetInstructorDashboardStatsQuery } from '@/Redux/AllApi/InstructorApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  IconBook,
  IconUsers,
  IconClipboardList,
  IconFileText,
  IconEye,
  IconTrendingUp,
  IconCalendar,
  IconClipboard,
} from '@tabler/icons-react'

const InstructorDashboard = () => {
  const { data: stats, isLoading, error } = useGetInstructorDashboardStatsQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load dashboard data</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const { courses, batches, students, recentActivities } = stats?.data || {}

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to your Instructor Dashboard
        </h2>
        <p className="text-muted-foreground">
          Monitor your assigned courses and batches. Track student progress and performance.
        </p>
        <Badge variant="success" className="mt-2">
          Read-only Access
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Assigned Courses
            </CardTitle>
            <IconBook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {courses?.published || 0} published courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Batches
            </CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batches?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {batches?.active || 0} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <IconTrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all your batches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
            <IconCalendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentActivities?.count || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link to="/instructor/courses">
              <Button variant="outline" className="w-full justify-start">
                <IconBook className="h-4 w-4 mr-2" />
                View My Courses
                <IconEye className="h-4 w-4 ml-auto" />
              </Button>
            </Link>
            
            <Link to="/instructor/batches">
              <Button variant="outline" className="w-full justify-start">
                <IconUsers className="h-4 w-4 mr-2" />
                View My Batches
                <IconEye className="h-4 w-4 ml-auto" />
              </Button>
            </Link>
            
            <Link to="/instructor/students">
              <Button variant="outline" className="w-full justify-start">
                <IconUsers className="h-4 w-4 mr-2" />
                Monitor Students
                <IconEye className="h-4 w-4 ml-auto" />
              </Button>
            </Link>
            
            <Link to="/instructor/quiz-monitoring">
              <Button variant="outline" className="w-full justify-start">
                <IconClipboardList className="h-4 w-4 mr-2" />
                Quiz Monitoring
                <IconEye className="h-4 w-4 ml-auto" />
              </Button>
            </Link>
            
            <Link to="/instructor/assignment-monitoring">
              <Button variant="outline" className="w-full justify-start">
                <IconClipboard className="h-4 w-4 mr-2" />
                Assignment Monitoring
                <IconEye className="h-4 w-4 ml-auto" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities?.items?.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.items.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Important Note */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div>
              <h3 className="font-medium text-amber-900">Read-Only Access</h3>
              <p className="text-sm text-amber-700 mt-1">
                You have view-only access to courses, batches, and student data. 
                You cannot create, edit, or delete any content. For administrative 
                actions, please contact your system administrator.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
};

export default InstructorDashboard;


