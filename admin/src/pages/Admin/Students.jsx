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
  useGetAllBatchesQuery,
  useAddStudentToBatchMutation,
} from "@/Redux/AllApi/BatchApi";
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
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconUsers,
  IconSchool,
  IconSearch,
  IconUserPlus,
  IconFilter,
  IconX,
  IconLoader,
  IconRefresh,
  IconInfoCircle,
  IconExternalLink,
  //   IconGraduation,
  IconCertificate,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const Students = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastToastId, setLastToastId] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    userName: "",
    email: "",
    phoneNumber: "",
    password: "",
    status: "PENDING",
  });
  const [formErrors, setFormErrors] = useState({});
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [batchFilter, setBatchFilter] = useState("ALL");
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
    },
    {
      // Prevent unnecessary refetches
      refetchOnMountOrArgChange: true,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );
  const {
    data: batchesData,
    isLoading: batchesLoading,
    error: batchesError,
  } = useGetAllBatchesQuery(
    {},
    {
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );
  const [registerStudent] = useUserRegisterMutation();
  const [updateStudent] = useUpdateUserMutation();
  const [deleteStudent] = useDeleteUserMutation();
  const [assignStudent] = useAddStudentToBatchMutation();

  const students = studentsData?.data?.users || [];
  const [triggerExportStudents, { isFetching: isExportingStudents }] = useLazyExportStudentsQuery();
  const totalPages = studentsData?.data?.totalPages || 1;
  const batches = batchesData?.data?.batches || [];

  // Filter options for reusable components
  const statusOptions = [
    { value: "ALL", label: "All Status" },
    { value: "ACTIVE", label: "Active" },
    { value: "PENDING", label: "Pending" },
    { value: "SUSPENDED", label: "Suspended" },
    { value: "BANNED", label: "Banned" },
  ];

  const batchOptions = [
    { value: "ALL", label: "All Batches" },
    { value: "HAS_BATCH", label: "Has Batch" },
    { value: "NO_BATCH", label: "No Batch" },
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

    if (batchFilter !== "ALL") {
      const batchLabel = batchOptions.find(
        (opt) => opt.value === batchFilter
      )?.label;
      filters.push({ label: "Batch", value: batchLabel });
    }

    if (searchTerm) {
      filters.push({ label: "Search", value: searchTerm });
    }

    return filters;
  }, [statusFilter, batchFilter, searchTerm, statusOptions, batchOptions]);

  // Filter students based on status and batch
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const statusMatch =
        statusFilter === "ALL" || student.status === statusFilter;
      const batchMatch =
        batchFilter === "ALL" ||
        (batchFilter === "HAS_BATCH" && student.batch) ||
        (batchFilter === "NO_BATCH" && !student.batch);
      return statusMatch && batchMatch;
    });
  }, [students, statusFilter, batchFilter]);

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

  const handleAssignToBatch = async (batchId) => {
    try {
      await assignStudent({
        batchId,
        studentId: selectedStudent._id,
      }).unwrap();

      showToast("success", "Student assigned to batch successfully!");
      setIsBatchDialogOpen(false);
      setSelectedStudent(null);

      // Refetch to get updated data
      refetch();
    } catch (error) {
      console.error("Assign student error:", error);
      let errorMessage = "Failed to assign student to batch";

      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.status === 400) {
        errorMessage = "Invalid batch or student selection";
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
      status: student.status,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (student) => {
    setSelectedStudent(student);
    setIsDeleteDialogOpen(true);
  };

  const openBatchDialog = (student) => {
    setSelectedStudent(student);
    setIsBatchDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="success" className="flex items-center gap-1 w-fit">
            <div className="h-2 w-2 rounded-full bg-green-500"></div> Active
          </Badge>
        );
      case "SUSPENDED":
        return (
          <Badge
            variant="destructive"
            className="flex items-center gap-1 w-fit"
          >
            <div className="h-2 w-2 rounded-full bg-red-500"></div> Suspended
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="warning" className="flex items-center gap-1 w-fit">
            <div className="h-2 w-2 rounded-full bg-amber-500"></div> Pending
          </Badge>
        );
      case "BANNED":
        return (
          <Badge
            variant="destructive"
            className="flex items-center gap-1 w-fit"
          >
            <div className="h-2 w-2 rounded-full bg-red-700"></div> Banned
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
            <div className="h-2 w-2 rounded-full bg-gray-500"></div> {status}
          </Badge>
  );
}
  };

  const handleQuickStatusChange = async (studentId, newStatus, oldStatus) => {
    // Confirm destructive actions
    if (["BANNED", "SUSPENDED"].includes(newStatus)) {
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

  const getBatchInfo = (student) => {
    if (!student.batch) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          No Batch
        </Badge>
      );
    }
    // Handle both populated and non-populated batch
    const batchName = student.batch?.name || student.batch;
    return (
      <Badge variant="info" className="flex items-center gap-1">
        <IconSchool className="h-3 w-3" />
        {batchName}
      </Badge>
    );
  };

  const clearFilters = () => {
    setStatusFilter("ALL");
    setBatchFilter("ALL");
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
            Please log in as an admin to view students
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
          Error loading students
        </div>
        <p className="text-gray-600 text-center">
          {studentsError?.message || "Failed to fetch students"}
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
          title="Total Students"
          value={studentsData?.data?.totalUsers || 0}
          description="All registered students"
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
          title="Active Students"
          value={students.filter((s) => s.status === "ACTIVE").length}
          description="Currently active"
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
          title="Assigned to Batches"
          value={students.filter((s) => s.batch).length}
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
              onClick={() => setStatusFilter("ACTIVE")}
            >
              Active
            </TabsTrigger>
            <TabsTrigger
              value="assigned"
              onClick={() => setBatchFilter("HAS_BATCH")}
            >
              Assigned
            </TabsTrigger>
            <TabsTrigger
              value="unassigned"
              onClick={() => setBatchFilter("NO_BATCH")}
            >
              Unassigned
            </TabsTrigger>
          </TabsList>

          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <IconPlus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </div>
      </Tabs>

      {/* Search and Filters using reusable components */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <SearchInput
              placeholder="Search students by name, email, or username..."
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
                value={batchFilter}
                onValueChange={setBatchFilter}
                options={batchOptions}
                placeholder="Batch"
                icon={IconSchool}
                className="w-[160px]"
              />

              {(statusFilter !== "ALL" ||
                batchFilter !== "ALL" ||
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
                    a.download = `students_${new Date().toISOString().slice(0,10)}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch {}
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
                    a.download = `students_${new Date().toISOString().slice(0,10)}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                  } catch {}
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
                <TableHead className="w-[220px]">Student</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Batch</TableHead>
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
                        value={student.status || ""}
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
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="SUSPENDED">Suspended</SelectItem>
                          <SelectItem value="BANNED">Banned</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getBatchInfo(student)}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation(); // Stop event propagation
                                  openBatchDialog(student);
                                }}
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <IconPencil className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Assign to batch</p>
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
                              <p>Edit student</p>
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
                              <p>Delete student</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex flex-col items-center space-y-3">
                      <IconUsers className="h-12 w-12 text-muted-foreground/60" />
                      <p className="text-muted-foreground font-medium">
                        No students found
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ||
                        statusFilter !== "ALL" ||
                        batchFilter !== "ALL"
                          ? "Try adjusting your search or filters"
                          : "Add your first student to get started"}
                      </p>
                      {(searchTerm ||
                        statusFilter !== "ALL" ||
                        batchFilter !== "ALL") && (
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
            {studentsData?.data?.totalUsers || 0} students
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
              Add New Student
            </DialogTitle>
            <DialogDescription>
              Add a new student to the system. All fields are required.
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
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="BANNED">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
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
              {isSubmitting ? "Registering..." : "Register Student"}
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
              Edit Student
            </DialogTitle>
            <DialogDescription>
              Update student information. All fields are required.
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
              {isSubmitting ? "Updating..." : "Update Student"}
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
              Delete Student
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
              Delete Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Assignment Dialog */}
      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconSchool className="h-5 w-5" />
              Assign to Batch
            </DialogTitle>
            <DialogDescription>
              Select a batch for <strong>{selectedStudent?.fullName}</strong>
              {selectedStudent?.batch && (
                <span className="text-amber-600 font-medium">
                  {" "}
                  (Currently assigned to:{" "}
                  {selectedStudent.batch.name || "Unknown Batch"})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {batchesLoading ? (
                <div className="flex justify-center py-8">
                  <IconLoader className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : batchesError ? (
                <div className="text-center py-8">
                  <p className="text-red-500">Error loading batches</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please try again later
                  </p>
                </div>
              ) : batches.length > 0 ? (
                batches.map((batch) => {
                  const isCurrentlyAssigned =
                    selectedStudent?.batch?.toString() === batch._id.toString();
                  const isAtCapacity =
                    batch.capacity && batch.students?.length >= batch.capacity;

                  return (
                    <div
                      key={batch._id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isCurrentlyAssigned
                          ? "bg-green-50 border-green-200 cursor-default"
                          : isAtCapacity
                          ? "bg-red-50 border-red-200 cursor-not-allowed opacity-60"
                          : "hover:bg-muted/50 cursor-pointer"
                      }`}
                      onClick={() => {
                        if (!isCurrentlyAssigned && !isAtCapacity) {
                          handleAssignToBatch(batch._id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${
                            isCurrentlyAssigned
                              ? "bg-green-100"
                              : isAtCapacity
                              ? "bg-red-100"
                              : "bg-blue-100"
                          }`}
                        >
                          <IconSchool
                            className={`h-4 w-4 ${
                              isCurrentlyAssigned
                                ? "text-green-600"
                                : isAtCapacity
                                ? "text-red-600"
                                : "text-blue-600"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-medium">{batch.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {batch.students?.length || 0} students
                            {batch.capacity && ` / ${batch.capacity} capacity`}
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
                  <p className="text-muted-foreground">No batches available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a batch first to assign students
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsBatchDialogOpen(false);
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
