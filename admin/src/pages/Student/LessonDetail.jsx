import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Video,
  FileText,
  FileImage,
  ExternalLink,
  Eye,
  Play,
  BookOpen,
  Trophy,
  ScrollText,
  RefreshCw,
} from "lucide-react";
import { useGetResourcesByLessonQuery } from "@/Redux/AllApi/resourceApi";
import axiosInstance from "@/Helper/axiosInstance";

const LessonDetail = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const [completingLesson, setCompletingLesson] = useState(false);
  const [courseData, setCourseData] = useState(null);

  // Fetch lesson resources
  const {
    data: resourcesData,
    isLoading: resourcesLoading,
    error: resourcesError,
  } = useGetResourcesByLessonQuery(lessonId, {
    skip: !lessonId,
  });

  const resources = resourcesData?.data || [];

  // Lesson and course data state
  const [lessonModuleId, setLessonModuleId] = useState(null);
  const [lessonDataState, setLessonDataState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch lesson details and course data
  useEffect(() => {
    const fetchLessonData = async () => {
      if (!lessonId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Get course content and progress data
        const response = await axiosInstance.get('/api/batches/me/course-content');
        const data = response?.data?.data;
        
        if (!data?.course?.modules) {
          throw new Error('Course modules not found');
        }
        
        setCourseData(data);
        
        // Check if lesson is already completed from progress data
        const progress = data.progress || {};
        const completedLessons = progress.completedLessons || [];
        const isLessonCompleted = completedLessons.some(lesson => 
          String(lesson.lessonId || lesson._id || lesson) === String(lessonId)
        );
        setIsCompleted(isLessonCompleted);
        
        // Find the lesson in any module
        let foundLesson = null;
        let foundModuleId = null;
        
        for (const module of data.course.modules) {
          const moduleId = module._id || module.id;
          try {
            const lessonsResponse = await axiosInstance.get(`/api/modules/${moduleId}/lessons`);
            const lessons = lessonsResponse?.data?.data || [];
            
            const lesson = lessons.find(l => 
              String(l._id || l.id) === String(lessonId)
            );
            
            if (lesson) {
              foundLesson = lesson;
              foundModuleId = moduleId;
              break;
            }
          } catch (err) {
            // Continue to next module if this one fails
            continue;
          }
        }
        
        if (!foundLesson || !foundModuleId) {
          throw new Error('Lesson not found in any module');
        }
        
        setLessonModuleId(foundModuleId);
        setLessonDataState(foundLesson);
        
      } catch (err) {
        console.error('Error fetching lesson:', err);
        setError(err.message || 'Failed to load lesson');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLessonData();
  }, [lessonId]);

  const lesson = lessonDataState;

  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      const container = scrollContainerRef.current;
      if (!container || isCompleted) return;

      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 100;
      
      setScrollProgress(Math.min(progress, 100));

      // Check if user has scrolled to bottom (within 5px threshold)
      if (scrollHeight - scrollTop <= 5 && !hasReachedBottom) {
        setHasReachedBottom(true);
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isCompleted, hasReachedBottom]);

  // Auto-complete lesson when user reaches bottom
  useEffect(() => {
    if (hasReachedBottom && !isCompleted && !completingLesson) {
      const timer = setTimeout(() => {
        handleCompleteLesson();
      }, 2000); // Wait 2 seconds after reaching bottom

      return () => clearTimeout(timer);
    }
  }, [hasReachedBottom, isCompleted, completingLesson]);

  const handleCompleteLesson = async () => {
    if (isCompleted || completingLesson || !courseData?.course) return;

    try {
      setCompletingLesson(true);
      
      const courseId = courseData.course._id || courseData.course.id;
      
      // Use the progress API to mark lesson complete
      const response = await axiosInstance.patch('/api/progress/lesson-complete', {
        courseId,
        lessonId
      });
      
      if (response.data.success) {
        setIsCompleted(true);
        toast.success("🎉 Lesson completed! Well done!");
      } else {
        throw new Error(response.data.message || 'Failed to complete lesson');
      }
      
    } catch (error) {
      console.error("Error completing lesson:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to mark lesson as complete";
      toast.error(errorMessage);
    } finally {
      setCompletingLesson(false);
    }
  };

  const getResourceIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'pdf':
      case 'text':
        return <FileText className="h-5 w-5" />;
      case 'image':
        return <FileImage className="h-5 w-5" />;
      case 'link':
        return <ExternalLink className="h-5 w-5" />;
      default:
        return <Download className="h-5 w-5" />;
    }
  };

  const handleResourceView = (url, type, title) => {
    if (type === 'link') {
      window.open(url, '_blank');
    } else {
      window.open(url, '_blank');
    }
  };

  const handleDownload = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'resource';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackToCourse = () => {
    navigate('/student/course');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>
              {error || "Lesson not found. Please try again."}
            </AlertDescription>
          </Alert>
          <Button onClick={handleBackToCourse} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="sticky top-0 bg-white border-b z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToCourse}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Course
              </Button>
              <div>
                <h1 className="text-xl font-bold">
                  {lesson.title || "Lesson"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {lesson.duration && (
                    <>
                      <Clock className="h-3 w-3 inline mr-1" />
                      {lesson.duration}
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isCompleted ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-32">
                    <Progress value={scrollProgress} className="h-2" />
                  </div>
                  <span className="text-xs text-muted-foreground min-w-[3rem]">
                    {Math.round(scrollProgress)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div 
        ref={scrollContainerRef}
        className="max-w-4xl mx-auto p-6 space-y-6 h-[calc(100vh-80px)] overflow-y-auto"
      >
        {/* Lesson Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Lesson Content
            </CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none">
            {lesson.description ? (
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {lesson.description}
              </div>
            ) : (
              <p className="text-muted-foreground">
                No lesson content available.
              </p>
            )}
            
            {/* Add some sample content to make page scrollable for demo */}
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold">Learning Objectives</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Understand the core concepts covered in this lesson</li>
                <li>Apply the knowledge to practical scenarios</li>
                <li>Build upon previous lessons for comprehensive learning</li>
              </ul>
              
              <h3 className="text-lg font-semibold">Key Points</h3>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <p>Make sure to review all the materials and resources provided below to get the most out of this lesson.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lesson Resources */}
        {resources.length > 0 && (
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-green-600" />
                Lesson Resources
                <Badge variant="outline" className="ml-2 bg-green-100 text-green-800">
                  {resources.length} resource{resources.length > 1 ? 's' : ''}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Additional materials and references for this lesson
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {resources.map((resource, index) => {
                  const resourceId = resource._id || resource.id || index;
                  
                  return (
                    <div
                      key={resourceId}
                      className="flex items-center justify-between p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-green-100 rounded-lg">
                          {getResourceIcon(resource.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium">
                              {resource.title || `Resource ${index + 1}`}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {resource.type?.toUpperCase() || 'FILE'}
                            </Badge>
                          </div>
                          {resource.description && (
                            <p className="text-xs text-muted-foreground">
                              {resource.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleResourceView(resource.url, resource.type, resource.title)}
                          variant="outline"
                          size="sm"
                          className="h-8"
                        >
                          {resource.type === 'video' ? (
                            <>
                              <Play className="h-3 w-3 mr-1" />
                              Play
                            </>
                          ) : resource.type === 'link' ? (
                            <>
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Visit
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Preview
                            </>
                          )}
                        </Button>
                        
                        {resource.type !== 'link' && (
                          <Button
                            onClick={() => handleDownload(resource.url, resource.title)}
                            variant="outline"
                            size="sm"
                            className="h-8"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion Status */}
        {!isCompleted && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6 text-center">
              <ScrollText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {hasReachedBottom ? (
                  completingLesson ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Completing lesson...
                    </span>
                  ) : (
                    "Great! Lesson will be marked complete shortly."
                  )
                ) : (
                  "Scroll down to complete this lesson"
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasReachedBottom ? (
                  "You've reviewed all the content. Well done!"
                ) : (
                  "Read through all the content to mark this lesson as complete."
                )}
              </p>
              <div className="mt-4">
                <Progress value={scrollProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(scrollProgress)}% of lesson reviewed
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion Success */}
        {isCompleted && (
          <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="p-6 text-center">
              <Trophy className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-800 mb-2">
                🎉 Lesson Completed!
              </h3>
              <p className="text-green-700 mb-4">
                Excellent work! You have successfully completed this lesson.
              </p>
              <Button 
                onClick={handleBackToCourse}
                className="bg-green-600 hover:bg-green-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continue Learning
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Extra content for scrolling demo */}
        <div className="h-32" /> {/* Spacer to ensure scrolling */}
      </div>
    </div>
  );
};

export default LessonDetail;
