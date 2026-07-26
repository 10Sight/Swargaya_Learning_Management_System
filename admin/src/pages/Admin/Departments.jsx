// src/pages/Admin/Departments.jsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useGetAllDepartmentsQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useAssignInstructorMutation,
  useAddStudentToDepartmentMutation,
  useRemoveStudentFromDepartmentMutation,
  useRemoveInstructorMutation,
  useCancelDepartmentMutation,
} from "@/Redux/AllApi/DepartmentApi";
import { useGetAllUsersQuery } from "@/Redux/AllApi/UserApi";
import { useGetCoursesQuery } from "@/Redux/AllApi/CourseApi";
import { useGetAllUnitsQuery } from "@/Redux/AllApi/UnitApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconUsers,
  IconSchool,
  IconUserPlus,
  IconFilter,
  IconX,
  IconLoader,
  IconRefresh,
  IconExternalLink,
  IconUser,
  IconBook,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import SearchInput from "@/components/common/SearchInput";
import FilterSelect from "@/components/common/FilterSelect";
import StatCard from "@/components/common/StatCard";
import FilterBar from "@/components/common/FilterBar";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useSelector } from 'react-redux';
import DepartmentStatusNotifications from "@/components/departments/DepartmentStatusNotifications";
import { useLazyExportDepartmentsQuery } from "@/Redux/AllApi/DepartmentApi";

