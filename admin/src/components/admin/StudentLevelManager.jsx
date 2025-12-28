import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Lock,
  Unlock,
  Shield,
  Trophy,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/Helper/axiosInstance";
import { useGetAllDepartmentsQuery, useGetDepartmentProgressQuery } from "@/Redux/AllApi/DepartmentApi";
import { useGetActiveConfigQuery } from "@/Redux/AllApi/CourseLevelConfigApi";

const StudentLevelManager = () => {
  const [students, setStudents] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(() => {
    // Restore last selected department from localStorage if available
    try {
      return localStorage.getItem("selectedDepartmentId") || "";
    } catch {
      return "";
    }
  });
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState({});

  // Fetch all departments using RTK Query
  const { data: departmentsData, isLoading: departmentsLoading } = useGetAllDepartmentsQuery({ limit: 100 });
  const departments = departmentsData?.data?.departments || [];

  // Fetch active level configuration
  const { data: levelConfigData, isLoading: configLoading } = useGetActiveConfigQuery();
  const levelConfig = levelConfigData?.data;
  const availableLevels = levelConfig?.levels || [
    { name: "L1", color: "#3B82F6" },
    { name: "L2", color: "#F97316" },
    { name: "L3", color: "#10B981" },
  ];

  // Get course ID from selected department
  const selectedDepartmentData = departments.find(dept => dept._id === selectedDepartment);
  const courseId = selectedDepartmentData?.course?._id || selectedDepartmentData?.courseId;

  // Auto-select first department if none selected and departments are available
  useEffect(() => {
    if (!selectedDepartment && departments.length > 0 && !departmentsLoading) {
      const firstDepartment = departments[0];
      setSelectedDepartment(firstDepartment._id);
      try { localStorage.setItem("selectedDepartmentId", firstDepartment._id); } catch { }
    }
  }, [departments, selectedDepartment, departmentsLoading]);

  // Fetch department progress using RTK Query
  const { data: departmentProgressData, isLoading: progressLoading, refetch: refetchProgress } = useGetDepartmentProgressQuery(
    selectedDepartment,
    { skip: !selectedDepartment }
  );

  // Update students when department progress data changes
  useEffect(() => {
    if (departmentProgressData?.data?.departmentProgress && Array.isArray(departmentProgressData.data.departmentProgress)) {
      const progressData = departmentProgressData.data.departmentProgress;

      // Transform progress data to include student info with actual level data from API
      const studentsWithProgress = progressData.map(progress => ({
        id: progress.student?._id || progress.student?.id,
        name: progress.student?.fullName || progress.student?.name || "Unknown",
        email: progress.student?.email || "No email",
        currentLevel: progress.currentLevel || "L1", // Use actual level from API
        levelLockEnabled: progress.levelLockEnabled || false, // Use actual lock status from API
        lockedLevel: progress.lockedLevel || null, // Use actual locked level from API
        progressPercent: progress.progressPercentage || 0,
        completedModules: progress.completedModules || 0,
        lastAccessed: progress.lastActivity,
        progressId: null, // Not available in department progress
        courseId: selectedDepartmentData?.course?._id // Use course ID from selected department
      }));

      setStudents(studentsWithProgress);
    } else if (selectedDepartment && !progressLoading) {
      setStudents([]);
    }
  }, [departmentProgressData, selectedDepartment, progressLoading, selectedDepartmentData]);

  // Handle department selection
  const handleDepartmentChange = (departmentId) => {
    setSelectedDepartment(departmentId);
    try { localStorage.setItem("selectedDepartmentId", departmentId || ""); } catch { }
    if (!departmentId) {
      setStudents([]);
    }
  };

  // Set student level and lock status
  const handleSetStudentLevel = async (studentId, level, lock) => {
    const updateKey = `${studentId}-${level}-${lock}`;
    setUpdating(prev => ({ ...prev, [updateKey]: true }));

    try {
      const response = await axiosInstance.patch("/api/progress/admin/set-level", {
        studentId,
        courseId: courseId,
        level,
        lock
      });

      if (response.data.success) {
        toast.success(
          lock
            ? `Student level locked to ${level}`
            : level
              ? `Student level set to ${level}`
              : "Level lock removed"
        );

        // Update the student in the local state
        setStudents(prev => prev.map(student =>
          student.id === studentId
            ? {
              ...student,
              currentLevel: level || student.currentLevel,
              levelLockEnabled: lock,
              lockedLevel: lock ? (level || student.currentLevel) : null
            }
            : student
        ));
      } else {
        throw new Error(response.data.message || "Failed to update employee level");
      }
    } catch (error) {
      console.error("Error setting employee level:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to update employee level";
      toast.error(errorMessage);
    } finally {
      setUpdating(prev => ({ ...prev, [updateKey]: false }));
    }
  };

  // Quick actions
  const handleLockAtCurrentLevel = (student) => {
    handleSetStudentLevel(student.id, student.currentLevel, true);
  };

  const handleUnlockLevel = (student) => {
    handleSetStudentLevel(student.id, student.currentLevel, false);
  };

  const handleSetLevel = (student, level) => {
    handleSetStudentLevel(student.id, level, student.levelLockEnabled);
  };

  const getLevelColor = (levelName) => {
    const level = availableLevels.find(
      l => l.name.toUpperCase() === levelName?.toUpperCase()
    );

    if (!level) return "bg-gray-100 text-gray-800";

    // Convert hex color to tailwind-like classes (simplified)
    // For actual hex colors, we'll use inline styles
    return "";
  };

  const getLevelStyle = (levelName) => {
    const level = availableLevels.find(
      l => l.name.toUpperCase() === levelName?.toUpperCase()
    );

    if (!level) return {};

    return {
      backgroundColor: `${level.color}20`, // 20 is for 12.5% opacity
      color: level.color,
      borderColor: level.color,
    };
  };

  const formatLastAccessed = (date) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Student Level Manager
          </CardTitle>
          <CardDescription>
            Control student level progression and set level locks to prevent automatic promotions. Select a department to manage its students.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="department-select">Select Department:</Label>
            <Select value={selectedDepartment} onValueChange={handleDepartmentChange} disabled={departmentsLoading}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder={departmentsLoading ? "Loading departments..." : "Choose a department to manage"} />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept._id} value={dept._id}>
                    {dept.name} - {dept.course?.title || 'No Course'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDepartment && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchProgress()}
                disabled={progressLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${progressLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Level Lock Info */}
      {selectedDepartment && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Level Lock:</strong> When enabled, prevents automatic level promotions when students complete modules.
            The student will remain at the locked level regardless of their progress.
          </AlertDescription>
        </Alert>
      )}

      {/* Students Table */}
      {selectedDepartment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Students ({students.length}) - {selectedDepartmentData?.name}
            </CardTitle>
            <CardDescription>
              Manage individual student levels and lock settings for {selectedDepartmentData?.course?.title || 'this department'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {progressLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading students...
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No students enrolled in this department
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Current Level</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Lock Status</TableHead>
                    <TableHead>Last Accessed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          className="border"
                          style={getLevelStyle(student.currentLevel)}
                        >
                          {student.currentLevel}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">{student.progressPercent}% complete</div>
                          <div className="text-xs text-muted-foreground">
                            {student.completedModules} modules completed
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {student.levelLockEnabled ? (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Locked at {student.lockedLevel}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Unlock className="h-3 w-3" />
                              Unlocked
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-sm">{formatLastAccessed(student.lastAccessed)}</div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* Level Selection */}
                          <Select
                            value={student.currentLevel}
                            onValueChange={(level) => handleSetLevel(student, level)}
                            disabled={updating[`${student.id}-${student.currentLevel}-${student.levelLockEnabled}`]}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {availableLevels.map((level) => (
                                <SelectItem key={level.name} value={level.name}>
                                  {level.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Lock/Unlock Toggle */}
                          {student.levelLockEnabled ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnlockLevel(student)}
                              disabled={updating[`${student.id}-${student.currentLevel}-false`]}
                            >
                              {updating[`${student.id}-${student.currentLevel}-false`] ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Unlock className="h-4 w-4" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLockAtCurrentLevel(student)}
                              disabled={updating[`${student.id}-${student.currentLevel}-true`]}
                            >
                              {updating[`${student.id}-${student.currentLevel}-true`] ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Lock className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentLevelManager;
