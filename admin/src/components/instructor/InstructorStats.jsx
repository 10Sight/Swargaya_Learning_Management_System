import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  IconBook,
  IconUsers,
  IconSchool,
  IconStar
} from "@tabler/icons-react";

const InstructorStats = ({ stats }) => {
  const statCards = [
    {
      title: "Total Courses",
      value: stats.coursesCount || 0,
      icon: IconBook,
      color: "text-[#2563eb]",
      bgColor: "bg-[#dbeafe]"
    },
    {
      title: "Active Departments",
      value: stats.departmentsCount || 0,
      icon: IconSchool,
      color: "text-[#16a34a]",
      bgColor: "bg-[#dcfce7]"
    },
    {
      title: "Average Rating",
      value: stats.averageRating ? `${stats.averageRating}/5` : "N/A",
      icon: IconStar,
      color: "text-[#d97706]",
      bgColor: "bg-[#fef3c7]"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default InstructorStats;