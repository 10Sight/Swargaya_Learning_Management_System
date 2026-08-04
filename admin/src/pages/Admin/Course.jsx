import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  useGetCoursesQuery,
  useDeleteCourseMutation,
  useTogglePublishCourseMutation,
  useUpdateCourseMutation,
} from "@/Redux/AllApi/CourseApi";
import { useLazyExportCoursesQuery } from "@/Redux/AllApi/CourseApi";
import {
  useGetActiveConfigQuery
} from "@/Redux/AllApi/CourseLevelConfigApi";
import { useGetAllUnitsQuery } from "@/Redux/AllApi/UnitApi";
import { useGetAllDepartmentsQuery } from "@/Redux/AllApi/DepartmentApi";
import {
  useGetLinesByDepartmentQuery,
  useLazyGetLinesByDepartmentQuery,
} from "@/Redux/AllApi/LineApi";
import {
  useGetMachinesByLineQuery,
  useLazyGetMachinesByLineQuery,
} from "@/Redux/AllApi/MachineApi";
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
  IconBook,
  IconSchool,
  IconSearch,
  IconFilter,
  IconX,
  IconLoader,
  IconRefresh,
  IconInfoCircle,
  IconEye,
  IconEyeOff,
  IconCalendar,
  IconUsers,
  IconFileText,
  IconChartBar,
  IconExternalLink,
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

// Import reusable components
import SearchInput from "@/components/common/SearchInput";
import FilterSelect from "@/components/common/FilterSelect";
import StatCard from "@/components/common/StatCard";
import FilterBar from "@/components/common/FilterBar";

