import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LabelList,
} from 'recharts';
import {
    IconChartBar,
    IconRefresh,
    IconUsers,
    IconCircleCheck,
    IconAlertTriangle,
    IconHelpCircle,
} from '@tabler/icons-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useGetAllUnitsQuery } from '@/Redux/AllApi/UnitApi';
import { useGetAllDepartmentsQuery } from '@/Redux/AllApi/DepartmentApi';
import { useGetLinesByDepartmentQuery } from '@/Redux/AllApi/LineApi';
import { useGetMachinesByLineQuery } from '@/Redux/AllApi/MachineApi';
import { useGetPlanLevelDistributionQuery } from '@/Redux/AllApi/AnalyticsApi';

// Ordinal sequential ramp (light -> dark), single hue — Current Level is ordered data,
// so it gets a magnitude ramp rather than arbitrary categorical colors.
const SEQUENTIAL_RAMP = [
    '#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7',
    '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b',
];

const getLevelColors = (count) => {
    if (count <= 0) return [];
    if (count === 1) return [SEQUENTIAL_RAMP[SEQUENTIAL_RAMP.length - 1]];
    const start = 3; // stays clear of the 2:1 ordinal-ramp floor against a light surface
    const end = SEQUENTIAL_RAMP.length - 1;
    const span = end - start;
    return Array.from({ length: count }, (_, i) => SEQUENTIAL_RAMP[start + Math.round((span * i) / (count - 1))]);
};

