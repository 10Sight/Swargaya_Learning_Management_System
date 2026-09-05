import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  Lock,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Lightbulb,
  ChevronDown,
  ChevronUp,
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
  ACTIVE: { name: "Active", color: "bg-slate-100 text-slate-700" },
  UPCOMING: { name: "Upcoming", color: "bg-slate-100 text-slate-700" },
  COMPLETED: { name: "Completed", color: "bg-slate-100 text-slate-500" },
  PAUSED: { name: "Paused", color: "bg-slate-100 text-slate-500" },
};

// Hook for managing course data
const useCourseData = (courseId) => {
  const [state, setState] = useState({
    department: null,
    modules: [],
    currentLevel: "L1",
    availableCourses: [],
    activeLevel: "L1",
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

      // Get department course content, optionally for a specific course/level
      const url = courseId
        ? `/api/departments/me/course-content?courseId=${encodeURIComponent(courseId)}`
        : "/api/departments/me/course-content";
      const response = await axiosInstance.get(url);
      const courseData = response?.data?.data;

      if (!courseData) {
        throw new Error("No course data available");
      }

      // The API now returns the course object directly
      const department = {
        course: courseData,
        status: 'ACTIVE' // Default status since we're viewing content
      };

      const modules = courseData.modules || [];
      const progress = courseData.progress || {};

      // Extract completed IDs from the nested structure
      const completedModuleIds = progress.completedModules
        ? progress.completedModules.map(module => String(module.moduleId || module._id || module))
        : [];

      const completedLessonIds = progress.completedLessons
        ? progress.completedLessons.map(lesson => String(lesson.lessonId || lesson._id || lesson))
        : [];


      setState({
        department,
        modules: modules.sort((a, b) => (a.order || 0) - (b.order || 0)),
        currentLevel: progress.currentLevel || "L1",
        levelLockEnabled: progress.levelLockEnabled || false,
        lockedLevel: progress.lockedLevel || null,
        availableCourses: courseData.availableCourses || [],
        activeLevel: courseData.activeLevel || "L1",
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
  }, [courseId]);

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
  } = useGetQuizzesByCourseQuery(courseId, {
    skip: !courseId || !allModulesCompleted,
  });

  const {
    data: courseAssignmentsData,
    isLoading: courseAssignmentsLoading,
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
    loadCourseContent: () => { }, // No longer needed with RTK Query
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

  // Refs to prevent duplicate network calls across re-renders
  const loadingModulesRef = useRef(new Set());
  const loadedModulesRef = useRef(new Set());

  // Store moduleId and courseId for RTK Query hooks
  const [currentModules, setCurrentModules] = useState({});

  const loadModuleContent = useCallback(async (moduleId, courseId, existingLessons = null) => {
    // Guard against undefined/invalid moduleId
    if (!moduleId) {
      console.warn("DepartmentCourse - Skipping loadModuleContent: missing moduleId", { moduleId, courseId });
      return;
    }

    const key = String(moduleId);
    if (loadedModulesRef.current.has(key) || loadingModulesRef.current.has(key)) {
      return;
    }

    loadingModulesRef.current.add(key);

    // Add to current modules for RTK Query
    setCurrentModules(prev => ({ ...prev, [key]: { moduleId, courseId } }));

    setState(prev => ({
      ...prev,
      loadingStates: { ...prev.loadingStates, [key]: true }
    }));

    try {
      // Load resources (always fetch resources as they might not be in courseData)
      const resourcesPromise = axiosInstance.get(`/api/resources/module/${moduleId}`);

      // Use existing lessons if provided, else fetch
      const lessonsPromise = (existingLessons && existingLessons.length > 0)
        ? Promise.resolve({ data: { data: existingLessons } })
        : axiosInstance.get(`/api/modules/${moduleId}/lessons`);

      const [lessonsRes, resourcesRes] = await Promise.allSettled([
        lessonsPromise,
        resourcesPromise,
      ]);

      if (resourcesRes.status === 'rejected') {
        console.error(`DepartmentCourse - Resources fetch failed for moduleId ${moduleId}:`, resourcesRes.reason);
      }

      const lessons = lessonsRes.status === 'fulfilled'
        ? (lessonsRes.value?.data?.data || []).sort((a, b) => (a.order || 0) - (b.order || 0))
        : [];

      const resources = resourcesRes.status === 'fulfilled'
        ? resourcesRes.value?.data?.data || []
        : [];

      setState(prev => ({
        ...prev,
        lessonsByModule: { ...prev.lessonsByModule, [key]: lessons },
        resourcesByModule: { ...prev.resourcesByModule, [key]: resources },
        loadingStates: { ...prev.loadingStates, [key]: false },
        loadedModules: new Set([...prev.loadedModules, key])
      }));
      loadedModulesRef.current.add(key);
    } catch (error) {
      console.error(`Error loading module ${moduleId} content:`, error);
      setState(prev => ({
        ...prev,
        lessonsByModule: { ...prev.lessonsByModule, [key]: [] },
        resourcesByModule: { ...prev.resourcesByModule, [key]: [] },
        loadingStates: { ...prev.loadingStates, [key]: false }
      }));
    } finally {
      loadingModulesRef.current.delete(key);
    }
    // Intentionally leave deps empty to keep a stable function identity.
  }, []);

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
  } = useGetQuizzesByModuleQuery(moduleId, {
    skip: !courseId || !moduleId,
  });

  const {
    data: moduleAssignmentsData,
    isLoading: moduleAssignmentsLoading,
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
const DepartmentCourse = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCourseId = searchParams.get('courseId') || null;

  const {
    department,
    modules,
    currentLevel,
    levelLockEnabled,
    lockedLevel,
    availableCourses,
    activeLevel,
    completedModuleIds,
    completedLessonIds,
    loading,
    error,
    refreshing,
    refresh
  } = useCourseData(selectedCourseId);



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
  } = useGetResourcesByCourseQuery(department?.course?._id || department?.course?.id, {
    skip: !department?.course?._id && !department?.course?.id,
  });

  const courseResources = courseResourcesData?.data || [];

  const allModulesCompleted = modules.length > 0 && modules.every(m =>
    completedModuleIds.includes(String(m?._id || m?.id))
  );

  const {
    courseQuizzes,
    courseAssignments,
    loaded: courseContentLoaded,
  } = useCourseContent(department?.course?._id || department?.course?.id, allModulesCompleted);

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

  // Track extra attempt approvals/rejections in-session to reflect UI instantly
  const [extraGrantedQuizIds, setExtraGrantedQuizIds] = useState(new Set());
  const [rejectedQuizIds, setRejectedQuizIds] = useState(new Set());

  useEffect(() => {
    const handler = (e) => {
      const { quizId, status } = e.detail || {};
      if (!quizId) return;
      if (status === 'APPROVED') {
        setExtraGrantedQuizIds(prev => new Set(prev).add(String(quizId)));
        // refresh attempts & progress so UI updates naturally
        if (typeof refetchAttempts === 'function') refetchAttempts();
        refresh();
      } else if (status === 'REJECTED') {
        setRejectedQuizIds(prev => new Set(prev).add(String(quizId)));
        if (typeof refetchAttempts === 'function') refetchAttempts();
        refresh();
      }
    };
    window.addEventListener('attempt-extension-updated', handler);
    return () => window.removeEventListener('attempt-extension-updated', handler);
  }, [refetchAttempts, refresh]);

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

  const [descExpanded, setDescExpanded] = useState(false);

  // Assignment modal states
  const [assignmentModals, setAssignmentModals] = useState({
    detailsModal: { isOpen: false, assignment: null, submission: null },
    submissionModal: { isOpen: false, assignment: null, submission: null }
  });

  // Helper functions
  const getModuleId = (m) => m?._id || m?.id;
  const getLessonId = (l) => l?._id || l?.id;
  const getAssignmentId = (a) => a?._id || a?.id;

  // Carries the active course id along so LessonDetail resolves the lesson against the
  // same course/level the student is currently viewing, rather than defaulting back to
  // whichever course matches their overall current level.
  const getLessonNavPath = (lesson) => {
    const activeCourseId = department?.course?._id || department?.course?.id;
    const lessonId = getLessonId(lesson);
    return activeCourseId ? `/student/lesson/${lessonId}?courseId=${activeCourseId}` : `/student/lesson/${lessonId}`;
  };

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
    const raw = typeof level === "string" ? level : (level != null ? `L${level}` : "L1");

    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-medium text-xs px-2 py-0.5">
        {raw}
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
    console.log('🔍 handleAssignmentSubmit called with:', { assignment, submission });
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

    // Always select the module in the workspace pane; re-clicking the active
    // module just re-loads its content instead of hiding the panel.
    setUiState(prev => ({ ...prev, activeModule: module, activeTab: 'lessons' }));
    if (!isCurrentlyActive) {
      loadModuleContent(moduleId, department?.course?._id || department?.course?.id, module.lessons);
    }
  };

  const handleShowDashboard = () => {
    setUiState(prev => ({ ...prev, activeModule: null, activeTab: 'lessons' }));
  };

  const handleSelectCourse = (courseId) => {
    if (!courseId) return;
    const activeCourseId = department?.course?._id || department?.course?.id;
    if (String(courseId) === String(activeCourseId)) return;
    setSearchParams({ courseId: String(courseId) });
  };

  const handleMarkModuleComplete = useCallback(async (module) => {
    if (!department?.course || uiState.processingAction) return;

    const courseId = department.course._id || department.course.id;
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
  }, [department?.course, uiState.processingAction, refresh]);

  // Auto-complete module when all lessons and assessments are complete
  const isModuleReadyToComplete = useCallback((module) => {
    const moduleId = getModuleId(module);

    const moduleLessons = lessonsByModule[moduleId] || [];
    const completedLessonsInModule = moduleLessons.filter(lesson => isLessonCompleted(lesson)).length;
    const allLessonsComplete = (moduleLessons.length === 0) || (completedLessonsInModule === moduleLessons.length);

    const moduleAssignmentsList = assignmentsByModule[moduleId] || [];
    const allAssignmentsComplete = moduleAssignmentsList.length === 0 || moduleAssignmentsList.every(a => {
      const aid = getAssignmentId(a);
      return aid && submissionsByAssignment[String(aid)];
    });

    const moduleQuizzesList = quizzesByModule[moduleId] || [];
    // When lessons exist: require passing quizzes; when no lessons: require at least one attempt per quiz
    const allQuizzesPassed = moduleQuizzesList.length === 0 || moduleQuizzesList.every(q => {
      const qid = q._id || q.id;
      const quizAttempts = attemptsByQuiz[String(qid)] || [];
      if (quizAttempts.length === 0) return false;
      const bestAttempt = quizAttempts.reduce((best, current) => (current.score > best.score ? current : best), quizAttempts[0]);
      const passingScore = q.passingScore || 70;
      return bestAttempt.score >= passingScore;
    });

    const hasLessons = moduleLessons.length > 0;
    const hasAssessments = (moduleAssignmentsList.length + moduleQuizzesList.length) > 0;

    // If no lessons and no assessments at all, consider module ready to complete automatically
    if (!hasLessons && !hasAssessments) return true;

    // New rule: if there are quizzes, student must PASS (at least once) for each quiz regardless of lessons presence
    const allAssessmentsComplete = allAssignmentsComplete && allQuizzesPassed;

    return allLessonsComplete && allAssessmentsComplete;
  }, [lessonsByModule, assignmentsByModule, submissionsByAssignment, quizzesByModule, attemptsByQuiz, isLessonCompleted, getAssignmentId, getModuleId]);

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

  // Load current module content only once per module
  const lastRequestedModuleRef = useRef(null);
  useEffect(() => {
    if (!modules || modules.length === 0) return;

    const currentModule = getCurrentModuleIndex();
    if (currentModule < 0 || currentModule >= modules.length) return;

    const module = modules[currentModule];
    const moduleId = getModuleId(module);
    if (!moduleId) return;

    if (lastRequestedModuleRef.current !== String(moduleId)) {
      lastRequestedModuleRef.current = String(moduleId);
      loadModuleContent(moduleId, department?.course?._id || department?.course?.id, module.lessons);
    }
  }, [modules, department?.course, getCurrentModuleIndex]);

  // Auto-select the current (first incomplete) module in the workspace pane on
  // initial load, so students land directly on their active module instead of
  // an empty state. Only runs once; users can return to the dashboard manually.
  const autoSelectDoneRef = useRef(false);
  useEffect(() => {
    if (autoSelectDoneRef.current) return;
    if (!modules || modules.length === 0) return;

    const allCompleted = modules.every(m => isModuleCompleted(m));
    if (allCompleted) {
      // Land on the dashboard/completion view instead of the last module.
      autoSelectDoneRef.current = true;
      return;
    }

    const index = getCurrentModuleIndex();
    if (index < 0 || index >= modules.length) return;

    autoSelectDoneRef.current = true;
    const module = modules[index];
    setUiState(prev => ({ ...prev, activeModule: module, activeTab: 'lessons' }));
  }, [modules, isModuleCompleted, getCurrentModuleIndex]);

  // Reset per-course UI/navigation state whenever the student switches to a different
  // course/level so the workspace pane and auto-select logic re-run for the new course.
  useEffect(() => {
    autoSelectDoneRef.current = false;
    lastRequestedModuleRef.current = null;
    setUiState(prev => ({ ...prev, activeModule: null, activeTab: 'lessons' }));
  }, [selectedCourseId]);

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

  // Load course-level content is handled automatically by RTK Query in useCourseContent hook
  // when allModulesCompleted becomes true. No manual effect needed.

  // Loading state with responsive design optimized for 320px
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] px-0 py-2 xs:px-4 xs:py-4 sm:px-6 sm:py-6">
        <div className="w-full max-w-[300px] sm:max-w-7xl mx-auto space-y-3 xs:space-y-4 sm:space-y-6">
          {/* Header Skeleton */}
          <Card className="overflow-hidden">
            <CardHeader className="space-y-3 xs:space-y-4 p-3 xs:p-4 sm:p-6">
              <div className="flex flex-col gap-3 xs:gap-4">
                <div className="space-y-2 xs:space-y-3">
                  <Skeleton className="h-5 xs:h-6 sm:h-7 w-full max-w-48 xs:max-w-64" />
                  <Skeleton className="h-3 xs:h-4 w-full max-w-32 xs:max-w-48" />
                </div>
                <div className="flex flex-col xs:flex-row gap-2">
                  <Skeleton className="h-7 xs:h-8 w-16 xs:w-20" />
                  <Skeleton className="h-7 xs:h-8 w-14 xs:w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-2 xs:h-3 w-full" />
                <Skeleton className="h-3 xs:h-4 w-20 xs:w-24" />
              </div>
            </CardHeader>
          </Card>

          {/* Module Cards Skeleton */}
          <Card>
            <CardHeader className="p-3 xs:p-4 sm:p-6">
              <Skeleton className="h-4 xs:h-5 sm:h-6 w-28 xs:w-32 sm:w-40" />
              <Skeleton className="h-3 xs:h-4 w-40 xs:w-48 sm:w-60" />
            </CardHeader>
            <CardContent className="space-y-2 xs:space-y-3 sm:space-y-4 p-3 xs:p-4 sm:p-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-2 xs:p-4 sm:p-6 border rounded-lg space-y-3 xs:space-y-4">
                  <div className="flex flex-col gap-3 xs:gap-4">
                    <div className="flex items-start gap-2 xs:gap-3 flex-1">
                      <Skeleton className="h-6 w-6 xs:h-8 xs:w-8 rounded-full shrink-0" />
                      <div className="space-y-1 xs:space-y-2 flex-1 min-w-0">
                        <div className="flex flex-col gap-1 xs:gap-2">
                          <Skeleton className="h-3 xs:h-4 w-full max-w-32 xs:max-w-48" />
                          <Skeleton className="h-4 xs:h-5 w-10 xs:w-12" />
                        </div>
                        <Skeleton className="h-2 xs:h-3 w-full max-w-40 xs:max-w-64" />
                        <Skeleton className="h-2 xs:h-3 w-16 xs:w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-7 xs:h-8 sm:h-9 w-full xs:w-20 xs:self-end" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state with responsive design optimized for 320px
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] flex items-center justify-center px-0 py-2 xs:px-4">
        <div className="w-full max-w-[300px] sm:max-w-md">
          <Card className="shadow-lg border-[#fecaca]">
            <CardContent className="p-3 xs:p-6 text-center">
              <div className="mb-4 xs:mb-6">
                <AlertCircle className="h-10 w-10 xs:h-12 xs:w-12 sm:h-16 sm:w-16 text-[#ef4444] mx-auto mb-3 xs:mb-4" />
                <h3 className="text-base xs:text-lg sm:text-xl font-bold text-[#111827] mb-2">Something went wrong</h3>
                <Alert variant="destructive" className="text-left">
                  <AlertDescription className="text-xs xs:text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              </div>
              <Button
                onClick={refresh}
                className="w-full"
                disabled={refreshing}
                size="sm"
              >
                <RefreshCw className={`h-3 w-3 xs:h-4 xs:w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // No department state with responsive design optimized for 320px
  if (!department) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] flex items-center justify-center px-0 py-2 xs:px-4">
        <div className="w-full max-w-[300px] sm:max-w-md">
          <Card className="shadow-lg">
            <CardContent className="p-4 xs:p-6 sm:p-8 text-center">
              <div className="mb-4 xs:mb-6">
                <BookOpen className="h-10 w-10 xs:h-12 xs:w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-3 xs:mb-4" />
                <h3 className="text-base xs:text-lg sm:text-xl font-bold text-[#111827] mb-2">No Course Assigned</h3>
                <p className="text-xs xs:text-sm sm:text-base text-muted-foreground leading-relaxed">
                  You are not currently enrolled in any course. Please contact your administrator for assistance.
                </p>
              </div>
              <div className="p-3 xs:p-4 bg-[#eff6ff] rounded-lg border border-[#bfdbfe]">
                <div className="flex items-center justify-center gap-2 text-[#1d4ed8]">
                  <Lightbulb className="h-3 w-3 xs:h-4 xs:w-4" />
                  <p className="text-xs xs:text-sm">
                    Once you're enrolled, your courses and learning materials will appear here.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Check if department is cancelled - prevent access to course content
  if (department?.status === 'CANCELLED') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] flex items-center justify-center px-0 py-2 xs:px-4">
        <div className="w-full max-w-[300px] sm:max-w-md lg:max-w-lg">
          <Card className="shadow-xl border-[#fecaca] bg-gradient-to-br from-[#fef2f2] to-[#fff1f2]">
            <CardContent className="p-4 xs:p-6 sm:p-8 text-center space-y-4 xs:space-y-6">
              {/* Cancellation Icon */}
              <div className="mx-auto w-16 h-16 xs:w-20 xs:h-20 sm:w-24 sm:h-24 bg-[#fee2e2] rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 text-[#dc2626]" />
              </div>

              {/* Cancellation Message */}
              <div className="space-y-2 xs:space-y-3">
                <h2 className="text-lg xs:text-xl sm:text-2xl font-bold text-[#991b1b]">
                  Department Cancelled
                </h2>
                <p className="text-sm xs:text-base text-[#b91c1b] leading-relaxed">
                  Unfortunately, your department <span className="font-semibold">"{department.name}"</span> has been cancelled.
                </p>
              </div>

              {/* Department Info */}
              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 xs:p-4 border border-[#fecaca]">
                <div className="space-y-2 text-sm xs:text-base">
                  <div className="flex items-center justify-between">
                    <span className="text-[#4b5563]">Course:</span>
                    <span className="font-medium text-[#1f2937]">
                      {department.course?.title || department.course?.name || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#4b5563]">Status:</span>
                    <Badge variant="destructive" className="text-xs">
                      Cancelled
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Cancellation Reason (if available) */}
              {/* Cancellation Reason (if available) */}
              {department.notes && (
                <Alert className="text-left bg-[#fff7ed] border-[#fed7aa]">
                  <AlertCircle className="h-4 w-4 text-[#ea580c]" />
                  <AlertDescription className="text-sm text-[#9a3412]">
                    <strong>Reason:</strong> {department.notes}
                  </AlertDescription>
                </Alert>
              )}

              {/* Contact Information */}
              <div className="space-y-3 xs:space-y-4">
                <div className="bg-[#eff6ff] rounded-lg p-3 xs:p-4 border border-[#bfdbfe]">
                  <div className="flex items-start gap-2 xs:gap-3">
                    <div className="p-1 bg-[#dbeafe] rounded-full shrink-0">
                      <Lightbulb className="h-3 w-3 xs:h-4 xs:w-4 text-[#2563eb]" />
                    </div>
                    <div className="text-left space-y-1">
                      <p className="text-xs xs:text-sm font-medium text-[#1e40af]">
                        Need Help?
                      </p>
                      <p className="text-xs text-[#1d4ed8]">
                        Please contact your administrator or instructor for more information about alternative learning options.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col xs:flex-row gap-2 xs:gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/student/dashboard')}
                    className="flex items-center gap-2 text-xs xs:text-sm"
                  >
                    <ArrowLeft className="h-3 w-3 xs:h-4 xs:w-4" />
                    Back to Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = 'mailto:support@your-platform.com?subject=Cancelled Department Inquiry'}
                    className="flex items-center gap-2 text-xs xs:text-sm"
                  >
                    <ExternalLink className="h-3 w-3 xs:h-4 xs:w-4" />
                    Contact Support
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const completedCount = getCompletedModulesCount();
  const progress = calculateProgress();
  const currentModuleIndex = getCurrentModuleIndex();
  const currentModule = currentModuleIndex < modules.length ? modules[currentModuleIndex] : null;

  // The level shown to the student should reflect the level of the course they're viewing
  // (from availableCourses), falling back to the department-wide level and finally the
  // per-course module progression level if neither is available (e.g. single-course departments).
  const activeCourseSummary = availableCourses.find(
    c => String(c.id) === String(department?.course?._id || department?.course?.id)
  );
  const displayLevel = activeCourseSummary?.level || activeLevel || currentLevel;


  // Filter out module-level items from course-level assessments
  const courseLevelQuizzes = (courseQuizzes || []).filter(q => !q?.module && !q?.moduleId && !(q?.module && (q.module._id || q.module.id)));
  const courseLevelAssignments = (courseAssignments || []).filter(a => !a?.module && !a?.moduleId && !(a?.module && (a.module._id || a.module.id)));

  // Derived values for the active module workspace panel (right column)
  const activeModule = uiState.activeModule;
  const activeModuleId = activeModule ? getModuleId(activeModule) : null;
  const activeModuleIndex = activeModule
    ? modules.findIndex(m => String(getModuleId(m)) === String(activeModuleId))
    : -1;
  const activeModuleLessons = activeModuleId ? (lessonsByModule[activeModuleId] || []) : [];
  const activeCompletedLessonsInModule = activeModuleLessons.filter(lesson => isLessonCompleted(lesson)).length;
  const activeModuleQuizzes = activeModuleId ? (quizzesByModule[activeModuleId] || []) : [];
  const activeModuleAssignments = activeModuleId ? (assignmentsByModule[activeModuleId] || []) : [];
  const isActiveModuleCompleted = activeModule ? isModuleCompleted(activeModule) : false;
  const isActiveModuleAccessible = activeModuleIndex >= 0 ? isModuleAccessible(activeModuleIndex) : false;
  const isActiveModuleLevelLocked = activeModule && levelLockEnabled && lockedLevel && activeModule.level &&
    parseInt(activeModule.level.replace('L', '')) > parseInt(currentLevel.replace('L', ''));

  // Derived values for the Welcome Dashboard "Next Up" card
  const nextIncompleteLesson = (!allModulesCompleted && currentModule)
    ? (lessonsByModule[getModuleId(currentModule)] || []).find(lesson => !isLessonCompleted(lesson))
    : null;
  const currentModuleStage = (currentModule && currentModuleIndex < modules.length)
    ? getCurrentStage(currentModuleIndex)
    : 'complete';

  const descriptionText = department.course?.description || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] overflow-x-hidden">
      <div className="w-full max-w-[300px] sm:max-w-7xl mx-auto px-0 xs:px-4 sm:px-6 py-2 xs:py-4 sm:py-6 space-y-3 xs:space-y-4 sm:space-y-6">
        {/* Level Upgrade Message */}
        {uiState.levelUpgradeMessage && (
          <Alert className="bg-white border-slate-200 shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 xs:gap-3">
              <span className="text-slate-700 font-medium text-xs xs:text-sm sm:text-base">
                {uiState.levelUpgradeMessage}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUiState(prev => ({ ...prev, levelUpgradeMessage: null }))}
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 self-end xs:self-auto p-1 xs:p-2"
              >
                <AlertCircle className="h-3 w-3 xs:h-4 xs:w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Level & Course Switcher */}
        {availableCourses && availableCourses.length > 1 && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 flex-wrap">
                {availableCourses.map((c) => {
                  const activeCourseId = department?.course?._id || department?.course?.id;
                  const isActive = String(c.id) === String(activeCourseId);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={c.isLocked}
                      onClick={() => handleSelectCourse(c.id)}
                      title={c.isLocked ? `Locked until you reach ${c.level}` : c.title}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs sm:text-sm font-medium transition-colors ${isActive
                        ? "bg-slate-900 text-white border-slate-900"
                        : c.isLocked
                          ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                    >
                      {c.isLocked ? (
                        <Lock className="h-3 w-3" />
                      ) : c.statusLabel === 'COMPLETED' ? (
                        <CheckCircle2 className={`h-3 w-3 ${isActive ? 'text-white' : 'text-emerald-500'}`} />
                      ) : null}
                      <span>{c.level}</span>
                      <span className={`hidden sm:inline ${isActive ? 'text-slate-200' : 'text-slate-400'}`}>·</span>
                      <span className="hidden sm:inline truncate max-w-[160px]">{c.title}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Split Layout Grid: sidebar navigation + workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start">

          {/* LEFT COLUMN: Sidebar Navigation */}
          <aside className="lg:col-span-4 min-w-0 space-y-4 sm:space-y-6 lg:sticky lg:top-6">

            {/* Course Progress Card */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="font-semibold text-sm sm:text-base text-slate-900 leading-tight break-words">
                      {department.course?.title || department.course?.name || "Course"}
                    </h1>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {getLevelBadge(displayLevel)}
                      <Badge
                        variant="outline"
                        className={`text-xs px-2 py-0.5 font-medium border-transparent ${STATUS_CONFIG[department.status]?.color || 'bg-slate-100 text-slate-600'}`}
                      >
                        {STATUS_CONFIG[department.status]?.name || department.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refresh}
                    disabled={refreshing}
                    className="shrink-0 h-8 w-8 p-0 border-slate-200 text-slate-500 hover:text-slate-700"
                    title="Refresh"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {/* Description with show more */}
                {descriptionText && (
                  <div>
                    <p className={`text-xs sm:text-sm text-slate-500 leading-relaxed break-words ${descExpanded ? '' : 'line-clamp-3'}`}>
                      {descriptionText}
                    </p>
                    {descriptionText.length > 140 && (
                      <button
                        type="button"
                        onClick={() => setDescExpanded(prev => !prev)}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        {descExpanded ? (
                          <>Show Less <ChevronUp className="h-3 w-3" /></>
                        ) : (
                          <>Show More <ChevronDown className="h-3 w-3" /></>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-medium text-slate-700">Course Progress</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {progress}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-2 bg-slate-100" />
                  <p className="text-xs text-slate-500">{completedCount} of {modules.length} modules completed</p>
                </div>

                {uiState.activeModule && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShowDashboard}
                    className="w-full border-slate-200 text-slate-600 hover:text-slate-900 text-xs"
                  >
                    Back to Dashboard
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Modules Navigation Timeline */}
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-100 p-3.5 sm:p-4">
                <CardTitle className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center justify-between gap-2">
                  <span>Course Outline</span>
                  <span className="text-slate-400 font-normal">{modules.length} modules</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {modules.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted-foreground">No modules available for this course yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#f3f4f6]">
                    {modules.map((module, index) => {
                      const moduleId = getModuleId(module);
                      const isCompleted = isModuleCompleted(module);
                      const isAccessible = isModuleAccessible(index);
                      const isCurrent = isAccessible && !isCompleted;
                      const isLocked = !isAccessible;
                      const isActive = uiState.activeModule &&
                        String(getModuleId(uiState.activeModule)) === String(moduleId);
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
                          courseId={department?.course?._id || department?.course?.id}
                          onAssessmentsLoaded={handleModuleAssessmentsLoaded}
                        >
                          <button
                            type="button"
                            onClick={() => handleModuleClick(module, index)}
                            disabled={isLocked || loadingStates[moduleId]}
                            className={`w-full text-left p-3 rounded-lg border-l-2 transition-colors duration-150 flex items-start gap-3 my-0.5 ${isActive
                              ? "bg-slate-50 border-l-slate-800"
                              : isLocked
                                ? "opacity-50 cursor-not-allowed border-l-transparent"
                                : "hover:bg-slate-50 border-l-transparent"
                              }`}
                          >
                            <div className="flex flex-col items-center shrink-0">
                              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium ${isCompleted
                                ? "bg-emerald-50 text-emerald-600"
                                : isCurrent
                                  ? "bg-slate-800 text-white"
                                  : "bg-slate-100 text-slate-400"
                                }`}>
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : isLocked ? (
                                  <Lock className="h-3.5 w-3.5" />
                                ) : (
                                  <span className="font-semibold">{index + 1}</span>
                                )}
                              </div>
                              {index < modules.length - 1 && (
                                <div className={`w-0.5 flex-1 min-h-[16px] mt-1 ${isCompleted ? "bg-emerald-100" : "bg-slate-100"}`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pb-1">
                              <span className="font-medium text-xs sm:text-sm line-clamp-1 text-slate-800 block mb-1">
                                {module.title || `Module ${index + 1}`}
                              </span>
                              <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
                                {module.level && getLevelBadge(module.level)}
                                <span>{completedLessonsInModule}/{moduleLessons.length || module.lessons?.length || 0} lessons</span>
                                {isLevelLocked && (
                                  <span>Requires {module.level}</span>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0 self-center">
                              {loadingStates[moduleId] ? (
                                <RefreshCw className="h-4 w-4 text-slate-300 animate-spin" />
                              ) : (
                                <ChevronRight className={`h-4 w-4 ${isActive ? 'text-slate-600' : 'text-slate-300'}`} />
                              )}
                            </div>
                          </button>
                        </ModuleAssessmentProvider>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Course Resources Panel */}
            <StudentCourseResources
              resources={courseResources}
              courseTitle={department?.course?.title || department?.course?.name}
            />
          </aside>

          {/* RIGHT COLUMN: Interactive Learning Workspace */}
          <main className="lg:col-span-8 min-w-0 space-y-4 sm:space-y-6 min-h-[500px]">

        {/* Enhanced Completion Banner */}
        {allModulesCompleted && (
          <Alert className="bg-emerald-50 border-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription>
              <div className="font-semibold text-sm sm:text-base text-emerald-900 mb-1">
                Course completed
              </div>
              <p className="text-emerald-700 text-xs sm:text-sm leading-relaxed">
                You've finished every module. Review any module for practice, or complete the final assessments below.
              </p>
            </AlertDescription>
          </Alert>
        )}

            {/* Active Module Workspace */}
            {uiState.activeModule ? (
              <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="p-4 sm:p-6 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <CardTitle className="text-base sm:text-lg lg:text-xl break-words">
                          {activeModule.title || `Module ${activeModuleIndex + 1}`}
                        </CardTitle>
                        {activeModule.level && getLevelBadge(activeModule.level)}
                        {isActiveModuleCompleted ? (
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-transparent px-2 py-0.5">Completed</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600 border-transparent px-2 py-0.5">In Progress</Badge>
                        )}
                        {isActiveModuleLevelLocked && (
                          <Badge variant="outline" className="text-xs bg-slate-100 text-slate-500 border-transparent px-2 py-0.5">
                            <Lock className="h-3 w-3 mr-1" />
                            Level Locked
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs sm:text-sm break-words">
                        {activeModule.description || "No description available"}
                      </CardDescription>
                    </div>
                    <div className="shrink-0 text-xs text-slate-400">
                      {activeCompletedLessonsInModule} of {activeModuleLessons.length} lessons
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Tabs value={uiState.activeTab} onValueChange={(tab) =>
                    setUiState(prev => ({ ...prev, activeTab: tab }))
                  }>
                    <div className="border-b border-slate-100 px-2 sm:px-4">
                      <TabsList className="flex w-full overflow-x-auto bg-transparent h-auto p-0 gap-1">
                        <TabsTrigger value="lessons" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-800 data-[state=active]:bg-transparent py-3 text-xs sm:text-sm min-w-[120px] sm:min-w-0">
                          Lessons ({activeModuleLessons.length})
                        </TabsTrigger>
                        <TabsTrigger value="assessments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-800 data-[state=active]:bg-transparent py-3 text-xs sm:text-sm min-w-[120px] sm:min-w-0">
                          Assessments ({activeModuleQuizzes.length + activeModuleAssignments.length})
                        </TabsTrigger>
                        <TabsTrigger value="resources" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-800 data-[state=active]:bg-transparent py-3 text-xs sm:text-sm min-w-[120px] sm:min-w-0">
                          Resources
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {/* Lessons Tab */}
                    <TabsContent value="lessons" className="p-3 sm:p-4 lg:p-6">
                      <div className="space-y-3 sm:space-y-4">
                        {activeModuleLessons.length === 0 ? (
                          <div className="text-center py-6 sm:py-8">
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              No lessons found for this module.
                            </p>
                          </div>
                        ) : (
                          activeModuleLessons.map((lesson, lessonIndex) => {
                            const isLessonDone = isLessonCompleted(lesson);
                            const currentLessonIndex = activeModuleLessons.findIndex(l =>
                              !isLessonCompleted(l)
                            );
                            const isLessonLocked = !isLessonDone &&
                              currentLessonIndex !== -1 &&
                              lessonIndex !== currentLessonIndex;

                            return (
                              <div
                                key={getLessonId(lesson) || lessonIndex}
                                className={`flex flex-col sm:flex-row items-start justify-between rounded-lg border p-3 sm:p-4 gap-3 sm:gap-0 ${isLessonLocked
                                  ? 'opacity-50 bg-slate-50 border-slate-100'
                                  : isLessonDone
                                    ? 'bg-white border-slate-200'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                  }`}
                              >
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium shrink-0 ${isLessonDone
                                    ? "bg-emerald-50 text-emerald-600"
                                    : isLessonLocked
                                      ? "bg-slate-100 text-slate-400"
                                      : "bg-slate-800 text-white"
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
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                                      <h4 className="text-sm sm:text-base font-medium text-slate-800 break-words max-w-full">
                                        {lesson.title || `Lesson ${lessonIndex + 1}`}
                                      </h4>
                                      {isLessonDone && (
                                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-transparent self-start sm:self-auto">
                                          Completed
                                        </Badge>
                                      )}
                                    </div>
                                    {lesson.description && (
                                      <p className="text-xs sm:text-sm text-muted-foreground mb-2 leading-relaxed line-clamp-2 break-words">
                                        {lesson.description}
                                      </p>
                                    )}
                                    <span className="text-xs text-slate-400">{lesson.duration || "5 min"}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto sm:shrink-0">
                                  {!isLessonLocked && (
                                    <Button
                                      size="sm"
                                      variant={isLessonDone ? "outline" : "default"}
                                      onClick={() => navigate(getLessonNavPath(lesson))}
                                      className={`w-full sm:w-auto text-xs sm:text-sm min-h-[44px] ${isLessonDone ?
                                        "border-slate-200 text-slate-600" :
                                        "bg-slate-800 hover:bg-slate-900 text-white"
                                        }`}
                                    >
                                      {isLessonDone ? "Review" : "Start Lesson"}
                                    </Button>
                                  )}
                                  {isLessonLocked && (
                                    <Badge variant="outline" className="text-xs bg-slate-50 text-slate-400 border-transparent px-2 py-1 w-full sm:w-auto justify-center">
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
                          const allLessonsComplete = (activeModuleLessons.length === 0) || (activeCompletedLessonsInModule === activeModuleLessons.length);
                          const totalAssessments = activeModuleQuizzes.length + activeModuleAssignments.length;

                          const allAssignmentsComplete = activeModuleAssignments.length === 0 || activeModuleAssignments.every(a => {
                            const aid = getAssignmentId(a);
                            return aid && submissionsByAssignment[String(aid)];
                          });

                          const allQuizzesPassed = activeModuleQuizzes.length === 0 || activeModuleQuizzes.every(q => {
                            const qid = q._id || q.id;
                            const quizAttempts = attemptsByQuiz[String(qid)] || [];
                            if (quizAttempts.length === 0) return false;
                            const bestAttempt = quizAttempts.reduce((best, current) => (current.score > best.score ? current : best), quizAttempts[0]);
                            const passingScore = q.passingScore || 70;
                            return bestAttempt.score >= passingScore;
                          });

                          const hasLessons = activeModuleLessons.length > 0;
                          const allAssessmentsComplete = allAssignmentsComplete && allQuizzesPassed;

                          if (!isActiveModuleCompleted && isActiveModuleAccessible && allLessonsComplete) {
                            return (
                              <div className="pt-4 border-t border-slate-100 mt-4">
                                {totalAssessments > 0 ? (
                                  allAssessmentsComplete ? (
                                    <div>
                                      <Button
                                        onClick={() => handleMarkModuleComplete(activeModule)}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 min-h-[44px]"
                                        size="lg"
                                        disabled={uiState.processingAction === `module-${activeModuleId}`}
                                      >
                                        {uiState.processingAction === `module-${activeModuleId}` && (
                                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        )}
                                        Complete Module
                                      </Button>
                                      <p className="text-center text-xs text-slate-400 mt-2">
                                        All {hasLessons ? 'lessons and ' : ''}assessments completed
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="text-center">
                                      <p className="text-sm text-slate-500 mb-4">
                                        {hasLessons ? 'All lessons completed! Now complete the assessments in the "Assessments" tab to finish this module.' : 'This module has no lessons. Please complete the assessments in the "Assessments" tab to finish this module.'}
                                      </p>
                                      <Button
                                        onClick={() => setUiState(prev => ({ ...prev, activeTab: "assessments" }))}
                                        variant="outline"
                                        className="w-full border-slate-200"
                                        size="lg"
                                      >
                                        Go to Assessments
                                      </Button>
                                      <p className="mt-3 text-xs text-slate-400">
                                        {activeModuleAssignments.filter(a => {
                                          const aid = getAssignmentId(a);
                                          return aid && submissionsByAssignment[String(aid)];
                                        }).length} of {activeModuleAssignments.length} assignments submitted
                                      </p>
                                    </div>
                                  )
                                ) : (
                                  <div>
                                    <Button
                                      onClick={() => handleMarkModuleComplete(activeModule)}
                                      className="w-full bg-emerald-600 hover:bg-emerald-700 min-h-[44px]"
                                      size="lg"
                                      disabled={uiState.processingAction === `module-${activeModuleId}`}
                                    >
                                      {uiState.processingAction === `module-${activeModuleId}` && (
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      )}
                                      Complete Module
                                    </Button>
                                    <p className="text-center text-xs text-slate-400 mt-2">
                                      {hasLessons ? 'All lessons completed. ' : ''}No assessments required for this module.
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
                    <TabsContent value="assessments" className="p-3 sm:p-4 lg:p-6">
                      <div className="space-y-4">
                        {activeModuleLessons.length > 0 && (
                          <div className="rounded-lg p-3 xs:p-4 mb-3 xs:mb-4 bg-slate-50 border border-slate-100">
                            <div className="flex items-start gap-2 xs:gap-3">
                              {activeCompletedLessonsInModule !== activeModuleLessons.length && (
                                <Lock className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                              )}
                              <div className="flex-1">
                                <div className="font-medium text-sm text-slate-700 mb-1">
                                  {activeCompletedLessonsInModule === activeModuleLessons.length
                                    ? 'Assessments unlocked'
                                    : 'Complete all lessons first'}
                                </div>
                                <p className="text-xs xs:text-sm leading-relaxed text-slate-500">
                                  {activeCompletedLessonsInModule === activeModuleLessons.length
                                    ? 'You can now access the assessments below. Complete all assessments to finish this module.'
                                    : `${activeCompletedLessonsInModule} of ${activeModuleLessons.length} lessons completed.`
                                  }
                                </p>
                                {activeCompletedLessonsInModule < activeModuleLessons.length && (
                                  <div className="mt-3">
                                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                                      <div
                                        className="bg-slate-500 h-1.5 rounded-full transition-all duration-500"
                                        style={{
                                          width: `${activeModuleLessons.length > 0 ? (activeCompletedLessonsInModule / activeModuleLessons.length) * 100 : 0}%`
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <StudentModuleQuizzes
                          quizzes={activeModuleQuizzes}
                          attempts={attemptsByQuiz}
                          isUnlocked={(activeModuleLessons.length === 0) || (activeCompletedLessonsInModule === activeModuleLessons.length)}
                          onStart={handleStartQuiz}
                          extraGrantedQuizIds={extraGrantedQuizIds}
                          rejectedQuizIds={rejectedQuizIds}
                        />

                        <StudentModuleAssignments
                          assignments={activeModuleAssignments}
                          submissions={submissionsByAssignment}
                          isUnlocked={(activeModuleLessons.length === 0) || (activeCompletedLessonsInModule === activeModuleLessons.length)}
                          onViewDetails={handleAssignmentViewDetails}
                          onSubmit={handleAssignmentSubmit}
                        />

                        {activeModuleQuizzes.length === 0 && activeModuleAssignments.length === 0 && (
                          <div className="text-center py-6 xs:py-8">
                            <p className="text-xs xs:text-sm text-muted-foreground">
                              No assessments available for this module.
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* Resources Tab */}
                    <TabsContent value="resources" className="p-3 sm:p-4 lg:p-6">
                      <StudentModuleResources
                        moduleId={activeModuleId}
                        resources={resourcesByModule[activeModuleId] || []}
                        isModuleCompleted={isActiveModuleCompleted}
                        completedLessons={activeCompletedLessonsInModule}
                        totalLessons={activeModuleLessons.length}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              /* Welcome Dashboard */
              <div className="space-y-4 sm:space-y-6">
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-5 sm:p-8 space-y-4">
                    <div className="text-xs sm:text-sm font-medium text-slate-400 uppercase tracking-wide">
                      {allModulesCompleted ? "Course Complete" : "Welcome Back"}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
                      {allModulesCompleted
                        ? "You've finished every module"
                        : "Ready to keep learning?"}
                    </h2>
                    <p className="text-slate-500 max-w-lg text-xs sm:text-sm leading-relaxed">
                      {allModulesCompleted
                        ? "Review any module from the outline, or head to the final assessments below to complete the course."
                        : "Resume your training right where you left off. Keep up the momentum to complete the course."}
                    </p>

                    {!allModulesCompleted && currentModule && (
                      <div className="mt-2 p-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-[11px] text-slate-400 uppercase font-medium tracking-wide mb-0.5">
                            Next Up · {currentModule.title || `Module ${currentModuleIndex + 1}`}
                          </div>
                          <div className="text-sm sm:text-base font-medium text-slate-800 truncate">
                            {nextIncompleteLesson
                              ? (nextIncompleteLesson.title || "Continue Lesson")
                              : currentModuleStage === 'quiz'
                                ? "Complete the module quiz"
                                : currentModuleStage === 'assignment'
                                  ? "Submit the module assignment"
                                  : currentModuleStage === 'resources'
                                    ? "Review module resources"
                                    : "Continue this module"}
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            if (nextIncompleteLesson) {
                              navigate(getLessonNavPath(nextIncompleteLesson));
                            } else {
                              handleModuleClick(currentModule, currentModuleIndex);
                            }
                          }}
                          className="bg-slate-800 hover:bg-slate-900 text-white shrink-0"
                        >
                          Resume
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <Card className="p-4 border-slate-200 shadow-sm">
                    <div className="text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-wide">Modules Done</div>
                    <div className="text-2xl sm:text-3xl font-semibold mt-1 text-slate-900">{completedCount}<span className="text-sm text-slate-400">/{modules.length}</span></div>
                  </Card>
                  <Card className="p-4 border-slate-200 shadow-sm">
                    <div className="text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-wide">Progress</div>
                    <div className="text-2xl sm:text-3xl font-semibold mt-1 text-slate-900">{progress}%</div>
                  </Card>
                  <Card className="p-4 border-slate-200 shadow-sm">
                    <div className="text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-wide">Current Level</div>
                    <div className="text-2xl sm:text-3xl font-semibold mt-1 text-slate-900">{displayLevel}</div>
                  </Card>
                  <Card className="p-4 border-slate-200 shadow-sm">
                    <div className="text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-wide">Attempts Logged</div>
                    <div className="text-2xl sm:text-3xl font-semibold mt-1 text-slate-900">{attempts.length}</div>
                  </Card>
                </div>
              </div>
            )}

            {/* Final Assessments (unlocked once all modules are completed) */}
            {allModulesCompleted && courseContentLoaded && (courseLevelQuizzes.length > 0 || courseLevelAssignments.length > 0) && (
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-3 xs:pb-4 sm:pb-6 p-3 xs:p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 xs:gap-3 mb-1 text-sm xs:text-base sm:text-lg text-slate-900">
                    <span>Final Assessments</span>
                    <span className="text-slate-400 font-normal text-xs">
                      {courseLevelQuizzes.length + courseLevelAssignments.length} total
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs xs:text-sm sm:text-base leading-relaxed break-words">
                    Complete these to finish the course.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 xs:space-y-6 p-3 xs:p-4 sm:p-6">
                  {courseLevelQuizzes.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3 xs:mb-4 text-slate-700 text-xs xs:text-sm sm:text-base">
                        Final Quizzes ({courseLevelQuizzes.length})
                      </h3>
                      <div className="grid gap-3 xs:gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                        {courseLevelQuizzes.map((quiz, index) => (
                          <Card key={index} className="border-slate-200">
                            <CardHeader className="pb-2 xs:pb-3 p-3 xs:p-4 sm:p-6">
                              <CardTitle className="text-xs xs:text-sm sm:text-base lg:text-lg">
                                <span className="truncate break-words text-xs xs:text-sm sm:text-base min-w-0 block">{quiz.title || 'Final Course Quiz'}</span>
                              </CardTitle>
                              {quiz.description && (
                                <CardDescription className="text-xs sm:text-sm leading-relaxed break-words">
                                  {quiz.description}
                                </CardDescription>
                              )}
                            </CardHeader>
                            <CardContent className="p-3 xs:p-4 sm:p-6">
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-400 mb-3 xs:mb-4">
                                <span>{quiz.questions?.length || 0} questions</span>
                                <span>Pass {quiz.passingScore || 70}%</span>
                                <span>{quiz.timeLimit || 60} min</span>
                                <span>{quiz.attemptsAllowed || 1} {quiz.attemptsAllowed === 1 ? 'try' : 'tries'}</span>
                              </div>
                              <Button
                                className="w-full bg-slate-800 hover:bg-slate-900 text-xs xs:text-sm min-h-[44px]"
                                onClick={() => handleStartQuiz(quiz)}
                                size="sm"
                              >
                                Start Quiz
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {courseLevelAssignments.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3 xs:mb-4 text-slate-700 text-xs xs:text-sm sm:text-base">
                        Final Assignments ({courseLevelAssignments.length})
                      </h3>
                      <div className="grid gap-3 xs:gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
                        {courseLevelAssignments.map((assignment, index) => (
                          <Card key={index} className="border-slate-200">
                            <CardHeader className="pb-2 xs:pb-3 p-3 xs:p-4 sm:p-6">
                              <CardTitle className="text-xs xs:text-sm sm:text-base lg:text-lg">
                                <span className="truncate break-words text-xs xs:text-sm sm:text-base min-w-0 block">{assignment.title || 'Final Assignment'}</span>
                              </CardTitle>
                              {assignment.description && (
                                <CardDescription className="text-xs sm:text-sm leading-relaxed break-words">
                                  {assignment.description}
                                </CardDescription>
                              )}
                            </CardHeader>
                            <CardContent className="p-3 xs:p-4 sm:p-6">
                              <div className="flex flex-col gap-1 text-xs text-slate-400 mb-3 xs:mb-4">
                                <span>
                                  Due: {assignment.dueDate
                                    ? new Date(assignment.dueDate).toLocaleDateString()
                                    : 'No deadline'
                                  }
                                </span>
                                <span>Max: {assignment.maxScore || 100} pts</span>
                              </div>
                              <div className="flex flex-col gap-2">
                                <Button variant="outline" className="w-full text-xs min-h-[44px] border-slate-200">
                                  View Details
                                </Button>
                                <Button className="w-full bg-slate-800 hover:bg-slate-900 text-xs min-h-[44px]">
                                  Submit Work
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </main>
        </div>

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
    </div>
  );
};

export default DepartmentCourse;
