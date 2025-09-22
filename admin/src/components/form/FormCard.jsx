// components/ui/form/FormCard.jsx
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const FormCard = ({ 
  title, 
  description, 
  children, 
  actionButton,
  className = "" 
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {actionButton}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};