// src/components/batches/BatchStudentsTable.jsx
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconSearch,
  IconUserPlus,
  IconDotsVertical,
  IconMail,
  IconPhone,
  IconUser,
  IconEye,
  IconX,
  IconTrendingUp,
  IconFilter,
  IconRefresh,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useGetBatchProgressQuery } from "@/Redux/AllApi/BatchApi";

const BatchStudentsTable = ({ students, batchId, batchName }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState("all");
  const navigate = useNavigate();

  // Fetch batch progress data
  const {
    data: progressData,
    isLoading: progressLoading,
    error: progressError,
    refetch: refetchProgress,
  } = useGetBatchProgressQuery(batchId, {
    refetchOnMountOrArgChange: true,
  });

  const batchProgress = progressData?.data?.batchProgress || [];

  // Enhanced filtering
  const filteredStudents = students.filter((student) => {
    // Text search filter
    const matchesSearch = 
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    
    // Progress filter
    if (progressFilter !== "all") {
      const studentProgress = batchProgress.find(p => p.student._id === student._id);
      const progressPercentage = studentProgress?.progressPercentage || 0;
      
      if (progressFilter === "not-started" && progressPercentage > 0) return false;
      if (progressFilter === "in-progress" && (progressPercentage === 0 || progressPercentage >= 100)) return false;
      if (progressFilter === "completed" && progressPercentage < 100) return false;
    }
    
    return matchesSearch && matchesStatus;
  });

  // Get student status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      ACTIVE: { variant: "default", color: "text-green-700" },
      SUSPENDED: { variant: "destructive", color: "text-red-700" },
      PENDING: { variant: "secondary", color: "text-amber-700" },
      BANNED: { variant: "destructive", color: "text-red-700" },
    };
    
    const config = statusConfig[status] || { variant: "secondary", color: "text-gray-700" };
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {status}
      </Badge>
    );
  };

  if (!students || students.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconUser className="h-5 w-5" />
            Students
          </CardTitle>
          <CardDescription>
            No students enrolled in this batch yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Button
              onClick={() => navigate(`/batches?manageStudents=${batchId}`)}
              className="gap-2"
            >
              <IconUserPlus className="h-4 w-4" />
              Add Students
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconUser className="h-5 w-5" />
                Students ({students.length})
              </CardTitle>
              <CardDescription>
                Students enrolled in {batchName} with progress tracking
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refetchProgress}
                disabled={progressLoading}
                className="gap-2"
              >
                <IconRefresh className={`h-4 w-4 ${progressLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={() => navigate(`/batches?manageStudents=${batchId}`)}
                className="gap-2"
              >
                <IconUserPlus className="h-4 w-4" />
                Manage
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <IconSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search students by name or email..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={progressFilter} onValueChange={setProgressFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Progress" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Progress</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {progressError ? (
          <Alert className="mb-4">
            <AlertDescription className="flex items-center gap-2">
              <IconX className="h-4 w-4" />
              Failed to load progress data. Some features may be limited.
            </AlertDescription>
          </Alert>
        ) : null}
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => {
              const studentProgress = batchProgress.find(p => p.student._id === student._id);
              const progressPercentage = studentProgress?.progressPercentage || 0;
              const completedModules = studentProgress?.completedModules || 0;
              const totalModules = studentProgress?.totalModules || 0;
              const lastActivity = studentProgress?.lastActivity;

              return (
                <TableRow key={student._id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2">
                        <AvatarImage
                          src={student.avatar?.url}
                          alt={student.fullName}
                        />
                        <AvatarFallback className="bg-blue-100 text-blue-800 font-medium">
                          {student.fullName
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{student.fullName}</p>
                        <p className="text-sm text-muted-foreground">@{student.userName || student.email.split('@')[0]}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <IconMail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-48">{student.email}</span>
                      </div>
                      {student.phoneNumber && (
                        <div className="flex items-center gap-2 text-sm">
                          <IconPhone className="h-3 w-3 text-muted-foreground" />
                          <span>{student.phoneNumber}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {progressLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-2 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    ) : (
                      <div className="space-y-2 min-w-28">
                        <div className="flex items-center gap-2">
                          <Progress value={progressPercentage} className="h-2 flex-1" />
                          <span className="text-xs font-medium text-muted-foreground">
                            {progressPercentage}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <IconTrendingUp className="h-3 w-3" />
                          {completedModules} / {totalModules} modules
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(student.status)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {lastActivity ? (
                        <div>
                          <div>{new Date(lastActivity).toLocaleDateString()}</div>
                          <div className="text-xs">{new Date(lastActivity).toLocaleTimeString()}</div>
                        </div>
                      ) : (
                        <span className="text-xs">No activity</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/students/${student._id}`)}
                        className="gap-1"
                      >
                        <IconEye className="h-4 w-4" />
                        View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <IconDotsVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/students/${student._id}`)}
                          >
                            <IconEye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              // Handle send message logic
                            }}
                          >
                            <IconMail className="h-4 w-4 mr-2" />
                            Send Message
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              // Handle remove student logic
                            }}
                            className="text-red-600"
                          >
                            <IconX className="h-4 w-4 mr-2" />
                            Remove from Batch
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filteredStudents.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <IconUser className="h-12 w-12 text-muted-foreground mx-auto" />
            <div className="text-muted-foreground">
              {searchTerm || statusFilter !== "all" || progressFilter !== "all" 
                ? "No students match your current filters" 
                : "No students found"
              }
            </div>
            {(searchTerm || statusFilter !== "all" || progressFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setProgressFilter("all");
                }}
                className="gap-2"
              >
                <IconRefresh className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Summary Stats */}
        {!progressLoading && batchProgress.length > 0 && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{students.length}</div>
              <div className="text-xs text-muted-foreground">Total Students</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {batchProgress.filter(p => p.progressPercentage > 0).length}
              </div>
              <div className="text-xs text-muted-foreground">Active Learners</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                {batchProgress.filter(p => p.progressPercentage >= 100).length}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {Math.round(
                  batchProgress.reduce((sum, p) => sum + p.progressPercentage, 0) / batchProgress.length
                )}%
              </div>
              <div className="text-xs text-muted-foreground">Avg Progress</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BatchStudentsTable;