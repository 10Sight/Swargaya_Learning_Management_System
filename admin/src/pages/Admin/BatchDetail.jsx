// src/pages/BatchDetail.jsx
import React, { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { 
  useGetBatchByIdQuery, 
  useGetBatchProgressQuery, 
  useGetBatchSubmissionsQuery, 
  useGetBatchAttemptsQuery 
} from "@/Redux/AllApi/BatchApi";
import BatchDetailHeader from "@/components/batches/BatchDetailHeader";
import BatchInstructorCard from "@/components/batches/BatchInstructorCard";
import BatchCourseCard from "@/components/batches/BatchCourseCard";
import BatchStudentsTable from "@/components/batches/BatchStudentsTable";
import BatchStats from "@/components/batches/BatchStats";
import BatchSkeleton from "@/components/batches/BatchSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  IconArrowLeft, 
  IconRefresh, 
  IconUsers,
  IconTrendingUp,
  IconFileText,
  IconClipboardList,
  IconChartBar,
  IconEye,
  IconX,
  IconBook2,
  IconTrophy,
  IconUser,
  IconMail
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const BatchDetail = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // API Queries
  const {
    data: batchData,
    isLoading: batchLoading,
    error: batchError,
    refetch: refetchBatch,
  } = useGetBatchByIdQuery(batchId);

  const {
    data: progressData,
    isLoading: progressLoading,
    error: progressError,
    refetch: refetchProgress,
  } = useGetBatchProgressQuery(batchId, {
    refetchOnMountOrArgChange: true,
  });

  const {
    data: submissionsData,
    isLoading: submissionsLoading,
    error: submissionsError,
    refetch: refetchSubmissions,
  } = useGetBatchSubmissionsQuery(batchId, {
    refetchOnMountOrArgChange: true,
  });

  const {
    data: attemptsData,
    isLoading: attemptsLoading,
    error: attemptsError,
    refetch: refetchAttempts,
  } = useGetBatchAttemptsQuery(batchId, {
    refetchOnMountOrArgChange: true,
  });

  const batch = batchData?.data;
  const progressStats = progressData?.data || { batchProgress: [], overallStats: {} };
  const submissionStats = submissionsData?.data || { submissions: [], stats: {} };
  const attemptStats = attemptsData?.data || { attempts: [], stats: {} };

  const isLoading = batchLoading;
  const anyError = batchError || progressError || submissionsError || attemptsError;

  const handleRefreshAll = () => {
    refetchBatch();
    refetchProgress();
    refetchSubmissions();
    refetchAttempts();
    toast.success("Batch data refreshed successfully!");
  };

  const getSubmissionStatusBadge = (submission) => {
    let variant, label;
    
    if (submission.grade !== undefined && submission.grade !== null) {
      variant = "default";
      label = "Graded";
    } else if (submission.isLate) {
      variant = "destructive";
      label = "Late";
    } else {
      variant = "secondary";
      label = "Submitted";
    }
    
    return (
      <Badge variant={variant}>
        {label}
      </Badge>
    );
  };

  // Calculate enhanced statistics
  const enhancedStats = useMemo(() => {
    const { overallStats } = progressStats;
    const { stats: submissionStatsData } = submissionStats;
    const { stats: attemptStatsData } = attemptStats;

    return {
      totalStudents: batch?.students?.length || 0,
      studentsWithProgress: overallStats.studentsWithProgress || 0,
      averageProgress: overallStats.averageProgress || 0,
      totalModules: overallStats.totalModules || 0,
      totalSubmissions: submissionStatsData.totalSubmissions || 0,
      gradedSubmissions: submissionStatsData.gradedSubmissions || 0,
      averageGrade: submissionStatsData.averageGrade || 0,
      totalQuizAttempts: attemptStatsData.totalAttempts || 0,
      passedAttempts: attemptStatsData.passedAttempts || 0,
      averageQuizScore: attemptStatsData.averageScore || 0,
    };
  }, [batch, progressStats, submissionStats, attemptStats]);

  if (isLoading) {
    return <BatchSkeleton />;
  }

  if (batchError) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="text-red-600 text-lg font-medium">
            {batchError.status === 404 ? "Batch not found" : "Error loading batch"}
          </div>
          <p className="text-gray-600 text-center">
            {batchError.data?.message || "Failed to fetch batch details"}
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate("/batches")}
              variant="outline"
              className="gap-2"
            >
              <IconArrowLeft className="h-4 w-4" />
              Back to Batches
            </Button>
            <Button onClick={handleRefreshAll} className="gap-2">
              <IconRefresh className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="text-gray-600 text-lg font-medium">
            Batch not found
          </div>
          <Button
            onClick={() => navigate("/batches")}
            variant="outline"
            className="gap-2"
          >
            <IconArrowLeft className="h-4 w-4" />
            Back to Batches
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/batches")}
            className="gap-2"
          >
            <IconArrowLeft className="h-4 w-4" />
            Back to Batches
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{batch.name}</h1>
            <p className="text-muted-foreground mt-1">
              {batch.course?.title || "No course assigned"} • {batch.students?.length || 0} students
            </p>
          </div>
        </div>

        <Button onClick={handleRefreshAll} variant="outline" className="gap-2">
          <IconRefresh className="h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <IconUsers className="h-4 w-4 text-blue-600" />
              Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{enhancedStats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Total enrolled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <IconTrendingUp className="h-4 w-4 text-green-600" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{enhancedStats.averageProgress}%</div>
            <p className="text-xs text-muted-foreground">Average progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <IconFileText className="h-4 w-4 text-purple-600" />
              Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{enhancedStats.totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">Total submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <IconChartBar className="h-4 w-4 text-orange-600" />
              Quiz Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{enhancedStats.averageQuizScore}%</div>
            <p className="text-xs text-muted-foreground">Average score</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="progress">Progress ({enhancedStats.studentsWithProgress})</TabsTrigger>
          <TabsTrigger value="submissions">Submissions ({enhancedStats.totalSubmissions})</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes ({enhancedStats.totalQuizAttempts})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Original components */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BatchInstructorCard instructor={batch.instructor} batchId={batchId} />
            <BatchCourseCard course={batch.course} />
          </div>
          
          <BatchStudentsTable 
            students={batch.students} 
            batchId={batchId}
            batchName={batch.name}
            onRefetch={refetchBatch}
          />
        </TabsContent>

        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle>Student Progress Tracking</CardTitle>
              <CardDescription>
                Progress overview for all students in the batch
              </CardDescription>
            </CardHeader>
            <CardContent>
              {progressError ? (
                <Alert>
                  <AlertDescription className="flex items-center gap-2">
                    <IconX className="h-4 w-4" />
                    Failed to load progress data. Please try refreshing.
                  </AlertDescription>
                </Alert>
              ) : progressStats.batchProgress.length > 0 ? (
                <div className="space-y-4">
                  {progressStats.batchProgress.map((studentProgress, index) => {
                    const { student, completedModules, totalModules, progressPercentage, lastActivity } = studentProgress;
                    
                    return (
                      <div key={student._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-800">
                              {student.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="font-medium">{student.fullName}</p>
                              <p className="text-sm text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">{completedModules} / {totalModules} modules</div>
                            <div className="text-xs text-muted-foreground">
                              {lastActivity ? new Date(lastActivity).toLocaleDateString() : 'No activity'}
                            </div>
                          </div>
                          <div className="w-24">
                            <Progress value={progressPercentage} className="h-2" />
                            <div className="text-xs text-center mt-1">{progressPercentage}%</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/students/${student._id}`)}
                          >
                            <IconEye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <IconBook2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Progress Data</h3>
                  <p className="text-muted-foreground">
                    No students have started the course yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Submissions</CardTitle>
              <CardDescription>
                All assignment submissions from batch students
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submissionsError ? (
                <Alert>
                  <AlertDescription className="flex items-center gap-2">
                    <IconX className="h-4 w-4" />
                    Failed to load submission data. Please try refreshing.
                  </AlertDescription>
                </Alert>
              ) : submissionStats.submissions.length > 0 ? (
                <div className="space-y-4">
                  {submissionStats.submissions.slice(0, 10).map((submission) => (
                    <div key={submission._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-medium text-purple-800">
                            {submission.student?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{submission.assignment?.title || 'Assignment'}</p>
                            <p className="text-xs text-muted-foreground">
                              by {submission.student?.fullName} • {new Date(submission.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {submission.grade !== undefined ? (
                          <Badge variant="outline">{submission.grade}%</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not graded</span>
                        )}
                        {getSubmissionStatusBadge(submission)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/students/${submission.student._id}`)}
                        >
                          <IconEye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Show stats summary */}
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{submissionStats.stats.totalSubmissions}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{submissionStats.stats.gradedSubmissions}</div>
                      <div className="text-xs text-muted-foreground">Graded</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">{submissionStats.stats.averageGrade}%</div>
                      <div className="text-xs text-muted-foreground">Avg Grade</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">{submissionStats.stats.lateSubmissions}</div>
                      <div className="text-xs text-muted-foreground">Late</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <IconFileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Submissions</h3>
                  <p className="text-muted-foreground">
                    No assignments have been submitted yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quizzes">
          <Card>
            <CardHeader>
              <CardTitle>Quiz Attempts</CardTitle>
              <CardDescription>
                All quiz attempts from batch students
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attemptsError ? (
                <Alert>
                  <AlertDescription className="flex items-center gap-2">
                    <IconX className="h-4 w-4" />
                    Failed to load quiz attempt data. Please try refreshing.
                  </AlertDescription>
                </Alert>
              ) : attemptStats.attempts.length > 0 ? (
                <div className="space-y-4">
                  {attemptStats.attempts.slice(0, 10).map((attempt) => (
                    <div key={attempt._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-medium text-orange-800">
                            {attempt.student?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{attempt.quiz?.title || 'Quiz'}</p>
                            <p className="text-xs text-muted-foreground">
                              by {attempt.student?.fullName} • {new Date(attempt.attemptedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{attempt.scorePercent || 0}%</Badge>
                        <Badge variant={attempt.passed ? "default" : "destructive"}>
                          {attempt.passed ? "Passed" : "Failed"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/students/${attempt.student._id}`)}
                        >
                          <IconEye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Show stats summary */}
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">{attemptStats.stats.totalAttempts}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{attemptStats.stats.passedAttempts}</div>
                      <div className="text-xs text-muted-foreground">Passed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{attemptStats.stats.passRate}%</div>
                      <div className="text-xs text-muted-foreground">Pass Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{attemptStats.stats.averageScore}%</div>
                      <div className="text-xs text-muted-foreground">Avg Score</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <IconClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Quiz Attempts</h3>
                  <p className="text-muted-foreground">
                    No quizzes have been attempted yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BatchDetail;