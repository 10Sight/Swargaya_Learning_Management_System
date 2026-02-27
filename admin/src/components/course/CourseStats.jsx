import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IconBook,
  IconFileText,
  IconClipboardList,
  IconHelpCircle,
  IconPaperclip,
  IconClock,
} from "@tabler/icons-react";
import StatCard from "@/components/common/StatCard";

const CourseStats = ({ course, modules, quizzes, assignments }) => {
  // Calculate total duration of all modules
  const totalDuration = modules.reduce((total, module) => {
    return total + (module.duration || 0);
  }, 0);

  // Format duration to hours and minutes
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard
        title="Modules"
        value={modules.length}
        description="Learning sections"
        icon={IconBook}
        iconBgColor="bg-[#dbeafe]"
        iconColor="text-[#2563eb]"
      />

      <StatCard
        title="Quizzes"
        value={quizzes.length}
        description="Knowledge checks"
        icon={IconHelpCircle}
        iconBgColor="bg-[#f3e8ff]"
        iconColor="text-[#9333ea]"
      />

      <StatCard
        title="Assignments"
        value={assignments.length}
        description="Practical tasks"
        icon={IconClipboardList}
        iconBgColor="bg-[#fef3c7]"
        iconColor="text-[#d97706]"
      />

      <StatCard
        title="Lessons"
        value={modules.reduce((total, module) => total + (module.lessons?.length || 0), 0)}
        description="Learning units"
        icon={IconFileText}
        iconBgColor="bg-[#d1fae5]"
        iconColor="text-[#059669]"
      />
    </div>
  );
};

export default CourseStats;