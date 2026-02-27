// src/components/departments/DepartmentStats.jsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { IconUser, IconUsers, IconBook, IconCalendar } from "@tabler/icons-react";

const DepartmentStats = ({ department }) => {
  const stats = [
    {
      title: "Total Students",
      value: department.students?.length || 0,
      icon: IconUsers,
      color: "text-[#2563eb]",
      bgColor: "bg-[#dbeafe]",
    },
    {
      title: "Instructor",
      value: department.instructor ? "Assigned" : "Not Assigned",
      icon: IconUser,
      color: "text-[#16a34a]",
      bgColor: "bg-[#dcfce7]",
    },
    {
      title: "Course",
      value: department.course ? "Assigned" : "Not Assigned",
      icon: IconBook,
      color: "text-[#9333ea]",
      bgColor: "bg-[#f3e8ff]",
    },
    {
      title: "Duration",
      value: department.startDate && department.endDate ? "Set" : "Not Set",
      icon: IconCalendar,
      color: "text-[#ea580c]",
      bgColor: "bg-[#ffedd5]",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DepartmentStats;