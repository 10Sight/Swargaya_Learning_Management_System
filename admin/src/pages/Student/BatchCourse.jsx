import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  CheckCircle2,
  PlayCircle,
  Lock,
  Trophy,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  ExternalLink,
  Video,
  FileImage,
  BarChart3,
  Award,
  ListChecks,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import axiosInstance from "@/Helper/axiosInstance";
import { useGetResourcesByCourseQuery } from "@/Redux/AllApi/resourceApi";
import { useGetQuizzesByCourseQuery, useGetQuizzesByModuleQuery } from "@/Redux/AllApi/QuizApi";
import { useGetAssignmentsByCourseQuery, useGetAssignmentsByModuleQuery } from "@/Redux/AllApi/AssignmentApi";
import { useGetMySubmissionsQuery } from "@/Redux/AllApi/SubmissionApi";
import { useGetMyAttemptsQuery } from "@/Redux/AllApi/AttemptedQuizApi";

// Import custom components
import StudentModuleResources from "@/components/student/StudentModuleResources";
import StudentCourseResources from "@/components/student/StudentCourseResources";
import StudentModuleQuizzes from "@/components/student/StudentModuleQuizzes";
import StudentModuleAssignments from "@/components/student/StudentModuleAssignments";
import AssignmentDetailsModal from "@/components/student/AssignmentDetailsModal";
import AssignmentSubmissionModal from "@/components/student/AssignmentSubmissionModal";

// Constants
const STATUS_CONFIG = {
  ACTIVE: { name: "Active", color: "bg-green-100 text-green-800" },
  UPCOMING: { name: "Upcoming", color: "bg-blue-100 text-blue-800" },
  COMPLETED: { name: "Completed", color: "bg-gray-100 text-gray-800" },
  PAUSED: { name: "Paused", color: "bg-yellow-100 text-yellow-800" },
};

// Hook for managing course data
const useCourseData = () => {
  const [state, setState] = useState({
    batch: null,
    modules: [],
    currentLevel: "L1",
    completedModuleIds: [],
    completedLessonIds: [],
    loading: true,
    error: null,
    refreshing: false,
  });

  const fetchCourseData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setState(prev => ({ ...prev, refreshing: true }));
      } else {
        setState(prev => ({ ...prev, loading: true }));
      }

      // Get batch course content
      const response = await axiosInstance.get("/api/batches/me/course-content");
      const data = response?.data?.data;

      if (!data) {
        throw new Error("No course data available");
      }

      const batch = {
        ...data.batch,
        course: data.course,
        status: data.batch?.status || 'ACTIVE'
      };

      const modules = data.course?.modules || [];
      const progress = data.progress || {};

      // Extract completed IDs from the nested structure
      const completedModuleIds = progress.completedModules 
        ? progress.completedModules.map(module => String(module.moduleId || module._id || module))
        : [];
      
      const completedLessonIds = progress.completedLessons 
        ? progress.completedLessons.map(lesson => String(lesson.lessonId || lesson._id || lesson))
        : [];


      setState({
        batch,
        modules: modules.sort((a, b) => (a.order || 0) - (b.order || 0)),
        currentLevel: progress.currentLevel || "L1",
        levelLockEnabled: progress.levelLockEnabled || false,
        lockedLevel: progress.lockedLevel || null,
        completedModuleIds,
        completedLessonIds,
        loading: false,
        refreshing: false,
        error: null,
      });
    } catch (error) {
      console.error("Error fetching course data:", error);
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: error.message || "Failed to load course data",
      }));
      toast.error("Failed to load course data");
    }
  }, []);

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  return { ...state, refresh: () => fetchCourseData(true) };
};


// Hook for managing course-level content using RTK Query
const useCourseContent = (courseId, allModulesCompleted) => {
  const {
    data: courseQuizzesData,
    isLoading: courseQuizzesLoading,
    error: courseQuizzesError,
  } = useGetQuizzesByCourseQuery(courseId, {
    skip: !courseId || !allModulesCompleted,
  });

  const {
    data: courseAssignmentsData,
    isLoading: courseAssignmentsLoading,
    error: courseAssignmentsError,
  } = useGetAssignmentsByCourseQuery(courseId, {
    skip: !courseId || !allModulesCompleted,
  });

  const courseQuizzes = courseQuizzesData?.data || [];
  const courseAssignments = courseAssignmentsData?.data || [];
  const loading = courseQuizzesLoading || courseAssignmentsLoading;
  const loaded = !loading && (courseQuizzesData !== undefined || courseAssignmentsData !== undefined);

  return {
    courseQuizzes,
    courseAssignments,
    loading,
    loaded,
    loadCourseContent: () => {}, // No longer needed with RTK Query
  };
};

