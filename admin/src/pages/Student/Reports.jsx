import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FileText,
  GraduationCap,
  Calendar,
  CheckCircle,
  Award,
  BookOpen,
  Users,
  TrendingUp
} from 'lucide-react'
import { useGetMyAllProgressQuery } from '@/Redux/AllApi/ProgressApi'

const Reports = () => {
  const navigate = useNavigate()
  const { data, isLoading, error } = useGetMyAllProgressQuery()

  const progressData = data?.data || []

  // Filter courses with accessible reports (server computes reportAvailable based on modules + quizzes)
  const accessibleReports = progressData.filter(progress => progress.reportAvailable);

  // Separate other completed courses that are not yet report-ready
  const otherCompletedCourses = progressData.filter(progress => {
    const isComplete = progress.progressPercent === 100;
    return isComplete && !progress.reportAvailable;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleViewReport = (courseId) => {
    navigate(`/student/report/${courseId}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Skeleton className="h-8 w-64 mx-auto mb-2" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-48">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Failed to load your course progress. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(to bottom right, #3b82f6, #9333ea)' }}
          >
            <GraduationCap className="h-8 w-8 text-[#ffffff]" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111827]">Course Reports</h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-2">
            Download completion certificates and performance reports for your finished courses
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center flex-wrap gap-3 sm:gap-4 p-4 sm:p-6">
            <div
              className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg mr-4"
              style={{ backgroundColor: '#dcfce7' }}
            >
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: '#16a34a' }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#111827]">{progressData.filter(p => p.progressPercent === 100).length}</p>
              <p className="text-sm" style={{ color: '#4b5563' }}>Completed Courses</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center flex-wrap gap-3 sm:gap-4 p-4 sm:p-6">
            <div
              className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg mr-4"
              style={{ backgroundColor: '#dbeafe' }}
            >
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: '#2563eb' }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#111827]">{progressData.length}</p>
              <p className="text-sm" style={{ color: '#4b5563' }}>Total Enrolled</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center flex-wrap gap-3 sm:gap-4 p-4 sm:p-6">
            <div
              className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg mr-4"
              style={{ backgroundColor: '#f3e8ff' }}
            >
              <Award className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: '#9333ea' }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#111827]">{accessibleReports.length}</p>
              <p className="text-sm" style={{ color: '#4b5563' }}>Reports Available</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accessible Course Reports */}
      {accessibleReports.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#eab308]" />
            <h2 className="text-xl sm:text-2xl font-semibold text-[#111827]">Available Course Reports</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {accessibleReports.map((progress) => (
              <Card key={progress._id} className="hover:shadow-lg transition-shadow border" style={{ borderColor: '#bbf7d0' }}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base sm:text-lg leading-6 mb-2 break-words">
                        {progress.course?.title || 'Course Title'}
                      </CardTitle>
                      <div className="flex items-center gap-2 flex-wrap text-sm" style={{ color: '#6b7280' }} mb-2>
                        <Users className="h-4 w-4" />
                        <span>Department: {progress.department?.name || 'N/A'}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm gap-2">
                      <span className="text-muted-foreground">Progress:</span>
                      <span className="font-medium text-[#16a34a]">{progress.progressPercent}%</span>
                    </div>

                    <div className="flex justify-between text-xs sm:text-sm gap-2">
                      <span className="text-muted-foreground">Level:</span>
                      <Badge variant="outline" className="text-xs">
                        {progress.currentLevel}
                      </Badge>
                    </div>

                    <div className="flex justify-between text-xs sm:text-sm gap-2">
                      <span className="text-muted-foreground">Completed:</span>
                      <span className="font-medium">
                        {formatDate(progress.completedAt)}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleViewReport(progress.course._id)}
                    className="w-full"
                    variant="outline"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Report
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-[#f3f4f6] rounded-full flex items-center justify-center">
                <GraduationCap className="h-8 w-8 text-[#9ca3af]" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-[#111827] mb-2">No Course Reports Available</h3>
            <p className="text-muted-foreground mb-4">
              Complete a course, finish all modules, and pass all required quizzes to generate your first report and certificate!
            </p>
            <Button
              onClick={() => navigate('/student/course')}
              variant="outline"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Browse Courses
            </Button>
          </CardContent>
        </Card>
      )}

      {/* In Progress Courses */}
      {progressData.length > accessibleReports.length && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#3b82f6]" />
            <h2 className="text-2xl font-semibold text-[#111827]">Courses In Progress</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {progressData
              .filter(progress => !progress.isCompleted || progress.progressPercent < 100)
              .map((progress) => (
                <Card key={progress._id} className="border border-[#bfdbfe]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">
                      {progress.course?.title || 'Course Title'}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      <Users className="h-4 w-4" />
                      <span>Department: {progress.department?.name || 'N/A'}</span>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm gap-2">
                        <span style={{ color: '#6b7280' }}>Progress:</span>
                        <span className="font-medium">{progress.progressPercent}%</span>
                      </div>
                      <div className="w-full rounded-full h-2" style={{ backgroundColor: '#e5e7eb' }}>
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${progress.progressPercent}%`,
                            backgroundColor: '#2563eb'
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Complete this course to generate your certificate
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Reports
