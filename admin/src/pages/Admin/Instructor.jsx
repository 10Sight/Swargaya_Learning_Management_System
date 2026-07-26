import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  useGetAllInstructorsQuery,
  useUpdateInstructorMutation,
  useDeleteInstructorMutation,
} from "@/Redux/AllApi/InstructorApi";
import { useUserRegisterMutation } from "@/Redux/AllApi/AuthApi";
import {
  useGetAllDepartmentsQuery,
  useAssignInstructorMutation,
} from "@/Redux/AllApi/DepartmentApi";
import { useGetLinesByDepartmentQuery } from "@/Redux/AllApi/LineApi";
import { useLazyGetMachinesByLineQuery } from "@/Redux/AllApi/MachineApi";
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
  IconRoute,
  IconCpu,
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
import { Checkbox } from "@/components/ui/checkbox";

// Import reusable components
import SearchInput from "@/components/common/SearchInput";
import FilterSelect from "@/components/common/FilterSelect";
import StatCard from "@/components/common/StatCard";
import FilterBar from "@/components/common/FilterBar";
import { useNavigate } from "react-router-dom";
import { useGetAllUnitsQuery } from "@/Redux/AllApi/UnitApi";

const Instructor = () => {
  const currentUser = useSelector((state) => state.auth.user);
  const isAdmin = currentUser?.role === "ADMIN";

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [isLinesMachinesDialogOpen, setIsLinesMachinesDialogOpen] = useState(false);
  const [lmFormData, setLmFormData] = useState({ department: "", lines: [], machines: [] });
  const [lmAvailableMachines, setLmAvailableMachines] = useState([]);
  const [lmMachinesLoading, setLmMachinesLoading] = useState(false);
  const [isLmSubmitting, setIsLmSubmitting] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastToastId, setLastToastId] = useState(null);
  const [formData, setFormData] = useState({
    fullName: "",
    userName: "",
    email: "",
    phoneNumber: "",
    password: "",
    status: "PRESENT",
    unit: "UNIT 1",
    doj: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [unitFilter, setUnitFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("all");
  const [hoveredBtn, setHoveredBtn] = useState(null);

  const navigate = useNavigate();

  const handleInstructorClick = (instructor) => {
    const handle = instructor.slug || instructor._id;
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
    data: instructorsData,
    isLoading,
    error: instructorsError,
    refetch,
  } = useGetAllInstructorsQuery(
    {
      page: currentPage,
      limit: 10,
      search: debouncedSearchTerm || "",
      status: statusFilter !== "ALL" ? statusFilter : "",
      unit: isAdmin ? (currentUser?.unit || "") : (unitFilter !== "ALL" ? unitFilter : ""),
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
    refetch: refetchDepartments,
  } = useGetAllDepartmentsQuery(
    {
      page: 1,
      limit: 1000,
      search: "",
    },
    {
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );
  const [registerInstructor] = useUserRegisterMutation();
  const [updateInstructor] = useUpdateInstructorMutation();
  const [deleteInstructor] = useDeleteInstructorMutation();
  const [assignInstructor] = useAssignInstructorMutation();

  const instructors = instructorsData?.data?.users || [];
  const totalPages = instructorsData?.data?.totalPages || 1;
  const departments = departmentsData?.data?.departments || [];

  const instructorDepartmentMap = useMemo(() => {
    if (!departments || !Array.isArray(departments)) return {};

    const map = {};

    departments.forEach((department) => {
      const insts = [];
      // Check for instructors array first
      if (department.instructors && Array.isArray(department.instructors)) {
        insts.push(...department.instructors);
      }
      // Fallback to legacy single instructor if array is empty but legacy exists
      else if (department.instructor) {
        insts.push(department.instructor);
      }

      insts.forEach((instructorRaw) => {
        const instructorId =
          typeof instructorRaw === "object"
            ? (instructorRaw?._id || instructorRaw?.id)?.toString()
            : instructorRaw?.toString();

        if (!instructorId) return;

        if (!map[instructorId]) {
          map[instructorId] = [];
        }

        // Avoid duplicates
        const deptId = (department._id || department.id)?.toString();
        if (!map[instructorId].some(d => (d._id || d.id)?.toString() === deptId)) {
          map[instructorId].push(department);
        }
      });
    });

    return map;
  }, [departments]);

  // Lines available for whichever department is selected in the Assign Lines/Machines dialog
  const { data: lmLinesData, isFetching: lmLinesLoading } = useGetLinesByDepartmentQuery(
    lmFormData.department,
    { skip: !lmFormData.department }
  );
  const lmAvailableLines = lmLinesData?.data || [];

  // Machines available for the lines currently selected under the selected department
  const [triggerGetMachinesByLine] = useLazyGetMachinesByLineQuery();
  const lmSelectedLineIdsForDept = useMemo(
    () =>
      (lmFormData.lines || [])
        .filter((l) => l.departmentId === lmFormData.department)
        .map((l) => l.id),
    [lmFormData.lines, lmFormData.department]
  );
  const lmSelectedLineIdsKey = lmSelectedLineIdsForDept.join(",");

  useEffect(() => {
    if (lmSelectedLineIdsForDept.length === 0) {
      setLmAvailableMachines([]);
      return;
    }

    let cancelled = false;
    setLmMachinesLoading(true);

    (async () => {
      try {
        const results = await Promise.all(
          lmSelectedLineIdsForDept.map((lineId) =>
            triggerGetMachinesByLine(lineId)
              .unwrap()
              .then((res) => res?.data || [])
              .catch(() => [])
          )
        );
        if (cancelled) return;

        const merged = results.flat();
        const deduped = Array.from(new Map(merged.map((m) => [m.id, m])).values());
        setLmAvailableMachines(deduped);
      } finally {
        if (!cancelled) setLmMachinesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lmSelectedLineIdsKey]);

  const openLinesMachinesDialog = (instructor) => {
    setSelectedInstructor(instructor);
    setLmFormData({
      department: "",
      lines: Array.isArray(instructor.lines) ? [...instructor.lines] : [],
      machines: Array.isArray(instructor.machines) ? [...instructor.machines] : [],
    });
    setIsLinesMachinesDialogOpen(true);
  };

  const handleLmDepartmentChange = (value) => {
    setLmFormData((prev) => ({ ...prev, department: value }));
  };

  const toggleLmLineSelection = (line) => {
    setLmFormData((prev) => {
      const isSelected = (prev.lines || []).some((l) => l.id === line.id);
      if (isSelected) {
        return {
          ...prev,
          lines: prev.lines.filter((l) => l.id !== line.id),
          machines: (prev.machines || []).filter((m) => m.lineId !== line.id),
        };
      }
      return {
        ...prev,
        lines: [...(prev.lines || []), { id: line.id, name: line.name, departmentId: prev.department }],
      };
    });
  };

  const toggleLmMachineSelection = (machine) => {
    setLmFormData((prev) => {
      const isSelected = (prev.machines || []).some((m) => m.id === machine.id);
      return {
        ...prev,
        machines: isSelected
          ? prev.machines.filter((m) => m.id !== machine.id)
          : [...(prev.machines || []), { id: machine.id, name: machine.name, lineId: machine.line }],
      };
    });
  };

  const removeLmLine = (lineId) => {
    setLmFormData((prev) => ({
      ...prev,
      lines: prev.lines.filter((l) => l.id !== lineId),
      machines: (prev.machines || []).filter((m) => m.lineId !== lineId),
    }));
  };

  const removeLmMachine = (machineId) => {
    setLmFormData((prev) => ({
      ...prev,
      machines: prev.machines.filter((m) => m.id !== machineId),
    }));
  };

  const handleSaveLinesMachines = async () => {
    if (isLmSubmitting) return;
    setIsLmSubmitting(true);
    try {
      await updateInstructor({
        id: selectedInstructor._id,
        lines: lmFormData.lines,
        machines: lmFormData.machines,
      }).unwrap();

      showToast("success", "Lines & machines updated successfully!");
      setIsLinesMachinesDialogOpen(false);
      setSelectedInstructor(null);
      refetch();
    } catch (error) {
      console.error("Update lines/machines error:", error);
      const errorMessage =
        error?.data?.message || error?.message || "Failed to update lines & machines";
      showToast("error", errorMessage);
    } finally {
      setIsLmSubmitting(false);
    }
  };

  // Filter options for reusable components
  const statusOptions = [
    { value: "ALL", label: "All Status" },
    { value: "PRESENT", label: "Present" },
    { value: "ON_LEAVE", label: "On Leave" },
    { value: "LEFT", label: "Left" },
  ];

  const departmentOptions = [
    { value: "ALL", label: "All Departments" },
    { value: "HAS_DEPARTMENT", label: "Has Department" },
    { value: "NO_DEPARTMENT", label: "No Department" },
  ];

  const { data: unitsResponse } = useGetAllUnitsQuery();
  const unitOptions = [
    { value: "ALL", label: "All Units" },
    ...(unitsResponse?.data || []).map((u) => ({ value: u.title, label: u.title })),
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

    if (!isAdmin && unitFilter !== "ALL") {
      const unitLabel = unitOptions.find((opt) => opt.value === unitFilter)?.label;
      filters.push({ label: "Unit", value: unitLabel });
    }

    if (searchTerm) {
      filters.push({ label: "Search", value: searchTerm });
    }

    return filters;
  }, [statusFilter, departmentFilter, searchTerm, statusOptions, departmentOptions, isAdmin, unitFilter]);

  // Filter instructors based on department and unit (status handled by API)
  const filteredInstructors = useMemo(() => {
    return instructors.filter((instructor) => {
      const instId = (instructor._id || instructor.id)?.toString();
      const departmentsForInstructor = instructorDepartmentMap[instId] || [];
      const hasDepartment = departmentsForInstructor.length > 0;

      const departmentMatch =
        departmentFilter === "ALL" ||
        (departmentFilter === "HAS_DEPARTMENT" && hasDepartment) ||
        (departmentFilter === "NO_DEPARTMENT" && !hasDepartment);

      const unitMatch = isAdmin
        ? instructor.unit === currentUser?.unit
        : (unitFilter === "ALL" || instructor.unit === unitFilter);

      return departmentMatch && unitMatch;
    });
  }, [instructors, departmentFilter, unitFilter, instructorDepartmentMap, isAdmin, currentUser?.unit]);

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
      unit: isAdmin ? (currentUser?.unit || "UNIT 1") : "UNIT 1",
      doj: "",
    });
    setFormErrors({});
  };

  useEffect(() => {
    if (isAdmin && currentUser?.unit) {
      setFormData((prev) => ({ ...prev, unit: currentUser.unit }));
    }
  }, [isAdmin, currentUser?.unit]);

  const handleAddInstructor = async () => {
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
    if (!formData.doj) {
      errors.doj = "Date of joining is required";
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
      const instructorData = {
        fullName: formData.fullName.trim(),
        userName: formData.userName.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        phoneNumber: formData.phoneNumber.trim(),
        password: formData.password.trim(),
        role: "INSTRUCTOR",
        unit: formData.unit,
        doj: formData.doj,
      };

      const result = await registerInstructor(instructorData).unwrap();
      showToast("success", "Instructor registered successfully!");
      setIsAddDialogOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      console.error("Register instructor error:", error);
      console.error("Error details:", {
        status: error?.status,
        data: error?.data,
        message: error?.message,
        originalStatus: error?.originalStatus,
      });

      let errorMessage = "Failed to register instructor. Please try again.";

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

  const handleEditInstructor = async () => {
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
        doj: updateData.doj,
      };

      await updateInstructor({
        id: selectedInstructor._id,
        ...cleanedData,
      }).unwrap();

      showToast("success", "Instructor updated successfully!");
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedInstructor(null);
      refetch();
    } catch (error) {
      console.error("Update instructor error:", error);
      const errorMessage =
        error?.data?.message || error?.message || "Failed to update instructor";
      showToast("error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInstructor = async () => {
    try {
      await deleteInstructor(selectedInstructor._id).unwrap();
      showToast("success", "Instructor deleted successfully!");
      setIsDeleteDialogOpen(false);
      setSelectedInstructor(null);
      refetch();
    } catch (error) {
      console.error("Delete instructor error:", error);
      const errorMessage =
        error?.data?.message || error?.message || "Failed to delete instructor";
      showToast("error", errorMessage);
    }
  };

  const handleAssignToDepartment = async (departmentId) => {
    try {
      await assignInstructor({
        departmentId,
        instructorId: selectedInstructor._id,
      }).unwrap();

      showToast("success", "Instructor assigned to department successfully!");
      setIsDepartmentDialogOpen(false);
      setSelectedInstructor(null);

      // Refetch both instructors and departments to get updated data
      refetch();
      if (typeof refetchDepartments === "function") {
        refetchDepartments();
      }
    } catch (error) {
      console.error("Assign instructor error:", error);
      let errorMessage = "Failed to assign instructor to department";

      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.status === 400) {
        errorMessage = "Invalid department or instructor selection";
      }

      showToast("error", errorMessage);
    }
  };

  const openEditDialog = (instructor) => {
    setSelectedInstructor(instructor);
    setFormData({
      fullName: instructor.fullName,
      userName: instructor.userName,
      email: instructor.email,
      phoneNumber: instructor.phoneNumber,
      password: "",
      status: instructor.status,
      unit: instructor.unit || "UNIT 1",
      doj: instructor.doj ? new Date(instructor.doj).toISOString().split('T')[0] : "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (instructor) => {
    setSelectedInstructor(instructor);
    setIsDeleteDialogOpen(true);
  };

  const openDepartmentDialog = (instructor) => {
    setSelectedInstructor(instructor);
    setIsDepartmentDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    const s = status || "PRESENT";
    switch (s) {
      case "PRESENT":
        return (
          <Badge variant="success" className="flex items-center gap-1 w-fit">
            <div className="h-2 w-2 rounded-full bg-[#22c55e]"></div> Present
          </Badge>
        );
      case "ON_LEAVE":
        return (
          <Badge variant="warning" className="flex items-center gap-1 w-fit">
            <div className="h-2 w-2 rounded-full bg-[#f59e0b]"></div> On Leave
          </Badge>
        );
      case "LEFT":
        return (
          <Badge
            variant="destructive"
            className="flex items-center gap-1 w-fit"
          >
            <div className="h-2 w-2 rounded-full bg-[#ef4444]"></div> Left
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
            <div className="h-2 w-2 rounded-full bg-[#6b7280]"></div> {status}
          </Badge>
        );
    }
  };

  const handleQuickStatusChange = async (
    instructorId,
    newStatus,
    oldStatus
  ) => {
    // Confirm destructive actions
    if (["LEFT"].includes(newStatus)) {
      if (
        !window.confirm(
          `Are you sure you want to mark this instructor as ${newStatus.toLowerCase()}?`
        )
      ) {
        return;
      }
    }

    try {
      await updateInstructor({
        id: instructorId,
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

  const getDepartmentInfo = (instructor) => {
    const instId = (instructor._id || instructor.id)?.toString();
    const departmentsForInstructor = instructorDepartmentMap[instId] || [];

    if (!departmentsForInstructor.length) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          No Department
        </Badge>
      );
    }

    if (departmentsForInstructor.length === 1) {
      const departmentName = departmentsForInstructor[0]?.name || "Unnamed Department";
      return (
        <Badge variant="info" className="flex items-center gap-1">
          <IconSchool className="h-3 w-3" />
          {departmentName}
        </Badge>
      );
    }

    return (
      <Badge variant="info" className="flex items-center gap-1">
        <IconSchool className="h-3 w-3" />
        {departmentsForInstructor.length} Departments
      </Badge>
    );
  };

  const getCurrentDepartmentsLabel = () => {
    if (!selectedInstructor?._id) return null;

    const departmentsForInstructor =
      instructorDepartmentMap[selectedInstructor._id] || [];

    if (!departmentsForInstructor.length) return null;

    if (departmentsForInstructor.length === 1) {
      return departmentsForInstructor[0]?.name || "Unknown Department";
    }

    return `${departmentsForInstructor.length} departments`;
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

  if (instructorsError) {
    // Handle authentication error specifically
    if (instructorsError.status === 401) {
      return (
        <div className="flex flex-col justify-center items-center h-64 space-y-4 p-4">
          <div className="text-[#dc2626] text-lg font-medium">
            Authentication Required
          </div>
          <p className="text-[#4b5563] text-center">
            Please log in as an admin to view trainers
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
          Error loading instructors
        </div>
        <p className="text-[#4b5563] text-center">
          {instructorsError?.message || "Failed to fetch trainers"}
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
          title="Total Trainers"
          value={instructorsData?.data?.totalUsers || 0}
          description="All registered trainers"
          icon={IconUsers}
          iconBgColor="bg-[#dbeafe]"
          iconColor="text-[#2563eb]"
          gradientFrom="from-[#eff6ff]"
          gradientTo="to-[#dbeafe]"
          borderColor="border-[#bfdbfe]"
          textColor="text-[#1e40af]"
          valueColor="text-[#1e3a8a]"
        />

        <StatCard
          title="Active Trainers"
          value={instructors.filter((i) => i.status === "PRESENT").length}
          description="Currently active"
          icon={IconUserPlus}
          iconBgColor="bg-[#dcfce7]"
          iconColor="text-[#16a34a]"
          gradientFrom="from-[#f0fdf4]"
          gradientTo="to-[#dcfce7]"
          borderColor="border-[#bbf7d0]"
          textColor="text-[#166534]"
          valueColor="text-[#14532d]"
        />

        <StatCard
          title="Assigned to Departments"
          value={Object.keys(instructorDepartmentMap).length}
          description="Currently teaching"
          icon={IconSchool}
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
          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="all" onClick={() => clearFilters()}>
              All
            </TabsTrigger>
            <TabsTrigger
              value="active"
              onClick={() => setStatusFilter("PRESENT")}
            >
              Active
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
            style={{
              backgroundColor: hoveredBtn === "add-trainer" ? "#1d4ed8" : "#2563eb",
              color: "#ffffff",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              transition: "all 0.2s",
            }}
            onMouseEnter={() => setHoveredBtn("add-trainer")}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            <IconPlus className="h-4 w-4 mr-2" />
            Add Trainer
          </Button>
        </div>
      </Tabs>

      {/* Search and Filters using reusable components */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <SearchInput
              placeholder="Search trainers by name, email, or username..."
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

              {!isAdmin && (
                <FilterSelect
                  value={unitFilter}
                  onValueChange={setUnitFilter}
                  options={unitOptions}
                  placeholder="Unit"
                  icon={IconUsers}
                  className="w-[140px]"
                />
              )}

              {(statusFilter !== "ALL" ||
                departmentFilter !== "ALL" ||
                (!isAdmin && unitFilter !== "ALL") ||
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
                <TableHead className="w-[220px]">Trainer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Machines</TableHead>
                <TableHead>Joining Date</TableHead>
                <TableHead>Leaving Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstructors.length > 0 ? (
                filteredInstructors.map((instructor) => (
                  <TableRow
                    key={instructor._id}
                    className="group hover:bg-muted/30 cursor-pointer"
                    onClick={(e) => {
                      if (
                        !e.target.closest(".action-button, .select-trigger")
                      ) {
                        handleInstructorClick(instructor);
                      }
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage
                            src={instructor.avatar?.url}
                            alt={instructor.fullName}
                          />
                          <AvatarFallback className="bg-[#dbeafe] text-[#1e40af]">
                            {instructor.fullName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">
                              {instructor.fullName}
                            </p>
                            <IconExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            @{instructor.userName}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-foreground">{instructor.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {instructor.phoneNumber}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={instructor.status || ""}
                        onValueChange={(newStatus) =>
                          handleQuickStatusChange(
                            instructor._id,
                            newStatus,
                            instructor.status
                          )
                        }
                      >
                        <SelectTrigger
                          className="w-[140px] select-trigger"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {getStatusBadge(instructor.status)}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRESENT">Present</SelectItem>
                          <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                          <SelectItem value="LEFT">Left</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {instructor.unit || "No unit"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDepartmentInfo(instructor)}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row click
                                  openDepartmentDialog(instructor);
                                }}
                                className="h-7 w-7 p-0 transition-opacity"
                                style={{
                                  opacity: 0,
                                  backgroundColor: hoveredBtn === `dept-${instructor._id}` ? '#f1f5f9' : 'transparent'
                                }}
                                onMouseEnter={() => setHoveredBtn(`dept-${instructor._id}`)}
                                onMouseLeave={() => setHoveredBtn(null)}
                              >
                                <IconPencil className="h-3 w-3" style={{ color: '#64748b' }} />
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
                      <div className="flex items-center gap-2">
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {Array.isArray(instructor.lines) && instructor.lines.length > 0 ? (
                            instructor.lines.map((line) => (
                              <Badge key={line.id} variant="outline">
                                {line.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row click
                                  openLinesMachinesDialog(instructor);
                                }}
                                className="h-7 w-7 p-0 transition-opacity"
                                style={{
                                  opacity: 0,
                                  backgroundColor: hoveredBtn === `lm-${instructor._id}` ? '#f1f5f9' : 'transparent'
                                }}
                                onMouseEnter={() => setHoveredBtn(`lm-${instructor._id}`)}
                                onMouseLeave={() => setHoveredBtn(null)}
                              >
                                <IconPencil className="h-3 w-3" style={{ color: '#64748b' }} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Assign lines & machines</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {Array.isArray(instructor.machines) && instructor.machines.length > 0 ? (
                          instructor.machines.map((machine) => (
                            <Badge key={machine.id} variant="outline">
                              {machine.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {instructor.doj
                          ? new Date(instructor.doj).toLocaleDateString()
                          : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {instructor.leavingDate
                          ? new Date(instructor.leavingDate).toLocaleDateString()
                          : "-"}
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
                                  e.stopPropagation(); // Prevent row click
                                  openEditDialog(instructor);
                                }}
                                className="h-8 w-8 p-0"
                                style={{
                                  backgroundColor: hoveredBtn === `edit-${instructor._id}` ? '#f1f5f9' : 'transparent'
                                }}
                                onMouseEnter={() => setHoveredBtn(`edit-${instructor._id}`)}
                                onMouseLeave={() => setHoveredBtn(null)}
                              >
                                <IconPencil className="h-4 w-4" style={{ color: '#64748b' }} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit trainer</p>
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
                                  e.stopPropagation(); // Prevent row click
                                  openDeleteDialog(instructor);
                                }}
                                className="h-8 w-8 p-0"
                                style={{
                                  color: hoveredBtn === `delete-${instructor._id}` ? '#991b1b' : '#dc2626',
                                  backgroundColor: hoveredBtn === `delete-${instructor._id}` ? '#fef2f2' : 'transparent'
                                }}
                                onMouseEnter={() => setHoveredBtn(`delete-${instructor._id}`)}
                                onMouseLeave={() => setHoveredBtn(null)}
                              >
                                <IconTrash className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete trainer</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10">
                    <div className="flex flex-col items-center space-y-3">
                      <IconUsers className="h-12 w-12 text-muted-foreground/60" />
                      <p className="text-muted-foreground font-medium">
                        No trainers found
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {searchTerm ||
                          statusFilter !== "ALL" ||
                          departmentFilter !== "ALL"
                          ? "Try adjusting your search or filters"
                          : "Add your first trainer to get started"}
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
            Showing {filteredInstructors.length} of{" "}
            {instructorsData?.data?.totalUsers || 0} trainers
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

      {/* Add Instructor Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconUserPlus className="h-5 w-5" />
              Add New Trainer
            </DialogTitle>
            <DialogDescription>
              Add a new trainer to the system. All fields are required.
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
                    ? "border-[#ef4444] focus:border-[#ef4444]"
                    : ""
                }
              />
              {formErrors.fullName && (
                <p className="text-sm text-[#dc2626]">{formErrors.fullName}</p>
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
                    ? "border-[#ef4444] focus:border-[#ef4444]"
                    : ""
                }
              />
              {formErrors.userName && (
                <p className="text-sm text-[#dc2626]">{formErrors.userName}</p>
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
                  formErrors.email ? "border-[#ef4444] focus:border-[#ef4444]" : ""
                }
              />
              {formErrors.email && (
                <p className="text-sm text-[#dc2626]">{formErrors.email}</p>
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
                    ? "border-[#ef4444] focus:border-[#ef4444]"
                    : ""
                }
              />
              {formErrors.phoneNumber && (
                <p className="text-sm text-[#dc2626]">{formErrors.phoneNumber}</p>
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
                  <SelectItem value="LEFT">Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isAdmin && (
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
                    {(unitsResponse?.data || []).map((u) => (
                      <SelectItem key={u.id} value={u.title}>{u.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="doj">Date of Joining</Label>
              <Input
                id="doj"
                name="doj"
                type="date"
                value={formData.doj}
                onChange={handleInputChange}
                className={
                  formErrors.doj
                    ? "border-[#ef4444] focus:border-[#ef4444]"
                    : ""
                }
              />
              {formErrors.doj && (
                <p className="text-sm text-[#dc2626]">{formErrors.doj}</p>
              )}
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
                    ? "border-[#ef4444] focus:border-[#ef4444]"
                    : ""
                }
              />
              {formErrors.password && (
                <p className="text-sm text-[#dc2626]">{formErrors.password}</p>
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
              onClick={handleAddInstructor}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting && <IconLoader className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Registering..." : "Register Trainer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Instructor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconPencil className="h-5 w-5" />
              Edit Trainer
            </DialogTitle>
            <DialogDescription>
              Update trainer information. All fields are required.
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
                  <SelectItem value="LEFT">Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!isAdmin && (
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
                    {(unitsResponse?.data || []).map((u) => (
                      <SelectItem key={u.id} value={u.title}>{u.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-doj">Date of Joining</Label>
              <Input
                id="edit-doj"
                name="doj"
                type="date"
                value={formData.doj}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
                setSelectedInstructor(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditInstructor}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting && <IconLoader className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Updating..." : "Update Trainer"}
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
              Delete Trainer
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              trainer account.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3 p-3 bg-[#fef2f2] rounded-lg border-[#fecaca]">
              <IconInfoCircle className="h-5 w-5 text-[#dc2626] flex-shrink-0" />
              <p className="text-sm text-[#991b1b]">
                Are you sure you want to delete{" "}
                <strong>{selectedInstructor?.fullName}</strong>?
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedInstructor(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteInstructor}
              className="gap-2"
            >
              <IconTrash className="h-4 w-4" />
              Delete Trainer
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
              Select a department for <strong>{selectedInstructor?.fullName}</strong>
              {getCurrentDepartmentsLabel() && (
                <span className="text-amber-600 font-medium">
                  {" "}(Currently assigned to: {getCurrentDepartmentsLabel()})
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
                  <p className="text-[#ef4444]">Error loading departments</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please try again later
                  </p>
                </div>
              ) : departments.length > 0 ? (
                departments.map((department) => {
                  const selectedId = selectedInstructor?._id?.toString();

                  // Handle multiple instructors logic
                  const instructors = department.instructors || (department.instructor ? [department.instructor] : []);
                  const instructorIds = instructors.map(i =>
                    (typeof i === 'object' ? (i._id || i.id) : i)?.toString()
                  ).filter(Boolean);

                  const isCurrentlyAssigned = selectedId && instructorIds.includes(selectedId);
                  const existingCount = instructorIds.length;
                  const hasOtherInstructors = existingCount > 0 && !isCurrentlyAssigned;

                  return (
                    <div
                      key={department._id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isCurrentlyAssigned
                        ? "bg-[#f0fdf4] border-[#bbf7d0] cursor-default"
                        : "hover:bg-muted/50 cursor-pointer"
                        }`}
                      onClick={() => {
                        if (!isCurrentlyAssigned) {
                          handleAssignToDepartment(department._id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isCurrentlyAssigned
                          ? "bg-[#dcfce7]"
                          : "bg-[#dbeafe]"
                          }`}>
                          <IconSchool className={`h-4 w-4 ${isCurrentlyAssigned
                            ? "text-[#16a34a]"
                            : "text-[#2563eb]"
                            }`} />
                        </div>
                        <div>
                          <p className="font-medium">{department.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {department.students?.length || 0} students
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrentlyAssigned && (
                          <Badge variant="success" className="ml-2">
                            Current
                          </Badge>
                        )}
                        {hasOtherInstructors && (
                          <Badge variant="secondary" className="ml-2">
                            {existingCount} Assigned
                          </Badge>
                        )}
                        {!isCurrentlyAssigned && (
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
                    Create a department first to assign trainers
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
                setSelectedInstructor(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Lines & Machines Dialog */}
      <Dialog open={isLinesMachinesDialogOpen} onOpenChange={setIsLinesMachinesDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconRoute className="h-5 w-5" />
              Assign Lines & Machines
            </DialogTitle>
            <DialogDescription>
              Manage lines and machines for <strong>{selectedInstructor?.fullName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Currently Assigned</Label>
              <div className="rounded-md border p-3 space-y-3">
                {(lmFormData.lines?.length > 0 || lmFormData.machines?.length > 0) ? (
                  <>
                    {lmFormData.lines?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <IconRoute className="h-3 w-3" /> Lines
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {lmFormData.lines.map((line) => (
                            <Badge key={line.id} variant="secondary" className="flex items-center gap-1">
                              {line.name}
                              <button
                                type="button"
                                onClick={() => removeLmLine(line.id)}
                                className="ml-1 hover:text-[#dc2626]"
                              >
                                <IconX className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {lmFormData.machines?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <IconCpu className="h-3 w-3" /> Machines
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {lmFormData.machines.map((machine) => (
                            <Badge key={machine.id} variant="secondary" className="flex items-center gap-1">
                              {machine.name}
                              <button
                                type="button"
                                onClick={() => removeLmMachine(machine.id)}
                                className="ml-1 hover:text-[#dc2626]"
                              >
                                <IconX className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No lines or machines assigned yet</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lm-department">Add More — Department</Label>
              <Select value={lmFormData.department || ""} onValueChange={handleLmDepartmentChange}>
                <SelectTrigger id="lm-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept._id} value={String(dept._id)}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Lines</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                {!lmFormData.department ? (
                  <p className="text-sm text-muted-foreground px-1">
                    Select a department first
                  </p>
                ) : lmLinesLoading ? (
                  <div className="flex justify-center py-3">
                    <IconLoader className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : lmAvailableLines.length > 0 ? (
                  lmAvailableLines.map((line) => (
                    <label
                      key={line.id}
                      className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={lmFormData.lines?.some((l) => l.id === line.id)}
                        onCheckedChange={() => toggleLmLineSelection(line)}
                      />
                      <span className="text-sm">{line.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground px-1">
                    No lines found for this department
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Machines</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                {lmSelectedLineIdsForDept.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-1">
                    Select at least one line first
                  </p>
                ) : lmMachinesLoading ? (
                  <div className="flex justify-center py-3">
                    <IconLoader className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : lmAvailableMachines.length > 0 ? (
                  lmAvailableMachines.map((machine) => (
                    <label
                      key={machine.id}
                      className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={lmFormData.machines?.some((m) => m.id === machine.id)}
                        onCheckedChange={() => toggleLmMachineSelection(machine)}
                      />
                      <span className="text-sm">{machine.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground px-1">
                    No machines found for selected lines
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsLinesMachinesDialogOpen(false);
                setSelectedInstructor(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveLinesMachines}
              disabled={isLmSubmitting}
              className="gap-2"
            >
              {isLmSubmitting && <IconLoader className="h-4 w-4 animate-spin" />}
              {isLmSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Instructor;
