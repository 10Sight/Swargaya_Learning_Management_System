// src/components/departments/DepartmentInstructorCard.jsx
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconUser, IconMail, IconPhone, IconPencil } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

const DepartmentInstructorCard = ({ instructor, instructors, departmentId }) => {
  const navigate = useNavigate();

  if (!instructor && (!instructors || instructors.length === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconUser className="h-5 w-5" />
            Instructors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">
              No instructor assigned to this department
            </div>
            <Button
              onClick={() => navigate(`/departments?assignInstructor=${departmentId}`)}
            >
              Assign Instructor
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const instructorList = instructors && instructors.length > 0 ? instructors : [instructor];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <IconUser className="h-5 w-5" />
          Instructors
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/departments?assignInstructor=${departmentId}`)}
        >
          <IconPencil className="h-4 w-4 mr-2" />
          Manage
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {instructorList.map(inst => (
            <div key={inst._id} className="flex flex-col items-center text-center gap-4 pb-4 border-b last:border-0 last:pb-0">
              <Avatar className="h-20 w-20">
                <AvatarImage src={inst.avatar?.url} alt={inst.fullName} />
                <AvatarFallback className="text-xl">
                  {inst.fullName
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>

              <div>
                <h3 className="text-xl font-semibold">{inst.fullName}</h3>
                <Badge variant="outline" className="mt-1">
                  Instructor
                </Badge>
              </div>

              <div className="w-full space-y-2">
                <div className="flex items-center gap-2 text-sm justify-center">
                  <IconMail className="h-4 w-4 text-muted-foreground" />
                  <span>{inst.email}</span>
                </div>

                {inst.phone && (
                  <div className="flex items-center gap-2 text-sm justify-center">
                    <IconPhone className="h-4 w-4 text-muted-foreground" />
                    <span>{inst.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DepartmentInstructorCard;