const Course = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = useMemo(() => {
    if (location.pathname.startsWith("/superadmin")) return "/superadmin";
    if (location.pathname.startsWith("/instructor")) return "/instructor";
    return "/admin";
  }, [location.pathname]);
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === "SUPERADMIN";
  const { data: unitsData } = useGetAllUnitsQuery(undefined, { skip: !isSuperAdmin });
  const allUnits = Array.isArray(unitsData?.data) ? unitsData.data : [];
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastToastId, setLastToastId] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    difficulty: "L1",
    status: "DRAFT",
    unit: "",
    departments: [], // [{ id, name }]
    lines: [], // [{ id, name, departmentId }]
    machines: [], // [{ id, name, lineId }]
  });
  const [formErrors, setFormErrors] = useState({});

  // Department / Line / Machine — optional multi-select cascading association for the course
  const { data: departmentsData } = useGetAllDepartmentsQuery();
  const allDepartments = departmentsData?.data?.departments || [];

  const [triggerGetLinesByDepartment] = useLazyGetLinesByDepartmentQuery();
  const [triggerGetMachinesByLine] = useLazyGetMachinesByLineQuery();
  const [editAvailableLines, setEditAvailableLines] = useState([]);
  const [editAvailableMachines, setEditAvailableMachines] = useState([]);
  const [editLinesLoading, setEditLinesLoading] = useState(false);
  const [editMachinesLoading, setEditMachinesLoading] = useState(false);

  const editSelectedDepartmentIds = useMemo(
    () => (formData.departments || []).map((d) => d.id),
    [formData.departments]
  );
  const editSelectedDepartmentIdsKey = editSelectedDepartmentIds.join(",");

  useEffect(() => {
    if (editSelectedDepartmentIds.length === 0) {
      setEditAvailableLines([]);
      return;
    }

    let cancelled = false;
    setEditLinesLoading(true);

    (async () => {
      try {
        const results = await Promise.all(
          editSelectedDepartmentIds.map((departmentId) =>
            triggerGetLinesByDepartment(departmentId)
              .unwrap()
              .then((res) => res?.data || [])
              .catch(() => [])
          )
        );
        if (cancelled) return;

        const merged = results.flat();
        const deduped = Array.from(new Map(merged.map((l) => [l.id, l])).values());
        setEditAvailableLines(deduped);

        setFormData((prev) => ({
          ...prev,
          lines: (prev.lines || []).filter((l) => deduped.some((dl) => dl.id === l.id)),
        }));
      } finally {
        if (!cancelled) setEditLinesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSelectedDepartmentIdsKey]);

  const editSelectedLineIds = useMemo(
    () => (formData.lines || []).map((l) => l.id),
    [formData.lines]
  );
  const editSelectedLineIdsKey = editSelectedLineIds.join(",");

  useEffect(() => {
    if (editSelectedLineIds.length === 0) {
      setEditAvailableMachines([]);
      return;
    }

    let cancelled = false;
    setEditMachinesLoading(true);

    (async () => {
      try {
        const results = await Promise.all(
          editSelectedLineIds.map((lineId) =>
            triggerGetMachinesByLine(lineId)
              .unwrap()
              .then((res) => res?.data || [])
              .catch(() => [])
          )
        );
        if (cancelled) return;

        const merged = results.flat();
        const deduped = Array.from(new Map(merged.map((m) => [m.id, m])).values());
        setEditAvailableMachines(deduped);

        setFormData((prev) => ({
          ...prev,
          machines: (prev.machines || []).filter((m) => editSelectedLineIds.includes(m.lineId)),
        }));
      } finally {
        if (!cancelled) setEditMachinesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSelectedLineIdsKey]);

  const toggleEditDepartmentSelection = (dept) => {
    setFormData((prev) => {
      const isSelected = (prev.departments || []).some((d) => d.id === dept._id);
      return {
        ...prev,
        departments: isSelected
          ? prev.departments.filter((d) => d.id !== dept._id)
          : [...(prev.departments || []), { id: dept._id, name: dept.name }],
      };
    });
  };

  const toggleEditLineSelection = (line) => {
    setFormData((prev) => {
      const isSelected = (prev.lines || []).some((l) => l.id === line.id);
      return {
        ...prev,
        lines: isSelected
          ? prev.lines.filter((l) => l.id !== line.id)
          : [...(prev.lines || []), { id: line.id, name: line.name, departmentId: line.department }],
      };
    });
  };

  const toggleEditMachineSelection = (machine) => {
    setFormData((prev) => {
      const isSelected = (prev.machines || []).some((m) => m.id === machine.id);
      return {
        ...prev,
        machines: isSelected
          ? prev.machines.filter((m) => m.id !== machine.id)
          : [...(prev.machines || []), { id: machine.id, name: machine.name, lineId: machine.line }],
      };
    });
  };

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [lineFilter, setLineFilter] = useState("ALL");
  const [machineFilter, setMachineFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("all");

  // Filter row: Department -> Line -> Machine (single-select cascading filters)
  const { data: filterLinesData, isFetching: filterLinesLoading } = useGetLinesByDepartmentQuery(
    departmentFilter,
    { skip: departmentFilter === "ALL" }
  );
  const filterLines = filterLinesData?.data || [];

  const { data: filterMachinesData, isFetching: filterMachinesLoading } = useGetMachinesByLineQuery(
    lineFilter,
    { skip: lineFilter === "ALL" }
  );
  const filterMachines = filterMachinesData?.data || [];

  const handleDepartmentFilterChange = (value) => {
    setDepartmentFilter(value);
    setLineFilter("ALL");
    setMachineFilter("ALL");
  };

  const handleLineFilterChange = (value) => {
    setLineFilter(value);
    setMachineFilter("ALL");
  };

  const [deleteConfirmation, setDeleteConfirmation] = useState("");

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
    data: coursesData,
    isLoading,
    error: coursesError,
    refetch,
  } = useGetCoursesQuery(
    {
      page: currentPage,
      limit: 10,
      search: debouncedSearchTerm || "",
      category: categoryFilter !== "ALL" ? categoryFilter : "",
      status: statusFilter !== "ALL" ? statusFilter : "",
    },
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );

  const [updateCourse] = useUpdateCourseMutation();
  const [deleteCourse] = useDeleteCourseMutation();
  const [togglePublish] = useTogglePublishCourseMutation();
  const [triggerExportCourses, { isFetching: isExportingCourses }] = useLazyExportCoursesQuery();
  const { data: configData } = useGetActiveConfigQuery();
  const activeLevels = configData?.data?.levels || [];

  const courses = coursesData?.data?.courses || [];
  const totalPages = coursesData?.data?.totalPages || 1;
  const totalCount = coursesData?.data?.total || 0;

  // Extract unique categories for filter
  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(courses.map((course) => course.category)),
    ];
    return ["ALL", ...uniqueCategories].filter(Boolean);
  }, [courses]);

  // Filter options for reusable components
  const statusOptions = [
    { value: "ALL", label: "All Status" },
    { value: "PUBLISHED", label: "Published" },
    { value: "DRAFT", label: "Draft" },
    { value: "ARCHIVED", label: "Archived" },
  ];

  const categoryOptions = useMemo(() => {
    const categoryOpts = categories
      .filter((cat) => cat !== "ALL")
      .map((category) => ({ value: category, label: category }));
    return [{ value: "ALL", label: "All Categories" }, ...categoryOpts];
  }, [categories]);

  const departmentOptions = [
    { value: "ALL", label: "All Departments" },
    ...allDepartments.map((d) => ({ value: String(d._id), label: d.name })),
  ];

  const lineOptions = [
    { value: "ALL", label: "All Lines" },
    ...filterLines.map((line) => ({ value: String(line.id), label: line.name })),
  ];

  const machineOptions = [
    { value: "ALL", label: "All Machines" },
    ...filterMachines.map((machine) => ({ value: String(machine.id), label: machine.name })),
  ];

  // Client-side narrowing by Department/Line/Machine (associations are multi-select,
  // so this mirrors how Students.jsx filters on a user's assigned lines/machines).
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const departmentMatch =
        departmentFilter === "ALL" ||
        (Array.isArray(course.departments) &&
          course.departments.some((d) => String(d._id) === departmentFilter));

      const lineMatch =
        lineFilter === "ALL" ||
        (Array.isArray(course.lines) &&
          course.lines.some((l) => String(l._id) === lineFilter));

      const machineMatch =
        machineFilter === "ALL" ||
        (Array.isArray(course.machines) &&
          course.machines.some((m) => String(m._id) === machineFilter));

      return departmentMatch && lineMatch && machineMatch;
    });
  }, [courses, departmentFilter, lineFilter, machineFilter]);

  // Active filters for FilterBar
  const activeFilters = useMemo(() => {
    const filters = [];

    if (statusFilter !== "ALL") {
      const statusLabel = statusOptions.find(
        (opt) => opt.value === statusFilter
      )?.label;
      filters.push({ label: "Status", value: statusLabel });
    }

    if (categoryFilter !== "ALL") {
      filters.push({ label: "Category", value: categoryFilter });
    }

    if (departmentFilter !== "ALL") {
      const departmentLabel = departmentOptions.find((opt) => opt.value === departmentFilter)?.label;
      filters.push({ label: "Department", value: departmentLabel });
    }

    if (lineFilter !== "ALL") {
      const lineLabel = lineOptions.find((opt) => opt.value === lineFilter)?.label;
      filters.push({ label: "Line", value: lineLabel });
    }

    if (machineFilter !== "ALL") {
      const machineLabel = machineOptions.find((opt) => opt.value === machineFilter)?.label;
      filters.push({ label: "Machine", value: machineLabel });
    }

    if (searchTerm) {
      filters.push({ label: "Search", value: searchTerm });
    }

    return filters;
  }, [statusFilter, categoryFilter, departmentFilter, lineFilter, machineFilter, searchTerm, statusOptions]);

  // Toast helpers
  const showToast = useCallback(
    (type, message) => {
      if (lastToastId) toast.dismiss(lastToastId);
      const toastId =
        type === "success"
          ? toast.success(message)
          : type === "error"
            ? toast.error(message)
            : toast(message);
      setLastToastId(toastId);
    },
    [lastToastId]
  );

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      difficulty: "L1",
      status: "DRAFT",
      unit: "",
      departments: [],
      lines: [],
      machines: [],
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title?.trim()) errors.title = "Title is required";
    if (!formData.description?.trim())
      errors.description = "Description is required";
    if (!formData.category?.trim()) errors.category = "Category is required";
    return errors;
  };

  const handleUpdateCourse = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast("error", "Please fix the form errors");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCourse({
        id: selectedCourse._id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category.trim(),
        difficulty: formData.difficulty,
        status: formData.status,
        unit: formData.unit,
        departmentIds: formData.departments.map((d) => d.id),
        lineIds: formData.lines.map((l) => l.id),
        machineIds: formData.machines.map((m) => m.id),
      }).unwrap();

      showToast("success", "Course updated successfully!");
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedCourse(null);
      refetch();
    } catch (error) {
      console.error("Update course error:", error);
      const errorMessage = error?.data?.message || "Failed to update course";
      showToast("error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    try {
      await deleteCourse(selectedCourse._id).unwrap();
      showToast("success", "Course deleted successfully!");
      setIsDeleteDialogOpen(false);
      setSelectedCourse(null);
      refetch();
    } catch (error) {
      console.error("Delete course error:", error);
      const errorMessage = error?.data?.message || "Failed to delete course";
      showToast("error", errorMessage);
    }
  };

  const handleTogglePublishStatus = async (courseId, currentStatus) => {
    try {
      await togglePublish(courseId).unwrap();
      showToast(
        "success",
        `Course ${currentStatus === "PUBLISHED" ? "unpublished" : "published"
        } successfully!`
      );
      refetch();
    } catch (error) {
      console.error("Toggle publish error:", error);
      const errorMessage =
        error?.data?.message || "Failed to update course status";
      showToast("error", errorMessage);
    }
  };

  const getNormalizedDifficulty = useCallback((difficulty) => {
    if (!difficulty) return activeLevels[0]?.name || "L1";

    const difficultyUpper = difficulty.toUpperCase();

    // 1. Try to find exact match in activeLevels
    const match = activeLevels.find(l => l.name.toUpperCase() === difficultyUpper);
    if (match) return match.name;

    // 2. Map legacy names to standard L names
    const legacyMap = {
      BEGINNER: "L1",
      BEGGINER: "L1",
      INTERMEDIATE: "L2",
      ADVANCED: "L3",
    };

    const standardName = legacyMap[difficultyUpper];
    if (standardName) {
      // Check if standard name exists in activeLevels
      const standardMatch = activeLevels.find(l => l.name.toUpperCase() === standardName);
      if (standardMatch) return standardMatch.name;
      return standardName;
    }

    return difficulty;
  }, [activeLevels]);

  const openEditDialog = (course) => {
    setSelectedCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      category: course.category,
      difficulty: getNormalizedDifficulty(course.difficulty),
      status: course.status,
      unit: course.unit || "",
      departments: Array.isArray(course.departments)
        ? course.departments.map((d) => ({ id: d._id, name: d.name }))
        : [],
      lines: Array.isArray(course.lines)
        ? course.lines.map((l) => ({ id: l._id, name: l.name, departmentId: l.department }))
        : [],
      machines: Array.isArray(course.machines)
        ? course.machines.map((m) => ({ id: m._id, name: m.name, lineId: m.line }))
        : [],
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (course) => {
    setSelectedCourse(course);
    setIsDeleteDialogOpen(true);
  };

  const handleCourseClick = (course) => {
    const handle = course.slug || course._id;
    navigate(`${handle}`);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PUBLISHED: { variant: "success", label: "Published", icon: IconEye },
      DRAFT: { variant: "secondary", label: "Draft", icon: IconEyeOff },
      ARCHIVED: { variant: "destructive", label: "Archived", icon: IconX },
    };

    const config = statusConfig[status] || {
      variant: "secondary",
      label: status,
      icon: IconInfoCircle,
    };
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getDifficultyBadge = (difficulty) => {
    const normalized = getNormalizedDifficulty(difficulty);

    // Check for dynamic level config first
    const activeLevel = activeLevels.find(l => l.name.toUpperCase() === normalized.toUpperCase());

    if (activeLevel) {
      return (
        <Badge
          style={{ backgroundColor: activeLevel.color, color: "#fff" }}
          className="w-fit border-none shadow-sm"
        >
          {activeLevel.name}
        </Badge>
      );
    }

    // Fallback to defaults
    const difficultyConfig = {
      L1: { variant: "success", label: "L1" },
      L2: { variant: "warning", label: "L2" },
      L3: { variant: "destructive", label: "L3" },
    };

    const config = difficultyConfig[normalized] || {
      variant: "secondary",
      label: normalized,
    };

    return (
      <Badge variant={config.variant} className="w-fit">
        {config.label}
      </Badge>
    );
  };

  const clearFilters = () => {
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    setDepartmentFilter("ALL");
    setLineFilter("ALL");
    setMachineFilter("ALL");
    setSearchTerm("");
    setActiveTab("all");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32 mt-1" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter Skeletons */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <Skeleton className="h-10 w-80" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Table Skeleton */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <TableHead key={i}>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((row) => (
                  <TableRow key={row}>
                    {[1, 2, 3, 4, 5, 6].map((cell) => (
                      <TableCell key={cell}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (coursesError) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4 p-4">
        <div className="text-[#dc2626] text-lg font-medium">
          Error loading courses
        </div>
        <p className="text-[#4b5563] text-center">
          {coursesError?.message || "Failed to fetch courses"}
        </p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <IconRefresh className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Stats using reusable StatCard components */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Courses"
          value={totalCount}
          description="All courses in the system"
          icon={IconBook}
          iconBgColor="bg-[#dbeafe]"
          iconColor="text-[#2563eb]"
          gradientFrom="from-[#eff6ff]"
          gradientTo="to-[#dbeafe]"
          borderColor="border-[#bfdbfe]"
          textColor="text-[#1e40af]"
          valueColor="text-[#1e3a8a]"
        />

        <StatCard
          title="Published"
          value={courses.filter((c) => c.status === "PUBLISHED").length}
          description="Currently published"
          icon={IconEye}
          iconBgColor="bg-[#dcfce7]"
          iconColor="text-[#16a34a]"
          gradientFrom="from-[#f0fdf4]"
          gradientTo="to-[#dcfce7]"
          borderColor="border-[#bbf7d0]"
          textColor="text-[#166534]"
          valueColor="text-[#14532d]"
        />

        <StatCard
          title="Total Modules"
          value={courses.reduce(
            (total, course) => total + (course.modules?.length || 0),
            0
          )}
          description="Learning materials"
          icon={IconFileText}
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
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="all" onClick={() => clearFilters()} className="text-xs sm:text-sm">
              All
            </TabsTrigger>
            <TabsTrigger
              value="published"
              onClick={() => setStatusFilter("PUBLISHED")}
              className="text-xs sm:text-sm"
            >
              Published
            </TabsTrigger>
            <TabsTrigger value="draft" onClick={() => setStatusFilter("DRAFT")} className="text-xs sm:text-sm">
              Draft
            </TabsTrigger>
            <TabsTrigger
              value="archived"
              onClick={() => setStatusFilter("ARCHIVED")}
              className="text-xs sm:text-sm"
            >
              Archived
            </TabsTrigger>
          </TabsList>

          <Button
            onClick={() => navigate(`${basePath}/add-course`)}
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-[#ffffff] shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
          >
            <IconPlus className="h-4 w-4 mr-2" />
            <span className="hidden xs:inline">Add Course</span>
            <span className="xs:hidden">Add</span>
          </Button>
        </div>
      </Tabs>

      {/* Search and Filters using reusable components */}
      <Card className="shadow-sm border border-[#e5e7eb]/50">
        <CardHeader className="pb-3 px-4 sm:px-6">
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <SearchInput
              placeholder="Search courses..."
              value={searchTerm}
              onChange={setSearchTerm}
              className="w-full sm:w-80 lg:w-96"
            />

            <div className="flex flex-col xs:flex-row gap-2">
              <div className="grid grid-cols-2 xs:flex gap-2">
                <FilterSelect
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  options={statusOptions}
                  placeholder="Status"
                  icon={IconFilter}
                  className="min-w-0"
                />

                <FilterSelect
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                  options={categoryOptions}
                  placeholder="Category"
                  icon={IconChartBar}
                  className="min-w-0 xs:w-[140px]"
                />

                <FilterSelect
                  value={departmentFilter}
                  onValueChange={handleDepartmentFilterChange}
                  options={departmentOptions}
                  placeholder="Department"
                  icon={IconSchool}
                  className="min-w-0 xs:w-[160px]"
                />

                <FilterSelect
                  value={lineFilter}
                  onValueChange={handleLineFilterChange}
                  options={lineOptions}
                  placeholder="Line"
                  icon={IconFilter}
                  className="min-w-0 xs:w-[140px]"
                  disabled={departmentFilter === "ALL" || filterLinesLoading}
                />

                <FilterSelect
                  value={machineFilter}
                  onValueChange={setMachineFilter}
                  options={machineOptions}
                  placeholder="Machine"
                  icon={IconFilter}
                  className="min-w-0 xs:w-[140px]"
                  disabled={lineFilter === "ALL" || filterMachinesLoading}
                />
              </div>

              {(statusFilter !== "ALL" ||
                categoryFilter !== "ALL" ||
                departmentFilter !== "ALL" ||
                lineFilter !== "ALL" ||
                machineFilter !== "ALL" ||
                searchTerm) && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="gap-1 w-full xs:w-auto"
                    size="sm"
                  >
                    <IconX className="h-4 w-4" />
                    <span className="hidden xs:inline">Clear</span>
                    <span className="xs:hidden">Clear Filters</span>
                  </Button>
                )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isExportingCourses}
                onClick={async () => {
                  try {
                    const { data } = await triggerExportCourses({
                      format: 'excel',
                      category: categoryFilter !== 'ALL' ? categoryFilter : '',
                      status: statusFilter !== 'ALL' ? statusFilter : '',
                      search: debouncedSearchTerm || ''
                    });
                    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `courses_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
                disabled={isExportingCourses}
                onClick={async () => {
                  try {
                    const { data } = await triggerExportCourses({
                      format: 'pdf',
                      category: categoryFilter !== 'ALL' ? categoryFilter : '',
                      status: statusFilter !== 'ALL' ? statusFilter : '',
                      search: debouncedSearchTerm || ''
                    });
                    const blob = new Blob([data], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `courses_${new Date().toISOString().slice(0, 10)}.pdf`;
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
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[250px]">Course</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Line</TableHead>
                  <TableHead>Machine</TableHead>
                  {isSuperAdmin && <TableHead>Unit</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => (
                    <TableRow
                      key={course._id}
                      className="group hover:bg-muted/30 cursor-pointer"
                      onClick={() => handleCourseClick(course)}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10 border bg-[#dbeafe]">
                            <AvatarFallback className="bg-[#dbeafe] text-[#1e40af]">
                              <IconBook className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground line-clamp-1">
                                {course.title}
                              </p>
                              <IconExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {course.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{course.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {getDifficultyBadge(course.difficulty)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={course.status}
                          onValueChange={(newStatus) =>
                            handleTogglePublishStatus(course._id, course.status)
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            {getStatusBadge(course.status)}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PUBLISHED">Published</SelectItem>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="ARCHIVED">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {Array.isArray(course.departments) && course.departments.length > 0 ? (
                            course.departments.map((d) => (
                              <Badge key={d._id} variant="outline" className="text-xs">{d.name}</Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {Array.isArray(course.lines) && course.lines.length > 0 ? (
                            course.lines.map((l) => (
                              <Badge key={l._id} variant="outline" className="text-xs">{l.name}</Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {Array.isArray(course.machines) && course.machines.length > 0 ? (
                            course.machines.map((m) => (
                              <Badge key={m._id} variant="outline" className="text-xs">{m.name}</Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          {course.unit ? (
                            <Badge variant="outline" className="text-xs">{course.unit}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
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
                                    openEditDialog(course);
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <IconPencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit course</p>
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
                                    openDeleteDialog(course);
                                  }}
                                  className="h-8 w-8 p-0 text-[#dc2626] hover:text-[#991b1b] hover:bg-[#fef2f2]"
                                >
                                  <IconTrash className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete course</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin ? 9 : 8} className="text-center py-10">
                      <div className="flex flex-col items-center space-y-3">
                        <IconBook className="h-12 w-12 text-[#9ca3af]/60" />
                        <p className="text-[#9ca3af] font-medium">
                          No courses found
                        </p>
                        <p className="text-sm text-[#9ca3af]">
                          {searchTerm ||
                            statusFilter !== "ALL" ||
                            categoryFilter !== "ALL" ||
                            departmentFilter !== "ALL" ||
                            lineFilter !== "ALL" ||
                            machineFilter !== "ALL"
                            ? "Try adjusting your search or filters"
                            : "Add your first course to get started"}
                        </p>
                        {(searchTerm ||
                          statusFilter !== "ALL" ||
                          categoryFilter !== "ALL" ||
                          departmentFilter !== "ALL" ||
                          lineFilter !== "ALL" ||
                          machineFilter !== "ALL") && (
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
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3 p-4">
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course) => (
                <Card
                  key={course._id}
                  className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] border border-[#e5e7eb]/50"
                  onClick={() => handleCourseClick(course)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-12 w-12 border bg-[#dbeafe] flex-shrink-0">
                        <AvatarFallback className="bg-[#dbeafe] text-[#1e40af]">
                          <IconBook className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-foreground line-clamp-1 group-hover:text-[#2563eb] transition-colors">
                              {course.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {course.description}
                            </p>
                          </div>
                          <IconExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {course.category}
                          </Badge>
                          {getDifficultyBadge(course.difficulty)}
                          {getStatusBadge(course.status)}
                          {isSuperAdmin && course.unit && (
                            <Badge variant="outline" className="text-xs">{course.unit}</Badge>
                          )}
                          {Array.isArray(course.departments) && course.departments.map((d) => (
                            <Badge key={d._id} variant="outline" className="text-xs">{d.name}</Badge>
                          ))}
                          {Array.isArray(course.lines) && course.lines.map((l) => (
                            <Badge key={l._id} variant="outline" className="text-xs">{l.name}</Badge>
                          ))}
                          {Array.isArray(course.machines) && course.machines.map((m) => (
                            <Badge key={m._id} variant="outline" className="text-xs">{m.name}</Badge>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#f3f4f6]">
                          <div className="flex items-center gap-2">
                            <Select
                              value={course.status}
                              onValueChange={(newStatus) =>
                                handleTogglePublishStatus(course._id, course.status)
                              }
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectTrigger className="w-[120px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PUBLISHED">Published</SelectItem>
                                <SelectItem value="DRAFT">Draft</SelectItem>
                                <SelectItem value="ARCHIVED">Archived</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(course);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <IconPencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteDialog(course);
                              }}
                              className="h-8 w-8 p-0 text-[#dc2626] hover:text-[#991b1b] hover:bg-[#fef2f2]"
                            >
                              <IconTrash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <IconBook className="h-16 w-16 text-muted-foreground/60 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No courses found
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm ||
                    statusFilter !== "ALL" ||
                    categoryFilter !== "ALL" ||
                    departmentFilter !== "ALL" ||
                    lineFilter !== "ALL" ||
                    machineFilter !== "ALL"
                    ? "Try adjusting your search or filters"
                    : "Add your first course to get started"}
                </p>
                {(searchTerm ||
                  statusFilter !== "ALL" ||
                  categoryFilter !== "ALL" ||
                  departmentFilter !== "ALL" ||
                  lineFilter !== "ALL" ||
                  machineFilter !== "ALL") && (
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="mt-2"
                    >
                      Clear filters
                    </Button>
                  )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredCourses.length} of {totalCount} courses
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

      {/* Edit Course Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconPencil className="h-5 w-5" />
              Edit Course
            </DialogTitle>
            <DialogDescription>
              Update course information. All fields are required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Course Title</Label>
              <Input
                id="edit-title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter course title"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter course description"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="Enter course category"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-difficulty">Difficulty Level</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, difficulty: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {activeLevels.length > 0 ? (
                    activeLevels.map((level) => (
                      <SelectItem key={level.name} value={level.name}>
                        {level.name}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="L1">L1</SelectItem>
                      <SelectItem value="L2">L2</SelectItem>
                      <SelectItem value="L3">L3</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isSuperAdmin && (
              <div className="grid gap-2">
                <Label htmlFor="edit-unit">Unit</Label>
                <Select
                  value={formData.unit || "none"}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, unit: v === "none" ? "" : v }))
                  }
                >
                  <SelectTrigger id="edit-unit">
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
              <Label>Departments</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                {allDepartments.length > 0 ? (
                  allDepartments.map((dept) => (
                    <label
                      key={dept._id}
                      className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={formData.departments?.some((d) => d.id === dept._id)}
                        onCheckedChange={() => toggleEditDepartmentSelection(dept)}
                      />
                      <span className="text-sm">{dept.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground px-1">No departments found</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Lines</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                {!formData.departments?.length ? (
                  <p className="text-sm text-muted-foreground px-1">
                    Select at least one department first
                  </p>
                ) : editLinesLoading ? (
                  <div className="flex justify-center py-3">
                    <IconLoader className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : editAvailableLines.length > 0 ? (
                  editAvailableLines.map((line) => (
                    <label
                      key={line.id}
                      className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={formData.lines?.some((l) => l.id === line.id)}
                        onCheckedChange={() => toggleEditLineSelection(line)}
                      />
                      <span className="text-sm">{line.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground px-1">
                    No lines found for the selected department(s)
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Machines</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                {!formData.lines?.length ? (
                  <p className="text-sm text-muted-foreground px-1">
                    Select at least one line first
                  </p>
                ) : editMachinesLoading ? (
                  <div className="flex justify-center py-3">
                    <IconLoader className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : editAvailableMachines.length > 0 ? (
                  editAvailableMachines.map((machine) => (
                    <label
                      key={machine.id}
                      className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={formData.machines?.some((m) => m.id === machine.id)}
                        onCheckedChange={() => toggleEditMachineSelection(machine)}
                      />
                      <span className="text-sm">{machine.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground px-1">
                    No machines found for the selected line(s)
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
                setSelectedCourse(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCourse}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting && <IconLoader className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Updating..." : "Update Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#fee2e2] rounded-full">
                <IconTrash className="h-6 w-6 text-[#dc2626]" />
              </div>
              <div>
                <DialogTitle className="text-[#991b1b]">
                  Delete Course
                </DialogTitle>
                <DialogDescription>
                  This action is permanent and cannot be undone
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 bg-[#fef2f2] rounded-lg border border-[#fecaca] mb-4">
              <p className="text-sm text-[#991b1b] font-medium mb-2">
                You are about to delete the following course:
              </p>

              <div className="bg-[#ffffff] p-3 rounded-md border border-[#fee2e2]">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 border bg-[#dbeafe] flex-shrink-0">
                    <AvatarFallback className="bg-[#dbeafe] text-[#1e40af]">
                      <IconBook className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground truncate">
                      {selectedCourse?.title}
                    </h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Badge variant="outline">
                        {selectedCourse?.category}
                      </Badge>
                      {getDifficultyBadge(selectedCourse?.difficulty)}
                      {getStatusBadge(selectedCourse?.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {selectedCourse?.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-[#f1f5f9] rounded-md">
              <p className="text-sm font-medium text-[#1e293b] flex items-center gap-2">
                <IconInfoCircle className="h-4 w-4" />
                To confirm deletion, type the course title below
              </p>
              <Input
                id="confirm-delete"
                placeholder={`Type "${selectedCourse?.title}" to confirm`}
                className="mt-2"
                onChange={(e) => setDeleteConfirmation(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedCourse(null);
                setDeleteConfirmation("");
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCourse}
              disabled={deleteConfirmation !== selectedCourse?.title}
              className="w-full sm:w-auto gap-2"
            >
              <IconTrash className="h-4 w-4" />
              Delete Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Course;