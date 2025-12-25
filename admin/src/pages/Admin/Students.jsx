// src/pages/Admin/Students.jsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  useGetAllStudentsQuery,
} from "@/Redux/AllApi/InstructorApi";
import { useUserRegisterMutation } from "@/Redux/AllApi/AuthApi";
import {
  useUpdateUserMutation,
  useDeleteUserMutation,
} from "@/Redux/AllApi/UserApi";
import {
  useGetAllDepartmentsQuery,
  useAddStudentToDepartmentMutation,
} from "@/Redux/AllApi/DepartmentApi";
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
  IconInfoCircle,
  IconExternalLink,
  IconUser,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

// Import reusable components
import SearchInput from "@/components/common/SearchInput";
import FilterSelect from "@/components/common/FilterSelect";
import StatCard from "@/components/common/StatCard";
import FilterBar from "@/components/common/FilterBar";
import { useNavigate } from "react-router-dom";
import { useLazyExportStudentsQuery } from "@/Redux/AllApi/UserApi";

const normalizeStatus = (status) => {
  switch (status) {
    case "ACTIVE":
      return "PRESENT";
    case "PENDING":
      return "ON_LEAVE";
    case "SUSPENDED":
    case "BANNED":
      return "ABSENT";
    default:
      return status || "";
  }
};

