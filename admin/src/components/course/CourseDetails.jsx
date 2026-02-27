import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconBook,
  IconUsers,
  IconEye,
  IconEyeOff,
  IconX,
  IconInfoCircle,
} from "@tabler/icons-react";

const CourseDetails = ({ course }) => {
  const getDifficultyBadge = (difficulty) => {
    const difficultyConfig = {
      BEGINNER: { variant: "success", label: "BEGINNER" },
      INTERMEDIATE: { variant: "warning", label: "INTERMEDIATE" },
      ADVANCED: { variant: "destructive", label: "ADVANCED" },
    };

    const config = difficultyConfig[difficulty] || {
      variant: "secondary",
      label: difficulty,
    };

    return (
      <Badge variant={config.variant} className="w-fit">
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PUBLISHED: { variant: "success", label: "Published", icon: IconEye },
      DRAFT: { variant: "secondary", label: "Draft", icon: IconEyeOff },
      ARCHIVED: { variant: "destructive", label: "Archived", icon: IconX },
    };

    const config = statusConfig[status] || {
      variant: "secondary",
      label: status,
      icon: IconInfoCircle,
    };
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Card className="bg-gradient-to-br from-[#eff6ff] to-[#dbeafe] border-[#bfdbfe]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-[#1e40af]">
          Course Details
        </CardTitle>
        <div className="p-2 rounded-full bg-[#dbeafe]">
          <IconBook className="h-5 w-5 text-[#2563eb]" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#1e3a8a]">{course?.title}</h2>
          <p className="text-sm text-[#1e40af]">{course?.description}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {getDifficultyBadge(course?.level)}
            {getStatusBadge(course?.status)}
            <Badge variant="outline" className="bg-white">
              {course?.category}
            </Badge>
            <div className="flex items-center text-sm text-[#1d4ed8]">
              <IconUsers className="h-4 w-4 mr-1" />
              {course?.students?.length || 0} students
            </div>
          </div>
        </div>
      </CardContent>
    </Card >
  );
};

export default CourseDetails;