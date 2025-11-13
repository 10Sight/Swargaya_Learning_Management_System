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
import { useGetAllBatchesQuery, useGetBatchProgressQuery } from "@/Redux/AllApi/BatchApi";
import { useGetActiveConfigQuery } from "@/Redux/AllApi/CourseLevelConfigApi";

const StudentLevelManager = () => {
  const [students, setStudents] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(() => {
    // Restore last selected batch from localStorage if available
    try {
      return localStorage.getItem("selectedBatchId") || "";
    } catch {
      return "";
    }
  });
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState({});

  // Fetch all batches using RTK Query
  const { data: batchesData, isLoading: batchesLoading } = useGetAllBatchesQuery({ limit: 100 });
  const batches = batchesData?.data?.batches || [];
  
  // Fetch active level configuration
  const { data: levelConfigData, isLoading: configLoading } = useGetActiveConfigQuery();
  const levelConfig = levelConfigData?.data;
  const availableLevels = levelConfig?.levels || [
    { name: "L1", color: "#3B82F6" },
    { name: "L2", color: "#F97316" },
    { name: "L3", color: "#10B981" },
  ];

  // Get course ID from selected batch
  const selectedBatchData = batches.find(batch => batch._id === selectedBatch);
  const courseId = selectedBatchData?.course?._id || selectedBatchData?.courseId;

  // Auto-select first batch if none selected and batches are available
  useEffect(() => {
    if (!selectedBatch && batches.length > 0 && !batchesLoading) {
      const firstBatch = batches[0];
      setSelectedBatch(firstBatch._id);
      try { localStorage.setItem("selectedBatchId", firstBatch._id); } catch {}
    }
  }, [batches, selectedBatch, batchesLoading]);

  // Fetch batch progress using RTK Query
  const { data: batchProgressData, isLoading: progressLoading, refetch: refetchProgress } = useGetBatchProgressQuery(
    selectedBatch,
    { skip: !selectedBatch }
  );

  // Update students when batch progress data changes
  useEffect(() => {
    if (batchProgressData?.data?.batchProgress && Array.isArray(batchProgressData.data.batchProgress)) {
      const progressData = batchProgressData.data.batchProgress;
      
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
        progressId: null, // Not available in batch progress
        courseId: selectedBatchData?.course?._id // Use course ID from selected batch
      }));
      
      setStudents(studentsWithProgress);
    } else if (selectedBatch && !progressLoading) {
      setStudents([]);
    }
  }, [batchProgressData, selectedBatch, progressLoading, selectedBatchData]);

  // Handle batch selection
  const handleBatchChange = (batchId) => {
    setSelectedBatch(batchId);
    try { localStorage.setItem("selectedBatchId", batchId || ""); } catch {}
    if (!batchId) {
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
        throw new Error(response.data.message || "Failed to update student level");
      }
    } catch (error) {
      console.error("Error setting student level:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to update student level";
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
            Control student level progression and set level locks to prevent automatic promotions. Select a batch to manage its students.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="batch-select">Select Batch:</Label>
            <Select value={selectedBatch} onValueChange={handleBatchChange} disabled={batchesLoading}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder={batchesLoading ? "Loading batches..." : "Choose a batch to manage"} />
              </SelectTrigger>
              <SelectContent>
                {batches.map((batch) => (
                  <SelectItem key={batch._id} value={batch._id}>
                    {batch.name} - {batch.course?.title || 'No Course'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBatch && (
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
      {selectedBatch && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Level Lock:</strong> When enabled, prevents automatic level promotions when students complete modules. 
            The student will remain at the locked level regardless of their progress.
          </AlertDescription>
        </Alert>
      )}

      {/* Students Table */}
      {selectedBatch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Students ({students.length}) - {selectedBatchData?.name}
            </CardTitle>
            <CardDescription>
              Manage individual student levels and lock settings for {selectedBatchData?.course?.title || 'this batch'}
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
                No students enrolled in this batch
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