const Students = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastToastId, setLastToastId] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    userName: "",
    email: "",
    phoneNumber: "",
    password: "",
    status: "PRESENT",
    unit: "UNIT_1",
  });
  const [formErrors, setFormErrors] = useState({});
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [unitFilter, setUnitFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("all");

  const navigate = useNavigate();

  const handleStudentClick = (student) => {
    const handle = student.slug || student._id;
    navigate(`${handle}`);
  };

  // Debounce search term to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // API Hooks
  const {
    data: studentsData,
    isLoading,
    error: studentsError,
    refetch,
  } = useGetAllStudentsQuery(
    {
      page: currentPage,
      limit: 10,
      search: debouncedSearchTerm || "",
      status: statusFilter !== "ALL" ? statusFilter : "",
      unit: unitFilter !== "ALL" ? unitFilter : "",
    },
    {
      // Prevent unnecessary refetches
      refetchOnMountOrArgChange: true,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );
  const {
    data: departmentsData,
    isLoading: departmentsLoading,
    error: departmentsError,
  } = useGetAllDepartmentsQuery(
    {},
    {
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );
  const [registerStudent] = useUserRegisterMutation();
  const [updateStudent] = useUpdateUserMutation();
  const [deleteStudent] = useDeleteUserMutation();
  const [assignStudent] = useAddStudentToDepartmentMutation();

  const students = studentsData?.data?.users || [];
  const [triggerExportStudents, { isFetching: isExportingStudents }] = useLazyExportStudentsQuery();
  const totalPages = studentsData?.data?.totalPages || 1;
  const departments = departmentsData?.data?.departments || [];

  // Filter options for reusable components
  const statusOptions = [
    { value: "ALL", label: "All Status" },
    { value: "PRESENT", label: "Present" },
    { value: "ON_LEAVE", label: "On Leave" },
    { value: "ABSENT", label: "Absent" },
  ];

  const departmentOptions = [
    { value: "ALL", label: "All Departments" },
    { value: "HAS_DEPARTMENT", label: "Has Department" },
    { value: "NO_DEPARTMENT", label: "No Department" },
  ];

  const unitOptions = [
    { value: "ALL", label: "All Units" },
    { value: "UNIT_1", label: "Unit 1" },
    { value: "UNIT_2", label: "Unit 2" },
    { value: "UNIT_3", label: "Unit 3" },
    { value: "UNIT_4", label: "Unit 4" },
    { value: "UNIT_5", label: "Unit 5" },
  ];

  // Active filters for FilterBar
  const activeFilters = useMemo(() => {
    const filters = [];

    if (statusFilter !== "ALL") {
      const statusLabel = statusOptions.find(
        (opt) => opt.value === statusFilter
      )?.label;
      filters.push({ label: "Status", value: statusLabel });
    }

    if (departmentFilter !== "ALL") {
      const departmentLabel = departmentOptions.find(
        (opt) => opt.value === departmentFilter
      )?.label;
      filters.push({ label: "Department", value: departmentLabel });
    }

    if (unitFilter !== "ALL") {
      const unitLabel = unitOptions.find((opt) => opt.value === unitFilter)?.label;
      filters.push({ label: "Unit", value: unitLabel });
    }

    if (searchTerm) {
      filters.push({ label: "Search", value: searchTerm });
    }

    return filters;
  }, [statusFilter, departmentFilter, searchTerm, statusOptions, departmentOptions]);

  // Filter students based on department and unit (status handled by API)
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const departmentMatch =
        departmentFilter === "ALL" ||
        (departmentFilter === "HAS_DEPARTMENT" && student.department) ||
        (departmentFilter === "NO_DEPARTMENT" && !student.department);

      const unitMatch =
        unitFilter === "ALL" || student.unit === unitFilter;

      return departmentMatch && unitMatch;
    });
  }, [students, departmentFilter, unitFilter]);

  // Toast helpers to prevent spam
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

    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: "" });
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      userName: "",
      email: "",
      phoneNumber: "",
      password: "",
      status: "PRESENT",
      unit: "UNIT_1",
    });
    setFormErrors({});
  };

  const handleAddStudent = async () => {
    // Reset previous errors
    setFormErrors({});
    const errors = {};

    // Validate required fields
    if (!formData.fullName?.trim()) {
      errors.fullName = "Full name is required";
    }
    if (!formData.userName?.trim()) {
      errors.userName = "Username is required";
    }
    if (!formData.email?.trim()) {
      errors.email = "Email is required";
    }
    if (!formData.phoneNumber?.trim()) {
      errors.phoneNumber = "Phone number is required";
    }
    if (!formData.password?.trim()) {
      errors.password = "Password is required";
    }
    if (!formData.unit) {
      errors.unit = "Unit is required";
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email?.trim() && !emailRegex.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address";
    }

    // Validate username format (no spaces, minimum length)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (
      formData.userName?.trim() &&
      !usernameRegex.test(formData.userName.trim())
    ) {
      errors.userName =
        "Username must be 3-20 characters long and contain only letters, numbers, and underscores";
    }

    // Validate password length
    if (formData.password?.trim() && formData.password.trim().length < 6) {
      errors.password = "Password must be at least 6 characters long";
    }

    // If there are validation errors, show them and return
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast("error", "Please fix the form errors before submitting");
      return;
    }

    // Prevent double submission
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Prepare data for register API
      const studentData = {
        fullName: formData.fullName.trim(),
        userName: formData.userName.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: formData.phoneNumber.trim(),
        password: formData.password.trim(),
        role: "STUDENT",
        unit: formData.unit,
      };

      const result = await registerStudent(studentData).unwrap();
      showToast("success", "Student registered successfully!");
      setIsAddDialogOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      console.error("Register student error:", error);
      console.error("Error details:", {
        status: error?.status,
        data: error?.data,
        message: error?.message,
        originalStatus: error?.originalStatus,
      });

      let errorMessage = "Failed to register student. Please try again.";

      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.status === 401) {
        errorMessage = "Authentication required. Please log in as an admin.";
      } else if (error?.status === 403) {
        errorMessage = "Access denied. Admin privileges required.";
      } else if (error?.status === 400) {
        errorMessage =
          error?.data?.message ||
          "Invalid data provided. Please check all fields.";
      } else if (error?.status === 409 || error?.message?.includes("already")) {
        errorMessage =
          "Email or username already exists. Please use different values.";
      } else if (error?.status === 0 || error?.message?.includes("Network")) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      showToast("error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStudent = async () => {
    if (
      !formData.fullName?.trim() ||
      !formData.userName?.trim() ||
      !formData.email?.trim() ||
      !formData.phoneNumber?.trim()
    ) {
      showToast("error", "All fields are required");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { password, ...updateData } = formData;
      const cleanedData = {
        fullName: updateData.fullName.trim(),
        userName: updateData.userName.trim().toLowerCase(),
        email: updateData.email.trim().toLowerCase(),
        phoneNumber: updateData.phoneNumber.trim(),
        status: updateData.status,
        unit: updateData.unit,
      };

      await updateStudent({
        id: selectedStudent._id,
        ...cleanedData,
      }).unwrap();

      showToast("success", "Student updated successfully!");
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedStudent(null);
      refetch();
    } catch (error) {
      console.error("Update student error:", error);
      const errorMessage =
        error?.data?.message || error?.message || "Failed to update student";
      showToast("error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    try {
      await deleteStudent(selectedStudent._id).unwrap();
      showToast("success", "Student deleted successfully!");
      setIsDeleteDialogOpen(false);
      setSelectedStudent(null);
      refetch();
    } catch (error) {
      console.error("Delete student error:", error);
      const errorMessage =
        error?.data?.message || error?.message || "Failed to delete student";
      showToast("error", errorMessage);
    }
  };

  const handleAssignToDepartment = async (departmentId) => {
    try {
      await assignStudent({
        departmentId,
        studentId: selectedStudent._id,
      }).unwrap();

      showToast("success", "Student assigned to department successfully!");
      setIsDepartmentDialogOpen(false);
      setSelectedStudent(null);

      // Refetch to get updated data
      refetch();
    } catch (error) {
      console.error("Assign student error:", error);
      let errorMessage = "Failed to assign student to department";

      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.status === 400) {
        errorMessage = "Invalid department or student selection";
      }

      showToast("error", errorMessage);
    }
  };

  const openEditDialog = (student) => {
    setSelectedStudent(student);
    setFormData({
      fullName: student.fullName,
      userName: student.userName,
      email: student.email,
      phoneNumber: student.phoneNumber,
      password: "",
      status: normalizeStatus(student.status),
      unit: student.unit || "UNIT_1",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (student) => {
    setSelectedStudent(student);
    setIsDeleteDialogOpen(true);
  };

  const openDepartmentDialog = (student) => {
    setSelectedStudent(student);
    setIsDepartmentDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case "PRESENT":
        return (
          <Badge variant="success" className="flex items-center gap-1 w-fit">
            <div className="h-2 w-2 rounded-full bg-green-500"></div> Present
          </Badge>
        );
      case "ON_LEAVE":
        return (
          <Badge variant="warning" className="flex items-center gap-1 w-fit">
            <div className="h-2 w-2 rounded-full bg-amber-500"></div> On Leave
          </Badge>
        );
      case "ABSENT":
        return (
          <Badge
            variant="destructive"
            className="flex items-center gap-1 w-fit"
          >
            <div className="h-2 w-2 rounded-full bg-red-600"></div> Absent
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
            <div className="h-2 w-2 rounded-full bg-gray-500"></div> {normalized || "Unknown"}
          </Badge>
        );
    }
  };

  const handleQuickStatusChange = async (studentId, newStatus, oldStatus) => {
    // Confirm destructive actions
    if (["ABSENT"].includes(newStatus)) {
      if (
        !window.confirm(
          `Are you sure you want to ${newStatus.toLowerCase()} this student?`
        )
      ) {
        return;
      }
    }

    try {
      await updateStudent({
        id: studentId,
        status: newStatus,
      }).unwrap();

      showToast("success", `Status changed to ${newStatus.toLowerCase()}`);
      refetch();
    } catch (error) {
      console.error("Quick status change error:", error);
      const errorMessage = error?.data?.message || "Failed to update status";
      showToast("error", errorMessage);
    }
  };

  const getDepartmentInfo = (student) => {
    if (!student.department) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          No Department
        </Badge>
      );
    }
    // Handle both populated and non-populated department
    const departmentName = student.department?.name || "Unknown Department";
    return (
      <Badge variant="info" className="flex items-center gap-1">
        <IconSchool className="h-3 w-3" />
        {departmentName}
      </Badge>
    );
  };

  const clearFilters = () => {
    setStatusFilter("ALL");
    setDepartmentFilter("ALL");
    setUnitFilter("ALL");
    setSearchTerm("");
    setActiveTab("all");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header with Stats Skeleton */}
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

        {/* Search and Actions Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-10 w-40" />
        </div>

        {/* Table Skeleton */}
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

  if (studentsError) {
    // Handle authentication error specifically
    if (studentsError.status === 401) {
      return (
        <div className="flex flex-col justify-center items-center h-64 space-y-4 p-4">
          <div className="text-red-600 text-lg font-medium">
            Authentication Required
          </div>
          <p className="text-gray-600 text-center">
            Please log in as an admin to view employees
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
        <div className="text-red-600 text-lg font-medium">
          Error loading employees
        </div>
        <p className="text-gray-600 text-center">
          {studentsError?.message || "Failed to fetch employees"}
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
      {/* Header with Stats using reusable StatCard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Employees"
          value={studentsData?.data?.totalUsers || 0}
          description="All registered employees"
          icon={IconUsers}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          gradientFrom="from-blue-50"
          gradientTo="to-blue-100"
          borderColor="border-blue-200"
          textColor="text-blue-800"
          valueColor="text-blue-900"
        />

        <StatCard
          title="Present Employees"
          value={students.filter((s) => normalizeStatus(s.status) === "PRESENT").length}
          description="Currently present"
          icon={IconUser}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          gradientFrom="from-green-50"
          gradientTo="to-green-100"
          borderColor="border-green-200"
          textColor="text-green-800"
          valueColor="text-green-900"
        />

        <StatCard
          title="Assigned to Departments"
          value={students.filter((s) => s.department).length}
          description="Currently enrolled"
          icon={IconSchool}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          gradientFrom="from-purple-50"
          gradientTo="to-purple-100"
          borderColor="border-purple-200"
          textColor="text-purple-800"
          valueColor="text-purple-900"
        />
      </div>

      {/* Tabs for filtering */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="all" onClick={() => clearFilters()}>
              All
            </TabsTrigger>
            <TabsTrigger
              value="active"
              onClick={() => setStatusFilter("PRESENT")}
            >
              Present
            </TabsTrigger>
            <TabsTrigger
              value="assigned"
              onClick={() => setDepartmentFilter("HAS_DEPARTMENT")}
            >
              Assigned
            </TabsTrigger>
            <TabsTrigger
              value="unassigned"
              onClick={() => setDepartmentFilter("NO_DEPARTMENT")}
            >
              Unassigned
            </TabsTrigger>
          </TabsList>

          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <IconPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </Tabs>

      {/* Search and Filters using reusable components */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <SearchInput
              placeholder="Search employees by name, email, or username..."
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

              <FilterSelect
                value={departmentFilter}
                onValueChange={setDepartmentFilter}
                options={departmentOptions}
                placeholder="Department"
                icon={IconSchool}
                className="w-[160px]"
              />

              <FilterSelect
                value={unitFilter}
                onValueChange={setUnitFilter}
                options={unitOptions}
                placeholder="Unit"
                icon={IconUsers}
                className="w-[140px]"
              />

              {(statusFilter !== "ALL" ||
                departmentFilter !== "ALL" ||
                unitFilter !== "ALL" ||
                searchTerm) && (
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
                disabled={isExportingStudents}
                onClick={async () => {
                  try {
                    const { data } = await triggerExportStudents({
                      format: 'excel',
                      search: debouncedSearchTerm || '',
                      status: statusFilter !== 'ALL' ? statusFilter : '',
                    });
                    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `employees_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
                disabled={isExportingStudents}
                onClick={async () => {
                  try {
                    const { data } = await triggerExportStudents({
                      format: 'pdf',
                      search: debouncedSearchTerm || '',
                      status: statusFilter !== 'ALL' ? statusFilter : '',
                    });
                    const blob = new Blob([data], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `employees_${new Date().toISOString().slice(0, 10)}.pdf`;
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

          {/* Filter bar showing active filters */}
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
                <TableHead className="w-[220px]">Employee</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow
                    key={student._id}
                    className="group hover:bg-muted/30 cursor-pointer"
                    onClick={() => handleStudentClick(student)}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage
                            src={student.avatar?.url}
                            alt={student.fullName}
                          />
                          <AvatarFallback className="bg-blue-100 text-blue-800">
                            {student.fullName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">
                              {student.fullName}
                            </p>
                            <IconExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            @{student.userName}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-foreground">{student.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.phoneNumber}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={normalizeStatus(student.status) || ""}
                        onValueChange={(newStatus) =>
                          handleQuickStatusChange(
                            student._id,
                            newStatus,
                            student.status
                          )
                        }
                        onClick={(e) => e.stopPropagation()} // Stop event propagation
                      >
                        <SelectTrigger className="w-[140px]">
                          {getStatusBadge(student.status)}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRESENT">Present</SelectItem>
                          <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                          <SelectItem value="ABSENT">Absent</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {student.unit ? student.unit.replace("UNIT_", "Unit ") : "No unit"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDepartmentInfo(student)}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation(); // Stop event propagation
                                  openDepartmentDialog(student);
                                }}
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <IconPencil className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Assign to department</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {new Date(student.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(student.createdAt).toLocaleTimeString()}
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
                                  e.stopPropagation(); // Stop event propagation
                                  openEditDialog(student);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <IconPencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit employee</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation(); // Stop event propagation
                                  openDeleteDialog(student);
                                }}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                              >
                                <IconTrash className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete employee</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <div className="flex flex-col items-center space-y-3">
                      <IconUsers className="h-12 w-12 text-muted-foreground/60" />
                      <p className="text-muted-foreground font-medium">
                        No trainee found
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ||
                          statusFilter !== "ALL" ||
                          departmentFilter !== "ALL"
                          ? "Try adjusting your search or filters"
                          : "Add your first employee to get started"}
                      </p>
                      {(searchTerm ||
                        statusFilter !== "ALL" ||
                        departmentFilter !== "ALL") && (
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
            Showing {filteredStudents.length} of{" "}
            {studentsData?.data?.totalUsers || 0} employees
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

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconUserPlus className="h-5 w-5" />
              Add New Employee
            </DialogTitle>
            <DialogDescription>
              Add a new employee to the system. All fields are required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter full name"
                className={
                  formErrors.fullName
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }
              />
              {formErrors.fullName && (
                <p className="text-sm text-red-600">{formErrors.fullName}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="userName">Username</Label>
              <Input
                id="userName"
                name="userName"
                value={formData.userName}
                onChange={handleInputChange}
                placeholder="Enter username"
                className={
                  formErrors.userName
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }
              />
              {formErrors.userName && (
                <p className="text-sm text-red-600">{formErrors.userName}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
                className={
                  formErrors.email ? "border-red-500 focus:border-red-500" : ""
                }
              />
              {formErrors.email && (
                <p className="text-sm text-red-600">{formErrors.email}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="Enter phone number"
                className={
                  formErrors.phoneNumber
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }
              />
              {formErrors.phoneNumber && (
                <p className="text-sm text-red-600">{formErrors.phoneNumber}</p>
              )}
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
                  <SelectItem value="PRESENT">Present</SelectItem>
                  <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                  <SelectItem value="ABSENT">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-unit">Unit</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) =>
                  setFormData({ ...formData, unit: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNIT_1">Unit 1</SelectItem>
                  <SelectItem value="UNIT_2">Unit 2</SelectItem>
                  <SelectItem value="UNIT_3">Unit 3</SelectItem>
                  <SelectItem value="UNIT_4">Unit 4</SelectItem>
                  <SelectItem value="UNIT_5">Unit 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit">Unit</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) =>
                  setFormData({ ...formData, unit: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNIT_1">Unit 1</SelectItem>
                  <SelectItem value="UNIT_2">Unit 2</SelectItem>
                  <SelectItem value="UNIT_3">Unit 3</SelectItem>
                  <SelectItem value="UNIT_4">Unit 4</SelectItem>
                  <SelectItem value="UNIT_5">Unit 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter password"
                className={
                  formErrors.password
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }
              />
              {formErrors.password && (
                <p className="text-sm text-red-600">{formErrors.password}</p>
              )}
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
              onClick={handleAddStudent}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting && <IconLoader className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Registering..." : "Register Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconPencil className="h-5 w-5" />
              Edit Employee
            </DialogTitle>
            <DialogDescription>
              Update employee information. All fields are required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-fullName">Full Name</Label>
              <Input
                id="edit-fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter full name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-userName">Username</Label>
              <Input
                id="edit-userName"
                name="userName"
                value={formData.userName}
                onChange={handleInputChange}
                placeholder="Enter username"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phoneNumber">Phone Number</Label>
              <Input
                id="edit-phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="Enter phone number"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-unit-edit">Unit</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) =>
                  setFormData({ ...formData, unit: value })
                }
              >
                <SelectTrigger id="edit-unit-edit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNIT_1">Unit 1</SelectItem>
                  <SelectItem value="UNIT_2">Unit 2</SelectItem>
                  <SelectItem value="UNIT_3">Unit 3</SelectItem>
                  <SelectItem value="UNIT_4">Unit 4</SelectItem>
                  <SelectItem value="UNIT_5">Unit 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
                setSelectedStudent(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditStudent}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting && <IconLoader className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Updating..." : "Update Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <IconTrash className="h-5 w-5" />
              Delete Employee
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              student account.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <IconInfoCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">
                Are you sure you want to delete{" "}
                <strong>{selectedStudent?.fullName}</strong>?
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedStudent(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteStudent}
              className="gap-2"
            >
              <IconTrash className="h-4 w-4" />
              Delete Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Assignment Dialog */}
      <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconSchool className="h-5 w-5" />
              Assign to Department
            </DialogTitle>
            <DialogDescription>
              Select a department for <strong>{selectedStudent?.fullName}</strong>
              {selectedStudent?.department && (
                <span className="text-amber-600 font-medium">
                  {" "}
                  (Currently assigned to:{" "}
                  {selectedStudent.department.name || "Unknown Department"})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {departmentsLoading ? (
                <div className="flex justify-center py-8">
                  <IconLoader className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : departmentsError ? (
                <div className="text-center py-8">
                  <p className="text-red-500">Error loading departments</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please try again later
                  </p>
                </div>
              ) : departments.length > 0 ? (
                departments.map((department) => {
                  const isCurrentlyAssigned =
                    selectedStudent?.department?._id.toString() === department._id.toString();
                  const isAtCapacity =
                    department.capacity && department.students?.length >= department.capacity;

                  return (
                    <div
                      key={department._id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isCurrentlyAssigned
                        ? "bg-green-50 border-green-200 cursor-default"
                        : isAtCapacity
                          ? "bg-red-50 border-red-200 cursor-not-allowed opacity-60"
                          : "hover:bg-muted/50 cursor-pointer"
                        }`}
                      onClick={() => {
                        if (!isCurrentlyAssigned && !isAtCapacity) {
                          handleAssignToDepartment(department._id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${isCurrentlyAssigned
                            ? "bg-green-100"
                            : isAtCapacity
                              ? "bg-red-100"
                              : "bg-blue-100"
                            }`}
                        >
                          <IconSchool
                            className={`h-4 w-4 ${isCurrentlyAssigned
                              ? "text-green-600"
                              : isAtCapacity
                                ? "text-red-600"
                                : "text-blue-600"
                              }`}
                          />
                        </div>
                        <div>
                          <p className="font-medium">{department.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {department.students?.length || 0} employees
                            {department.capacity && ` / ${department.capacity} capacity`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrentlyAssigned && (
                          <Badge variant="success" className="ml-2">
                            Current
                          </Badge>
                        )}
                        {isAtCapacity && (
                          <Badge variant="destructive" className="ml-2">
                            Full
                          </Badge>
                        )}
                        {!isCurrentlyAssigned && !isAtCapacity && (
                          <Badge variant="outline" className="ml-2">
                            Available
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <IconSchool className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No departments available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a department first to assign employees
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDepartmentDialogOpen(false);
                setSelectedStudent(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;