const FilterSelect = ({ value, onValueChange, disabled, placeholder, allLabel, items, getKey, getValue, getLabel }) => (
    <Select value={value || 'ALL'} onValueChange={(v) => onValueChange(v === 'ALL' ? '' : v)} disabled={disabled}>
        <SelectTrigger className="w-full sm:w-[190px]">
            <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="ALL">{allLabel}</SelectItem>
            {items.map((item) => (
                <SelectItem key={getKey(item)} value={getValue(item)}>
                    {getLabel(item)}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
);

const KpiTile = ({ icon: Icon, label, value, bg, color }) => (
    <div className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: '#e5e7eb' }}>
        <div className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
            <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0">
            <div className="text-lg font-bold leading-tight" style={{ color: '#111827' }}>{value}</div>
            <div className="text-xs truncate" style={{ color: '#6b7280' }}>{label}</div>
        </div>
    </div>
);

const PlanCurrentLevelChart = ({ isSuperAdmin = false }) => {
    const currentUser = useSelector((state) => state.auth?.user);
    const lockedUnit = !isSuperAdmin ? (currentUser?.unit || '') : '';

    const [selectedUnit, setSelectedUnit] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedLine, setSelectedLine] = useState('');
    const [selectedMachine, setSelectedMachine] = useState('');

    const effectiveUnit = isSuperAdmin ? selectedUnit : lockedUnit;

    const { data: unitsData } = useGetAllUnitsQuery(undefined, { skip: !isSuperAdmin });
    const units = Array.isArray(unitsData?.data) ? unitsData.data : [];

    const { data: departmentsData, isFetching: deptLoading } = useGetAllDepartmentsQuery({
        limit: 1000,
        unit: effectiveUnit,
    });
    const departments = departmentsData?.data?.departments || [];

    const { data: linesData, isFetching: linesLoading } = useGetLinesByDepartmentQuery(selectedDepartment, {
        skip: !selectedDepartment,
    });
    const lines = linesData?.data || [];

    const { data: machinesData, isFetching: machinesLoading } = useGetMachinesByLineQuery(selectedLine, {
        skip: !selectedLine,
    });
    const machines = machinesData?.data || [];

    const {
        data: distributionData,
        isFetching: distributionLoading,
        isError: distributionError,
        refetch,
    } = useGetPlanLevelDistributionQuery({
        unit: effectiveUnit,
        departmentId: selectedDepartment,
        lineId: selectedLine,
        machineId: selectedMachine,
    });

    const result = distributionData?.data;
    const chartData = result?.chartData || [];
    const levels = result?.levels || [];
    const kpis = result?.kpis || { totalUsers: 0, compliantCount: 0, complianceRate: 0, underTrainedCount: 0, unassignedCount: 0 };
    const levelColors = useMemo(() => getLevelColors(levels.length), [levels.length]);

    const handleUnitChange = (val) => {
        setSelectedUnit(val);
        setSelectedDepartment('');
        setSelectedLine('');
        setSelectedMachine('');
    };
    const handleDepartmentChange = (val) => {
        setSelectedDepartment(val);
        setSelectedLine('');
        setSelectedMachine('');
    };
    const handleLineChange = (val) => {
        setSelectedLine(val);
        setSelectedMachine('');
    };
    const handleMachineChange = (val) => {
        setSelectedMachine(val);
    };
    const handleReset = () => {
        setSelectedUnit('');
        setSelectedDepartment('');
        setSelectedLine('');
        setSelectedMachine('');
    };

    const hasFilters = selectedUnit || selectedDepartment || selectedLine || selectedMachine;
    const isLoading = distributionLoading;

    return (
        <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <IconChartBar className="h-5 w-5" />
                        Plan vs Current Level Distribution
                    </CardTitle>
                    <CardDescription>
                        Employees grouped by required plan level, broken down by their current skill level
                    </CardDescription>
                </div>
                <Button
                    onClick={() => refetch()}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="flex items-center gap-2 self-start"
                >
                    <IconRefresh className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </CardHeader>
            <CardContent className="space-y-5">
                {/* Cascading Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    {isSuperAdmin && (
                        <FilterSelect
                            value={selectedUnit}
                            onValueChange={handleUnitChange}
                            placeholder="All Units"
                            allLabel="All Units"
                            items={units}
                            getKey={(u) => u._id || u.id}
                            getValue={(u) => u.title}
                            getLabel={(u) => u.title}
                        />
                    )}

                    <FilterSelect
                        value={selectedDepartment}
                        onValueChange={handleDepartmentChange}
                        placeholder={deptLoading ? 'Loading departments...' : 'All Departments'}
                        allLabel="All Departments"
                        items={departments}
                        getKey={(d) => d._id || d.id}
                        getValue={(d) => String(d._id)}
                        getLabel={(d) => d.name}
                    />

                    <FilterSelect
                        value={selectedLine}
                        onValueChange={handleLineChange}
                        disabled={!selectedDepartment}
                        placeholder={linesLoading ? 'Loading lines...' : 'All Lines'}
                        allLabel="All Lines"
                        items={lines}
                        getKey={(l) => l.id || l._id}
                        getValue={(l) => String(l.id || l._id)}
                        getLabel={(l) => l.name}
                    />

                    <FilterSelect
                        value={selectedMachine}
                        onValueChange={handleMachineChange}
                        disabled={!selectedLine}
                        placeholder={machinesLoading ? 'Loading machines...' : 'All Machines'}
                        allLabel="All Machines"
                        items={machines}
                        getKey={(m) => m.id || m._id}
                        getValue={(m) => String(m.id || m._id)}
                        getLabel={(m) => m.name}
                    />

                    {hasFilters && (
                        <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs" style={{ color: '#6b7280' }}>
                            Reset Filters
                        </Button>
                    )}
                </div>

                {/* KPI Ribbon */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiTile icon={IconUsers} label="Total Employees" value={kpis.totalUsers} bg="#eff6ff" color="#2563eb" />
                    <KpiTile
                        icon={IconCircleCheck}
                        label="Plan Compliance Rate"
                        value={`${kpis.complianceRate}%`}
                        bg="#f0fdf4"
                        color="#16a34a"
                    />
                    <KpiTile
                        icon={IconAlertTriangle}
                        label="Under-Training Count"
                        value={kpis.underTrainedCount}
                        bg="#fff7ed"
                        color="#ea580c"
                    />
                    <KpiTile
                        icon={IconHelpCircle}
                        label="No Plan Assigned"
                        value={kpis.unassignedCount}
                        bg="#f3f4f6"
                        color="#6b7280"
                    />
                </div>

                {/* Chart */}
                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-[320px] w-full rounded-lg" />
                    </div>
                ) : distributionError ? (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg" style={{ color: '#dc2626' }}>
                        Failed to load distribution data.
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg" style={{ color: '#6b7280' }}>
                        No skill matrix data found for the selected filters.
                    </div>
                ) : (
                    <div style={{ width: '100%', height: 360 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData} margin={{ top: 24, right: 16, left: 0, bottom: 4 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                <XAxis dataKey="plan" tick={{ fontSize: 12, fill: '#4b5563' }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#4b5563' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                                    formatter={(value, name) => [value, name]}
                                />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                {levels.map((level, idx) => (
                                    <Bar key={level} dataKey={level} name={level} fill={levelColors[idx]} radius={[3, 3, 0, 0]}>
                                        <LabelList
                                            dataKey={level}
                                            position="top"
                                            formatter={(v) => (v > 0 ? v : '')}
                                            style={{ fontSize: 11, fontWeight: 600, fill: '#1e293b' }}
                                        />
                                    </Bar>
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default PlanCurrentLevelChart;
