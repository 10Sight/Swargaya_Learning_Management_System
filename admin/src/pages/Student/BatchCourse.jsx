import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "@/Helper/axiosInstance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Lock, 
  BookOpen, 
  ListChecks, 
  CheckCircle2, 
  FileText, 
  PlayCircle,
  Clock,
  BarChart3,
  Award,
  ChevronRight,
  Download,
  Eye,
  Video,
  FileImage,
  ExternalLink,
  Trophy
} from "lucide-react";

// Batch Completion Section Component
const BatchCompletionSection = ({ allModulesCompleted }) => {
  const [batchAssessments, setBatchAssessments] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (allModulesCompleted) {
      const fetchBatchAssessments = async () => {
        try {
          setLoading(true);
          const response = await axiosInstance.get("/api/batches/me/assessments");
          setBatchAssessments(response.data.data);
        } catch (error) {
          console.error("Failed to fetch batch assessments:", error);
          setBatchAssessments({ hasAccess: false, reason: "Failed to load assessments" });
        } finally {
          setLoading(false);
        }
      };
      fetchBatchAssessments();
    }
  }, [allModulesCompleted]);

  if (!allModulesCompleted) {
    return null;
  }

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!batchAssessments?.hasAccess) {
    return (
      <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <Clock className="h-5 w-5" />
            Final Assessments
          </CardTitle>
          <CardDescription className="text-yellow-700">
            {batchAssessments?.reason || "Complete all modules to unlock final assessments"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {batchAssessments?.progress && (
            <div className="text-sm text-yellow-800">
              Progress: {batchAssessments.progress.completed} / {batchAssessments.progress.total} modules completed
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

};

const BatchCourse = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState(null);
  const [modules, setModules] = useState([]);
  const [completedModuleIds, setCompletedModuleIds] = useState([]);
  const [completedLessonIds, setCompletedLessonIds] = useState([]);
  const [currentLevel, setCurrentLevel] = useState("L1");
  const [error, setError] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [lessonsByModule, setLessonsByModule] = useState({});
  const [lessonsLoading, setLessonsLoading] = useState({});
  const [resourcesByModule, setResourcesByModule] = useState({});
  const [resourcesLoading, setResourcesLoading] = useState({});
  const [quizzesByModule, setQuizzesByModule] = useState({});
  const [assignmentsByModule, setAssignmentsByModule] = useState({});
  const [quizAssignmentLoading, setQuizAssignmentLoading] = useState({});
  const [levelUpgradeMessage, setLevelUpgradeMessage] = useState(null);

  const getModuleId = (m) => m?._id || m?.id;
  const getLessonId = (l) => l?._id || l?.id;

  // Consider a module completed if either:
  // - It is in completedModuleIds, OR
  // - All of its lessons are completed (effective completion)
  const isModuleEffectivelyCompleted = (module) => {
    const moduleId = String(getModuleId(module));
    if (!moduleId) return false;
    if (completedModuleIds.includes(moduleId)) return true;

    const moduleLessons = (lessonsByModule[moduleId] || module?.lessons || []);
    if (!Array.isArray(moduleLessons) || moduleLessons.length === 0) return false;

    // All lessons must be in completedLessonIds
    return moduleLessons.every(lesson => completedLessonIds.includes(String(getLessonId(lesson))));
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        
        // Use the new batch course content endpoint for better performance
        const courseContentRes = await axiosInstance.get("/api/batches/me/course-content");
        const courseContentData = courseContentRes?.data?.data || null;
        
        if (courseContentData) {
          // Extract batch and course info
          setBatch({
            ...courseContentData.batch,
            course: courseContentData.course,
            status: 'ACTIVE' // Default status since it's not in the new response
          });
          
          // Extract modules (already sorted and with lessons populated)
          const moduleList = courseContentData.course?.modules || [];
          setModules(moduleList);
          
          // Pre-populate lessons for all modules
          const lessonsMap = {};
          moduleList.forEach(module => {
            if (module.lessons && Array.isArray(module.lessons)) {
              lessonsMap[getModuleId(module)] = module.lessons;
            }
          });
          setLessonsByModule(lessonsMap);
          
          // Extract progress data
          const progressData = courseContentData.progress;
          if (progressData?.currentLevel) {
            setCurrentLevel(progressData.currentLevel);
          }
          
          // Set completed modules and lessons - handle both ID arrays and object arrays
          let completedModules = [];
          let completedLessons = [];
          
          if (progressData?.completedModuleIds && Array.isArray(progressData.completedModuleIds)) {
            completedModules = progressData.completedModuleIds;
          } else if (progressData?.completedModules && Array.isArray(progressData.completedModules)) {
            completedModules = progressData.completedModules.map(mod => {
              if (typeof mod === 'string') return mod;
              return mod.moduleId || mod._id || mod.id;
            }).filter(Boolean);
          }

          if (progressData?.completedLessonIds && Array.isArray(progressData.completedLessonIds)) {
            completedLessons = progressData.completedLessonIds;
          } else if (progressData?.completedLessons && Array.isArray(progressData.completedLessons)) {
            completedLessons = progressData.completedLessons.map(lesson => {
              if (typeof lesson === 'string') return lesson;
              return lesson.lessonId || lesson._id || lesson.id;
            }).filter(Boolean);
          }
          
          setCompletedModuleIds(completedModules.map(id => String(id)));
          setCompletedLessonIds(completedLessons.map(id => String(id)));
        } else {
          setBatch(null);
          setModules([]);
        }
        
        setError(null);
      } catch (e) {
        console.error("Error loading course data:", e);
        // Fallback to old method if new endpoint fails
        try {
          console.log("Falling back to individual API calls...");
          const b = await axiosInstance.get("/api/batches/me/my-batch");
          const batchData = b?.data?.data || null;
          setBatch(batchData);

          if (batchData?.course?._id || batchData?.course?.id) {
            const courseId = batchData.course._id || batchData.course.id;
            
            const [modulesRes, progressRes] = await Promise.all([
              axiosInstance.get(`/api/modules/${courseId}`),
              axiosInstance.get(`/api/progress/init/${courseId}`)
            ]);

            const moduleList = Array.isArray(modulesRes?.data?.data) ? modulesRes.data.data : [];
            moduleList.sort((a, b) => (a.order || 0) - (b.order || 0));
            setModules(moduleList);

            const progressData = progressRes?.data?.data;
            if (progressData?.currentLevel) {
              setCurrentLevel(progressData.currentLevel);
            }

            let completedModules = [];
            let completedLessons = [];
            
            if (progressData?.completedModuleIds && Array.isArray(progressData.completedModuleIds)) {
              completedModules = progressData.completedModuleIds;
            } else if (progressData?.completedModules && Array.isArray(progressData.completedModules)) {
              completedModules = progressData.completedModules.map(mod => {
                if (typeof mod === 'string') return mod;
                return mod.moduleId || mod._id || mod.id;
              }).filter(Boolean);
            }

            if (progressData?.completedLessonIds && Array.isArray(progressData.completedLessonIds)) {
              completedLessons = progressData.completedLessonIds;
            } else if (progressData?.completedLessons && Array.isArray(progressData.completedLessons)) {
              completedLessons = progressData.completedLessons.map(lesson => {
                if (typeof lesson === 'string') return lesson;
                return lesson.lessonId || lesson._id || lesson.id;
              }).filter(Boolean);
            }

            setCompletedModuleIds(completedModules.map(id => String(id)));
            setCompletedLessonIds(completedLessons.map(id => String(id)));
          }
          setError(null);
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
          setError("Failed to load course modules. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Count of modules effectively completed (marked or all lessons done)
  const completedEffectiveCount = modules.reduce((count, m) => count + (isModuleEffectivelyCompleted(m) ? 1 : 0), 0);

  const loadModuleResources = async (moduleId) => {
    if (!resourcesByModule[moduleId] && !resourcesLoading[moduleId]) {
      try {
        setResourcesLoading((s) => ({ ...s, [moduleId]: true }));
        const res = await axiosInstance.get(`/api/resources/module/${moduleId}`);
        const resources = Array.isArray(res?.data?.data) ? res.data.data : [];
        setResourcesByModule((map) => ({ ...map, [moduleId]: resources }));
      } catch (err) {
        console.error("Failed to load resources:", err);
        setResourcesByModule((map) => ({ ...map, [moduleId]: [] }));
      } finally {
        setResourcesLoading((s) => ({ ...s, [moduleId]: false }));
      }
    }
  };

  const loadQuizzesAndAssignments = async (moduleId) => {
    if (!quizzesByModule[moduleId] && !quizAssignmentLoading[moduleId]) {
      try {
        setQuizAssignmentLoading((s) => ({ ...s, [moduleId]: true }));
        const courseId = batch?.course?._id || batch?.course?.id;
        
        // Load module-only quizzes and assignments with access control
        const [quizRes, assignRes] = await Promise.all([
          axiosInstance.get(`/api/quizzes/accessible/${courseId}/${moduleId}?onlyModule=true`).catch(() => ({ data: { data: { quizzes: [], accessInfo: { hasAccess: false, reason: "Error loading" } } } })),
          axiosInstance.get(`/api/assignments/accessible/${courseId}/${moduleId}?onlyModule=true`).catch(() => ({ data: { data: { assignments: [], accessInfo: { hasAccess: false, reason: "Error loading" } } } }))
        ]);

        // Handle new API response structure
        const quizData = quizRes?.data?.data || {};
        const assignmentData = assignRes?.data?.data || {};
        
        const quizzes = Array.isArray(quizData.quizzes) ? quizData.quizzes : 
                       Array.isArray(quizData) ? quizData : [];
        const assignments = Array.isArray(assignmentData.assignments) ? assignmentData.assignments : 
                           Array.isArray(assignmentData) ? assignmentData : [];
        
        // Store access info for UI purposes
        if (quizData.accessInfo) {
          console.log(`Module ${moduleId} quiz access:`, quizData.accessInfo);
        }
        if (assignmentData.accessInfo) {
          console.log(`Module ${moduleId} assignment access:`, assignmentData.accessInfo);
        }
        
        setQuizzesByModule((map) => ({ ...map, [moduleId]: quizzes }));
        setAssignmentsByModule((map) => ({ ...map, [moduleId]: assignments }));
      } catch (err) {
        console.error("Failed to load quizzes/assignments:", err);
        setQuizzesByModule((map) => ({ ...map, [moduleId]: [] }));
        setAssignmentsByModule((map) => ({ ...map, [moduleId]: [] }));
      } finally {
        setQuizAssignmentLoading((s) => ({ ...s, [moduleId]: false }));
      }
    }
  };

  const handleStartOrContinue = async (module, index) => {
    const moduleId = getModuleId(module);
    const isCompletedModule = isModuleEffectivelyCompleted(module);
    const isCurrent = index === completedEffectiveCount;
    
    // Check if module is unlocked (completed/effectively completed or current)
    const isUnlocked = isCompletedModule || isCurrent;
    if (!isUnlocked) return;

    // Toggle active module
    setActiveModule(activeModule && String(getModuleId(activeModule)) === String(moduleId) ? null : module);

    // Fetch lessons for this module if not already loaded
    if (!lessonsByModule[moduleId] && !lessonsLoading[moduleId]) {
      try {
        setLessonsLoading((s) => ({ ...s, [moduleId]: true }));
        const res = await axiosInstance.get(`/api/lessons/modules/${moduleId}/lessons`);
        const lessons = Array.isArray(res?.data?.data) ? res.data.data : [];
        lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
        setLessonsByModule((map) => ({ ...map, [moduleId]: lessons }));
      } catch (err) {
        console.error("Failed to load lessons:", err);
        setLessonsByModule((map) => ({ ...map, [moduleId]: [] }));
      } finally {
        setLessonsLoading((s) => ({ ...s, [moduleId]: false }));
      }
    }

    // Load resources
    await loadModuleResources(moduleId);

    // Load quizzes and assignments like resources (fetch regardless of lock)
    await loadQuizzesAndAssignments(moduleId);
  };

  const handleMarkLessonComplete = async (lesson, module) => {
    if (!batch?.course) return;
    const courseId = batch.course._id || batch.course.id;
    const lessonId = getLessonId(lesson);

    try {
      const response = await axiosInstance.patch(`/api/progress/lesson-complete`, { 
        courseId, 
        lessonId 
      });
      
      
      if (response.data.success) {
        const newCompletedLessonId = String(lessonId);
        
        // Update completed lessons
        setCompletedLessonIds((ids) => {
          if (ids.includes(newCompletedLessonId)) return ids;
          return [...ids, newCompletedLessonId];
        });


        // Check if all lessons in this module are completed
        const moduleId = getModuleId(module);
        const moduleLessons = lessonsByModule[moduleId] || [];
        const allLessonsCompleted = moduleLessons.every(lesson => 
          completedLessonIds.includes(String(getLessonId(lesson))) || 
          String(getLessonId(lesson)) === newCompletedLessonId
        );

        // If all lessons completed, mark module as complete
        if (allLessonsCompleted && !completedModuleIds.includes(String(moduleId))) {
          await handleMarkModuleComplete(module);
        }
      }
    } catch (e) {
      console.error("Failed to mark lesson complete:", e);
      setError("Failed to mark lesson as complete. Please try again.");
    }
  };

  const handleMarkModuleComplete = async (module) => {
    if (!batch?.course) return;
    const courseId = batch.course._id || batch.course.id;
    const moduleId = getModuleId(module);

    try {
      const response = await axiosInstance.patch(`/api/progress/module-complete`, { 
        courseId, 
        moduleId 
      });
      
      
        if (response.data.success) {
        const newCompletedModuleId = String(moduleId);
        
        setCompletedModuleIds((ids) => {
          if (ids.includes(newCompletedModuleId)) return ids;
          return [...ids, newCompletedModuleId];
        });
        
        // Update current level if it changed and show upgrade message
        if (response.data.data && response.data.data.currentLevel) {
          const newLevel = response.data.data.currentLevel;
          if (newLevel !== currentLevel) {
            setCurrentLevel(newLevel);
            // Show congratulatory message for level upgrade
            if (response.data.message && response.data.message.includes('Level')) {
              setLevelUpgradeMessage(response.data.message);
              // Auto-hide the message after 8 seconds
              setTimeout(() => setLevelUpgradeMessage(null), 8000);
            }
          }
        }
        
        // Load quizzes and assignments for the just completed module
        await loadQuizzesAndAssignments(moduleId);
        
        // Auto-advance to next module if available
        const currentIndex = modules.findIndex((m) => String(getModuleId(m)) === newCompletedModuleId);
        if (currentIndex >= 0 && currentIndex + 1 < modules.length) {
          const nextModule = modules[currentIndex + 1];
          setActiveModule(nextModule);
          
          // Pre-load lessons for next module
          const nextModuleId = getModuleId(nextModule);
          if (!lessonsByModule[nextModuleId] && !lessonsLoading[nextModuleId]) {
            try {
              setLessonsLoading((s) => ({ ...s, [nextModuleId]: true }));
              const res = await axiosInstance.get(`/api/lessons/modules/${nextModuleId}/lessons`);
              const lessons = Array.isArray(res?.data?.data) ? res.data.data : [];
              lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
              setLessonsByModule((map) => ({ ...map, [nextModuleId]: lessons }));
            } catch (err) {
              console.error("Failed to load next module lessons:", err);
            } finally {
              setLessonsLoading((s) => ({ ...s, [nextModuleId]: false }));
            }
          }
          
          // Load resources for next module
          await loadModuleResources(nextModuleId);
        }
      }
    } catch (e) {
      console.error("Failed to mark module complete:", e);
      setError("Failed to mark module as complete. Please try again.");
    }
  };

  const calculateProgress = () => {
    if (modules.length === 0) return 0;
    return Math.round((completedEffectiveCount / modules.length) * 100);
  };

  const isLessonCompleted = (lesson) => {
    return completedLessonIds.includes(String(getLessonId(lesson)));
  };

  const handleStartQuiz = (quiz) => {
    navigate(`/student/quiz/${quiz._id}`);
  };

  const getLevelBadge = (level) => {
    const levelConfig = {
      L1: { variant: "secondary", label: "Level 1", color: "bg-blue-100 text-blue-800 border-blue-200" },
      L2: { variant: "warning", label: "Level 2", color: "bg-orange-100 text-orange-800 border-orange-200" },
      L3: { variant: "success", label: "Level 3", color: "bg-green-100 text-green-800 border-green-200" },
    };

    const config = levelConfig[level] || {
      variant: "secondary",
      label: "Level 1",
      color: "bg-gray-100 text-gray-800 border-gray-200"
    };

    return (
      <Badge className={`${config.color} font-medium text-xs px-2 py-1`}>
        {config.label}
      </Badge>
    );
  };

  const allModulesCompleted = modules.length > 0 && completedEffectiveCount >= modules.length;
  const progress = calculateProgress();


  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
                <Skeleton className="h-9 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!batch) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Course Assigned</h3>
          <p className="text-muted-foreground">
            You are not currently enrolled in any course. Please contact your administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Level Upgrade Message */}
      {levelUpgradeMessage && (
        <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 animate-in slide-in-from-top duration-500">
          <Trophy className="h-5 w-5 text-green-600" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-green-800 font-medium text-base">
                🎉 {levelUpgradeMessage}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLevelUpgradeMessage(null)}
              className="text-green-600 hover:text-green-700 hover:bg-green-100"
            >
              ✕
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Course Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  {batch.course?.title || batch.course?.name || "Course"}
                </CardTitle>
                {getLevelBadge(currentLevel)}
              </div>
              <CardDescription className="text-base">
                {batch.course?.description || "Complete the modules below to finish the course"}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {batch.status}
            </Badge>
          </div>
          
          {/* Progress Section */}
          <div className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <span className="text-sm font-medium">Course Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedEffectiveCount} of {modules.length} modules completed
              </span>
            </div>
            <div className="space-y-2">
              <Progress value={progress} className="h-3" />
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">{progress}% Complete</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Modules Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-blue-600" />
            Course Modules
            <Badge variant="secondary" className="ml-2">
              {modules.length} modules
            </Badge>
          </CardTitle>
          <CardDescription>
            Complete modules in sequence to unlock the next content. Click on a module to view its lessons.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {modules.length === 0 ? (
            <div className="text-center py-8">
              <ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No modules available for this course yet.</p>
            </div>
          ) : (
            modules.map((module, index) => {
              const id = getModuleId(module);
              const isCompletedModule = isModuleEffectivelyCompleted(module);
              const isCurrent = index === completedEffectiveCount;
              const isLocked = !isCompletedModule && !isCurrent;
              const moduleLessons = lessonsByModule[id] || module?.lessons || [];
              const isLessonsLoading = !!lessonsLoading[id];
              const isActive = activeModule && String(getModuleId(activeModule)) === String(id);
              const completedLessonsInModule = moduleLessons.filter(lesson => 
                isLessonCompleted(lesson)
              ).length;

              return (
                <div
                  key={id || index}
                  className={`group relative p-4 rounded-lg border transition-all duration-200 ${
                    isCompletedModule
                      ? "bg-green-50 border-green-200"
                      : isCurrent
                      ? "bg-blue-50 border-blue-200 shadow-sm"
                      : isLocked
                      ? "bg-gray-50 border-gray-200"
                      : "bg-white border-gray-200"
                  } ${isCurrent ? "ring-2 ring-blue-100" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          isCompletedModule
                            ? "bg-green-100 text-green-700"
                            : isCurrent
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {isCompletedModule ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        {index < modules.length - 1 && (
                          <div className={`w-0.5 h-8 mt-1 ${
                            isCompletedModule ? "bg-green-200" : "bg-gray-200"
                          }`}></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-semibold ${
                            isCompletedModule ? "text-green-800" : 
                            isCurrent ? "text-blue-800" : 
                            "text-gray-700"
                          }`}>
                            {module.title || `Module ${index + 1}`}
                          </h3>
                          {isCurrent && (
                            <Badge variant="default" className="text-xs">
                              Current
                            </Badge>
                          )}
                          {isCompletedModule && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                              Completed
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {module.description || "No description available"}
                        </p>

                        {/* Module Meta */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {completedLessonsInModule} of {moduleLessons.length} lessons completed
                          </span>
                          {module.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {module.duration}
                            </span>
                          )}
                          {Array.isArray(module.resources) && module.resources.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              {module.resources.length} resources
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleStartOrContinue(module, index)}
                        disabled={isLocked}
                        className={`${isCompletedModule ? "bg-green-100 text-green-700 hover:bg-green-200" : ""} ${isCurrent ? "shadow-md" : ""}`}
                      >
                        {isCompletedModule ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Completed
                          </>
                        ) : isCurrent ? (
                          <>
                            <PlayCircle className="h-4 w-4 mr-1" />
                            {isActive ? "Hide" : "Start"}
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-1" />
                            Locked
                          </>
                        )}
                        <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  {/* Module Content Panel with Tabs */}
                  {isActive && (
                    <div className="mt-4 rounded-md border bg-white">
                      <Tabs defaultValue="lessons" className="w-full">
                        <div className="border-b">
                          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 rounded-none bg-transparent h-auto p-0">
                            <TabsTrigger value="lessons" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3 px-2 text-xs sm:text-sm">
                              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              <span className="hidden sm:inline">Lessons</span>
                              <span className="sm:hidden">L</span>
                              <span className="ml-1">({moduleLessons.length})</span>
                            </TabsTrigger>
                            <TabsTrigger value="resources" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3 px-2 text-xs sm:text-sm">
                              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              <span className="hidden sm:inline">Resources</span>
                              <span className="sm:hidden">R</span>
                              <span className="ml-1">({resourcesByModule[id]?.length || 0})</span>
                            </TabsTrigger>
                            <TabsTrigger value="quiz" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3 px-2 text-xs sm:text-sm">
                              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              {!isCompletedModule && <Lock className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />}
                              <span className="hidden sm:inline">Quiz ({quizzesByModule[id]?.length || 0})</span>
                              <span className="sm:hidden">Q({quizzesByModule[id]?.length || 0})</span>
                            </TabsTrigger>
                            <TabsTrigger value="assignment" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3 px-2 text-xs sm:text-sm">
                              <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              {!isCompletedModule && <Lock className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />}
                              <span className="hidden sm:inline">Assignment ({assignmentsByModule[id]?.length || 0})</span>
                              <span className="sm:hidden">A({assignmentsByModule[id]?.length || 0})</span>
                            </TabsTrigger>
                          </TabsList>
                        </div>
                        
                        <TabsContent value="lessons" className="p-0 mt-0">
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-3">
                              <div className="font-medium">Lessons Progress</div>
                              <div className="text-xs text-muted-foreground">
                                {completedLessonsInModule} of {moduleLessons.length} completed
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              {isLessonsLoading ? (
                                <div className="space-y-2">
                                  {[1, 2, 3].map(i => (
                                    <Skeleton key={i} className="h-16 w-full" />
                                  ))}
                                </div>
                              ) : moduleLessons.length === 0 ? (
                                <div className="text-center py-8">
                                  <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                  <p className="text-sm text-muted-foreground">No lessons found for this module.</p>
                                </div>
                              ) : (
                                moduleLessons.map((lesson, li) => {
                                  const lessonId = getLessonId(lesson);
                                  const isLessonDone = isLessonCompleted(lesson);
                                  const isModuleCurrent = index === completedEffectiveCount;
                                  const currentLessonIndex = moduleLessons.findIndex(lesson => !isLessonCompleted(lesson));
                                  const isLessonLocked = !isCompletedModule && li > currentLessonIndex && currentLessonIndex !== -1;

                                  return (
                                    <div key={lessonId || li} className={`flex items-start justify-between rounded-lg border p-4 transition-colors ${
                                      isLessonLocked ? 'opacity-50 bg-gray-50' : isLessonDone ? 'bg-green-50 border-green-200' : 'hover:bg-blue-50'
                                    }`}>
                                      <div className="flex items-start gap-3 flex-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                                          isLessonDone ? "bg-green-100 text-green-700" : isLessonLocked ? "bg-gray-100 text-gray-500" : "bg-blue-100 text-blue-600"
                                        }`}>
                                          {isLessonDone ? <CheckCircle2 className="h-4 w-4" /> : isLessonLocked ? <Lock className="h-4 w-4" /> : li + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-sm font-semibold">{lesson.title || `Lesson ${li + 1}`}</h4>
                                            {isLessonDone && (
                                              <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                                                Completed
                                              </Badge>
                                            )}
                                          </div>
                                          {lesson.description && (
                                            <p className="text-xs text-muted-foreground mb-2">{lesson.description}</p>
                                          )}
                                          {lesson.content && (
                                            <p className="text-xs text-muted-foreground line-clamp-2">{lesson.content}</p>
                                          )}
                                          <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="outline" className="text-xs">
                                              <Clock className="h-3 w-3 mr-1" />
                                              {lesson.duration || "--:--"}
                                            </Badge>
                                            {lesson.order && (
                                              <span className="text-xs text-muted-foreground">Order: {lesson.order}</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0 ml-3">
                                        {!isLessonDone && li === currentLessonIndex && isModuleCurrent && (
                                          <Button
                                            size="sm"
                                            onClick={() => handleMarkLessonComplete(lesson, module)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                          >
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Mark Complete
                                          </Button>
                                        )}
                                        {isLessonDone && (
                                          <Button size="sm" variant="outline">
                                            <Eye className="h-3 w-3 mr-1" />
                                            Review
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                              
                              {/* Mark Module Complete Button - only show if all lessons are completed */}
                              {!isCompletedModule && !isLocked && completedLessonsInModule === moduleLessons.length && moduleLessons.length > 0 && (
                                <div className="pt-4 border-t mt-4">
                                  <Button 
                                    onClick={() => handleMarkModuleComplete(module)} 
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    size="lg"
                                  >
                                    <Trophy className="h-4 w-4 mr-2" />
                                    Complete Module & Unlock Assessments
                                  </Button>
                                  <p className="text-xs text-muted-foreground text-center mt-2">
                                    🎉 All lessons completed! Complete this module to unlock quizzes and assignments.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="resources" className="p-0 mt-0">
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-3">
                              <div className="font-medium">Module Resources</div>
                              <div className="text-xs text-muted-foreground">
                                {resourcesByModule[id]?.length || 0} resources available
                              </div>
                            </div>
                            
                            <div className="space-y-3">
                              {resourcesLoading[id] ? (
                                <div className="space-y-2">
                                  {[1, 2].map(i => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                  ))}
                                </div>
                              ) : (!resourcesByModule[id] || resourcesByModule[id].length === 0) ? (
                                <div className="text-center py-8">
                                  <Download className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                  <p className="text-sm text-muted-foreground">No resources available for this module.</p>
                                </div>
                              ) : (
                                resourcesByModule[id].map((resource, ri) => {
                                  const getResourceIcon = (type) => {
                                    switch(type?.toUpperCase()) {
                                      case 'VIDEO': return <Video className="h-4 w-4" />;
                                      case 'PDF': case 'TEXT': return <FileText className="h-4 w-4" />;
                                      case 'IMAGE': return <FileImage className="h-4 w-4" />;
                                      case 'LINK': return <ExternalLink className="h-4 w-4" />;
                                      default: return <Download className="h-4 w-4" />;
                                    }
                                  };
                                  
                                  const getResourceColor = (type) => {
                                    switch(type?.toUpperCase()) {
                                      case 'VIDEO': return 'bg-red-50 border-red-200 text-red-700';
                                      case 'PDF': return 'bg-orange-50 border-orange-200 text-orange-700';
                                      case 'TEXT': return 'bg-blue-50 border-blue-200 text-blue-700';
                                      case 'IMAGE': return 'bg-green-50 border-green-200 text-green-700';
                                      case 'LINK': return 'bg-purple-50 border-purple-200 text-purple-700';
                                      default: return 'bg-gray-50 border-gray-200 text-gray-700';
                                    }
                                  };
                                  
                                  return (
                                    <div key={ri} className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:shadow-sm ${getResourceColor(resource.type)}`}>
                                      <div className="flex items-center gap-3 flex-1">
                                        <div className="p-2 rounded-lg bg-white/50">
                                          {getResourceIcon(resource.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-sm font-medium truncate">{resource.title || `Resource ${ri + 1}`}</h4>
                                            <Badge variant="outline" className="text-xs shrink-0">
                                              {resource.type || 'FILE'}
                                            </Badge>
                                          </div>
                                          {resource.description && (
                                            <p className="text-xs opacity-75 line-clamp-1">{resource.description}</p>
                                          )}
                                          {resource.fileSize && (
                                            <p className="text-xs opacity-75 mt-1">
                                              Size: {(resource.fileSize / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex gap-2 shrink-0">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => window.open(resource.url, '_blank')}
                                          className="bg-white hover:bg-gray-50"
                                        >
                                          {resource.type === 'LINK' ? (
                                            <>
                                              <ExternalLink className="h-3 w-3 mr-1" />
                                              View
                                            </>
                                          ) : (
                                            <>
                                              <Download className="h-3 w-3 mr-1" />
                                              Download
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="quiz" className="p-0 mt-0">
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-3">
                              <div className="font-medium">Module Quizzes</div>
                              <div className="text-xs text-muted-foreground">
                                {quizzesByModule[id]?.length || 0} available
                              </div>
                            </div>
                            
                            {quizAssignmentLoading[id] ? (
                              <Skeleton className="h-32 w-full" />
                            ) : (!quizzesByModule[id] || quizzesByModule[id].length === 0) ? (
                              <div className="text-center py-8">
                                <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  No quizzes available for this module yet.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {quizzesByModule[id].map((quiz, qi) => (
                                  <Card key={qi} className={`border-green-200 ${!isCompletedModule ? 'opacity-50' : 'bg-gradient-to-br from-green-50 to-emerald-50'}`}>
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-base flex items-center gap-2 text-green-800">
                                        {!isCompletedModule && <Lock className="h-4 w-4" />}
                                        <Award className="h-4 w-4" />
                                        {quiz.title || 'Module Quiz'}
                                      </CardTitle>
                                      {quiz.description && (
                                        <CardDescription className="text-green-700 text-sm">
                                          {quiz.description}
                                        </CardDescription>
                                      )}
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center justify-between">
                                          <span>Questions</span>
                                          <span className="font-medium">{quiz.questions?.length || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span>Passing Score</span>
                                          <span className="font-medium">{quiz.passingScore || 70}%</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span>Time Limit</span>
                                          <span className="font-medium">{quiz.timeLimit || 30} min</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span>Attempts</span>
                                          <span className="font-medium">{quiz.attemptsAllowed || 1}</span>
                                        </div>
                                      </div>
                                      {!isCompletedModule && (
                                        <div className="text-center py-2 border-t border-yellow-200 bg-yellow-50 rounded-md">
                                          <p className="text-xs text-yellow-700 flex items-center justify-center gap-1">
                                            <Lock className="h-3 w-3" />
                                            Complete all lessons in this module to unlock
                                          </p>
                                        </div>
                                      )}
                                      <Button 
                                        className={`w-full ${!isCompletedModule ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                                        disabled={!isCompletedModule}
                                        onClick={() => isCompletedModule && handleStartQuiz(quiz)}
                                      >
                                        <BarChart3 className="h-4 w-4 mr-2" />
                                        {!isCompletedModule ? 'Locked' : 'Start Quiz'}
                                      </Button>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="assignment" className="p-0 mt-0">
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-3">
                              <div className="font-medium">Module Assignments</div>
                              <div className="text-xs text-muted-foreground">
                                {assignmentsByModule[id]?.length || 0} available
                              </div>
                            </div>
                            
                            {quizAssignmentLoading[id] ? (
                              <Skeleton className="h-32 w-full" />
                            ) : (!assignmentsByModule[id] || assignmentsByModule[id].length === 0) ? (
                              <div className="text-center py-8">
                                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  No assignments available for this module yet.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {assignmentsByModule[id].map((assignment, ai) => (
                                  <Card key={ai} className={`border-blue-200 ${!isCompletedModule ? 'opacity-50' : 'bg-gradient-to-br from-blue-50 to-cyan-50'}`}>
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                                        {!isCompletedModule && <Lock className="h-4 w-4" />}
                                        <FileText className="h-4 w-4" />
                                        {assignment.title || 'Module Assignment'}
                                      </CardTitle>
                                      {assignment.description && (
                                        <CardDescription className="text-blue-700 text-sm">
                                          {assignment.description}
                                        </CardDescription>
                                      )}
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center justify-between">
                                          <span>Due Date</span>
                                          <span className="font-medium">
                                            {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No deadline'}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span>Max Score</span>
                                          <span className="font-medium">{assignment.maxScore || 100} points</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span>Resubmission</span>
                                          <span className="font-medium">{assignment.allowResubmission ? 'Allowed' : 'Not allowed'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span>Status</span>
                                          <Badge variant="outline" className={`text-xs ${
                                            assignment.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                                            assignment.status === 'CLOSED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                          }`}>
                                            {assignment.status || 'ACTIVE'}
                                          </Badge>
                                        </div>
                                      </div>
                                      {!isCompletedModule && (
                                        <div className="text-center py-2 border-t border-yellow-200 bg-yellow-50 rounded-md">
                                          <p className="text-xs text-yellow-700 flex items-center justify-center gap-1">
                                            <Lock className="h-3 w-3" />
                                            Complete all lessons in this module to unlock
                                          </p>
                                        </div>
                                      )}
                                      <div className="flex gap-2">
                                        <Button 
                                          variant="outline" 
                                          className={`flex-1 ${!isCompletedModule ? 'border-gray-300 text-gray-500 cursor-not-allowed' : 'border-blue-300 text-blue-700'}`}
                                          disabled={!isCompletedModule}
                                        >
                                          <Eye className="h-4 w-4 mr-2" />
                                          {!isCompletedModule ? 'Locked' : 'View Details'}
                                        </Button>
                                        <Button 
                                          className={`flex-1 ${!isCompletedModule ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                          disabled={!isCompletedModule}
                                        >
                                          <FileText className="h-4 w-4 mr-2" />
                                          {!isCompletedModule ? 'Locked' : 'Submit Assignment'}
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Completion Section */}
      <BatchCompletionSection allModulesCompleted={allModulesCompleted} />

      {/* Active Module Indicator */}
      {activeModule && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="flex items-center justify-between">
            <span>
              Viewing: <strong>{activeModule.title || "Untitled module"}</strong>
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveModule(null)}
            >
              Close
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default BatchCourse;