// Updated hook for managing module content with RTK Query for assessments
const useModuleContent = () => {
  const [state, setState] = useState({
    lessonsByModule: {},
    resourcesByModule: {},
    quizzesByModule: {},
    assignmentsByModule: {},
    loadingStates: {},
    loadedModules: new Set(), // Track which modules have been loaded
  });

  // Store moduleId and courseId for RTK Query hooks
  const [currentModules, setCurrentModules] = useState({});

  const loadModuleContent = useCallback(async (moduleId, courseId) => {
    const key = String(moduleId);
    if (state.loadingStates[key]) return;

    // Add to current modules for RTK Query
    setCurrentModules(prev => ({ ...prev, [key]: { moduleId, courseId } }));

    setState(prev => ({
      ...prev,
      loadingStates: { ...prev.loadingStates, [key]: true }
    }));

    try {
      // Load lessons and resources (still using direct API calls as no RTK Query hooks exist for these)
      console.log(`BatchCourse - Loading content for moduleId: ${moduleId}`);
      
      const [lessonsRes, resourcesRes] = await Promise.allSettled([
        axiosInstance.get(`/api/modules/${moduleId}/lessons`),
        axiosInstance.get(`/api/resources/module/${moduleId}`),
      ]);

      console.log(`BatchCourse - lessonsRes status: ${lessonsRes.status}`);
      console.log(`BatchCourse - resourcesRes status: ${resourcesRes.status}`);
      
      if (resourcesRes.status === 'rejected') {
        console.error(`BatchCourse - Resources fetch failed for moduleId ${moduleId}:`, resourcesRes.reason);
      } else {
        console.log(`BatchCourse - Resources response for moduleId ${moduleId}:`, resourcesRes.value?.data);
      }

      const lessons = lessonsRes.status === 'fulfilled'
        ? (lessonsRes.value?.data?.data || []).sort((a, b) => (a.order || 0) - (b.order || 0))
        : [];

      const resources = resourcesRes.status === 'fulfilled'
        ? resourcesRes.value?.data?.data || []
        : [];
        
      console.log(`BatchCourse - Found ${resources.length} resources for moduleId ${moduleId}`);
      console.log(`BatchCourse - Resources data:`, resources);

      setState(prev => ({
        ...prev,
        lessonsByModule: { ...prev.lessonsByModule, [key]: lessons },
        resourcesByModule: { ...prev.resourcesByModule, [key]: resources },
        loadingStates: { ...prev.loadingStates, [key]: false },
        loadedModules: new Set([...prev.loadedModules, key])
      }));
    } catch (error) {
      console.error(`Error loading module ${moduleId} content:`, error);
      setState(prev => ({
        ...prev,
        lessonsByModule: { ...prev.lessonsByModule, [key]: [] },
        resourcesByModule: { ...prev.resourcesByModule, [key]: [] },
        loadingStates: { ...prev.loadingStates, [key]: false }
      }));
    }
  }, [state.loadingStates]);

  // Function to update assessments data from RTK Query
  const updateModuleAssessments = useCallback((moduleId, quizzes = [], assignments = []) => {
    const key = String(moduleId);
    setState(prev => ({
      ...prev,
      quizzesByModule: { ...prev.quizzesByModule, [key]: quizzes },
      assignmentsByModule: { ...prev.assignmentsByModule, [key]: assignments }
    }));
  }, []);

  return { 
    ...state, 
    loadModuleContent,
    updateModuleAssessments,
    currentModules
  };
};

// Component to handle RTK Query hooks for individual modules
const ModuleAssessmentProvider = ({ moduleId, courseId, children, onAssessmentsLoaded }) => {
  const {
    data: moduleQuizzesData,
    isLoading: moduleQuizzesLoading,
    error: moduleQuizzesError,
  } = useGetQuizzesByModuleQuery(moduleId, {
    skip: !courseId || !moduleId,
  });

  const {
    data: moduleAssignmentsData,
    isLoading: moduleAssignmentsLoading,
    error: moduleAssignmentsError,
  } = useGetAssignmentsByModuleQuery(moduleId, {
    skip: !courseId || !moduleId,
  });

  const moduleQuizzes = moduleQuizzesData?.data || [];
  const moduleAssignments = moduleAssignmentsData?.data || [];

  // Update parent component when assessments are loaded
  useEffect(() => {
    if (!moduleQuizzesLoading && !moduleAssignmentsLoading && onAssessmentsLoaded) {
      onAssessmentsLoaded(moduleId, moduleQuizzes, moduleAssignments);
    }
  }, [moduleId, moduleQuizzes, moduleAssignments, moduleQuizzesLoading, moduleAssignmentsLoading, onAssessmentsLoaded]);

  return children;
};

