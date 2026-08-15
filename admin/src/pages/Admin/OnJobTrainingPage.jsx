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
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    IconPlus,
    IconClipboardCheck,
    IconFilter,
    IconSchool,
    IconX,
    IconRefresh,
    IconUsers,
    IconExternalLink,
} from "@tabler/icons-react";

import SearchInput from "@/components/common/SearchInput";
import FilterSelect from "@/components/common/FilterSelect";
import StatCard from "@/components/common/StatCard";
import FilterBar from "@/components/common/FilterBar";
import Pagination from "@/components/common/Pagination";
import CreateOJTDialog from "@/components/admin/CreateOJTDialog";

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
        <div className="space-y-4 sm:space-y-6">
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

            <div className="flex justify-end">
                <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] text-[#ffffff] shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
                >
                    <IconPlus className="h-4 w-4 mr-2" />
                    Start New Session
                </Button>
            </div>

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
                                            <TableCell>{employee.sheetCount}</TableCell>
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
                                                <h3 className="font-medium text-foreground line-clamp-1">
                                                    {employee.fullName || "—"}
                                                </h3>
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

            <CreateOJTDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSuccess={() => setIsCreateDialogOpen(false)}
            />
        </div>
    );
};

export default OnJobTrainingPage;