const Departments = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignInstructorDialogOpen, setIsAssignInstructorDialogOpen] =
    useState(false);
  const [isManageStudentsDialogOpen, setIsManageStudentsDialogOpen] =
    useState(false);
  const [isCancelDepartmentDialogOpen, setIsCancelDepartmentDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelingDepartment, setIsCancelingDepartment] = useState(false);
  const [lastToastId, setLastToastId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    unit: "",
    instructorId: "",
    courseId: "",
    startDate: "",
    endDate: "",
    capacity: 50,
    status: "UPCOMING",
  });
  const [formErrors, setFormErrors] = useState({});
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [unitFilter, setUnitFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [cancelReason, setCancelReason] = useState("");
  const [hoveredBtn, setHoveredBtn] = useState(null);

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const basePath = pathname.startsWith("/superadmin") ? "/superadmin" : "/admin";

  // Get current user from Redux store
  const { user } = useSelector((state) => state.auth);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // API Hooks
  const isSuperAdmin = user?.role === "SUPERADMIN";

  const { data: unitsData } = useGetAllUnitsQuery(undefined, { skip: !isSuperAdmin });
  const allUnits = Array.isArray(unitsData?.data) ? unitsData.data : [];

  const {
    data: departmentsData,
    isLoading,
    error: departmentsError,
    refetch,
  } = useGetAllDepartmentsQuery(
    {
      page: currentPage,
      limit: 10,
      search: debouncedSearchTerm || "",
      ...(isSuperAdmin && unitFilter ? { unit: unitFilter } : {}),
    },
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );

  const [searchParams, setSearchParams] = useSearchParams();

  // Handle auto-open edit dialog from URL params causing navigation from details page


  const {
    data: instructorsData,
    isLoading: instructorsLoading,
    error: instructorsError,
  } = useGetAllUsersQuery(
    { page: 1, limit: 100, role: "INSTRUCTOR" },
    {
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );

  const {
    data: studentsData,
    isLoading: studentsLoading,
    error: studentsError,
  } = useGetAllUsersQuery(
    { page: 1, limit: 200, role: "STUDENT" },
    {
      refetchOnFocus: false,
      refetchOnReconnect: false,
      skip: !isManageStudentsDialogOpen,
    }
  );

  // Add courses query
  const {
    data: coursesData,
    isLoading: coursesLoading,
    error: coursesError,
  } = useGetCoursesQuery(
    { page: 1, limit: 100 },
    {
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );

  const [createDepartment] = useCreateDepartmentMutation();
  const [updateDepartment] = useUpdateDepartmentMutation();
  const [deleteDepartment] = useDeleteDepartmentMutation();
  const [assignInstructor] = useAssignInstructorMutation();
  const [addStudentToDepartment] = useAddStudentToDepartmentMutation();
  const [removeStudentFromDepartment] = useRemoveStudentFromDepartmentMutation();
  const [removeInstructor, { isLoading: isRemovingInstructor }] =
    useRemoveInstructorMutation();
  const [cancelDepartment] = useCancelDepartmentMutation();
  const [triggerExportDepartments, { isFetching: isExportingDepartments }] = useLazyExportDepartmentsQuery();

  const departments = departmentsData?.data?.departments || [];

  // Handle auto-open edit dialog from URL params causing navigation from details page
  useEffect(() => {
    const editValues = searchParams.get("editDepartment");
    if (editValues && departments && departments.length > 0) {
      const deptToEdit = departments.find(d => d._id === editValues);
      if (deptToEdit) {
        openEditDialog(deptToEdit);
        // Clear param so it doesn't reopen on refresh or blocking other actions
        setSearchParams({});
      }
    }
  }, [searchParams, departments]);
  const totalPages = departmentsData?.data?.totalPages || 1;
  const totalCount = departmentsData?.data?.totalDepartments || 0;
  const instructors = instructorsData?.data?.users || [];
  const students = studentsData?.data?.users || [];
  const allCourses = coursesData?.data?.courses || [];

  // Filter options
  const statusOptions = [
    { value: "ALL", label: "All Status" },
    { value: "UPCOMING", label: "Upcoming" },
    { value: "ONGOING", label: "Ongoing" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" },
    { value: "HAS_INSTRUCTOR", label: "Has Instructor" },
    { value: "NO_INSTRUCTOR", label: "No Instructor" },
  ];

  // Active filters
  const activeFilters = useMemo(() => {
    const filters = [];

    if (statusFilter !== "ALL") {
      const statusLabel = statusOptions.find(
        (opt) => opt.value === statusFilter
      )?.label;
      filters.push({ label: "Status", value: statusLabel });
    }

    if (searchTerm) {
      filters.push({ label: "Search", value: searchTerm });
    }

    return filters;
  }, [statusFilter, searchTerm, statusOptions]);

  // Filter departments based on status
  const filteredDepartments = useMemo(() => {
    return departments.filter((department) => {
      const hasInstructor = (department.instructors && department.instructors.length > 0) || !!department.instructor;
      const statusMatch =
        statusFilter === "ALL" ||
        (statusFilter === "HAS_INSTRUCTOR" && hasInstructor) ||
        (statusFilter === "NO_INSTRUCTOR" && !hasInstructor) ||
        department.status === statusFilter;
      return statusMatch;
    });
  }, [departments, statusFilter]);

  // Toast helper
  const showToast = useCallback(
    (type, message) => {
      if (lastToastId) {
        toast.dismiss(lastToastId);
      }
      let toastId;
      if (type === "success") {
        toastId = toast.success(message);
      } else if (type === "error") {
        toastId = toast.error(message);
      } else {
        toastId = toast(message);
      }
      setLastToastId(toastId);
    },
    [lastToastId]
  );

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: "" });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      unit: "",
      instructorId: "",
      courseId: "",
      startDate: "",
      endDate: "",
      capacity: 50,
      status: "UPCOMING",
    });
    setFormErrors({});
    setSelectedStudents([]);
    setSelectedCourses([]);
  };

  const handleCreateDepartment = async () => {
    try {
      if (!formData.name) {
        setFormErrors({ name: "Department name is required" });
        return;
      }

      setIsSubmitting(true);
      await createDepartment({
        ...formData,
        courseIds: selectedCourses,
      }).unwrap();

      showToast("success", "Department created successfully");
      setIsAddDialogOpen(false);
      resetForm();
      refetch();
    } catch (err) {
      showToast("error", err?.data?.message || "Failed to create department");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDepartment = async () => {
    try {
      if (!formData.name) {
        setFormErrors({ name: "Department name is required" });
        return;
      }

      setIsSubmitting(true);
      await updateDepartment({
        id: selectedDepartment._id,
        data: {
          ...formData,
          courseIds: selectedCourses,
        },
      }).unwrap();

      showToast("success", "Department updated successfully");
      setIsEditDialogOpen(false);
      resetForm();
      refetch();
    } catch (err) {
      showToast("error", err?.data?.message || "Failed to update department");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDepartment = async () => {
    try {
      await deleteDepartment(selectedDepartment._id).unwrap();
      showToast("success", "Department deleted successfully");
      setIsDeleteDialogOpen(false);
      refetch();
    } catch (err) {
      showToast("error", err?.data?.message || "Failed to delete department");
    }
  };

  const handleAssignInstructor = async (instructorId) => {
    try {
      const updatedDept = await assignInstructor({
        departmentId: selectedDepartment._id,
        instructorId,
      }).unwrap();
      showToast("success", "Instructor assigned successfully");
      setIsAssignInstructorDialogOpen(false); // Can keep open if multi-select desired? User said "add multiple", so keeping open might be better, or just update state.
      // If we keep dialog open, we must update state.
      setSelectedDepartment(updatedDept.data || updatedDept);
      refetch();
    } catch (err) {
      showToast("error", err?.data?.message || "Failed to assign instructor");
    }
  };

  const handleRemoveInstructor = async (instructorId) => {
    try {
      const updatedDept = await removeInstructor({
        departmentId: selectedDepartment._id,
        instructorId
      }).unwrap();
      showToast("success", "Instructor removed successfully");
      // Update local state so UI reflects removal immediately
      setSelectedDepartment(updatedDept.data || updatedDept);
      refetch();
    } catch (err) {
      showToast("error", err?.data?.message || err?.message || "Failed to remove instructor");
    }
  };


  const handleCancelDepartment = async () => {
    if (!selectedDepartment) return;

    try {
      setIsCancelingDepartment(true);
      await cancelDepartment({
        id: selectedDepartment._id,
        reason: cancelReason
      }).unwrap();

      showToast("success", "Department cancelled successfully");
      setIsCancelDepartmentDialogOpen(false);
      setCancelReason("");
      refetch();
    } catch (err) {
      showToast("error", err?.data?.message || "Failed to cancel department");
    } finally {
      setIsCancelingDepartment(false);
    }
  };

  const handleAddStudents = async () => {
    // Safely extract valid IDs and filter out any undefined/nulls
    const validStudentIds = [...new Set(selectedStudents)].filter(Boolean);

    if (validStudentIds.length === 0) {
      toast.error("Please select at least one valid trainee");
      return;
    }

    try {
      // Single Batch Call
      const res = await addStudentToDepartment({
        departmentId: selectedDepartment._id,
        studentIds: validStudentIds,
      }).unwrap();

      showToast("success", res.message || "Students added successfully");
      setIsManageStudentsDialogOpen(false);
      setSelectedStudents([]);
      refetch();
    } catch (err) {
      console.error(err);
      showToast("error", err?.data?.message || err.message || "Failed to add students");
    }
  };

  const handleRemoveStudent = async ({ departmentId, studentId, studentName }) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to remove ${studentName} from this department?`
    );

    if (!isConfirmed) return;

    try {
      await removeStudentFromDepartment({ departmentId, studentId }).unwrap();
      showToast("success", "Student removed successfully");
      refetch();

      // Update local state if dialog is open
      if (selectedDepartment && selectedDepartment._id === departmentId) {
        setSelectedDepartment(prev => ({
          ...prev,
          students: prev.students.filter(s => s._id !== studentId)
        }));
      }
    } catch (err) {
      showToast("error", err?.data?.message || "Failed to remove student");
    }
  };

  const openEditDialog = (department) => {
    setSelectedDepartment(department);
    // Handle legacy course vs courses array - Normalize to strings
    const deptCourses = department.courses && department.courses.length > 0
      ? department.courses.map(c => String(c._id || c.id))
      : (department.course ? [String(department.course._id || department.course.id)] : []);

    setFormData({
      name: department.name,
      unit: department.unit || "",
      instructorId: department.instructor?._id ? String(department.instructor._id) : "",
      courseId: "", // Legacy field cleared
      startDate: department.startDate
        ? new Date(department.startDate).toISOString().split("T")[0]
        : "",
      endDate: department.endDate
        ? new Date(department.endDate).toISOString().split("T")[0]
        : "",
      capacity: department.capacity || 50,
      status: department.status || "UPCOMING",
    });
    setSelectedCourses(deptCourses);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (department) => {
    setSelectedDepartment(department);
    setIsDeleteDialogOpen(true);
  };

  const openAssignInstructorDialog = (department) => {
    setSelectedDepartment(department);
    setIsAssignInstructorDialogOpen(true);
  };

  const openManageStudentsDialog = (department) => {
    setSelectedDepartment(department);
    setIsManageStudentsDialogOpen(true);
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const getInstructorInfo = (department) => {
    const instructors = department.instructors || (department.instructor ? [department.instructor] : []);

    if (instructors.length === 0) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          No Instructor
        </Badge>
      );
    }

    if (instructors.length === 1) {
      const instructor = instructors[0];
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={instructor.avatar?.url} alt={instructor.fullName} />
            <AvatarFallback className="text-xs">
              {instructor.fullName
                ?.split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{instructor.fullName}</span>
        </div>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center -space-x-2">
              {instructors.slice(0, 3).map((inst, i) => (
                <Avatar key={inst._id || i} className="h-6 w-6 border-2 border-white">
                  <AvatarImage src={inst.avatar?.url} alt={inst.fullName} />
                  <AvatarFallback className="text-[10px]">
                    {inst.fullName?.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
              ))}
              {instructors.length > 3 && (
                <div className="flex items-center justify-center h-6 w-6 rounded-full border-2 border-white bg-[#f3f4f6] text-[10px] font-medium text-[#4b5563]">
                  +{instructors.length - 3}
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-col gap-1">
              {instructors.map((inst) => (
                <span key={inst._id || Math.random()}>{inst.fullName}</span>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getStudentCount = (department) => {
    if (!department) return 0;
    return department.students?.length || 0;
  };

  const getCourseInfo = (department) => {
    const courses = department.courses && department.courses.length > 0
      ? department.courses
      : (department.course ? [department.course] : []);

    if (courses.length === 0) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          No Course
        </Badge>
      );
    }

    if (courses.length === 1) {
      const courseName = courses[0].title || courses[0].name || "Unnamed Course";
      return (
        <div className="flex items-center gap-2">
          <IconBook className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{courseName}</span>
        </div>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-2">
              <IconBook className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary" className="text-xs">
                {courses.length} Courses
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-col gap-1">
              {courses.map(c => (
                <span key={c._id || Math.random()}>{c.title || c.name}</span>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const handleDepartmentClick = (department) => {
    // Navigate to department details or manage page
    // For now, let's open the edit dialog if no dedicated page exists
    // OR if there is a route, navigate to it.
    // Based on typical patterns:
    navigate(`${basePath}/departments/${department._id}`);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      UPCOMING: {
        variant: "secondary",
        label: "Upcoming",
        className: "bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe] hover:bg-[#bfdbfe]"
      },
      ONGOING: {
        variant: "default",
        label: "Ongoing",
        className: "bg-[#dcfce7] text-[#166534] border-[#bbf7d0] hover:bg-[#bbf7d0]"
      },
      COMPLETED: {
        variant: "outline",
        label: "Completed",
        className: "bg-[#f3f4f6] text-[#374151] border-[#d1d5db] hover:bg-[#e5e7eb]"
      },
      CANCELLED: {
        variant: "destructive",
        label: "Cancelled",
        className: "bg-[#fee2e2] text-[#991b1b] border-[#fecaca] hover:bg-[#fecaca] font-medium"
      },
    };

    const config = statusConfig[status] || {
      variant: "outline",
      label: status || 'Unknown',
      className: "bg-[#fef9c3] text-[#854d0e] border-[#fde047]"
    };

    return (
      <Badge
        variant={config.variant}
        className={config.className}
      >
        {config.label}
      </Badge>
    );
  };

  const clearFilters = () => {
    setStatusFilter("ALL");
    setUnitFilter("");
    setSearchTerm("");
    setActiveTab("all");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-10 w-40" />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="p-6">
              <Skeleton className="h-6 w-full mb-4" />
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full mb-2" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (departmentsError) {
    if (departmentsError.status === 401) {
      return (
        <div className="flex flex-col justify-center items-center h-64 space-y-4 p-4">
          <div className="text-[#dc2626] text-lg font-medium">
            Authentication Required
          </div>
          <p className="text-[#4b5563] text-center">
            Please log in as an admin to view departments
          </p>
          <Button
            onClick={() => (window.location.href = "/login")}
            variant="outline"
          >
            Go to Login
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4 p-4">
        <div className="text-[#dc2626] text-lg font-medium">
          Error loading departments
        </div>
        <p className="text-[#4b5563] text-center">
          {departmentsError?.message || "Failed to fetch departments"}
        </p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <IconRefresh className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Departments"
          value={totalCount}
          description="All created departments"
          icon={IconSchool}
          iconBgColor="bg-[#dbeafe]"
          iconColor="text-[#2563eb]"
          gradientFrom="from-[#eff6ff]"
          gradientTo="to-[#dbeafe]"
          borderColor="border-[#bfdbfe]"
          textColor="text-[#1e40af]"
          valueColor="text-[#1e3a8a]"
        />

        <StatCard
          title="Assigned Departments"
          value={departments.filter((d) => (d.instructors && d.instructors.length > 0) || d.instructor).length}
          description="With instructors"
          icon={IconUser}
          iconBgColor="bg-[#dcfce7]"
          iconColor="text-[#16a34a]"
          gradientFrom="from-[#f0fdf4]"
          gradientTo="to-[#dcfce7]"
          borderColor="border-[#bbf7d0]"
          textColor="text-[#166534]"
          valueColor="text-[#14532d]"
        />

        <StatCard
          title="Total Trainees"
          value={departments.reduce(
            (total, department) => total + getStudentCount(department),
            0
          )}
          description="Across all departments"
          icon={IconUsers}
          iconBgColor="bg-[#f3e8ff]"
          iconColor="text-[#9333ea]"
          gradientFrom="from-[#faf5ff]"
          gradientTo="to-[#f3e8ff]"
          borderColor="border-[#e9d5ff]"
          textColor="text-[#6b21a8]"
          valueColor="text-[#581c87]"
        />
      </div>

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger
              value="all"
              onClick={() => {
                setActiveTab("all");
                setStatusFilter("ALL");
              }}
            >
              All ({departments.length})
            </TabsTrigger>
            <TabsTrigger
              value="assigned"
              onClick={() => {
                setActiveTab("assigned");
                setStatusFilter("HAS_INSTRUCTOR");
              }}
            >
              Assigned ({departments.filter(d => (d.instructors && d.instructors.length > 0) || d.instructor).length})
            </TabsTrigger>
            <TabsTrigger
              value="unassigned"
              onClick={() => {
                setActiveTab("unassigned");
                setStatusFilter("NO_INSTRUCTOR");
              }}
            >
              Unassigned ({departments.filter(d => (!d.instructors || d.instructors.length === 0) && !d.instructor).length})
            </TabsTrigger>
          </TabsList>

          <Button
            onClick={() => setIsAddDialogOpen(true)}
            style={{
              backgroundColor: hoveredBtn === 'create-dept' ? '#1d4ed8' : '#2563eb',
              color: '#ffffff',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={() => setHoveredBtn('create-dept')}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            <IconPlus className="h-4 w-4 mr-2" />
            Create Department
          </Button>
        </div>
      </Tabs>

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <SearchInput
              placeholder="Search departments by name..."
              value={searchTerm}
              onChange={setSearchTerm}
              className="w-full sm:w-96"
            />

            <div className="flex flex-wrap gap-2">
              <FilterSelect
                value={statusFilter}
                onValueChange={setStatusFilter}
                options={statusOptions}
                placeholder="Status"
                icon={IconFilter}
              />

              {isSuperAdmin && (
                <Select value={unitFilter || "ALL"} onValueChange={(v) => { setUnitFilter(v === "ALL" ? "" : v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All Units" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Units</SelectItem>
                    {allUnits.map((u) => (
                      <SelectItem key={u._id || u.id} value={u.title}>
                        {u.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {(statusFilter !== "ALL" || searchTerm || unitFilter) && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="gap-1"
                >
                  <IconX className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isExportingDepartments}
                onClick={async () => {
                  try {
                    const { data } = await triggerExportDepartments({
                      format: 'excel',
                      search: debouncedSearchTerm || '',
                      status: statusFilter !== 'ALL' ? statusFilter : ''
                    });
                    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `departments_${new Date().toISOString().slice(0, 10)}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch { }
                }}
              >
                Export Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isExportingDepartments}
                onClick={async () => {
                  try {
                    const { data } = await triggerExportDepartments({
                      format: 'pdf',
                      search: debouncedSearchTerm || '',
                      status: statusFilter !== 'ALL' ? statusFilter : ''
                    });
                    const blob = new Blob([data], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `departments_${new Date().toISOString().slice(0, 10)}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch { }
                }}
              >
                Export PDF
              </Button>
            </div>
          </div>

          <FilterBar
            filters={activeFilters}
            onClearFilters={clearFilters}
            className="mt-3"
          />
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[220px]">Department Name</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Trainees</TableHead>
                {isSuperAdmin && <TableHead>Unit</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepartments.length > 0 ? (
                filteredDepartments.map((department) => (
                  <TableRow
                    key={department._id}
                    className="group hover:bg-muted/30"
                    onClick={() => handleDepartmentClick(department)}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div
                          className="p-2 rounded-full"
                          style={{ backgroundColor: '#dbeafe' }}
                        >
                          <IconSchool
                            className="h-5 w-5"
                            style={{ color: '#2563eb' }}
                          />
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: '#0f172a' }}>
                            {department.name}
                          </p>
                        </div>
                        <IconExternalLink
                          className="h-4 w-4 transition-opacity"
                          style={{
                            color: '#64748b',
                            opacity: 0
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>{getCourseInfo(department)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getInstructorInfo(department)}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAssignInstructorDialog(department);
                                }}
                                className="h-7 w-7 p-0 transition-opacity"
                                style={{
                                  opacity: 0,
                                  backgroundColor: hoveredBtn === `assign-${department._id}` ? '#f1f5f9' : 'transparent'
                                }}
                                onMouseEnter={() => setHoveredBtn(`assign-${department._id}`)}
                                onMouseLeave={() => setHoveredBtn(null)}
                              >
                                <IconPencil className="h-3 w-3" style={{ color: '#64748b' }} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Assign instructor</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <IconUsers className="h-3 w-3" />
                          {getStudentCount(department)} trainees
                        </Badge>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 transition-opacity"
                              style={{
                                opacity: 0,
                                backgroundColor: hoveredBtn === `manage-${department._id}` ? '#f1f5f9' : 'transparent'
                              }}
                              onMouseEnter={() => setHoveredBtn(`manage-${department._id}`)}
                              onMouseLeave={() => setHoveredBtn(null)}
                            >
                              <IconUserPlus className="h-3 w-3" style={{ color: '#64748b' }} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openManageStudentsDialog(department);
                              }}
                            >
                              <IconUserPlus className="h-4 w-4 mr-2" />
                              Manage Trainees
                            </DropdownMenuItem>

                            {department.students && department.students.length > 0 && (
                              <>
                                <DropdownMenuSeparator />
                                <div className="max-h-48 overflow-y-auto">
                                  {department.students.slice(0, 5).map((student) => (
                                    <DropdownMenuItem
                                      key={student._id}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleRemoveStudent({ departmentId: department._id, studentId: student._id, studentName: student.fullName });
                                      }}
                                      style={{ color: '#dc2626' }}
                                      className="focus:bg-[#fef2f2] focus:text-[#dc2626]"
                                    >
                                      <IconTrash className="h-4 w-4 mr-2" />
                                      Remove {student.fullName}
                                    </DropdownMenuItem>
                                  ))}
                                </div>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        {department.unit
                          ? <Badge variant="outline" className="text-xs">{department.unit}</Badge>
                          : <span className="text-xs text-muted-foreground">Global</span>}
                      </TableCell>
                    )}
                    <TableCell>{getStatusBadge(department.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {new Date(department.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(department.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDialog(department);
                                }}
                                className="h-8 w-8 p-0"
                                style={{
                                  backgroundColor: hoveredBtn === `edit-${department._id}` ? '#f1f5f9' : 'transparent'
                                }}
                                onMouseEnter={() => setHoveredBtn(`edit-${department._id}`)}
                                onMouseLeave={() => setHoveredBtn(null)}
                              >
                                <IconPencil className="h-4 w-4" style={{ color: '#64748b' }} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit department</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {department.status !== 'CANCELLED' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDepartment(department);
                                    setIsCancelDepartmentDialogOpen(true);
                                  }}
                                  className="h-8 w-8 p-0"
                                  style={{
                                    color: hoveredBtn === `cancel-${department._id}` ? '#9a3412' : '#ea580c',
                                    backgroundColor: hoveredBtn === `cancel-${department._id}` ? '#fff7ed' : 'transparent'
                                  }}
                                  onMouseEnter={() => setHoveredBtn(`cancel-${department._id}`)}
                                  onMouseLeave={() => setHoveredBtn(null)}
                                >
                                  <IconX className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Cancel department</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteDialog(department);
                                }}
                                className="h-8 w-8 p-0"
                                style={{
                                  color: hoveredBtn === `delete-${department._id}` ? '#991b1b' : '#dc2626',
                                  backgroundColor: hoveredBtn === `delete-${department._id}` ? '#fef2f2' : 'transparent'
                                }}
                                onMouseEnter={() => setHoveredBtn(`delete-${department._id}`)}
                                onMouseLeave={() => setHoveredBtn(null)}
                              >
                                <IconTrash className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete department</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 8 : 7} className="text-center py-10">
                    <div className="flex flex-col items-center space-y-3">
                      <IconSchool className="h-12 w-12 text-muted-foreground/60" />
                      <p className="text-muted-foreground font-medium">
                        No departments found
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm || statusFilter !== "ALL"
                          ? "Try adjusting your search or filters"
                          : "Create your first department to get started"}
                      </p>
                      {(searchTerm || statusFilter !== "ALL") && (
                        <Button
                          variant="outline"
                          onClick={clearFilters}
                          className="mt-2"
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredDepartments.length} of {totalCount} departments
          </p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </Button>
            <div className="flex items-center justify-center px-4 text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Department Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconPlus className="h-5 w-5" />
              Create New Department
            </DialogTitle>
            <DialogDescription>
              Create a new department. You can assign an instructor later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Department Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter department name"
                className={
                  formErrors.name ? "border-[#ef4444] focus:border-[#ef4444]" : ""
                }
              />
              {formErrors.name && (
                <p className="text-sm text-[#dc2626]">{formErrors.name}</p>
              )}
            </div>

            {isSuperAdmin && (
              <div className="grid gap-2">
                <Label>Unit (Optional)</Label>
                <Select
                  value={formData.unit || "none"}
                  onValueChange={(v) => setFormData({ ...formData, unit: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit (Global if none)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Global (No unit)</SelectItem>
                    {allUnits.map((u) => (
                      <SelectItem key={u._id || u.id} value={u.title}>
                        {u.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Courses (Optional)</Label>
              <div className="space-y-3">
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (value && value !== "loading" && value !== "error" && value !== "none" && !selectedCourses.map(String).includes(String(value))) {
                      setSelectedCourses([...selectedCourses, String(value)]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add courses..." />
                  </SelectTrigger>
                  <SelectContent>
                    {coursesLoading ? (
                      <SelectItem value="loading" disabled>
                        <div className="flex items-center gap-2">
                          <IconLoader className="h-4 w-4 animate-spin" />
                          Loading courses...
                        </div>
                      </SelectItem>
                    ) : coursesError ? (
                      <SelectItem value="error" disabled>
                        Error loading courses
                      </SelectItem>
                    ) : allCourses.length > 0 ? (
                      allCourses.map((course) => (
                        <SelectItem key={course._id || course.id} value={String(course._id || course.id)}>
                          {course.title || course.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No courses available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {selectedCourses.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/20">
                    {selectedCourses.map((courseId) => {
                      const course = allCourses.find((c) => String(c._id || c.id) === String(courseId));
                      return (
                        <Badge key={courseId} variant="secondary" className="flex items-center gap-1 pl-2 pr-1 py-1">
                          {course?.title || course?.name || "Loading..."}
                          <div
                            className="ml-1 hover:bg-[#fecaca] rounded-full p-0.5 cursor-pointer transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCourses(prev => prev.filter(id => id !== courseId));
                            }}
                          >
                            <IconX className="h-3 w-3 text-[#dc2626]" />
                          </div>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="instructorId">Instructor (Optional)</Label>
              <Select
                value={formData.instructorId ? String(formData.instructorId) : ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, instructorId: value ? Number(value) : "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an instructor" />
                </SelectTrigger>
                <SelectContent>
                  {instructorsLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading instructors...
                    </SelectItem>
                  ) : instructorsError ? (
                    <SelectItem value="error" disabled>
                      Error loading instructors
                    </SelectItem>
                  ) : instructors.length > 0 ? (
                    instructors.map((instructor) => (
                      <SelectItem key={instructor._id} value={String(instructor._id)}>
                        {instructor.fullName} ({instructor.email})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No instructors available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date (Optional)</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="capacity">Capacity (Optional)</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={handleInputChange}
                placeholder="Enter capacity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateDepartment}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting && <IconLoader className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Creating..." : "Create Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconPencil className="h-5 w-5" />
              Edit Department
            </DialogTitle>
            <DialogDescription>Update department information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Department Name *</Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter department name"
              />
            </div>

            {isSuperAdmin && (
              <div className="grid gap-2">
                <Label>Unit</Label>
                <Select
                  value={formData.unit || "none"}
                  onValueChange={(v) => setFormData({ ...formData, unit: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit (Global if none)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Global (No unit)</SelectItem>
                    {allUnits.map((u) => (
                      <SelectItem key={u._id || u.id} value={u.title}>
                        {u.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Courses</Label>
              <div className="space-y-3">
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (value && value !== "loading" && value !== "error" && value !== "none" && !selectedCourses.map(String).includes(String(value))) {
                      setSelectedCourses([...selectedCourses, String(value)]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add courses..." />
                  </SelectTrigger>
                  <SelectContent>
                    {coursesLoading ? (
                      <SelectItem value="loading" disabled>
                        <div className="flex items-center gap-2">
                          <IconLoader className="h-4 w-4 animate-spin" />
                          Loading courses...
                        </div>
                      </SelectItem>
                    ) : coursesError ? (
                      <SelectItem value="error" disabled>
                        Error loading courses
                      </SelectItem>
                    ) : allCourses.length > 0 ? (
                      allCourses.map((course) => (
                        <SelectItem key={course._id || course.id} value={String(course._id || course.id)}>
                          {course.title || course.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No courses available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {selectedCourses.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/20">
                    {selectedCourses.map((courseId) => {
                      const course = allCourses.find((c) => String(c._id || c.id) === String(courseId));
                      // Fallback if course not found in list (e.g. pagination limit)
                      // In real app we might need to fetch it or rely on department data if available
                      return (
                        <Badge key={courseId} variant="secondary" className="flex items-center gap-1 pl-2 pr-1 py-1">
                          {course?.title || course?.name || "Unknown Course"}
                          <div
                            className="ml-1 hover:bg-[#fecaca] rounded-full p-0.5 cursor-pointer transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCourses(prev => prev.filter(id => id !== courseId));
                            }}
                          >
                            <IconX className="h-3 w-3 text-[#dc2626]" />
                          </div>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPCOMING">Upcoming</SelectItem>
                  <SelectItem value="ONGOING">Ongoing</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-startDate">Start Date</Label>
                <Input
                  id="edit-startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-endDate">End Date</Label>
                <Input
                  id="edit-endDate"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-capacity">Capacity</Label>
              <Input
                id="edit-capacity"
                name="capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={handleInputChange}
                placeholder="Enter capacity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDepartment}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting && <IconLoader className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Updating..." : "Update Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#dc2626]">
              <IconTrash className="h-5 w-5" />
              Delete Department
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the department "{selectedDepartment?.name}"?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDepartment}
              className="gap-2"
            >
              <IconTrash className="h-4 w-4" />
              Delete Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Instructor Dialog */}
      <Dialog
        open={isAssignInstructorDialogOpen}
        onOpenChange={setIsAssignInstructorDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconUser className="h-5 w-5" />
              {selectedDepartment?.instructor
                ? "Reassign Instructor"
                : "Assign Instructor"}
            </DialogTitle>
            <DialogDescription>
              {selectedDepartment?.instructor
                ? `Change instructor for department "${selectedDepartment?.name}"`
                : `Assign an instructor to the department "${selectedDepartment?.name}"`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {(selectedDepartment?.instructors?.length > 0 || selectedDepartment?.instructor) && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Current Instructors</h4>
                <div className="space-y-2">
                  {(selectedDepartment.instructors || [selectedDepartment.instructor]).filter(Boolean).map(inst => (
                    <div key={inst._id} className="flex items-center justify-between p-3 rounded-lg border bg-[#eff6ff]/50 border-[#dbeafe]">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={inst.avatar?.url} />
                          <AvatarFallback>{inst.fullName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{inst.fullName}</p>
                          <p className="text-xs text-muted-foreground">{inst.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isRemovingInstructor}
                        onClick={() => handleRemoveInstructor(inst._id)}
                        className="h-8 w-8 text-[#ef4444] hover:text-[#b91c1c] hover:bg-[#fef2f2]"
                      >
                        {isRemovingInstructor ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconX className="h-4 w-4" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-2">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Available Instructors</h4>
            </div>

            {instructorsLoading ? (
              <div className="flex justify-center py-8">
                <IconLoader className="h-6 w-6 animate-spin" />
              </div>
            ) : instructorsError ? (
              <div className="text-center text-[#dc2626] py-4">
                Error loading instructors
              </div>
            ) : instructors.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No instructors available
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {instructors.map((instructor) => {
                  const isAssigned = (selectedDepartment?.instructors || [selectedDepartment?.instructor])
                    .some(i => i && i._id === instructor._id);

                  return (
                    <div
                      key={instructor._id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isAssigned ? "bg-muted opacity-60" : "cursor-pointer hover:bg-muted"
                        }`}
                      onClick={() => !isAssigned && handleAssignInstructor(instructor._id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={instructor.avatar?.url} alt={instructor.fullName} />
                          <AvatarFallback className="text-xs">
                            {instructor.fullName?.split(" ").map((n) => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{instructor.fullName}</p>
                          <p className="text-sm text-muted-foreground">{instructor.email}</p>
                        </div>
                      </div>
                      {isAssigned && (
                        <Badge variant="secondary" className="text-xs">Assigned</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAssignInstructorDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Students Dialog */}
      <Dialog
        open={isManageStudentsDialogOpen}
        onOpenChange={setIsManageStudentsDialogOpen}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconUsers className="h-5 w-5" />
              Manage Trainees
            </DialogTitle>
            <DialogDescription>
              Manage trainees in the department "{selectedDepartment?.name}".
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="add" className="w-full flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add">Add Trainees</TabsTrigger>
              <TabsTrigger value="remove">Remove Trainees</TabsTrigger>
            </TabsList>

            <TabsContent
              value="add"
              className="flex-1 overflow-hidden flex flex-col"
            >
              <div className="py-4 flex-1 overflow-hidden">
                {studentsLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <IconLoader className="h-6 w-6 animate-spin" />
                  </div>
                ) : studentsError ? (
                  <div className="text-center text-[#dc2626] py-4">
                    Error loading trainees
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No trainees available
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {students
                      .filter(
                        (student) =>
                          !selectedDepartment?.students?.some(
                            (s) => s._id === student._id
                          )
                      )
                      .map((student) => {
                        const rawId = student._id || student.id;
                        if (!rawId) return null;
                        const sId = String(rawId);
                        const isSelected = selectedStudents.includes(sId);

                        return (
                          <div
                            key={sId}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isSelected
                              ? "bg-[#eff6ff] border-[#bfdbfe]"
                              : "hover:bg-muted"
                              }`}
                            onClick={() => toggleStudentSelection(sId)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={student.avatar?.url}
                                  alt={student.fullName}
                                />
                                <AvatarFallback className="text-xs">
                                  {student.fullName
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {student.fullName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {student.email}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <Badge variant="secondary">Selected</Badge>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
              <DialogFooter className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {selectedStudents.length} trainee(s) selected
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsManageStudentsDialogOpen(false);
                      setSelectedStudents([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddStudents}
                    disabled={selectedStudents.length === 0}
                    className="gap-2"
                  >
                    <IconUserPlus className="h-4 w-4" />
                    Add Selected Trainees
                  </Button>
                </div>
              </DialogFooter>
            </TabsContent>

            <TabsContent
              value="remove"
              className="flex-1 overflow-hidden flex flex-col"
            >
              <div className="py-4 flex-1 overflow-hidden">
                {!selectedDepartment?.students ||
                  selectedDepartment.students.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No trainees in this department
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedDepartment.students.map((student) => (
                      <div
                        key={student._id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={student.avatar?.url}
                              alt={student.fullName}
                            />
                            <AvatarFallback className="text-xs">
                              {student.fullName
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{student.fullName}</p>
                            <p className="text-sm text-muted-foreground">
                              {student.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveStudent({ departmentId: selectedDepartment?._id, studentId: student._id, studentName: student.fullName })}
                          className="gap-1"
                          disabled={!selectedDepartment?._id}
                        >
                          <IconTrash className="h-3 w-3" />
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsManageStudentsDialogOpen(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Cancel Department Confirmation Dialog */}
      <Dialog open={isCancelDepartmentDialogOpen} onOpenChange={setIsCancelDepartmentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#ea580c]">
              <IconX className="h-5 w-5" />
              Cancel Department
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the department "{selectedDepartment?.name}"?
              This will notify all enrolled trainees and the instructor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cancel-reason">Reason for Cancellation (Optional)</Label>
              <Input
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter reason for cancelling this department..."
                disabled={isCancelingDepartment}
              />
              <p className="text-sm text-muted-foreground">
                This reason will be included in notifications sent to affected users.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCancelDepartmentDialogOpen(false)}
              disabled={isCancelingDepartment}
            >
              Keep Department
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelDepartment}
              disabled={isCancelingDepartment}
              className="gap-2 bg-orange-600 hover:bg-orange-700"
            >
              {isCancelingDepartment ? (
                <IconLoader className="h-4 w-4 animate-spin" />
              ) : (
                <IconX className="h-4 w-4" />
              )}
              {isCancelingDepartment ? "Canceling..." : "Cancel Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Departments;
