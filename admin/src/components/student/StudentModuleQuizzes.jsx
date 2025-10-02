import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Award, BarChart3, Clock, RefreshCw, CheckCircle, AlertCircle, Eye, XCircle } from "lucide-react";

const StudentModuleQuizzes = ({ quizzes = [], attempts = {}, isUnlocked = false, onStart }) => {
  if (!quizzes || quizzes.length === 0) return null;

  const handleStart = (quiz) => {
    if (!isUnlocked) return;
    const quizStatus = getQuizStatus(quiz);
    if (quizStatus.status === 'no_attempts_left') return;
    if (typeof onStart === "function") onStart(quiz);
  };

  const getQuizId = (quiz) => quiz._id || quiz.id;

  const getQuizStatus = (quiz) => {
    const quizId = getQuizId(quiz);
    const quizAttempts = attempts[quizId] || [];
    const attemptsAllowed = quiz.attemptsAllowed || 1;
    const attemptsUsed = quizAttempts.length;
    const attemptsLeft = attemptsAllowed - attemptsUsed;

    if (attemptsUsed === 0) {
      return {
        status: 'not_attempted',
        message: 'Not attempted',
        color: 'secondary',
        icon: BarChart3,
        buttonText: 'Start Quiz',
        buttonDisabled: false,
        canStart: true
      };
    }

    // Get the best attempt (highest score)
    const bestAttempt = quizAttempts.reduce((best, current) => {
      return (current.score > best.score) ? current : best;
    }, quizAttempts[0]);

    const passingScore = quiz.passingScore || 70;
    const isPassed = bestAttempt.score >= passingScore;

    if (attemptsLeft > 0) {
      if (isPassed) {
        return {
          status: 'passed_can_retake',
          message: `Passed: ${bestAttempt.score}% (${attemptsLeft} attempts left)`,
          color: 'default',
          icon: CheckCircle,
          buttonText: `Retake Quiz (${attemptsLeft} left)`,
          buttonDisabled: false,
          canStart: true,
          score: bestAttempt.score
        };
      } else {
        return {
          status: 'failed_can_retake',
          message: `Score: ${bestAttempt.score}% (${attemptsLeft} attempts left)`,
          color: 'destructive',
          icon: AlertCircle,
          buttonText: `Retake Quiz (${attemptsLeft} left)`,
          buttonDisabled: false,
          canStart: true,
          score: bestAttempt.score
        };
      }
    } else {
      if (isPassed) {
        return {
          status: 'passed_no_attempts',
          message: `Completed: ${bestAttempt.score}%`,
          color: 'default',
          icon: CheckCircle,
          buttonText: 'View Results',
          buttonDisabled: false,
          canStart: false,
          score: bestAttempt.score
        };
      } else {
        return {
          status: 'no_attempts_left',
          message: `Failed: ${bestAttempt.score}% (No attempts left)`,
          color: 'destructive',
          icon: XCircle,
          buttonText: 'No Attempts Left',
          buttonDisabled: true,
          canStart: false,
          score: bestAttempt.score
        };
      }
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="font-medium mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        Quizzes ({quizzes.length})
      </h4>
      <div className="space-y-3">
        {quizzes.map((quiz, idx) => {
          const quizStatus = getQuizStatus(quiz);
          const StatusIcon = quizStatus.icon;
          const quizId = getQuizId(quiz);
          const quizAttempts = attempts[quizId] || [];
          const attemptsUsed = quizAttempts.length;
          const attemptsAllowed = quiz.attemptsAllowed || 1;
          
          return (
            <Card 
              key={quiz._id || quiz.id || idx} 
              className={`${!isUnlocked ? "opacity-50" : ""}`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {!isUnlocked && <Lock className="h-4 w-4" />}
                  <Award className="h-4 w-4" />
                  {quiz.title || "Module Quiz"}
                </CardTitle>
                
                {/* Status Badges */}
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className="bg-orange-100 text-orange-800 text-xs border-orange-200">
                    MODULE LEVEL
                  </Badge>
                  
                  {isUnlocked && (
                    <Badge variant={quizStatus.color} className="text-xs">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {quizStatus.message}
                    </Badge>
                  )}
                </div>
                
                {quiz.description && (
                  <CardDescription className="mt-2">{quiz.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    Questions: {quiz.questions?.length || 0}
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    Passing: {quiz.passingScore || 70}%
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Time: {quiz.timeLimit || 30} min
                  </div>
                  <div className="flex items-center gap-1">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    Attempts: {attemptsUsed}/{attemptsAllowed}
                  </div>
                </div>
                
                {/* Show attempt history if there are attempts */}
                {isUnlocked && quizAttempts.length > 0 && (
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <h5 className="text-sm font-medium mb-2">Attempt History:</h5>
                    <div className="space-y-1">
                      {quizAttempts.map((attempt, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span>Attempt {idx + 1}:</span>
                          <span className={`font-medium ${
                            attempt.score >= (quiz.passingScore || 70) 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {attempt.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                    {quizStatus.score !== undefined && (
                      <div className="pt-2 mt-2 border-t text-xs">
                        <span className="font-medium">
                          Best Score: 
                          <span className={`ml-1 ${
                            quizStatus.score >= (quiz.passingScore || 70) 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {quizStatus.score}%
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                <Button 
                  className={`w-full ${
                    quizStatus.status === 'no_attempts_left' 
                      ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed'
                      : quizStatus.status === 'passed_no_attempts'
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : ''
                  }`}
                  disabled={!isUnlocked || quizStatus.buttonDisabled} 
                  onClick={() => handleStart(quiz)}
                >
                  {!isUnlocked ? (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Complete Lessons First
                    </>
                  ) : (
                    <>
                      <StatusIcon className="h-4 w-4 mr-2" />
                      {quizStatus.buttonText}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default StudentModuleQuizzes;