// Main component
const BatchCourse = () => {
  const navigate = useNavigate();
  const {
    batch, 
    modules, 
    currentLevel, 
    levelLockEnabled,
    lockedLevel,
    completedModuleIds, 
    completedLessonIds, 
    loading, 
    error, 
    refreshing,
    refresh 
  } = useCourseData();
  
  // Extract level lock information from course data
  const [levelLockInfo, setLevelLockInfo] = useState({
    isLocked: false,
    lockedLevel: null
  });
  
  const {
    lessonsByModule,
    resourcesByModule,
    quizzesByModule,
    assignmentsByModule,
    loadingStates,
    loadModuleContent,
    updateModuleAssessments
  } = useModuleContent();

  // Callback for handling module assessments loaded from RTK Query
  const handleModuleAssessmentsLoaded = useCallback((moduleId, quizzes, assignments) => {
    updateModuleAssessments(moduleId, quizzes, assignments);
  }, [updateModuleAssessments]);

  // Fetch course-level resources
  const {
    data: courseResourcesData,
    isLoading: courseResourcesLoading,
    error: courseResourcesError,
  } = useGetResourcesByCourseQuery(batch?.course?._id || batch?.course?.id, {
    skip: !batch?.course?._id && !batch?.course?.id,
  });
  
  console.log("BatchCourse - Course Resources:", {
    courseId: batch?.course?._id || batch?.course?.id,
    courseResourcesData,
    courseResourcesLoading,
    courseResourcesError,
  });
  
  const courseResources = courseResourcesData?.data || [];
  console.log("BatchCourse - Course Resources count:", courseResources.length);

  const allModulesCompleted = modules.length > 0 && modules.every(m => 
    completedModuleIds.includes(String(m?._id || m?.id))
  );
  
  const {
    courseQuizzes,
    courseAssignments,
    loading: courseContentLoading,
    loaded: courseContentLoaded,
    loadCourseContent
  } = useCourseContent(batch?.course?._id || batch?.course?.id, allModulesCompleted);
  
  // Fetch student submissions
  const { data: submissionsData, refetch: refetchSubmissions } = useGetMySubmissionsQuery(undefined, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const submissions = submissionsData?.data || [];

  // Create a map of submissions by assignment ID for quick lookup (from API)
  const apiSubmissionsByAssignment = submissions.reduce((acc, submission) => {
    if (submission.assignment) {
      const key = typeof submission.assignment === 'object' 
        ? (submission.assignment._id || submission.assignment.id)
        : submission.assignment;
      if (key) acc[key] = submission;
    }
    return acc;
  }, {});

  // Fetch student quiz attempts
  const { data: attemptsData, refetch: refetchAttempts } = useGetMyAttemptsQuery(undefined, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const attempts = attemptsData?.data || [];

  // Create a map of quiz attempts by quiz ID for quick lookup
  const attemptsByQuiz = attempts.reduce((acc, attempt) => {
    if (attempt.quiz) {
      const key = typeof attempt.quiz === 'object' 
        ? (attempt.quiz._id || attempt.quiz.id)
        : attempt.quiz;
      if (key) {
        if (!acc[key]) acc[key] = [];
        acc[key].push(attempt);
      }
    }
    return acc;
  }, {});

  // Local optimistic map for instant UI updates after successful submission
  const [localSubmissionsMap, setLocalSubmissionsMap] = useState({});

  // Effective submissions map (API + local optimistic updates)
  const submissionsByAssignment = { ...apiSubmissionsByAssignment, ...localSubmissionsMap };

  const [uiState, setUiState] = useState({
    levelUpgradeMessage: null,
    processingAction: null,
    activeModule: null,
    activeTab: 'lessons',
  });

  // Assignment modal states
  const [assignmentModals, setAssignmentModals] = useState({
    detailsModal: { isOpen: false, assignment: null, submission: null },
    submissionModal: { isOpen: false, assignment: null, submission: null }
  });

  // Helper functions
  const getModuleId = (m) => m?._id || m?.id;
  const getLessonId = (l) => l?._id || l?.id;
  const getAssignmentId = (a) => a?._id || a?.id;

  const isModuleCompleted = useCallback((module) => {
    const moduleId = String(getModuleId(module));
    return completedModuleIds.includes(moduleId);
  }, [completedModuleIds]);

  const isLessonCompleted = useCallback((lesson) => {
    return completedLessonIds.includes(String(getLessonId(lesson)));
  }, [completedLessonIds]);

  const isModuleAccessible = useCallback((moduleIndex) => {
    // First module is always accessible
    if (moduleIndex === 0) return true;
    
    // Check if all previous modules are completed
    for (let i = 0; i < moduleIndex; i++) {
      if (!isModuleCompleted(modules[i])) {
        return false;
      }
    }
    
    // Check level lock restrictions if enabled
    if (levelLockEnabled && lockedLevel && modules[moduleIndex]) {
      const moduleLevel = modules[moduleIndex].level || "L1";
      const currentLevelNum = parseInt(currentLevel.replace('L', ''));
      const moduleLevelNum = parseInt(moduleLevel.replace('L', ''));
      
      // Module is locked if its level is higher than current level
      if (moduleLevelNum > currentLevelNum) {
        return false;
      }
    }
    
    return true;
  }, [modules, isModuleCompleted, levelLockEnabled, lockedLevel, currentLevel]);

  const getCompletedModulesCount = useCallback(() => {
    return modules.reduce((count, module) => 
      count + (isModuleCompleted(module) ? 1 : 0), 0
    );
  }, [modules, isModuleCompleted]);

  const calculateProgress = useCallback(() => {
    if (modules.length === 0) return 0;
    return Math.round((getCompletedModulesCount() / modules.length) * 100);
  }, [modules.length, getCompletedModulesCount]);

  const getLevelBadge = useCallback((level) => {
    const config = {
      L1: { label: "Level 1", color: "bg-blue-100 text-blue-800" },
      L2: { label: "Level 2", color: "bg-orange-100 text-orange-800" },
      L3: { label: "Level 3", color: "bg-green-100 text-green-800" },
    };

    const levelConfig = config[level] || config.L1;
    
    return (
      <Badge className={`${levelConfig.color} font-medium text-xs px-2 py-1`}>
        {levelConfig.label}
      </Badge>
    );
  }, []);

  // Get the current accessible module based on completion status
  const getCurrentModuleIndex = useCallback(() => {
    for (let i = 0; i < modules.length; i++) {
      if (!isModuleCompleted(modules[i])) {
        return i;
      }
    }
    return modules.length - 1; // All modules completed, stay at last module
  }, [modules, isModuleCompleted]);

  // Check stage completion status for current module
  const getStageStatus = (moduleIndex, stage) => {
    if (moduleIndex >= modules.length) return { completed: true, accessible: false };
    
    const module = modules[moduleIndex];
    const moduleId = getModuleId(module);
    const moduleLessons = lessonsByModule[moduleId] || [];
    const moduleResources = resourcesByModule[moduleId] || [];
    const moduleQuizzes = quizzesByModule[moduleId] || [];
    const moduleAssignments = assignmentsByModule[moduleId] || [];

    const allLessonsCompleted = moduleLessons.every(lesson => 
      isLessonCompleted(lesson)
    );
    
    switch (stage) {
      case 'lessons':
        return { 
          completed: allLessonsCompleted, 
          accessible: true,
          hasContent: moduleLessons.length > 0
        };
      case 'resources':
        return { 
          completed: allLessonsCompleted, // Resources are considered "completed" when lessons are done
          accessible: allLessonsCompleted,
          hasContent: moduleResources.length > 0
        };
      case 'quiz': {
        const allQuizzesCompleted = moduleQuizzes.length > 0 && moduleQuizzes.every(q => {
          const qid = q._id || q.id;
          const quizAttempts = attemptsByQuiz[String(qid)] || [];
          if (quizAttempts.length === 0) return false;
          
          // Check if passed (best score >= passing score)
          const bestAttempt = quizAttempts.reduce((best, current) => {
            return (current.score > best.score) ? current : best;
          }, quizAttempts[0]);
          
          const passingScore = q.passingScore || 70;
          return bestAttempt.score >= passingScore;
        });
        
        return { 
          completed: allQuizzesCompleted,
          accessible: allLessonsCompleted,
          hasContent: moduleQuizzes.length > 0
        };
      }
      case 'assignment': {
        const allAssignmentsSubmitted = moduleAssignments.length > 0 && moduleAssignments.every(a => {
          const aid = getAssignmentId(a);
          return aid && submissionsByAssignment[String(aid)];
        });
        return { 
          completed: allAssignmentsSubmitted,
          accessible: allLessonsCompleted,
          hasContent: moduleAssignments.length > 0
        };
      }
      default:
        return { completed: false, accessible: false, hasContent: false };
    }
  };

  // Determine what stage should be shown for current module
  const getCurrentStage = (moduleIndex) => {
    const stages = ['lessons', 'resources', 'quiz', 'assignment'];
    
    for (const stage of stages) {
      const status = getStageStatus(moduleIndex, stage);
      if (status.hasContent && !status.completed) {
        return stage;
      }
    }
    return 'complete'; // All stages completed
  };

  // Action handlers
  const handleMarkLessonComplete = async (lesson) => {
    if (!batch?.course || uiState.processingAction) return;
    
    const courseId = batch.course._id || batch.course.id;
    const lessonId = getLessonId(lesson);

    setUiState(prev => ({ ...prev, processingAction: `lesson-${lessonId}` }));

    try {
      const response = await axiosInstance.patch(`/api/progress/lesson-complete`, { 
        courseId, 
        lessonId 
      });
      
      if (response.data.success) {
        toast.success("Lesson completed!");
        refresh(); // Refresh to get updated state
      } else {
        throw new Error(response.data.message || 'Failed to complete lesson');
      }
    } catch (error) {
      console.error("Failed to mark lesson complete:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to mark lesson as complete. Please try again.";
      toast.error(errorMessage);
    } finally {
      setUiState(prev => ({ ...prev, processingAction: null }));
    }
  };

  // Remove unused handleNextStage function as it's not being used in the current UI

  const handleStartQuiz = (quiz) => {
    navigate(`/student/quiz/${quiz._id || quiz.id}`);
  };

  // Assignment handlers
  const handleAssignmentViewDetails = (assignment, submission) => {
    setAssignmentModals({
      ...assignmentModals,
      detailsModal: { isOpen: true, assignment, submission }
    });
  };

  const handleAssignmentSubmit = (assignment, submission) => {
    setAssignmentModals({
      ...assignmentModals,
      submissionModal: { isOpen: true, assignment, submission }
    });
  };

  const handleCloseDetailsModal = () => {
    setAssignmentModals({
      ...assignmentModals,
      detailsModal: { isOpen: false, assignment: null, submission: null }
    });
  };

  const handleCloseSubmissionModal = () => {
    setAssignmentModals({
      ...assignmentModals,
      submissionModal: { isOpen: false, assignment: null, submission: null }
    });
  };

  const handleSubmissionSuccess = (submissionData) => {
    // Normalize submission object from API response wrapper or direct object
    const submission = submissionData?.data || submissionData;
    const assignmentKey = typeof submission?.assignment === 'object'
      ? (submission.assignment?._id || submission.assignment?.id)
      : submission?.assignment;

    if (assignmentKey) {
      // Optimistically update local submissions map for instant UI change
      setLocalSubmissionsMap(prev => ({ ...prev, [String(assignmentKey)]: submission }));
    }

    toast.success('Assignment submitted successfully!');

    // Close modals
    setAssignmentModals({
      detailsModal: { isOpen: false, assignment: null, submission: null },
      submissionModal: { isOpen: false, assignment: null, submission: null }
    });

    // Ensure server state is synced (RTK invalidation + explicit refetch)
    if (typeof refetchSubmissions === 'function') {
      refetchSubmissions();
    }
  };

  const handleShowSubmissionFromDetails = () => {
    const { assignment, submission } = assignmentModals.detailsModal;
    setAssignmentModals({
      detailsModal: { isOpen: false, assignment: null, submission: null },
      submissionModal: { isOpen: true, assignment, submission }
    });
  };

  const handleModuleClick = (module, index) => {
    if (!isModuleAccessible(index)) return;
    
    const moduleId = getModuleId(module);
    const isCurrentlyActive = uiState.activeModule && 
      String(getModuleId(uiState.activeModule)) === String(moduleId);
    
    if (isCurrentlyActive) {
      // Hide the module panel
      setUiState(prev => ({ ...prev, activeModule: null, activeTab: 'lessons' }));
    } else {
      // Show the module panel and load its content
      setUiState(prev => ({ ...prev, activeModule: module, activeTab: 'lessons' }));
      loadModuleContent(moduleId, batch?.course?._id || batch?.course?.id);
    }
  };

  const handleMarkModuleComplete = useCallback(async (module) => {
    if (!batch?.course || uiState.processingAction) return;
    
    const courseId = batch.course._id || batch.course.id;
    const moduleId = getModuleId(module);

    setUiState(prev => ({ ...prev, processingAction: `module-${moduleId}` }));

    try {
      const response = await axiosInstance.patch(`/api/progress/module-complete`, { 
        courseId, 
        moduleId 
      });
      
      if (response.data.success) {
        toast.success("Module completed!");
        refresh(); // Refresh to get updated state
        
        // Check if this unlocks a new level
        if (response.data.data?.levelUp) {
          setUiState(prev => ({ 
            ...prev, 
            levelUpgradeMessage: `Congratulations! You've advanced to ${response.data.data.newLevel}!`
          }));
        }
      } else {
        throw new Error(response.data.message || 'Failed to complete module');
      }
    } catch (error) {
      console.error("Failed to mark module complete:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to mark module as complete. Please try again.";
      toast.error(errorMessage);
    } finally {
      setUiState(prev => ({ ...prev, processingAction: null }));
    }
  }, [batch?.course, uiState.processingAction, refresh]);

  // Auto-complete module when all lessons and assessments are complete
  const isModuleReadyToComplete = useCallback((module) => {
    const moduleId = getModuleId(module);

    const moduleLessons = lessonsByModule[moduleId] || [];
    const completedLessonsInModule = moduleLessons.filter(lesson => isLessonCompleted(lesson)).length;
    const allLessonsComplete = moduleLessons.length > 0 && completedLessonsInModule === moduleLessons.length;

    const moduleAssignmentsList = assignmentsByModule[moduleId] || [];
    const allAssignmentsComplete = moduleAssignmentsList.length === 0 || moduleAssignmentsList.every(a => {
      const aid = getAssignmentId(a);
      return aid && submissionsByAssignment[String(aid)];
    });

    const moduleQuizzesList = quizzesByModule[moduleId] || [];
    const allQuizzesComplete = moduleQuizzesList.length === 0 || moduleQuizzesList.every(q => {
      const qid = q._id || q.id;
      const quizAttempts = attemptsByQuiz[String(qid)] || [];
      if (quizAttempts.length === 0) return false;
      const bestAttempt = quizAttempts.reduce((best, current) => {
        return (current.score > best.score) ? current : best;
      }, quizAttempts[0]);
      const passingScore = q.passingScore || 70;
      return bestAttempt.score >= passingScore;
    });

    return allLessonsComplete && allAssignmentsComplete && allQuizzesComplete;
  }, [lessonsByModule, assignmentsByModule, submissionsByAssignment, quizzesByModule, attemptsByQuiz, isLessonCompleted]);

  useEffect(() => {
    if (!modules || modules.length === 0) return;
    if (uiState.processingAction) return;

    const index = getCurrentModuleIndex();
    if (index >= modules.length) return;

    const module = modules[index];
    if (!isModuleCompleted(module) && isModuleReadyToComplete(module)) {
      handleMarkModuleComplete(module);
    }
  }, [
    modules,
    uiState.processingAction,
    getCurrentModuleIndex,
    isModuleCompleted,
    isModuleReadyToComplete,
    handleMarkModuleComplete
  ]);

  // Load current module content
  useEffect(() => {
    const currentModule = getCurrentModuleIndex();
    if (currentModule < modules.length) {
      const module = modules[currentModule];
      loadModuleContent(getModuleId(module), batch?.course?._id || batch?.course?.id);
    }
  }, [modules, batch?.course]);

  // Auto-refresh when page becomes visible/focused to sync completion state and attempts/submissions
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, refresh course data and queries
        refresh();
        if (typeof refetchSubmissions === 'function') refetchSubmissions();
        if (typeof refetchAttempts === 'function') refetchAttempts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh when window gets focus (user returns from quiz/assignment pages)
    const handleFocus = () => {
      refresh();
      if (typeof refetchSubmissions === 'function') refetchSubmissions();
      if (typeof refetchAttempts === 'function') refetchAttempts();
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refresh, refetchSubmissions, refetchAttempts]);

  // Load course-level content when all modules are completed
  useEffect(() => {
    const modulesDone = modules.length > 0 && getCompletedModulesCount() >= modules.length;
    const courseId = batch?.course?._id || batch?.course?.id;
    if (modulesDone && courseId && !courseContentLoaded && !courseContentLoading) {
      loadCourseContent(courseId);
    }
  }, [modules, completedModuleIds, batch?.course, courseContentLoaded, courseContentLoading, loadCourseContent, getCompletedModulesCount]);

  // Loading state
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

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // No batch state
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

  const completedCount = getCompletedModulesCount();
  const progress = calculateProgress();
  const currentModuleIndex = getCurrentModuleIndex();
  const currentModule = currentModuleIndex < modules.length ? modules[currentModuleIndex] : null;
  const currentStage = currentModule ? getCurrentStage(currentModuleIndex) : 'complete';

  return (
    <div className="space-y-6">
      {/* Level Upgrade Message */}
      {uiState.levelUpgradeMessage && (
        <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <Trophy className="h-5 w-5 text-green-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-green-800 font-medium">
              🎉 {uiState.levelUpgradeMessage}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setUiState(prev => ({ ...prev, levelUpgradeMessage: null }))}
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
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refresh}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Badge 
                variant="outline" 
                className={`text-sm px-3 py-1 ${STATUS_CONFIG[batch.status]?.color || 'bg-gray-100 text-gray-800'}`}
              >
                {STATUS_CONFIG[batch.status]?.name || batch.status}
              </Badge>
            </div>
          </div>
          
          {/* Progress Section */}
          <div className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <span className="text-sm font-medium">Course Progress</span>
              <span className="text-sm text-muted-foreground">
                {completedCount} of {modules.length} modules completed
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

      {/* Completion Banner */}
      {allModulesCompleted && (
        <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <Trophy className="h-5 w-5 text-green-600" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-green-800 font-medium text-lg">
                  🎉 Congratulations! You've completed the entire course!
                </span>
                <p className="text-green-700 mt-1">
                  You have successfully finished all modules. Great work on your learning journey!
                </p>
              </div>
              <Badge className="bg-green-600 text-white">
                Course Complete
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Course-Level Assessments Section */}
      {allModulesCompleted && courseContentLoaded && (courseQuizzes.length > 0 || courseAssignments.length > 0) && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-600" />
              Course Final Assessments
              <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-800">
                {courseQuizzes.length + courseAssignments.length} assessments
              </Badge>
            </CardTitle>
            <CardDescription>
              🎯 Congratulations on completing all modules! You can now access the final course assessments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Course Quizzes */}
              {courseQuizzes.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-purple-800">
                    <Award className="h-5 w-5" />
                    Final Course Quizzes ({courseQuizzes.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {courseQuizzes.map((quiz, index) => (
                      <Card key={index} className="border-purple-200 hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-purple-600" />
                            {quiz.title || 'Final Course Quiz'}
                            <Badge className="bg-purple-600 text-white text-xs">
                              COURSE LEVEL
                            </Badge>
                          </CardTitle>
                          {quiz.description && (
                            <CardDescription className="text-sm">
                              {quiz.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              Questions: {quiz.questions?.length || 0}
                            </div>
                            <div className="flex items-center gap-1">
                              <BarChart3 className="h-4 w-4 text-muted-foreground" />
                              Passing: {quiz.passingScore || 70}%
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              Time: {quiz.timeLimit || 60} min
                            </div>
                            <div className="flex items-center gap-1">
                              <RefreshCw className="h-4 w-4 text-muted-foreground" />
                              Attempts: {quiz.attemptsAllowed || 1}
                            </div>
                          </div>
                          <Button 
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            onClick={() => handleStartQuiz(quiz)}
                            size="lg"
                          >
                            <Trophy className="h-4 w-4 mr-2" />
                            Start Final Quiz
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Course Assignments */}
              {courseAssignments.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2 text-purple-800">
                    <FileText className="h-5 w-5" />
                    Final Course Assignments ({courseAssignments.length})
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {courseAssignments.map((assignment, index) => (
                      <Card key={index} className="border-purple-200 hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-purple-600" />
                            {assignment.title || 'Final Course Assignment'}
                            <Badge className="bg-purple-600 text-white text-xs">
                              COURSE LEVEL
                            </Badge>
                          </CardTitle>
                          {assignment.description && (
                            <CardDescription className="text-sm">
                              {assignment.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              Due: {assignment.dueDate 
                                ? new Date(assignment.dueDate).toLocaleDateString() 
                                : 'No deadline'
                              }
                            </div>
                            <div className="flex items-center gap-1">
                              <Award className="h-4 w-4 text-muted-foreground" />
                              Max Score: {assignment.maxScore || 100} points
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" className="flex-1">
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                            <Button className="flex-1 bg-purple-600 hover:bg-purple-700">
                              <FileText className="h-4 w-4 mr-2" />
                              Submit Work
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
            📚 Complete modules in strict sequence to unlock the next content. You must finish all lessons (and assessments if any) in a module before proceeding to the next one.
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
              const moduleId = getModuleId(module);
              const isCompleted = isModuleCompleted(module);
              const isAccessible = isModuleAccessible(index);
              const isCurrent = isAccessible && !isCompleted;
              const isLocked = !isAccessible;
              const isActive = uiState.activeModule && 
                String(getModuleId(uiState.activeModule)) === String(moduleId);
              
              // Check if module is level-locked specifically
              const isLevelLocked = levelLockEnabled && lockedLevel && module.level && 
                parseInt(module.level.replace('L', '')) > parseInt(currentLevel.replace('L', ''));
              
              const moduleLessons = lessonsByModule[moduleId] || [];
              const completedLessonsInModule = moduleLessons.filter(lesson => 
                isLessonCompleted(lesson)
              ).length;

              return (
                <ModuleAssessmentProvider
                  key={moduleId || index}
                  moduleId={moduleId}
                  courseId={batch?.course?._id || batch?.course?.id}
                  onAssessmentsLoaded={handleModuleAssessmentsLoaded}
                >
                  <div
                    className={`group relative p-6 rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                      isCompleted
                        ? "bg-gradient-to-br from-green-50 to-green-100 border-green-300 shadow-sm"
                        : isCurrent
                        ? "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 shadow-md ring-2 ring-blue-200"
                        : isLocked
                        ? "bg-gray-50 border-gray-200 opacity-60"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                  >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Module Number/Status Indicator */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          isCompleted
                            ? "bg-green-100 text-green-700"
                            : isCurrent
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        {index < modules.length - 1 && (
                          <div className={`w-0.5 h-8 mt-1 ${
                            isCompleted ? "bg-green-200" : "bg-gray-200"
                          }`} />
                        )}
                      </div>

                      {/* Module Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-semibold ${
                            isCompleted ? "text-green-800" : 
                            isCurrent ? "text-blue-800" : 
                            "text-gray-700"
                          }`}>
                            {module.title || `Module ${index + 1}`}
                          </h3>
                          
                          {/* Module level badge */}
                          {module.level && (
                            <div className="flex items-center gap-1">
                              {getLevelBadge(module.level)}
                            </div>
                          )}
                          
                          {isCurrent && (
                            <Badge variant="default" className="text-xs">
                              Current
                            </Badge>
                          )}
                          {isCompleted && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                              Completed
                            </Badge>
                          )}
                          {isLevelLocked && (
                            <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                              <Lock className="h-3 w-3 mr-1" />
                              Level Locked
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {module.description || "No description available"}
                        </p>

                        {/* Module Meta */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {completedLessonsInModule} of {moduleLessons.length} lessons
                          </span>
                          {module.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {module.duration}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleModuleClick(module, index)}
                        disabled={isLocked || loadingStates[moduleId]}
                        className={`${
                          isCompleted 
                            ? "bg-green-100 text-green-700 hover:bg-green-200" 
                            : isCurrent 
                            ? "shadow-md" 
                            : ""
                        }`}
                      >
                        {loadingStates[moduleId] ? (
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                        ) : isCurrent ? (
                          <PlayCircle className="h-4 w-4 mr-1" />
                        ) : (
                          <Lock className="h-4 w-4 mr-1" />
                        )}
                        {isCompleted ? "Review" : 
                         isCurrent ? (isActive ? "Hide" : "Start") : 
                         isLevelLocked ? `Need ${module.level}` :
                         "Locked"}
                        <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${
                          isActive ? 'rotate-90' : ''
                        }`} />
                      </Button>
                    </div>
                  </div>

                  {/* Module Content Panel */}
                  {isActive && (
                    <div className="mt-4 rounded-md border bg-white">
                      <Tabs value={uiState.activeTab} onValueChange={(tab) => 
                        setUiState(prev => ({ ...prev, activeTab: tab }))
                      }>
                        <div className="border-b">
                          <TabsList className="grid w-full grid-cols-2 rounded-none bg-transparent h-auto p-0">
                            <TabsTrigger value="lessons" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3">
                              <BookOpen className="h-4 w-4 mr-2" />
                              Lessons ({moduleLessons.length})
                            </TabsTrigger>
                            <TabsTrigger value="assessments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent py-3">
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Assessments ({(quizzesByModule[moduleId]?.length || 0) + (assignmentsByModule[moduleId]?.length || 0)})
                            </TabsTrigger>
                          </TabsList>
                        </div>

                        {/* Lessons Tab */}
                        <TabsContent value="lessons" className="p-4">
                          <div className="space-y-3">
                            {moduleLessons.length === 0 ? (
                              <div className="text-center py-8">
                                <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  No lessons found for this module.
                                </p>
                              </div>
                            ) : (
                              moduleLessons.map((lesson, lessonIndex) => {
                                const isLessonDone = isLessonCompleted(lesson);
                                const currentLessonIndex = moduleLessons.findIndex(l => 
                                  !isLessonCompleted(l)
                                );
                                // Enforce strictly sequential lesson progression
                                // A lesson is locked if it is not yet completed AND
                                // it is not the immediate next lesson to complete.
                                // Completed lessons should remain accessible for review.
                                const isLessonLocked = !isLessonDone &&
                                  currentLessonIndex !== -1 &&
                                  lessonIndex !== currentLessonIndex;

                                return (
                                  <div 
                                    key={getLessonId(lesson) || lessonIndex} 
                                    className={`flex items-start justify-between rounded-lg border p-4 ${
                                      isLessonLocked 
                                        ? 'opacity-60 bg-gray-50' 
                                        : isLessonDone 
                                        ? 'bg-green-50 border-green-200' 
                                        : 'hover:bg-blue-50 border-blue-200 ring-2 ring-blue-100'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3 flex-1">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                                        isLessonDone 
                                          ? "bg-green-100 text-green-700" 
                                          : isLessonLocked 
                                          ? "bg-gray-100 text-gray-500" 
                                          : "bg-blue-100 text-blue-600"
                                      }`}>
                                        {isLessonDone ? (
                                          <CheckCircle2 className="h-4 w-4" />
                                        ) : isLessonLocked ? (
                                          <Lock className="h-4 w-4" />
                                        ) : (
                                          lessonIndex + 1
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h4 className="text-sm font-semibold">
                                            {lesson.title || `Lesson ${lessonIndex + 1}`}
                                          </h4>
                                          {isLessonDone && (
                                            <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                                              Completed
                                            </Badge>
                                          )}
                                        </div>
                                        {lesson.description && (
                                          <p className="text-xs text-muted-foreground mb-2">
                                            {lesson.description}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="text-xs">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {lesson.duration || "5 min"}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-3">
                                      {!isLessonLocked && (
                                        <Button
                                          size="sm"
                                          onClick={() => navigate(`/student/lesson/${getLessonId(lesson)}`)}
                                          className={isLessonDone ? 
                                            "bg-green-100 text-green-700 hover:bg-green-200" : 
                                            "bg-blue-600 hover:bg-blue-700 text-white"
                                          }
                                        >
                                          {isLessonDone ? (
                                            <>
                                              <Eye className="h-3 w-3 mr-1" />
                                              Review
                                            </>
                                          ) : (
                                            <>
                                              <PlayCircle className="h-3 w-3 mr-1" />
                                              Start Lesson
                                            </>
                                          )}
                                        </Button>
                                      )}
                                      {isLessonLocked && (
                                        <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                                          <Lock className="h-3 w-3 mr-1" />
                                          Locked
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                            
                            {/* Module Complete Button */}
                            {(() => {
                              const moduleAssignments = assignmentsByModule[moduleId] || [];
                              const moduleQuizzes = quizzesByModule[moduleId] || [];
                              const allLessonsComplete = completedLessonsInModule === moduleLessons.length && moduleLessons.length > 0;
                              const totalAssessments = moduleQuizzes.length + moduleAssignments.length;
                              
                              // Check if all assignments in this module are submitted
                              const allAssignmentsComplete = moduleAssignments.length === 0 || moduleAssignments.every(a => {
                                const aid = getAssignmentId(a);
                                return aid && submissionsByAssignment[String(aid)];
                              });
                              
                              // Check if all quizzes in this module are completed (passed)
                              const allQuizzesComplete = moduleQuizzes.length === 0 || moduleQuizzes.every(q => {
                                const qid = q._id || q.id;
                                const quizAttempts = attemptsByQuiz[String(qid)] || [];
                                if (quizAttempts.length === 0) return false;
                                
                                // Check if passed (best score >= passing score)
                                const bestAttempt = quizAttempts.reduce((best, current) => {
                                  return (current.score > best.score) ? current : best;
                                }, quizAttempts[0]);
                                
                                const passingScore = q.passingScore || 70;
                                return bestAttempt.score >= passingScore;
                              });
                              
                              const allAssessmentsComplete = allAssignmentsComplete && allQuizzesComplete;
                              const canCompleteModule = allLessonsComplete && allAssessmentsComplete;
                              
                              if (!isCompleted && isAccessible && allLessonsComplete) {
                                return (
                                  <div className="pt-4 border-t mt-4">
                                    {totalAssessments > 0 ? (
                                      allAssessmentsComplete ? (
                                        <div>
                                          <Button 
                                            onClick={() => handleMarkModuleComplete(module)} 
                                            className="w-full bg-green-600 hover:bg-green-700"
                                            size="lg"
                                            disabled={uiState.processingAction === `module-${moduleId}`}
                                          >
                                            {uiState.processingAction === `module-${moduleId}` ? (
                                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                              <Trophy className="h-4 w-4 mr-2" />
                                            )}
                                            Complete Module
                                          </Button>
                                          <p className="text-xs text-muted-foreground text-center mt-2">
                                            🎉 All lessons and assessments completed!
                                          </p>
                                        </div>
                                      ) : (
                                        <div className="text-center">
                                          <p className="text-sm text-muted-foreground mb-4">
                                            📚 All lessons completed! Now complete the assessments in the "Assessments" tab to finish this module.
                                          </p>
                                          <Button 
                                            onClick={() => setUiState(prev => ({ ...prev, activeTab: "assessments" }))}
                                            variant="outline" 
                                            className="w-full"
                                            size="lg"
                                          >
                                            <BarChart3 className="h-4 w-4 mr-2" />
                                            Go to Assessments
                                          </Button>
                                          <div className="mt-3 text-xs text-muted-foreground">
                                            <p>Progress: {moduleAssignments.filter(a => {
                                              const aid = getAssignmentId(a);
                                              return aid && submissionsByAssignment[String(aid)];
                                            }).length} of {moduleAssignments.length} assignments submitted</p>
                                          </div>
                                        </div>
                                      )
                                    ) : (
                                      <div>
                                        <Button 
                                          onClick={() => handleMarkModuleComplete(module)} 
                                          className="w-full bg-green-600 hover:bg-green-700"
                                          size="lg"
                                          disabled={uiState.processingAction === `module-${moduleId}`}
                                        >
                                          {uiState.processingAction === `module-${moduleId}` ? (
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                          ) : (
                                            <Trophy className="h-4 w-4 mr-2" />
                                          )}
                                          Complete Module
                                        </Button>
                                        <p className="text-xs text-muted-foreground text-center mt-2">
                                          🎉 All lessons completed! No assessments required for this module.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </TabsContent>


                        {/* Assessments Tab */}
                        <TabsContent value="assessments" className="p-4">
                          <div className="space-y-4">
                            {/* Assessment access control */}
                            {moduleLessons.length > 0 && (
                              <div className={`rounded-lg p-4 mb-4 ${
                                completedLessonsInModule === moduleLessons.length
                                  ? 'bg-green-50 border border-green-200'
                                  : 'bg-amber-50 border border-amber-200'
                              }`}>
                                <div className="flex items-start gap-3">
                                  {completedLessonsInModule === moduleLessons.length ? (
                                    <Trophy className="h-5 w-5 text-green-600 mt-0.5" />
                                  ) : (
                                    <Lock className="h-5 w-5 text-amber-600 mt-0.5" />
                                  )}
                                  <div>
                                    <h4 className={`font-semibold mb-1 ${
                                      completedLessonsInModule === moduleLessons.length
                                        ? 'text-green-800'
                                        : 'text-amber-800'
                                    }`}>
                                      {completedLessonsInModule === moduleLessons.length
                                        ? '🎉 Assessments Unlocked!'
                                        : '🔒 Complete All Lessons First'
                                      }
                                    </h4>
                                    <p className={`text-sm ${
                                      completedLessonsInModule === moduleLessons.length
                                        ? 'text-green-700'
                                        : 'text-amber-700'
                                    }`}>
                                      {completedLessonsInModule === moduleLessons.length
                                        ? 'Great job completing all lessons! You can now access the assessments below. Complete all assessments to finish this module.'
                                        : `You need to complete all ${moduleLessons.length} lessons in this module before you can access assessments. Progress: ${completedLessonsInModule} of ${moduleLessons.length} lessons completed.`
                                      }
                                    </p>
                                    {completedLessonsInModule < moduleLessons.length && (
                                      <div className="mt-3">
                                        <div className="w-full bg-amber-200 rounded-full h-2">
                                          <div 
                                            className="bg-amber-600 h-2 rounded-full transition-all duration-500" 
                                            style={{ 
                                              width: `${moduleLessons.length > 0 ? (completedLessonsInModule / moduleLessons.length) * 100 : 0}%` 
                                            }}
                                          ></div>
                                        </div>
                                        <p className="text-xs text-amber-600 mt-1">
                                          {Math.round((completedLessonsInModule / moduleLessons.length) * 100)}% complete
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Module Quizzes Component */}
                            <StudentModuleQuizzes 
                              quizzes={quizzesByModule[moduleId] || []}
                              attempts={attemptsByQuiz}
                              isUnlocked={completedLessonsInModule === moduleLessons.length && moduleLessons.length > 0}
                              onStart={handleStartQuiz}
                            />
                            
                            {/* Module Assignments Component */}
                            <StudentModuleAssignments 
                              assignments={assignmentsByModule[moduleId] || []}
                              submissions={submissionsByAssignment}
                              isUnlocked={completedLessonsInModule === moduleLessons.length && moduleLessons.length > 0}
                              onViewDetails={handleAssignmentViewDetails}
                              onSubmit={handleAssignmentSubmit}
                            />

                            {/* No Assessments */}
                            {(!quizzesByModule[moduleId] || quizzesByModule[moduleId].length === 0) &&
                             (!assignmentsByModule[moduleId] || assignmentsByModule[moduleId].length === 0) && (
                              <div className="text-center py-8">
                                <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  No assessments available for this module.
                                </p>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}

                  {/* Module Resources Component */}
                  <div className="mt-4">
                    <StudentModuleResources 
                      moduleId={moduleId}
                      resources={resourcesByModule[moduleId] || []}
                      isModuleCompleted={isCompleted}
                      completedLessons={completedLessonsInModule}
                      totalLessons={moduleLessons.length}
                    />
                  </div>
                </div>
              </ModuleAssessmentProvider>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Course Resources Component */}
      <StudentCourseResources 
        resources={courseResources}
        courseTitle={batch?.course?.title || batch?.course?.name}
      />
      
      {/* Assignment Modals */}
      <AssignmentDetailsModal 
        assignment={assignmentModals.detailsModal.assignment}
        submission={assignmentModals.detailsModal.submission}
        isOpen={assignmentModals.detailsModal.isOpen}
        onClose={handleCloseDetailsModal}
        onSubmit={handleShowSubmissionFromDetails}
      />
      
      <AssignmentSubmissionModal 
        assignment={assignmentModals.submissionModal.assignment}
        submission={assignmentModals.submissionModal.submission}
        isOpen={assignmentModals.submissionModal.isOpen}
        onClose={handleCloseSubmissionModal}
        onSuccess={handleSubmissionSuccess}
      />
    </div>
  );
};

export default BatchCourse;
