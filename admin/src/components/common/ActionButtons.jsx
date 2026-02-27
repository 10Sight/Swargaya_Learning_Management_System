import React from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw, Eye, Edit, User, Users } from "lucide-react";
import { cn } from '@/lib/utils';

const ActionButton = ({
  icon: Icon,
  onClick,
  tooltip,
  variant = "outline",
  size = "sm",
  className,
  disabled = false,
  ...props
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={cn("p-2", className)}
      title={tooltip}
      {...props}
    >
      <Icon className="w-4 h-4" />
    </Button>
  );
};

const ActionButtons = {
  View: (props) => (
    <ActionButton
      icon={Eye}
      tooltip="View Details"
      className="hover:bg-[#eff6ff] hover:text-[#2563eb]"
      {...props}
    />
  ),

  Edit: (props) => (
    <ActionButton
      icon={Edit}
      tooltip="Edit"
      className="hover:bg-[#f0fdf4] hover:text-[#16a34a]"
      {...props}
    />
  ),

  Delete: (props) => (
    <ActionButton
      icon={Trash2}
      tooltip="Delete Permanently"
      className="hover:bg-[#fef2f2] hover:text-[#dc2626]"
      variant="outline"
      {...props}
    />
  ),

  SoftDelete: (props) => (
    <ActionButton
      icon={Trash2}
      tooltip="Delete"
      className="hover:bg-[#fff7ed] hover:text-[#ea580c]"
      variant="outline"
      {...props}
    />
  ),

  Restore: (props) => (
    <ActionButton
      icon={RotateCcw}
      tooltip="Restore"
      className="hover:bg-[#f0fdf4] hover:text-[#16a34a]"
      variant="outline"
      {...props}
    />
  ),

  ViewUser: (props) => (
    <ActionButton
      icon={User}
      tooltip="View User"
      className="hover:bg-[#eff6ff] hover:text-[#2563eb]"
      {...props}
    />
  ),

  ManageUsers: (props) => (
    <ActionButton
      icon={Users}
      tooltip="Manage Users"
      className="hover:bg-[#f3e8ff] hover:text-[#9333ea]"
      {...props}
    />
  ),
};

export default ActionButtons;
