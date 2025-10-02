import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useGetAllBatchesQuery,
  useCreateBatchMutation,
  useUpdateBatchMutation,
  useDeleteBatchMutation,
  useAssignInstructorMutation,
  useAddStudentToBatchMutation,
  useRemoveStudentFromBatchMutation,
  useRemoveInstructorMutation,
} from "@/Redux/AllApi/BatchApi";
import { useGetAllUsersQuery } from "@/Redux/AllApi/UserApi";
import { useGetCoursesQuery } from "@/Redux/AllApi/CourseApi";
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
  IconUser,
  IconCalendar,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useNavigate } from "react-router-dom";

const Batches = () => {
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
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastToastId, setLastToastId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    instructorId: "",
    courseId: "",
    startDate: "",
    endDate: "",
    capacity: 50,
  });
  const [formErrors, setFormErrors] = useState({});
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedStudents, setSelectedStudents] = useState([]);

  const navigate = useNavigate();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // API Hooks
  const {
    data: batchesData,
    isLoading,
    error: batchesError,
    refetch,
  } = useGetAllBatchesQuery(
    {
      page: currentPage,
      limit: 10,
      search: debouncedSearchTerm || "",
    },
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );

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

  const [createBatch] = useCreateBatchMutation();
  const [updateBatch] = useUpdateBatchMutation();
  const [deleteBatch] = useDeleteBatchMutation();
  const [assignInstructor] = useAssignInstructorMutation();
  const [addStudentToBatch] = useAddStudentToBatchMutation();
  const [removeStudentFromBatch] = useRemoveStudentFromBatchMutation();
  const [removeInstructor, { isLoading: isRemovingInstructor }] =
    useRemoveInstructorMutation();

  const batches = batchesData?.data?.batches || [];
  const totalPages = batchesData?.data?.totalPages || 1;
  const totalCount = batchesData?.data?.totalBatches || 0;
  const instructors = instructorsData?.data?.users || [];
  const students = studentsData?.data?.users || [];
  const courses = coursesData?.data?.courses || [];

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

  // Filter batches based on status
  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const statusMatch =
        statusFilter === "ALL" ||
        (statusFilter === "HAS_INSTRUCTOR" && batch.instructor) ||
        (statusFilter === "NO_INSTRUCTOR" && !batch.instructor) ||
        batch.status === statusFilter;
      return statusMatch;
    });
  }, [batches, statusFilter]);

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
      instructorId: "",
      courseId: "",
      startDate: "",
      endDate: "",
      capacity: 50,
    });
    setFormErrors({});
    setSelectedStudents([]);
  };

  const handleCreateBatch = async () => {
    setFormErrors({});
    const errors = {};

    if (!formData.name?.trim()) {
      errors.name = "Batch name is required";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast("error", "Please fix the form errors before submitting");
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const batchData = {
        name: formData.name.trim(),
        instructorId: formData.instructorId || undefined,
        courseId: formData.courseId || undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
      };

      await createBatch(batchData).unwrap();
      showToast("success", "Batch created successfully!");
      setIsAddDialogOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      console.error("Create batch error:", error);
      const errorMessage =
        error?.data?.message || error?.message || "Failed to create batch";
      showToast("error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBatch = async () => {
    if (!formData.name?.trim()) {
      showToast("error", "Batch name is required");
      return;
    }

    if (!selectedBatch?._id) {
      showToast("error", "No batch selected for update");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const updateData = {
        id: selectedBatch._id,
        name: formData.name.trim(),
        status: formData.status, // Add this line
        // Add other fields as needed
      };

      await updateBatch(updateData).unwrap();
      showToast("success", "Batch updated successfully!");
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedBatch(null);
      refetch();
    } catch (error) {
      console.error("Update batch error:", error);
      const errorMessage =
        error?.data?.message || error?.message || "Failed to update batch";
      showToast("error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (!selectedBatch?._id) {
      showToast("error", "No batch selected for deletion");
      return;
    }

    try {
      await deleteBatch(selectedBatch._id).unwrap();
      showToast("success", "Batch deleted successfully!");
      setIsDeleteDialogOpen(false);
      setSelectedBatch(null);
      refetch();
    } catch (error) {
      console.error("Delete batch error:", error);
      const errorMessage =
        error?.data?.message || error?.message || "Failed to delete batch";
      showToast("error", errorMessage);
    }
  };

  const handleAssignInstructor = async (instructorId) => {
    if (!selectedBatch?._id) {
      showToast("error", "No batch selected for instructor assignment");
      return;
    }

    try {
      await assignInstructor({
        batchId: selectedBatch._id,
        instructorId,
      }).unwrap();

      showToast("success", "Instructor assigned successfully!");
      setIsAssignInstructorDialogOpen(false);
      setSelectedBatch(null);
      refetch();
    } catch (error) {
      console.error("Assign instructor error:", error);
      const errorMessage =
        error?.data?.message || error?.message || "Failed to assign instructor";
      showToast("error", errorMessage);
    }
  };

  const handleRemoveInstructor = async () => {
    if (!selectedBatch?._id) {
      showToast("error", "No batch selected for instructor removal");
      return;
    }

    try {
      await removeInstructor(selectedBatch._id).unwrap();
      showToast("success", "Instructor removed successfully!");
      setIsAssignInstructorDialogOpen(false);
      setSelectedBatch(null);
      refetch();
    } catch (error) {
      console.error("Remove instructor error:", error);
      const errorMessage =
        error?.data?.message || error?.message || "Failed to remove instructor";
      showToast("error", errorMessage);
    }
  };

  const handleAddStudents = async () => {
    if (selectedStudents.length === 0) {
      showToast("error", "Please select at least one student");
      return;
    }

    if (!selectedBatch?._id) {
      showToast("error", "No batch selected for adding students");
      return;
    }

    try {
      // Add students to batch
      const batchPromises = selectedStudents.map((studentId) =>
        addStudentToBatch({
          batchId: selectedBatch._id,
          studentId,
        }).unwrap()
      );

      await Promise.all(batchPromises);
      showToast(
        "success",
        `${selectedStudents.length} student(s) added to batch!`
      );

      setIsManageStudentsDialogOpen(false);
      setSelectedBatch(null);
      setSelectedStudents([]);
      refetch();
    } catch (error) {
      console.error("Add students error:", error);
      const errorMessage =
        error?.data?.message || error?.message || "Failed to add students";
      showToast("error", errorMessage);
    }
  };

  const handleRemoveStudent = async ({ batchId, studentId, studentName }) => {
    // Defensive: allow fallback to selectedBatch if caller didn't pass batchId
    const safeBatchId = batchId ?? selectedBatch?._id ?? null;
    if (!safeBatchId || !studentId) {
      showToast(
        "error",
        "Unable to remove student: missing batch or student. Please try again."
      );
      return;
    }

    try {
      await removeStudentFromBatch({
        batchId: safeBatchId,
        studentId,
      }).unwrap();
      showToast(
        "success",
        studentName
          ? `${studentName} removed from batch!`
          : "Student removed from batch!"
      );
      refetch();
    } catch (error) {
      console.error("Remove student error:", error);
      const errorMessage =
        error?.data?.message || error?.message || "Failed to remove student";
      showToast("error", errorMessage);
    }
  };

  const handleBatchClick = (batch) => {
    navigate(`/admin/batches/${batch._id}`);
  };

  const openEditDialog = (batch) => {
    setSelectedBatch(batch);
    setFormData({
      name: batch.name,
      instructorId: batch.instructor?._id || "",
      courseId: batch.course?._id || "",
      startDate: batch.startDate
        ? new Date(batch.startDate).toISOString().split("T")[0]
        : "",
      endDate: batch.endDate
        ? new Date(batch.endDate).toISOString().split("T")[0]
        : "",
      capacity: batch.capacity || 50,
      status: batch.status || "UPCOMING", // Add this line
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (batch) => {
    setSelectedBatch(batch);
    setIsDeleteDialogOpen(true);
  };

  const openAssignInstructorDialog = (batch) => {
    setSelectedBatch(batch);
    setIsAssignInstructorDialogOpen(true);
  };

  const openManageStudentsDialog = (batch) => {
    setSelectedBatch(batch);
    setIsManageStudentsDialogOpen(true);
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const getInstructorInfo = (batch) => {
    if (!batch.instructor) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          No Instructor
        </Badge>
      );
    }

    const instructor = batch.instructor;
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
  };

  const getStudentCount = (batch) => {
    if (!batch) return 0;
    return batch.students?.length || 0;
  };

  const getCourseInfo = (batch) => {
    if (!batch.course) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          No Course
        </Badge>
      );
    }

    // Handle both course object structures
    const courseName =
      batch.course.title || batch.course.name || "Unnamed Course";

    return (
      <div className="flex items-center gap-2">
        <IconBook className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{courseName}</span>
      </div>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      UPCOMING: { variant: "secondary", label: "Upcoming" },
      ONGOING: { variant: "default", label: "Ongoing" },
      COMPLETED: { variant: "success", label: "Completed" },
      CANCELLED: { variant: "destructive", label: "Cancelled" },
    };

    const config = statusConfig[status] || {
      variant: "outline",
      label: status,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const clearFilters = () => {
    setStatusFilter("ALL");
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

  if (batchesError) {
    if (batchesError.status === 401) {
      return (
        <div className="flex flex-col justify-center items-center h-64 space-y-4 p-4">
          <div className="text-red-600 text-lg font-medium">
            Authentication Required
          </div>
          <p className="text-gray-600 text-center">
            Please log in as an admin to view batches
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
          Error loading batches
        </div>
        <p className="text-gray-600 text-center">
          {batchesError?.message || "Failed to fetch batches"}
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
          title="Total Batches"
          value={totalCount}
          description="All created batches"
          icon={IconSchool}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          gradientFrom="from-blue-50"
          gradientTo="to-blue-100"
          borderColor="border-blue-200"
          textColor="text-blue-800"
          valueColor="text-blue-900"
        />

        <StatCard
          title="Assigned Batches"
          value={batches.filter((b) => b.instructor).length}
          description="With instructors"
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
          title="Total Students"
          value={batches.reduce(
            (total, batch) => total + getStudentCount(batch),
            0
          )}
          description="Across all batches"
          icon={IconUsers}
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
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger 
              value="all" 
              onClick={() => {
                setActiveTab("all");
                setStatusFilter("ALL");
              }}
            >
              All ({batches.length})
            </TabsTrigger>
            <TabsTrigger
              value="assigned"
              onClick={() => {
                setActiveTab("assigned");
                setStatusFilter("HAS_INSTRUCTOR");
              }}
            >
              Assigned ({batches.filter(b => b.instructor).length})
            </TabsTrigger>
            <TabsTrigger
              value="unassigned"
              onClick={() => {
                setActiveTab("unassigned");
                setStatusFilter("NO_INSTRUCTOR");
              }}
            >
              Unassigned ({batches.filter(b => !b.instructor).length})
            </TabsTrigger>
          </TabsList>

          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <IconPlus className="h-4 w-4 mr-2" />
            Create Batch
          </Button>
        </div>
      </Tabs>

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <SearchInput
              placeholder="Search batches by name..."
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

              {(statusFilter !== "ALL" || searchTerm) && (
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
                <TableHead className="w-[220px]">Batch Name</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBatches.length > 0 ? (
                filteredBatches.map((batch) => (
                  <TableRow
                    key={batch._id}
                    className="group hover:bg-muted/30"
                    onClick={() => handleBatchClick(batch)}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-blue-100">
                          <IconSchool className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {batch.name}
                          </p>
                        </div>
                        <IconExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </TableCell>
                    <TableCell>{getCourseInfo(batch)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getInstructorInfo(batch)}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAssignInstructorDialog(batch);
                                }}
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <IconPencil className="h-3 w-3" />
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
                          {getStudentCount(batch)} students
                        </Badge>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <IconUserPlus className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openManageStudentsDialog(batch);
                              }}
                            >
                              <IconUserPlus className="h-4 w-4 mr-2" />
                              Manage Students
                            </DropdownMenuItem>

                            {batch.students && batch.students.length > 0 && (
                              <>
                                <DropdownMenuSeparator />
                                <div className="max-h-48 overflow-y-auto">
                                  {batch.students.slice(0, 5).map((student) => (
                                    <DropdownMenuItem
                                      key={student._id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveStudent({ batchId: batch._id, studentId: student._id, studentName: student.fullName });
                                      }}
                                      className="text-red-600 focus:text-red-600"
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
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {new Date(batch.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(batch.createdAt).toLocaleTimeString()}
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
                                  openEditDialog(batch);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <IconPencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit batch</p>
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
                                  e.stopPropagation();
                                  openDeleteDialog(batch);
                                }}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                              >
                                <IconTrash className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete batch</p>
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
                      <IconSchool className="h-12 w-12 text-muted-foreground/60" />
                      <p className="text-muted-foreground font-medium">
                        No batches found
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm || statusFilter !== "ALL"
                          ? "Try adjusting your search or filters"
                          : "Create your first batch to get started"}
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
            Showing {filteredBatches.length} of {totalCount} batches
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

      {/* Create Batch Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconPlus className="h-5 w-5" />
              Create New Batch
            </DialogTitle>
            <DialogDescription>
              Create a new batch. You can assign an instructor later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Batch Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter batch name"
                className={
                  formErrors.name ? "border-red-500 focus:border-red-500" : ""
                }
              />
              {formErrors.name && (
                <p className="text-sm text-red-600">{formErrors.name}</p>
              )}
            </div>

            {/* Create Batch Dialog - Course Selector */}
            <div className="grid gap-2">
              <Label htmlFor="courseId">Course (Optional)</Label>
              <Select
                value={formData.courseId}
                onValueChange={(value) =>
                  setFormData({ ...formData, courseId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a course">
                    {formData.courseId
                      ? courses.find((c) => c._id === formData.courseId)
                          ?.title || courses.find((c) => c._id === formData.courseId)?.name || "Selected Course"
                      : "Select a course"}
                  </SelectValue>
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
                  ) : courses.length > 0 ? (
                    courses.map((course) => (
                      <SelectItem key={course._id} value={course._id}>
                        {course.title || course.name} - {course.difficulty || 'Not specified'}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No courses available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="instructorId">Instructor (Optional)</Label>
              <Select
                value={formData.instructorId}
                onValueChange={(value) =>
                  setFormData({ ...formData, instructorId: value })
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
                      <SelectItem key={instructor._id} value={instructor._id}>
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
              onClick={handleCreateBatch}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting && <IconLoader className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Creating..." : "Create Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Batch Dialog */}
      {/* Edit Batch Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconPencil className="h-5 w-5" />
              Edit Batch
            </DialogTitle>
            <DialogDescription>Update batch information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Batch Name *</Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter batch name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-courseId">Course</Label>
              <Select
                value={formData.courseId}
                onValueChange={(value) =>
                  setFormData({ ...formData, courseId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a course">
                    {formData.courseId
                      ? courses.find((c) => c._id === formData.courseId)
                          ?.title || courses.find((c) => c._id === formData.courseId)?.name || "Selected Course"
                      : "Select a course"}
                  </SelectValue>
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
                  ) : courses.length > 0 ? (
                    courses.map((course) => (
                      <SelectItem key={course._id} value={course._id}>
                        {course.title || course.name} - {course.difficulty || 'Not specified'}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No courses available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* In Edit Batch Dialog */}
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

            {/* Rest of the edit form remains the same */}
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
              onClick={handleUpdateBatch}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting && <IconLoader className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Updating..." : "Update Batch"}
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
              Delete Batch
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the batch "{selectedBatch?.name}"?
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
              onClick={handleDeleteBatch}
              className="gap-2"
            >
              <IconTrash className="h-4 w-4" />
              Delete Batch
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
              {selectedBatch?.instructor
                ? "Reassign Instructor"
                : "Assign Instructor"}
            </DialogTitle>
            <DialogDescription>
              {selectedBatch?.instructor
                ? `Change instructor for batch "${selectedBatch?.name}"`
                : `Assign an instructor to the batch "${selectedBatch?.name}"`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* Add option to remove current instructor */}
            {selectedBatch?.instructor && (
              <div
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors mb-4 ${
                  isRemovingInstructor
                    ? "bg-gray-100 border-gray-200 cursor-not-allowed"
                    : "hover:bg-red-50 border-red-200"
                }`}
                onClick={
                  isRemovingInstructor ? undefined : handleRemoveInstructor
                }
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                    {isRemovingInstructor ? (
                      <IconLoader className="h-4 w-4 animate-spin text-red-600" />
                    ) : (
                      <IconX className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-red-700">
                      {isRemovingInstructor
                        ? "Removing Instructor..."
                        : "Remove Current Instructor"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Unassign {selectedBatch.instructor.fullName} from this
                      batch
                    </p>
                  </div>
                </div>
              </div>
            )}
            {instructorsLoading ? (
              <div className="flex justify-center py-8">
                <IconLoader className="h-6 w-6 animate-spin" />
              </div>
            ) : instructorsError ? (
              <div className="text-center text-red-600 py-4">
                Error loading instructors
              </div>
            ) : instructors.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No instructors available
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {instructors.map((instructor) => (
                  <div
                    key={instructor._id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedBatch?.instructor?._id === instructor._id
                        ? "bg-blue-50 border-blue-200"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => handleAssignInstructor(instructor._id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={instructor.avatar?.url}
                          alt={instructor.fullName}
                        />
                        <AvatarFallback className="text-xs">
                          {instructor.fullName
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{instructor.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          {instructor.email}
                        </p>
                      </div>
                    </div>
                    {selectedBatch?.instructor?._id === instructor._id && (
                      <Badge variant="default">Current</Badge>
                    )}
                  </div>
                ))}
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
              Manage Students
            </DialogTitle>
            <DialogDescription>
              Manage students in the batch "{selectedBatch?.name}".
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="add" className="w-full flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add">Add Students</TabsTrigger>
              <TabsTrigger value="remove">Remove Students</TabsTrigger>
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
                  <div className="text-center text-red-600 py-4">
                    Error loading students
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No students available
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {students
                      .filter(
                        (student) =>
                          !selectedBatch?.students?.some(
                            (s) => s._id === student._id
                          )
                      )
                      .map((student) => {
                        const isSelected = selectedStudents.includes(
                          student._id
                        );

                        return (
                          <div
                            key={student._id}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-blue-50 border-blue-200"
                                : "hover:bg-muted"
                            }`}
                            onClick={() => toggleStudentSelection(student._id)}
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
                  {selectedStudents.length} student(s) selected
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
                    Add Selected Students
                  </Button>
                </div>
              </DialogFooter>
            </TabsContent>

            <TabsContent
              value="remove"
              className="flex-1 overflow-hidden flex flex-col"
            >
              <div className="py-4 flex-1 overflow-hidden">
                {!selectedBatch?.students ||
                selectedBatch.students.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No students in this batch
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedBatch.students.map((student) => (
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
                          onClick={() => handleRemoveStudent({ batchId: selectedBatch?._id, studentId: student._id, studentName: student.fullName })}
                          className="gap-1"
                          disabled={!selectedBatch?._id}
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
    </div>
  );
};

export default Batches;
