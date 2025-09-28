import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconClipboardList,
  IconCalendar,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

const AssignmentList = ({ assignments, courseId, modules = [] }) => {
  const navigate = useNavigate();
  
  // Helper function to get module name
  const getModuleName = (moduleId) => {
    const module = modules.find(m => m._id === moduleId || m.id === moduleId);
    return module ? module.title : 'Unknown Module';
  };

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <IconClipboardList className="h-12 w-12 text-muted-foreground/60 mb-4" />
          <p className="text-muted-foreground font-medium">No assignments yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add assignments for students to complete
          </p>
          <Button 
            onClick={() => navigate(`/admin/add-assignment/${courseId}`)} 
            className="mt-4"
          >
            Add Assignment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Course Assignments</h3>
          <p className="text-sm text-muted-foreground">
            Practical tasks for students
          </p>
        </div>
        <Button onClick={() => navigate(`/admin/add-assignment/${courseId}`)}>
          <IconPlus className="h-4 w-4 mr-2" />
          Add Assignment
        </Button>
      </div>

      <div className="grid gap-4">
        {assignments.map((assignment) => (
          <Card key={assignment._id} className="group">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{assignment.title}</CardTitle>
                  <CardDescription>{assignment.description}</CardDescription>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/edit-assignment/${assignment._id}`)}
                  >
                    <IconPencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {assignment.moduleId && (
                  <Badge variant="secondary" className="text-xs">
                    📚 {getModuleName(assignment.moduleId)}
                  </Badge>
                )}
                {assignment.dueDate && (
                  <div className="flex items-center gap-1">
                    <IconCalendar className="h-4 w-4" />
                    <span>
                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AssignmentList;