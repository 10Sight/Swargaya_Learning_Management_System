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

const StudentLevelManager = () => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState({});

  // Fetch courses on component mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axiosInstance.get("/api/courses");
        // The backend returns { data: { total, page, limit, courses } }
        const coursesData = response.data?.data?.courses || [];
        setCourses(Array.isArray(coursesData) ? coursesData : []);
      } catch (error) {
        console.error("Error fetching courses:", error);
        toast.error("Failed to load courses");
      }
    };
    fetchCourses();
  }, []);

  // Fetch students progress for selected course
  const fetchStudentProgress = async (courseId) => {
    if (!courseId) return;
    
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/api/progress/course/${courseId}`);
      const progressData = response.data?.data || [];
      
      // Transform progress data to include student info
      const studentsWithProgress = progressData.map(progress => ({
        id: progress.student._id || progress.student.id,
        name: progress.student.fullName || progress.student.name || "Unknown",
        email: progress.student.email || "No email",
        currentLevel: progress.currentLevel || "L1",
        levelLockEnabled: progress.levelLockEnabled || false,
        lockedLevel: progress.lockedLevel || null,
        progressPercent: progress.progressPercent || 0,
        completedModules: progress.completedModules?.length || 0,
        lastAccessed: progress.lastAccessed,
        progressId: progress._id
      }));
      
      setStudents(studentsWithProgress);
    } catch (error) {
      console.error("Error fetching student progress:", error);
      toast.error("Failed to load student progress");
    } finally {
      setLoading(false);
    }
  };

  // Handle course selection
  const handleCourseChange = (courseId) => {
    setSelectedCourse(courseId);
    if (courseId) {
      fetchStudentProgress(courseId);
    } else {
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
        courseId: selectedCourse,
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

  const getLevelColor = (level) => {
    switch (level) {
      case "L1": return "bg-blue-100 text-blue-800";
      case "L2": return "bg-orange-100 text-orange-800";
      case "L3": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
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
            Control student level progression and set level locks to prevent automatic promotions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="course-select">Select Course:</Label>
            <Select value={selectedCourse} onValueChange={handleCourseChange}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Choose a course to manage" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course._id || course.id} value={course._id || course.id}>
                    {course.title || course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCourse && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchStudentProgress(selectedCourse)}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Level Lock Info */}
      {selectedCourse && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Level Lock:</strong> When enabled, prevents automatic level promotions when students complete modules. 
            The student will remain at the locked level regardless of their progress.
          </AlertDescription>
        </Alert>
      )}

      {/* Students Table */}
      {selectedCourse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Students ({students.length})
            </CardTitle>
            <CardDescription>
              Manage individual student levels and lock settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading students...
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No students enrolled in this course
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
                        <Badge className={getLevelColor(student.currentLevel)}>
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
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="L1">L1</SelectItem>
                              <SelectItem value="L2">L2</SelectItem>
                              <SelectItem value="L3">L3</SelectItem>
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
