import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "@/Helper/axiosInstance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ArrowLeft,
  Send,
  Trophy,
  RotateCcw,
  MessageSquare,
  Unlock,
  PlusCircle,
  HelpCircle,
  Loader2,
  XCircle,
  FileQuestion
} from "lucide-react";

const TakeQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerActive, setTimerActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState(null);

  // Extra attempt request state
  const [noAttemptsData, setNoAttemptsData] = useState(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Load quiz data
  useEffect(() => {
    const loadQuiz = async () => {
      try {
        setLoading(true);
        setNoAttemptsData(null);
        setError(null);

        const response = await axiosInstance.get(`/api/attempts/start/${quizId}`);
        const data = response.data.data;

        if (!data.canAttempt) {
          if (data.reason === "No attempts remaining" || data.attemptsRemaining <= 0) {
            setNoAttemptsData(data);
            setHasPendingRequest(Boolean(data.hasPendingRequest));
            setQuiz(data.quiz || { title: "Quiz" });
          } else {
            setError(data.reason || "Cannot attempt this quiz");
            setQuiz({ title: data.quiz?.title || "Quiz" });
          }
          return;
        }

        setQuiz(data.quiz);
        setTimeRemaining(data.quiz.timeLimit ? data.quiz.timeLimit * 60 : null);
        setStartTime(Date.now());

        // Initialize answers array
        const initialAnswers = {};
        data.quiz.questions.forEach((_, index) => {
          initialAnswers[index] = null;
        });
        setAnswers(initialAnswers);

        // Start timer if time limit exists
        if (data.quiz.timeLimit) {
          setTimerActive(true);
        }

        setError(null);
      } catch (err) {
        console.error("Failed to load quiz:", err);
        setError(err.response?.data?.message || "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);

  // Check pending request status if needed
  const checkPendingStatus = async () => {
    try {
      const response = await axiosInstance.get(`/api/attempts/status/${quizId}`);
      if (response?.data?.data?.hasPendingRequest !== undefined) {
        setHasPendingRequest(Boolean(response.data.data.hasPendingRequest));
      }
    } catch (_) {
      // Ignore background status fetch error
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!timerActive || timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setTimerActive(false);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerActive, timeRemaining]);

  const handleAutoSubmit = () => {
    if (!submitting) {
      handleSubmit(true);
    }
  };

  const handleAnswerChange = (questionIndex, option) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: option
    }));
  };

  const handleSubmit = async (autoSubmit = false) => {
    try {
      setSubmitting(true);
      setTimerActive(false);

      // Calculate time taken
      const timeTaken = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;

      // Convert answers to array format
      const answersArray = quiz.questions.map((_, index) => answers[index]);

      const response = await axiosInstance.post("/api/attempts/submit", {
        quizId,
        answers: answersArray,
        timeTaken
      });

      const resData = response.data.data;
      setResult(resData);
      setHasPendingRequest(Boolean(resData.hasPendingRequest));

      // Also trigger background status check if failed and cannot retry
      if (!resData.passed && !resData.canRetry) {
        checkPendingStatus();
      }
    } catch (err) {
      console.error("Failed to submit quiz:", err);
      setError(err.response?.data?.message || "Failed to submit quiz");
      setTimerActive(true); // Restart timer on error
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    return Object.values(answers).filter(answer => answer !== null).length;
  };

  const handleBackToCourse = () => {
    navigate("/student/course");
  };

  const handleRetry = () => {
    setResult(null);
    setAnswers({});
    setTimeRemaining(quiz?.timeLimit ? quiz.timeLimit * 60 : null);
    setStartTime(Date.now());
    setTimerActive(quiz?.timeLimit ? true : false);
    setError(null);

    // Reinitialize answers
    const initialAnswers = {};
    quiz.questions.forEach((_, index) => {
      initialAnswers[index] = null;
    });
    setAnswers(initialAnswers);
  };

  const handleContactInstructor = () => {
    toast.info("Please reach out to your course instructor or administrator for direct guidance.");
  };

  // Submit extra attempt request
  const handleSendExtraAttemptRequest = async (e) => {
    if (e) e.preventDefault();
    try {
      setIsSubmittingRequest(true);
      const targetQuizId = quiz?._id || quiz?.id || quizId;
      await axiosInstance.post("/api/attempts/extra-requests", {
        quizId: targetQuizId,
        reason: requestReason.trim() || "Requesting an extra attempt to retake the quiz."
      });

      setHasPendingRequest(true);
      setIsRequestModalOpen(false);
      setRequestReason("");
      toast.success("Extra attempt request submitted! Your instructor or admin will review it.");

      // Notify other components if listening
      window.dispatchEvent(new CustomEvent('attempt-extension-updated'));
    } catch (err) {
      console.error("Failed to request extra attempt:", err);
      toast.error(err.response?.data?.message || "Failed to submit request for extra attempt");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="animate-pulse">
          <Card>
            <CardHeader>
              <div className="h-6 bg-[#e5e7eb] rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-[#e5e7eb] rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-[#e5e7eb] rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Modal for requesting extra attempt
  const renderRequestModal = () => (
    <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <PlusCircle className="h-5 w-5 text-[#2563eb]" />
            Request Extra Attempt
          </DialogTitle>
          <DialogDescription>
            Submit a request to your instructor or administrator to grant you an extra attempt for this quiz.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSendExtraAttemptRequest} className="space-y-4 py-2">
          <div className="p-3 bg-muted rounded-lg space-y-1 text-xs sm:text-sm">
            <div className="font-semibold text-[#111827]">
              {quiz?.title || "Quiz"}
            </div>
            {quiz?.module?.title && (
              <div className="text-muted-foreground">
                Module: {quiz.module.title}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-reason" className="text-xs sm:text-sm font-medium">
              Reason for Request (Optional)
            </Label>
            <Textarea
              id="request-reason"
              placeholder="e.g., I have reviewed the module materials and lessons and would like another chance to pass the quiz."
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              rows={3}
              className="resize-none text-sm"
              disabled={isSubmittingRequest}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRequestModalOpen(false)}
              disabled={isSubmittingRequest}
              className="w-full sm:w-auto text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingRequest}
              className="w-full sm:w-auto bg-[#2563eb] hover:bg-[#1d4ed8] text-sm"
            >
              {isSubmittingRequest ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  // Dedicated View when no attempts are remaining on page load
  if (noAttemptsData) {
    const quizTitle = noAttemptsData.quiz?.title || quiz?.title || "Quiz";
    const moduleTitle = noAttemptsData.quiz?.module?.title || quiz?.module?.title;

    return (
      <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        <Card className="border-[#fecaca] bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-[#fee2e2] to-[#fef2f2] p-6 border-b border-[#fecaca]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs uppercase tracking-wide">
                    No Attempts Left
                  </Badge>
                  {hasPendingRequest && (
                    <Badge className="bg-[#fef3c7] text-[#92400e] border-[#fde68a] text-xs">
                      Request Pending
                    </Badge>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#111827] mt-2">
                  {quizTitle}
                </h1>
                {moduleTitle && (
                  <p className="text-sm text-[#4b5563] mt-1">
                    Module: {moduleTitle}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-full bg-[#fee2e2] flex items-center justify-center flex-shrink-0 text-[#dc2626]">
                <XCircle className="h-7 w-7" />
              </div>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Status explanation */}
            {hasPendingRequest ? (
              <Alert className="bg-[#fffbeb] border-[#fde68a]">
                <Clock className="h-5 w-5 text-[#d97706]" />
                <AlertDescription className="text-sm text-[#92400e]">
                  <div className="font-semibold mb-1">Request Under Review</div>
                  You have already requested an extra attempt for this quiz. Your instructor or administrator has been notified and will review your request shortly. Once approved, you will be able to take the quiz again.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-[#fef2f2] border-[#fecaca]">
                <AlertCircle className="h-5 w-5 text-[#dc2626]" />
                <AlertDescription className="text-sm text-[#991b1b]">
                  <div className="font-semibold mb-1">All Attempts Exhausted</div>
                  You have used all {noAttemptsData.attemptsAllowed} attempt(s) for this quiz. If you need to retake this quiz to achieve a passing score, you can submit a request for an extra attempt below.
                </AlertDescription>
              </Alert>
            )}

            {/* Attempts Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-[#f9fafb] text-center">
                <div className="text-2xl font-bold text-[#111827]">
                  {noAttemptsData.attemptsUsed}
                </div>
                <div className="text-xs sm:text-sm text-[#4b5563]">Attempts Used</div>
              </div>
              <div className="p-4 rounded-lg border bg-[#f9fafb] text-center">
                <div className="text-2xl font-bold text-[#111827]">
                  {noAttemptsData.attemptsAllowed}
                </div>
                <div className="text-xs sm:text-sm text-[#4b5563]">Max Attempts Allowed</div>
              </div>
              <div className="p-4 rounded-lg border bg-[#f9fafb] text-center">
                <div className="text-2xl font-bold text-[#dc2626]">0</div>
                <div className="text-xs sm:text-sm text-[#4b5563]">Attempts Remaining</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={handleBackToCourse} variant="outline" className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Course
              </Button>

              {hasPendingRequest ? (
                <Button disabled variant="secondary" className="flex-1 bg-[#fef3c7] text-[#92400e] border-[#fde68a]">
                  <Clock className="h-4 w-4 mr-2" />
                  Request Pending Review
                </Button>
              ) : (
                <Button
                  onClick={() => setIsRequestModalOpen(true)}
                  className="flex-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Request Extra Attempt
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {renderRequestModal()}
      </div>
    );
  }

  // Show result page
  if (result) {
    return (
      <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        <Card className={`${result.passed ? 'border-[#bbf7d0] bg-[#f0fdf4]' : 'border-[#fecaca] bg-[#fef2f2]'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.passed ? (
                <CheckCircle2 className="h-6 w-6 text-[#16a34a]" />
              ) : (
                <AlertCircle className="h-6 w-6 text-[#dc2626]" />
              )}
              Quiz {result.passed ? 'Passed!' : 'Failed'}
            </CardTitle>
            <CardDescription>
              {result.quiz.title} - {result.quiz.module?.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score Display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-[#111827]">{result.scorePercent}%</div>
                <div className="text-sm text-[#4b5563]">Your Score</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-[#111827]">{result.score}/{result.totalMarks}</div>
                <div className="text-sm text-[#4b5563]">Points Earned</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-[#111827]">{result.quiz.passingScore}%</div>
                <div className="text-sm text-[#4b5563]">Passing Score</div>
              </div>
            </div>

            {/* Progress Messages */}
            {result.nextModuleUnlocked && (
              <Alert className="bg-[#eff6ff] border-[#bfdbfe]">
                <Unlock className="h-4 w-4 text-[#2563eb]" />
                <AlertDescription className="text-[#1e40af]">
                  🎉 Congratulations! The next module has been unlocked.
                </AlertDescription>
              </Alert>
            )}

            {result.levelUpgraded && (
              <Alert className="bg-[#faf5ff] border-[#e9d5ff]">
                <Trophy className="h-4 w-4 text-[#9333ea]" />
                <AlertDescription className="text-[#6b21a8]">
                  🏆 Level Up! You've been promoted to {result.newLevel}!
                </AlertDescription>
              </Alert>
            )}

            {/* Failed & No attempts remaining banner */}
            {!result.passed && !result.canRetry && (
              <div>
                {hasPendingRequest ? (
                  <Alert className="bg-[#fffbeb] border-[#fde68a]">
                    <Clock className="h-5 w-5 text-[#d97706]" />
                    <AlertDescription className="text-sm text-[#92400e]">
                      <strong>Extra Attempt Request Pending:</strong> Your request has been sent to the instructor/admin. You will be able to retry once it is approved.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-[#fff7ed] border-[#fed7aa]">
                    <HelpCircle className="h-5 w-5 text-[#ea580c]" />
                    <AlertDescription className="text-sm text-[#9a3412]">
                      <strong>No attempts remaining:</strong> You did not achieve the required passing score ({result.quiz.passingScore}%). You can request an extra attempt from your administrator or instructor.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Attempts Info */}
            <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
              <div>
                <div className="font-medium">Attempts Used</div>
                <div className="text-sm text-[#4b5563]">
                  {result.attemptsAllowed === 0
                    ? `${result.attemptsUsed} of Unlimited attempts`
                    : `${result.attemptsUsed} of ${result.attemptsAllowed} attempts`}
                </div>
              </div>
              <div>
                <Badge variant={result.canRetry ? "secondary" : "destructive"}>
                  {result.attemptsAllowed === 0
                    ? "Unlimited attempts remaining"
                    : `${result.attemptsRemaining} attempts remaining`}
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleBackToCourse} variant="outline" className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Course
              </Button>

              {!result.passed && result.canRetry && (
                <Button onClick={handleRetry} className="flex-1 bg-[#2563eb] hover:bg-[#1d4ed8]">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}

              {!result.passed && !result.canRetry && (
                hasPendingRequest ? (
                  <Button disabled variant="secondary" className="flex-1 bg-[#fef3c7] text-[#92400e] border-[#fde68a]">
                    <Clock className="h-4 w-4 mr-2" />
                    Request Pending
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsRequestModalOpen(true)}
                    className="flex-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Request Extra Attempt
                  </Button>
                )
              )}

              {!result.passed && !result.canRetry && (
                <Button onClick={handleContactInstructor} variant="secondary" className="flex-1">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Instructor
                </Button>
              )}
            </div>

            {/* Detailed Answers */}
            {result.detailedAnswers && (
              <div className="space-y-3">
                <h3 className="font-semibold">Review Answers:</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {result.detailedAnswers.map((answer, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${answer.isCorrect ? 'bg-[#f0fdf4] border-[#bbf7d0]' : 'bg-[#fef2f2] border-[#fecaca]'}`}>
                      <div className="flex items-start gap-2 mb-2">
                        {answer.isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-[#16a34a] mt-0.5" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-[#dc2626] mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-sm">Question {answer.questionNumber}</div>
                          <div className="text-xs text-[#4b5563] mb-1">{answer.questionText}</div>
                          <div className="text-xs">
                            <span className="font-medium">Your answer:</span> {answer.userAnswer || "Not answered"}
                          </div>
                          {!answer.isCorrect && (
                            <div className="text-xs text-[#15803d]">
                              <span className="font-medium">Correct answer:</span> {answer.correctAnswer}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-[#4b5563]">
                          {answer.marksObtained}/{answer.totalMarks}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {renderRequestModal()}
      </div>
    );
  }

  // Show error state (real network / authorization errors)
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div><strong>Error:</strong> {error}</div>
              {error.includes("not found") && (
                <div className="text-sm">
                  This usually means the quiz route is not properly configured or the server is not running.
                </div>
              )}
              {error.includes("401") || error.includes("authentication") || error.includes("unauthorized") ? (
                <div className="text-sm">
                  Authentication error. Please try logging out and logging in again.
                </div>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBackToCourse}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Course
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="secondary"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show quiz taking interface
  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Quiz Header */}
      <Card className="bg-gradient-to-r from-[#eff6ff] to-[#eef2ff] border-[#bfdbfe]">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <BarChart3 className="h-5 w-5 text-[#2563eb]" />
                <span className="break-words">{quiz?.title}</span>
              </CardTitle>
              {quiz?.description && (
                <CardDescription className="mt-2 text-sm">{quiz.description}</CardDescription>
              )}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-[#4b5563]">
                <span>Module: {quiz?.module?.title}</span>
                <span className="hidden sm:inline">•</span>
                <span>Passing: {quiz?.passingScore}%</span>
                <span className="hidden sm:inline">•</span>
                <span>{quiz?.questions?.length || 0} Questions</span>
              </div>
            </div>

            {/* Timer */}
            {timeRemaining !== null && (
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-2 text-base sm:text-lg font-bold">
                  <Clock className={`h-4 w-4 sm:h-5 sm:w-5 ${timeRemaining <= 300 ? 'text-[#dc2626]' : 'text-[#2563eb]'}`} />
                  <span className={timeRemaining <= 300 ? 'text-[#dc2626]' : 'text-[#2563eb]'}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
                <div className="text-xs text-[#4b5563]">Time Remaining</div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-xs sm:text-sm text-[#4b5563]">
                {getAnsweredCount()} of {quiz?.questions?.length || 0} answered
              </span>
            </div>
            <Progress
              value={quiz?.questions?.length ? (getAnsweredCount() / quiz.questions.length) * 100 : 0}
              className="h-2"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Questions */}
      <div className="space-y-6">
        {quiz?.questions?.map((question, questionIndex) => (
          <Card key={questionIndex} className="border-l-4 border-l-[#3b82f6]">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                Question {question.questionNumber}
                <Badge variant="outline" className="ml-2 text-xs">
                  {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                </Badge>
              </CardTitle>
              <CardDescription className="text-base text-[#1f2937]">
                {question.questionText}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {question.image && question.image.url && (
                <div className="mb-4 flex justify-center">
                  <img
                    src={question.image.url}
                    alt="Question Reference"
                    className="max-h-72 w-auto rounded-md object-contain border bg-white"
                  />
                </div>
              )}
              <div className="space-y-3">
                {question.options?.map((option, optionIndex) => (
                  <div
                    key={optionIndex}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${answers[questionIndex]?.text === option.text
                      ? 'bg-[#eff6ff] border-[#93c5fd]'
                      : 'hover:bg-[#f9fafb] border-[#e5e7eb]'
                      }`}
                    onClick={() => handleAnswerChange(questionIndex, option)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${answers[questionIndex]?.text === option.text
                        ? 'border-[#3b82f6] bg-[#3b82f6]'
                        : 'border-[#d1d5db]'
                        }`}>
                        {answers[questionIndex]?.text === option.text && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <span className="flex-1">{option.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Submit Section */}
      <Card className="bg-[#f9fafb]">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="font-medium">Ready to submit?</div>
              <div className="text-sm text-[#4b5563]">
                {getAnsweredCount() === (quiz?.questions?.length || 0)
                  ? "All questions answered"
                  : `${(quiz?.questions?.length || 0) - getAnsweredCount()} questions remaining`}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={handleBackToCourse} className="text-sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="bg-[#16a34a] hover:bg-[#15803d] text-sm"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Quiz
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TakeQuiz;
