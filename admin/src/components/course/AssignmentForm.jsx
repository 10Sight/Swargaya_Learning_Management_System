// components/course/AssignmentForm.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { FormInput, FormTextarea } from "@/components/form/index";
import { IconTrash } from "@tabler/icons-react";

export const AssignmentForm = ({ assignment, onUpdate, onRemove }) => {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <FormInput
            label="Assignment Title"
            value={assignment.title}
            onChange={(e) => onUpdate(assignment.id, "title", e.target.value)}
            placeholder="Enter assignment title"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={onRemove}
          className="text-[#dc2626] hover:text-[#991b1b] ml-4"
        >
          <IconTrash className="h-4 w-4" />
        </Button>
      </div>

      <FormTextarea
        label="Description"
        value={assignment.description}
        onChange={(e) => onUpdate(assignment.id, "description", e.target.value)}
        placeholder="Enter assignment description"
        rows={2}
      />

      <FormInput
        label="Due Date"
        type="datetime-local"
        value={assignment.dueDate}
        onChange={(e) => onUpdate(assignment.id, "dueDate", e.target.value)}
      />
    </div>
  );
};