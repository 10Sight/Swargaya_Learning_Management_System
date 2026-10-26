import React, { useState, useMemo, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import {
    useGetAllOJTsQuery,
} from "@/Redux/AllApi/OnJobTrainingApi";
import { useGetAllUnitsQuery } from "@/Redux/AllApi/UnitApi";
import { useGetAllDepartmentsQuery, useGetMyDepartmentsQuery } from "@/Redux/AllApi/DepartmentApi";
import { useGetLinesByDepartmentQuery } from "@/Redux/AllApi/LineApi";
import { useGetMachinesByLineQuery } from "@/Redux/AllApi/MachineApi";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    IconPlus,
    IconClipboardCheck,
    IconFilter,
    IconSchool,
    IconX,
    IconRefresh,
    IconUsers,
    IconExternalLink,
    IconFileText,
    IconEye,
    IconArrowLeft,
    IconTable,
    IconLayoutGrid,
    IconBuilding,
    IconCheck,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

import SearchInput from "@/components/common/SearchInput";
import FilterSelect from "@/components/common/FilterSelect";
import StatCard from "@/components/common/StatCard";
import FilterBar from "@/components/common/FilterBar";
import Pagination from "@/components/common/Pagination";
import CreateOJTDialog from "@/components/admin/CreateOJTDialog";
import SkillLevelCircle from "@/components/common/SkillLevelCircle";
import {
    OJT_SHEET_REGISTRY,
    getAllRegisteredSheets,
    saveCustomDepartmentMapping,
    resetSingleDepartmentMapping,
} from "@/components/admin/ojt/ojtSheetRegistry";
import { useGetActiveConfigQuery } from "@/Redux/AllApi/CourseLevelConfigApi";

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "—");

const OnJobTrainingPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const basePath = useMemo(() => {
        if (location.pathname.startsWith("/superadmin")) return "/superadmin";
        if (location.pathname.startsWith("/trainer")) return "/trainer";
        return "/admin";
    }, [location.pathname]);

    const { user } = useSelector((state) => state.auth);
    const isSuperAdmin = user?.role === "SUPERADMIN";
    const isInstructor = user?.role === "INSTRUCTOR";

    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [unitFilter, setUnitFilter] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("ALL");
    const [lineFilter, setLineFilter] = useState("ALL");
    const [machineFilter, setMachineFilter] = useState("ALL");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("associates");
    const [previewingSheet, setPreviewingSheet] = useState(null);
    const [templateViewMode, setTemplateViewMode] = useState("table");

    // Dynamic Department Assignment State for OJT Sheets
    const [sheetsVersion, setSheetsVersion] = useState(0);
    const [assigningSheet, setAssigningSheet] = useState(null);
    const [assignedDepts, setAssignedDepts] = useState([]);
    const [isAllDepts, setIsAllDepts] = useState(false);
    const [deptSearchTerm, setDeptSearchTerm] = useState("");

    const { data: levelConfigData } = useGetActiveConfigQuery();
    const levels = levelConfigData?.data?.levels || [];

    const availableSheets = useMemo(() => {
        return getAllRegisteredSheets();
    }, [sheetsVersion]);

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Units (SuperAdmin only)
    const { data: unitsData } = useGetAllUnitsQuery(undefined, { skip: !isSuperAdmin });
    const allUnits = Array.isArray(unitsData?.data) ? unitsData.data : [];

    // Departments: Instructors only see their assigned departments; Admin is auto-restricted
    // server-side to their unit; SuperAdmin can additionally narrow by the chosen unit.
    const { data: myDeptsData } = useGetMyDepartmentsQuery(undefined, { skip: !isInstructor });
    const { data: allDeptsData } = useGetAllDepartmentsQuery(
        { page: 1, limit: 100, ...(isSuperAdmin && unitFilter ? { unit: unitFilter } : {}) },
        { skip: isInstructor }
    );
    const allDepartments = isInstructor
        ? (myDeptsData?.data?.departments || [])
        : (allDeptsData?.data?.departments || []);

    // Department Assignment Handlers
    const handleOpenAssignModal = (sheet) => {
        setAssigningSheet(sheet);
        const isAll = !sheet.departmentNames || sheet.departmentNames.length === 0;
        setIsAllDepts(isAll);
        setAssignedDepts(sheet.departmentNames || []);
        setDeptSearchTerm("");
    };

    const handleToggleDept = (deptName) => {
        setAssignedDepts((prev) => {
            if (prev.includes(deptName)) {
                return prev.filter((d) => d !== deptName);
            } else {
                return [...prev, deptName];
            }
        });
    };

    const handleSaveDeptMapping = () => {
        if (!assigningSheet) return;
        const deptsToSave = isAllDepts ? [] : assignedDepts;
        saveCustomDepartmentMapping(assigningSheet.sheetKey, deptsToSave);
        setSheetsVersion((v) => v + 1);
        toast.success(`Department mapping saved for "${assigningSheet.title}"`);
        setAssigningSheet(null);
    };

    const handleResetDeptMapping = () => {
        if (!assigningSheet) return;
        resetSingleDepartmentMapping(assigningSheet.sheetKey);
        setSheetsVersion((v) => v + 1);
        toast.success(`Reset "${assigningSheet.title}" to default department mapping`);
        setAssigningSheet(null);
    };

    const selectableDepartments = useMemo(() => {
        const set = new Set();
        (allDepartments || []).forEach((d) => {
            if (d?.name) set.add(d.name.trim());
        });
        ["Moulding", "HCBC", "Surface Coating", "Assembly", "Quality", "Maintenance"].forEach((d) => set.add(d));
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [allDepartments]);

    const filteredSelectableDepartments = useMemo(() => {
        if (!deptSearchTerm.trim()) return selectableDepartments;
        const term = deptSearchTerm.toLowerCase();
        return selectableDepartments.filter((d) => d.toLowerCase().includes(term));
    }, [selectableDepartments, deptSearchTerm]);

    // Cascading Line / Machine filters
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
        setCurrentPage(1);
    };

    const handleLineFilterChange = (value) => {
        setLineFilter(value);
        setMachineFilter("ALL");
        setCurrentPage(1);
    };

    const handleUnitFilterChange = (value) => {
        setUnitFilter(value === "ALL" ? "" : value);
        setDepartmentFilter("ALL");
        setLineFilter("ALL");
        setMachineFilter("ALL");
        setCurrentPage(1);
    };

    // Employees with OJT records (one row per employee)
    const {
        data: ojtsData,
        isLoading,
        error: ojtsError,
        refetch,
    } = useGetAllOJTsQuery(
        {
            page: currentPage,
            limit: 10,
            search: debouncedSearchTerm || "",
            ...(isSuperAdmin && unitFilter ? { unit: unitFilter } : {}),
            ...(departmentFilter !== "ALL" ? { departmentId: departmentFilter } : {}),
            ...(lineFilter !== "ALL" ? { lineId: lineFilter } : {}),
            ...(machineFilter !== "ALL" ? { machineId: machineFilter } : {}),
        },
        {
            refetchOnMountOrArgChange: true,
            refetchOnFocus: false,
            refetchOnReconnect: false,
        }
    );

    const employees = ojtsData?.data?.employees || [];
    const totalPages = ojtsData?.data?.totalPages || 1;
    const totalCount = ojtsData?.data?.total || 0;

    const departmentOptions = [
        { value: "ALL", label: "All Departments" },
        ...allDepartments.map((d) => ({ value: String(d._id || d.id), label: d.name })),
    ];

    const lineOptions = [
        { value: "ALL", label: "All Lines" },
        ...filterLines.map((line) => ({ value: String(line.id), label: line.name })),
    ];

    const machineOptions = [
        { value: "ALL", label: "All Machines" },
        ...filterMachines.map((machine) => ({ value: String(machine.id), label: machine.name })),
    ];

    const activeFilters = useMemo(() => {
        const filters = [];
        if (unitFilter) filters.push({ label: "Unit", value: unitFilter });
        if (departmentFilter !== "ALL") {
            filters.push({ label: "Department", value: departmentOptions.find((o) => o.value === departmentFilter)?.label });
        }
        if (lineFilter !== "ALL") {
            filters.push({ label: "Line", value: lineOptions.find((o) => o.value === lineFilter)?.label });
        }
        if (machineFilter !== "ALL") {
            filters.push({ label: "Machine", value: machineOptions.find((o) => o.value === machineFilter)?.label });
        }
        if (searchTerm) filters.push({ label: "Search", value: searchTerm });
        return filters;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unitFilter, departmentFilter, lineFilter, machineFilter, searchTerm]);

    const clearFilters = () => {
        setUnitFilter("");
        setDepartmentFilter("ALL");
        setLineFilter("ALL");
        setMachineFilter("ALL");
        setSearchTerm("");
        setCurrentPage(1);
    };

    const openEmployee = (employee) => {
        navigate(`${basePath}/on-job-training/${employee.studentId}`);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardContent className="p-6">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-12 w-full mb-2" />
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (ojtsError) {
        return (
            <div className="flex flex-col justify-center items-center h-64 space-y-4 p-4">
                <div className="text-[#dc2626] text-lg font-medium">Error loading On Job Training records</div>
                <p className="text-[#4b5563] text-center">{ojtsError?.data?.message || "Failed to fetch records"}</p>
                <Button onClick={() => refetch()} variant="outline" className="gap-2">
                    <IconRefresh className="h-4 w-4" />
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className={`space-y-4 sm:space-y-6 ${previewingSheet ? "w-fit min-w-full pb-8 pr-10 sm:pr-16" : ""}`}>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <StatCard
                    title="Employees with OJT Records"
                    value={totalCount}
                    description="Distinct employees evaluated"
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
                    title="OJT Sheets (this page)"
                    value={employees.reduce((sum, e) => sum + (e.sheetCount || 0), 0)}
                    description="Total sheets across shown employees"
                    icon={IconClipboardCheck}
                    iconBgColor="bg-[#f0fdf4]"
                    iconColor="text-[#16a34a]"
                    gradientFrom="from-[#f0fdf4]"
                    gradientTo="to-[#dcfce7]"
                    borderColor="border-[#bbf7d0]"
                    textColor="text-[#166534]"
                    valueColor="text-[#14532d]"
                />
            </div>

            {previewingSheet ? (
                <div className="space-y-4 w-fit min-w-full pb-8 pr-10 sm:pr-16">
                    <div className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm no-print w-full">
                        <div className="flex items-center gap-3">
                            <SkillLevelCircle levelName={previewingSheet.levelName} levelIndex={previewingSheet.order} levels={levels} size={22} />
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-base">{previewingSheet.title}</span>
                                    <Badge variant="outline" className="border-blue-400 bg-white text-blue-700 font-semibold">{previewingSheet.levelName}</Badge>
                                    <span className="text-xs bg-white text-slate-800 border border-blue-200 px-2 py-0.5 rounded font-mono font-semibold shadow-xs">
                                        Doc No: {previewingSheet.docNo || "—"} | Rev: {previewingSheet.revNo || "—"} | Rev Date: {previewingSheet.revDate || "—"}
                                    </span>
                                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-300 font-medium">
                                        Dept: {previewingSheet.departmentLabel || "All Departments"}
                                    </Badge>
                                </div>
                                <p className="text-xs text-blue-700">Layout Preview Mode — Review table columns, scoring rubrics, and printable format</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleOpenAssignModal(previewingSheet)} className="gap-1.5 bg-white text-purple-700 border-purple-300 hover:bg-purple-50 shadow-xs">
                                <IconBuilding className="h-4 w-4" />
                                Assign Department
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setPreviewingSheet(null)} className="gap-2 bg-white">
                                <IconArrowLeft className="h-4 w-4" />
                                Back to All Sheets
                            </Button>
                        </div>
                    </div>
                    <previewingSheet.component
                        ojtId={null}
                        studentName="Associate Name (Sample Preview)"
                        model="Model / Component Sample"
                        readOnly={true}
                        onBack={() => setPreviewingSheet(null)}
                    />
                </div>
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <TabsList className="bg-muted p-1">
                            <TabsTrigger value="associates" className="gap-2">
                                <IconUsers className="h-4 w-4" />
                                Employee Evaluations ({totalCount})
                            </TabsTrigger>
                            <TabsTrigger value="templates" className="gap-2">
                                <IconFileText className="h-4 w-4" />
                                Evaluation Sheet Layouts ({availableSheets.length})
                            </TabsTrigger>
                        </TabsList>
                        <Button
                            onClick={() => setIsCreateDialogOpen(true)}
                            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-[#ffffff] shadow-sm w-full sm:w-auto"
                        >
                            <IconPlus className="h-4 w-4 mr-2" />
                            Start New Session
                        </Button>
                    </div>

                    {/* Tab 1: Associates List */}
                    <TabsContent value="associates" className="space-y-4 mt-0">
                        <Card className="shadow-sm border border-[#e5e7eb]/50">
                            <CardHeader className="pb-3 px-4 sm:px-6">
                                <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row justify-between items-stretch sm:items-center gap-4">
                                    <SearchInput
                                        placeholder="Search by employee name, email, or ID..."
                                        value={searchTerm}
                                        onChange={setSearchTerm}
                                        className="w-full sm:w-80 lg:w-96"
                                    />

                                    <div className="flex flex-col xs:flex-row gap-2">
                                        <div className="grid grid-cols-2 xs:flex gap-2">
                                            {isSuperAdmin && (
                                                <Select value={unitFilter || "ALL"} onValueChange={handleUnitFilterChange}>
                                                    <SelectTrigger className="min-w-0 xs:w-[140px]">
                                                        <SelectValue placeholder="All Units" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ALL">All Units</SelectItem>
                                                        {allUnits.map((u) => (
                                                            <SelectItem key={u._id || u.id} value={u.title}>{u.title}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}

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
                                                onValueChange={(v) => { setMachineFilter(v); setCurrentPage(1); }}
                                                options={machineOptions}
                                                placeholder="Machine"
                                                icon={IconFilter}
                                                className="min-w-0 xs:w-[140px]"
                                                disabled={lineFilter === "ALL" || filterMachinesLoading}
                                            />
                                        </div>

                                        {(unitFilter || departmentFilter !== "ALL" || lineFilter !== "ALL" || machineFilter !== "ALL" || searchTerm) && (
                                            <Button variant="outline" onClick={clearFilters} className="gap-1 w-full xs:w-auto" size="sm">
                                                <IconX className="h-4 w-4" />
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <FilterBar filters={activeFilters} onClearFilters={clearFilters} className="mt-3" />
                            </CardHeader>

                            <CardContent className="p-0">
                                {/* Desktop Table */}
                                <div className="hidden md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="w-[220px]">Employee Name</TableHead>
                                                <TableHead>Employee ID</TableHead>
                                                <TableHead>Date of Joining</TableHead>
                                                <TableHead>OJT Sheets</TableHead>
                                                <TableHead>Last Updated</TableHead>
                                                <TableHead>Last Updated By</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {employees.length > 0 ? (
                                                employees.map((employee) => (
                                                    <TableRow
                                                        key={employee.studentId}
                                                        className="hover:bg-muted/30 cursor-pointer"
                                                        onClick={() => openEmployee(employee)}
                                                    >
                                                        <TableCell>
                                                            <div className="flex items-center space-x-3">
                                                                <Avatar className="h-9 w-9 border bg-[#dbeafe]">
                                                                    <AvatarFallback className="bg-[#dbeafe] text-[#1e40af] text-xs">
                                                                        {(employee.fullName || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-medium text-foreground line-clamp-1">
                                                                        {employee.fullName || "—"}
                                                                    </p>
                                                                    <IconExternalLink className="h-4 w-4 text-muted-foreground" />
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{employee.userName || "—"}</TableCell>
                                                        <TableCell>{formatDate(employee.doj || employee.createdAt)}</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">{employee.sheetCount}</span>
                                                                {employee.sheetCount > 0 && employee.latestLevelName && (
                                                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                                                                        <SkillLevelCircle
                                                                            levelName={employee.latestLevelName}
                                                                            levelIndex={employee.latestLevelOrder}
                                                                            levels={levels}
                                                                            size={14}
                                                                        />
                                                                        <span>{employee.latestLevelName}</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{formatDate(employee.lastUpdatedAt)}</TableCell>
                                                        <TableCell>{employee.updatedByName || "—"}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-10">
                                                        <div className="flex flex-col items-center space-y-3">
                                                            <IconClipboardCheck className="h-12 w-12 text-[#9ca3af]/60" />
                                                            <p className="text-[#9ca3af] font-medium">No On Job Training records found</p>
                                                            <p className="text-sm text-[#9ca3af]">
                                                                {searchTerm || departmentFilter !== "ALL" || lineFilter !== "ALL" || machineFilter !== "ALL" || unitFilter
                                                                    ? "Try adjusting your search or filters"
                                                                    : "Start your first OJT session to get started"}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile Card View */}
                                <div className="md:hidden space-y-3 p-4">
                                    {employees.length > 0 ? (
                                        employees.map((employee) => (
                                            <Card
                                                key={employee.studentId}
                                                className="cursor-pointer transition-all duration-200 hover:shadow-md border border-[#e5e7eb]/50"
                                                onClick={() => openEmployee(employee)}
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex items-start space-x-3">
                                                        <Avatar className="h-10 w-10 border bg-[#dbeafe] flex-shrink-0">
                                                            <AvatarFallback className="bg-[#dbeafe] text-[#1e40af]">
                                                                {(employee.fullName || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0 space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <h3 className="font-medium text-foreground line-clamp-1">
                                                                    {employee.fullName || "—"}
                                                                </h3>
                                                                {employee.sheetCount > 0 && employee.latestLevelName && (
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
                                                                        <SkillLevelCircle
                                                                            levelName={employee.latestLevelName}
                                                                            levelIndex={employee.latestLevelOrder}
                                                                            levels={levels}
                                                                            size={13}
                                                                        />
                                                                        <span>{employee.latestLevelName}</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">ID: {employee.userName || "—"}</p>
                                                            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                                                                <span>{employee.sheetCount} sheet{employee.sheetCount === 1 ? "" : "s"}</span>
                                                                <span>•</span>
                                                                <span>Updated: {formatDate(employee.lastUpdatedAt)}</span>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground pt-1">
                                                                DOJ: {formatDate(employee.doj || employee.createdAt)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <IconClipboardCheck className="h-16 w-16 text-muted-foreground/60 mx-auto mb-4" />
                                            <h3 className="text-lg font-medium text-muted-foreground mb-2">No records found</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {searchTerm || departmentFilter !== "ALL" ? "Try adjusting your search or filters" : "Start your first OJT session to get started"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm text-muted-foreground">
                                    Showing {employees.length} of {totalCount} employees
                                </p>
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        )}
                    </TabsContent>

                    {/* Tab 2: Evaluation Sheet Layouts */}
                    <TabsContent value="templates" className="space-y-4 mt-0">
                        {/* Header bar with View Mode Switch */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-muted/40 p-3 rounded-lg border">
                            <div>
                                <h3 className="font-semibold text-sm">Evaluation Sheet Template Library</h3>
                                <p className="text-xs text-muted-foreground">Standardized OJT evaluation templates with Doc. No., Rev. no., and Rev. Date</p>
                            </div>
                            <div className="flex items-center gap-1 bg-muted p-1 rounded-md border">
                                <Button
                                    variant={templateViewMode === "table" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setTemplateViewMode("table")}
                                    className="h-7 px-2.5 text-xs gap-1.5 shadow-none"
                                >
                                    <IconTable className="h-3.5 w-3.5" />
                                    Preview Table
                                </Button>
                                <Button
                                    variant={templateViewMode === "cards" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setTemplateViewMode("cards")}
                                    className="h-7 px-2.5 text-xs gap-1.5 shadow-none"
                                >
                                    <IconLayoutGrid className="h-3.5 w-3.5" />
                                    Cards View
                                </Button>
                            </div>
                        </div>

                        {templateViewMode === "table" ? (
                            /* Preview Table View */
                            <Card className="shadow-sm border">
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="w-[90px]">Level</TableHead>
                                                <TableHead className="min-w-[240px]">Training Sheet Name</TableHead>
                                                <TableHead>Department</TableHead>
                                                <TableHead className="font-mono">Doc. No.</TableHead>
                                                <TableHead className="font-mono">Rev. no.</TableHead>
                                                <TableHead className="font-mono">Rev. Date</TableHead>
                                                <TableHead className="w-[80px]">Marks</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {availableSheets.map((sheet) => (
                                                <TableRow key={sheet.sheetKey || sheet.order} className="hover:bg-muted/30">
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <SkillLevelCircle levelName={sheet.levelName} levelIndex={sheet.order} levels={levels} size={20} />
                                                            <span className="font-bold text-xs">{sheet.levelName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-semibold text-xs text-foreground">{sheet.title}</div>
                                                            <div className="text-[11px] text-muted-foreground line-clamp-1">{sheet.description}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {sheet.departmentNames && sheet.departmentNames.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1 max-w-[240px]">
                                                                {sheet.departmentNames.map((d, idx) => (
                                                                    <Badge key={idx} variant="secondary" className="text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                                                        {d}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[11px] font-medium border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                                                                All Departments
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                                                            {sheet.docNo || "—"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted/60">
                                                            {sheet.revNo || "—"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            {sheet.revDate || "—"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-xs font-semibold">{sheet.defaultMarks}</span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleOpenAssignModal(sheet)}
                                                                className="gap-1.5 h-8 text-xs text-purple-700 hover:bg-purple-50 border-purple-200"
                                                                title="Decide which department uses this sheet"
                                                            >
                                                                <IconBuilding className="h-3.5 w-3.5" />
                                                                Assign Dept
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setPreviewingSheet(sheet)}
                                                                className="gap-1.5 h-8 text-xs hover:bg-blue-50 hover:text-blue-700 border-blue-200"
                                                            >
                                                                <IconEye className="h-3.5 w-3.5" />
                                                                Preview
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        ) : (
                            /* Cards View with Document Control Box */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {availableSheets.map((sheet) => (
                                    <Card key={sheet.sheetKey || sheet.order} className="border border-muted/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <div className="flex items-center gap-2.5">
                                                    <SkillLevelCircle levelName={sheet.levelName} levelIndex={sheet.order} levels={levels} size={26} />
                                                    <div>
                                                        <span className="font-bold text-lg text-foreground">{sheet.levelName}</span>
                                                        <span className="text-xs text-muted-foreground ml-2">Total Marks: {sheet.defaultMarks}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                    {sheet.departmentNames && sheet.departmentNames.length > 0 ? (
                                                        sheet.departmentNames.map((d, idx) => (
                                                            <Badge key={idx} variant="outline" className="border-purple-300 bg-purple-50/60 text-purple-800 text-[11px] font-medium">
                                                                {d}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <Badge variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                                                            All Departments
                                                        </Badge>
                                                    )}
                                                    <Badge className="bg-blue-600 text-white font-medium text-[11px]">Active Template</Badge>
                                                </div>
                                            </div>
                                            <CardTitle className="text-base font-semibold leading-tight">{sheet.title}</CardTitle>
                                            <CardDescription className="text-xs mt-1 text-muted-foreground leading-relaxed">{sheet.description}</CardDescription>

                                            {/* Document Control Box (Top-Right Style) */}
                                            <div className="mt-3 p-2 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                                                <div className="grid grid-cols-3 gap-2 text-center text-xs divide-x divide-slate-200 dark:divide-slate-800">
                                                    <div className="px-1">
                                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Doc. No.</span>
                                                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{sheet.docNo || "—"}</span>
                                                    </div>
                                                    <div className="px-1">
                                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Rev. no.</span>
                                                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{sheet.revNo || "—"}</span>
                                                    </div>
                                                    <div className="px-1">
                                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Rev. Date</span>
                                                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{sheet.revDate || "—"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-0 space-y-4">
                                            <div>
                                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Focus Areas & Checkpoints:</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {sheet.focusAreas?.map((item, idx) => (
                                                        <span key={idx} className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border">
                                                            {item}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="pt-3 border-t flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleOpenAssignModal(sheet)}
                                                    className="gap-1.5 text-xs text-purple-700 hover:bg-purple-50 border-purple-300"
                                                >
                                                    <IconBuilding className="h-4 w-4" />
                                                    Assign Department
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setPreviewingSheet(sheet)}
                                                    className="gap-2 hover:bg-blue-50 hover:text-blue-700 border-blue-200 text-xs"
                                                >
                                                    <IconEye className="h-4 w-4" />
                                                    Preview Sheet Layout
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            )}

            {/* Department Assignment Dialog */}
            <Dialog open={Boolean(assigningSheet)} onOpenChange={(open) => !open && setAssigningSheet(null)} className="max-w-lg">
                <DialogContent className="max-w-lg p-6">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            {assigningSheet && (
                                <SkillLevelCircle
                                    levelName={assigningSheet.levelName}
                                    levelIndex={assigningSheet.order}
                                    levels={levels}
                                    size={24}
                                />
                            )}
                            <DialogTitle className="text-lg font-bold text-slate-900">
                                Assign Departments to OJT Sheet
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-slate-500">
                            Decide which department(s) use <span className="font-semibold text-slate-800">{assigningSheet?.title}</span> during practical evaluations.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Doc Info snippet */}
                        <div className="flex items-center justify-between text-xs p-2 rounded-md bg-slate-50 border border-slate-200">
                            <span className="font-mono text-slate-700">
                                <strong>Doc No:</strong> {assigningSheet?.docNo || "—"}
                            </span>
                            <span className="font-mono text-slate-700">
                                <strong>Rev:</strong> {assigningSheet?.revNo || "—"}
                            </span>
                            <span className="font-mono text-slate-700">
                                <strong>Date:</strong> {assigningSheet?.revDate || "—"}
                            </span>
                        </div>

                        {/* All Departments switch */}
                        <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors">
                            <div className="space-y-0.5">
                                <label htmlFor="all-depts-toggle" className="text-sm font-semibold text-slate-900 cursor-pointer">
                                    Applicable to All Departments
                                </label>
                                <p className="text-xs text-muted-foreground">
                                    When enabled, this sheet is available as the general default for every department.
                                </p>
                            </div>
                            <Switch
                                id="all-depts-toggle"
                                checked={isAllDepts}
                                onCheckedChange={(checked) => {
                                    setIsAllDepts(checked);
                                    if (checked) {
                                        setAssignedDepts([]);
                                    }
                                }}
                            />
                        </div>

                        {/* Department Selection when not All */}
                        {!isAllDepts && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Select Target Department(s) ({assignedDepts.length} selected):
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setAssignedDepts(selectableDepartments)}
                                            className="text-[11px] text-blue-600 hover:underline font-medium"
                                        >
                                            Select All
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button
                                            type="button"
                                            onClick={() => setAssignedDepts([])}
                                            className="text-[11px] text-slate-500 hover:underline"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>

                                <Input
                                    placeholder="Search departments..."
                                    value={deptSearchTerm}
                                    onChange={(e) => setDeptSearchTerm(e.target.value)}
                                    className="h-8 text-xs"
                                />

                                <div className="max-h-56 overflow-y-auto border rounded-md p-2 space-y-1 divide-y divide-slate-100">
                                    {filteredSelectableDepartments.length === 0 ? (
                                        <p className="text-xs text-muted-foreground p-3 text-center">No departments match search</p>
                                    ) : (
                                        filteredSelectableDepartments.map((deptName) => {
                                            const isChecked = assignedDepts.includes(deptName);
                                            return (
                                                <label
                                                    key={deptName}
                                                    className={`flex items-center gap-2.5 p-2 rounded cursor-pointer transition-colors ${
                                                        isChecked ? "bg-purple-50/80 text-purple-900 font-medium" : "hover:bg-slate-50 text-slate-700"
                                                    }`}
                                                >
                                                    <Checkbox
                                                        checked={isChecked}
                                                        onCheckedChange={() => handleToggleDept(deptName)}
                                                    />
                                                    <span className="text-xs flex-1">{deptName}</span>
                                                    {isChecked && (
                                                        <IconCheck className="h-3.5 w-3.5 text-purple-600" />
                                                    )}
                                                </label>
                                            );
                                        })
                                    )}
                                </div>

                                {assignedDepts.length > 0 && (
                                    <div className="pt-1 flex flex-wrap gap-1">
                                        {assignedDepts.map((d) => (
                                            <span
                                                key={d}
                                                className="inline-flex items-center gap-1 text-[11px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium"
                                            >
                                                {d}
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleDept(d)}
                                                    className="hover:text-purple-950 font-bold ml-0.5"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 border-t">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleResetDeptMapping}
                            className="text-xs text-slate-500 hover:text-slate-800 gap-1.5"
                        >
                            <IconRefresh className="h-3.5 w-3.5" />
                            Reset to Default
                        </Button>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setAssigningSheet(null)}
                                className="text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSaveDeptMapping}
                                className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5"
                            >
                                <IconCheck className="h-4 w-4" />
                                Save Department Assignment
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CreateOJTDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSuccess={() => setIsCreateDialogOpen(false)}
            />
        </div>
    );
};

export default OnJobTrainingPage;
