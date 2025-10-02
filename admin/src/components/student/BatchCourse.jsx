import React, { useMemo, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Lock, ArrowRight, ArrowLeft, BookOpen, FileText, ClipboardList, GraduationCap } from "lucide-react";

import ModuleLessons from './ModuleLessons';
import ModuleResources from './ModuleResources';
import ModuleQuiz from './ModuleQuiz';
import ModuleAssignment from './ModuleAssignment';
import FinalAssessments from './FinalAssessments';

// Stage order for a module
const STAGES = ["lessons", "resources", "quiz", "assignment", "complete"];

const stageMeta = {
  lessons: { label: 'Lessons', icon: BookOpen },
  resources: { label: 'Resources', icon: FileText },
  quiz: { label: 'Quiz', icon: ClipboardList },
  assignment: { label: 'Assignment', icon: ClipboardList },
  complete: { label: 'Complete', icon: CheckCircle2 },
};

export default function BatchCourse({ course, onCourseComplete }) {
  if (!course) {
    return (
      <Alert>
        <AlertDescription>No course data provided.</AlertDescription>
      </Alert>
    );
  }

  const modules = course.modules || [];

  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [stage, setStage] = useState('lessons');
  // Keep simple arrays for progress to avoid serializability issues with Sets
  const [progress, setProgress] = useState(() => (modules.map(() => ({
    lessonsCompleted: [],
    resourcesCompleted: [],
    quizCompleted: false,
    assignmentCompleted: false,
  }))));

  const currentModule = modules[currentModuleIndex] || {};
  const isLastModule = currentModuleIndex === modules.length - 1;

  const lessons = currentModule.lessons || [];
  const resources = currentModule.resources || [];
  const quiz = currentModule.quiz || null;
  const assignment = currentModule.assignment || null;

  const moduleProgress = progress[currentModuleIndex] || { lessonsCompleted: [], resourcesCompleted: [], quizCompleted: false, assignmentCompleted: false };

  const lessonsDone = lessons.length === 0 || lessons.every(l => moduleProgress.lessonsCompleted.includes(l._id || l.id));
  const resourcesDone = resources.length === 0 || resources.every(r => moduleProgress.resourcesCompleted.includes(r._id || r.id));
  const quizDone = !quiz || moduleProgress.quizCompleted;
  const assignmentDone = !assignment || moduleProgress.assignmentCompleted;

  const stageIndex = STAGES.indexOf(stage);

  const canAccessStage = useMemo(() => ({
    lessons: true,
    resources: lessonsDone,
    quiz: lessonsDone && resourcesDone,
    assignment: lessonsDone && resourcesDone && quizDone,
  }), [lessonsDone, resourcesDone, quizDone]);

  const goToNextStage = () => {
    if (stage === 'assignment' || (stage === 'quiz' && !assignment) || (stage === 'resources' && !quiz && !assignment) || (stage === 'lessons' && !resources && !quiz && !assignment)) {
      // Module complete, move to next module or final
      if (!isLastModule) {
        setCurrentModuleIndex(idx => idx + 1);
        setStage('lessons');
      } else {
        setStage('final');
      }
      return;
    }

    const nextIdx = Math.min(stageIndex + 1, STAGES.length - 1);
    setStage(STAGES[nextIdx]);
  };

  const goToPrevStage = () => {
    if (stage === 'lessons') {
      if (currentModuleIndex > 0) {
        setCurrentModuleIndex(idx => idx - 1);
        setStage('assignment');
      }
      return;
    }
    const prevIdx = Math.max(stageIndex - 1, 0);
    setStage(STAGES[prevIdx]);
  };

  const handleLessonComplete = (lessonId) => {
    setProgress(prev => prev.map((mProg, idx) => {
      if (idx !== currentModuleIndex) return mProg;
      if (mProg.lessonsCompleted.includes(lessonId)) return mProg;
      return { ...mProg, lessonsCompleted: [...mProg.lessonsCompleted, lessonId] };
    }));
  };

  const handleResourceComplete = (resourceId) => {
    setProgress(prev => prev.map((mProg, idx) => {
      if (idx !== currentModuleIndex) return mProg;
      if (mProg.resourcesCompleted.includes(resourceId)) return mProg;
      return { ...mProg, resourcesCompleted: [...mProg.resourcesCompleted, resourceId] };
    }));
  };

  const handleQuizComplete = () => {
    setProgress(prev => prev.map((mProg, idx) => {
      if (idx !== currentModuleIndex) return mProg;
      return { ...mProg, quizCompleted: true };
    }));
  };

  const handleAssignmentComplete = () => {
    setProgress(prev => prev.map((mProg, idx) => {
      if (idx !== currentModuleIndex) return mProg;
      return { ...mProg, assignmentCompleted: true };
    }));
  };

  const allModulesComplete = modules.length > 0 && modules.every((m, i) => {
    const mp = progress[i] || { lessonsCompleted: [], resourcesCompleted: [], quizCompleted: false, assignmentCompleted: false };
    const lDone = (m.lessons || []).length === 0 || (m.lessons || []).every(l => mp.lessonsCompleted.includes(l._id || l.id));
    const rDone = (m.resources || []).length === 0 || (m.resources || []).every(r => mp.resourcesCompleted.includes(r._id || r.id));
    const qDone = !m.quiz || mp.quizCompleted;
    const aDone = !m.assignment || mp.assignmentCompleted;
    return lDone && rDone && qDone && aDone;
  });

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{course.title || 'Course'}</h1>
          <p className="text-muted-foreground">Sequential learning path through modules</p>
        </div>
        <Badge variant={allModulesComplete && stage === 'final' ? 'default' : 'outline'}>
          {currentModuleIndex + 1} / {modules.length} Modules
        </Badge>
      </div>

      {/* Module & Stage Overview */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-[200px]">
              <div className="text-xs text-muted-foreground">Current Module</div>
              <div className="font-semibold">{currentModule.title || `Module ${currentModuleIndex + 1}`}</div>
            </div>
            <div className="flex items-center gap-2 flex-1">
              {STAGES.slice(0, 4).map((s, i) => {
                const Icon = stageMeta[s].icon;
                const label = stageMeta[s].label;
                const unlocked = i === 0 ? true : (i === 1 ? lessonsDone : (i === 2 ? (lessonsDone && resourcesDone) : (lessonsDone && resourcesDone && quizDone)));
                const active = stage === s;
                const done = (s === 'lessons' && lessonsDone) || (s === 'resources' && resourcesDone) || (s === 'quiz' && quizDone) || (s === 'assignment' && assignmentDone);
                return (
                  <div key={s} className={`flex items-center gap-2 p-2 rounded-md border ${active ? 'bg-muted' : ''}`}>
                    {unlocked ? <Icon className={`h-4 w-4 ${done ? 'text-green-600' : 'text-foreground'}`} /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                    <span className={`text-sm ${!unlocked ? 'text-muted-foreground' : ''}`}>{label}</span>
                    {i < 3 && <Separator orientation="vertical" className="h-6" />}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={goToPrevStage} disabled={currentModuleIndex === 0 && stage === 'lessons'}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={goToNextStage}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage Content */}
      {stage !== 'final' ? (
        <div>
          {stage === 'lessons' && (
            <ModuleLessons
              lessons={lessons}
              isUnlocked={true}
              completedLessonIds={moduleProgress.lessonsCompleted}
              onLessonComplete={handleLessonComplete}
              canProceed={true}
              onNext={() => setStage('resources')}
            />
          )}

          {stage === 'resources' && (
            <ModuleResources
              resources={resources}
              isUnlocked={canAccessStage.resources}
              completedResourceIds={moduleProgress.resourcesCompleted}
              onResourceComplete={handleResourceComplete}
              canProceed={true}
              onNext={() => setStage(quiz ? 'quiz' : (assignment ? 'assignment' : 'complete'))}
            />
          )}

          {stage === 'quiz' && (
            <ModuleQuiz
              quiz={quiz}
              isUnlocked={canAccessStage.quiz}
              completed={quizDone}
              onComplete={() => { handleQuizComplete(); setStage(assignment ? 'assignment' : 'complete'); }}
              canProceed={true}
              onNext={() => setStage(assignment ? 'assignment' : 'complete')}
            />
          )}

          {stage === 'assignment' && (
            <ModuleAssignment
              assignment={assignment}
              isUnlocked={canAccessStage.assignment}
              completed={assignmentDone}
              onSubmitComplete={() => { handleAssignmentComplete(); setStage('complete'); }}
              canProceed={true}
              onNext={() => setStage('complete')}
            />
          )}

          {stage === 'complete' && (
            <Card>
              <CardContent className="p-6 text-center space-y-4">
                <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
                <h3 className="text-xl font-semibold">Module Complete</h3>
                <p className="text-muted-foreground">Great work! {isLastModule ? 'Proceed to final assessments.' : 'Continue to the next module.'}</p>
                <div className="flex justify-center gap-3">
                  {!isLastModule ? (
                    <Button onClick={() => { setCurrentModuleIndex(i => i + 1); setStage('lessons'); }}>
                      Next Module <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={() => setStage('final')}>
                      Go to Final Assessments <GraduationCap className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <FinalAssessments
          finalQuiz={course.finalAssessments?.quiz}
          finalAssignment={course.finalAssessments?.assignment}
          onFinalComplete={() => { if (onCourseComplete) onCourseComplete(); }}
        />
      )}
    </div>
  );
}

