import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
    IconCalendar,
    IconFilter,
    IconX,
    IconInfoCircle,
} from '@tabler/icons-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// High-contrast, vibrant palette mapping each level to distinct, recognizable colors
// so adjacent bars in the chart are instantly distinguishable.
const LEVEL_PALETTE = {
    L0: { fill: '#64748b', stroke: '#475569', label: 'L0' }, // Slate Gray (Baseline / Unassigned)
    L1: { fill: '#0284c7', stroke: '#0369a1', label: 'L1' }, // Sky Blue
    L2: { fill: '#059669', stroke: '#047857', label: 'L2' }, // Emerald Green
    L3: { fill: '#d97706', stroke: '#b45309', label: 'L3' }, // Amber Orange
    L4: { fill: '#7c3aed', stroke: '#6d28d9', label: 'L4' }, // Royal Purple / Violet
    L5: { fill: '#e11d48', stroke: '#be123c', label: 'L5' }, // Vibrant Rose / Red
    L6: { fill: '#2563eb', stroke: '#1d4ed8', label: 'L6' }, // Indigo / Blue
    L7: { fill: '#0891b2', stroke: '#0e7490', label: 'L7' }, // Cyan Teal
    L8: { fill: '#c026d3', stroke: '#a21caf', label: 'L8' }, // Fuchsia
    L9: { fill: '#ea580c', stroke: '#c2410c', label: 'L9' }, // Bright Orange
};

const DISTINCT_COLORS = [
    '#64748b', // Slate Gray
    '#0284c7', // Sky Blue
    '#059669', // Emerald Green
    '#d97706', // Amber Orange
    '#7c3aed', // Royal Purple
    '#e11d48', // Vibrant Rose
    '#2563eb', // Indigo Blue
    '#0891b2', // Cyan Teal
    '#c026d3', // Fuchsia
    '#ea580c', // Bright Orange
    '#10b981', // Mint
    '#6366f1', // Soft Indigo
];

const getLevelColor = (level, idx = 0) => {
    if (!level) return DISTINCT_COLORS[idx % DISTINCT_COLORS.length];
    const key = String(level).trim().toUpperCase();
    if (LEVEL_PALETTE[key]) return LEVEL_PALETTE[key].fill;

    // Check if numeric digits exist (e.g., "L1", "LEVEL 1", etc.)
    const numMatch = key.match(/\d+/);
    if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        const lKey = `L${num}`;
        if (LEVEL_PALETTE[lKey]) return LEVEL_PALETTE[lKey].fill;
        return DISTINCT_COLORS[num % DISTINCT_COLORS.length];
    }
    return DISTINCT_COLORS[idx % DISTINCT_COLORS.length];
};

const EMPTY_KPIS = { totalUsers: 0, compliantCount: 0, complianceRate: 0, underTrainedCount: 0, unassignedCount: 0 };

// Local calendar date (not UTC) as "YYYY-MM-DD", matching what <input type="date"> expects/emits.
const toISODate = (d) => {
    const x = new Date(d);
    const offsetMs = x.getTimezoneOffset() * 60000;
    return new Date(x.getTime() - offsetMs).toISOString().slice(0, 10);
};

const DATE_PRESETS = [
    { key: '7d', label: 'Last 7 Days', getRange: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 6); return [start, end]; } },
    { key: '30d', label: 'Last 30 Days', getRange: () => { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 29); return [start, end]; } },
    { key: 'month', label: 'This Month', getRange: () => { const now = new Date(); return [new Date(now.getFullYear(), now.getMonth(), 1), now]; } },
    { key: '3m', label: 'Last 3 Months', getRange: () => { const end = new Date(); const start = new Date(); start.setMonth(start.getMonth() - 3); return [start, end]; } },
    { key: 'year', label: 'This Year', getRange: () => { const now = new Date(); return [new Date(now.getFullYear(), 0, 1), now]; } },
];

const TIMEFRAME_TABS = [
    { value: 'snapshot', label: 'Snapshot' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
];

const TIMEFRAME_DESCRIPTIONS = {
    snapshot: 'Employees grouped by required plan level, broken down by their current skill level',
    daily: 'Total employees at each skill level, day by day — reconstructed from level history for past dates',
    weekly: 'Total employees at each skill level, week by week — reconstructed from level history for past dates',
    monthly: 'Total employees at each skill level, month by month — reconstructed from level history for past dates',
};

const CHART_ITEM_WIDTH = 95; // px reserved per bucket so bars/labels never get cramped

// Custom Tooltip component with colored level indicators, clean totals, and percentages
const CustomChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const total = payload.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
    const nonZeroItems = payload.filter((p) => Number(p.value) > 0);
    const displayItems = nonZeroItems.length > 0 ? nonZeroItems : payload;

    return (
        <div className="bg-white/95 backdrop-blur-md rounded-xl p-3.5 shadow-xl border border-slate-200/90 text-xs min-w-[210px] z-50">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 mb-2">
                <span className="font-bold text-slate-800 text-sm tracking-tight">{label}</span>
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded-full">
                    Total: {total}
                </span>
            </div>
            <div className="space-y-1.5">
                {displayItems.map((item) => {
                    const count = Number(item.value) || 0;
                    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                        <div key={item.name} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span
                                    className="h-2.5 w-2.5 rounded-full flex-shrink-0 shadow-2xs"
                                    style={{ backgroundColor: item.color || item.fill }}
                                />
                                <span className="font-semibold text-slate-700">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-semibold">
                                <span className="text-slate-900">{count}</span>
                                <span className="text-slate-400 font-normal text-[10px]">({percent}%)</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Custom Legend with distinct badge pills
const CustomLegend = (props) => {
    const { payload } = props;
    if (!payload || !payload.length) return null;
    return (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
                Current Level:
            </span>
            {payload.map((entry) => (
                <div
                    key={entry.value}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200/80 bg-slate-50/90 shadow-2xs hover:bg-slate-100 transition-colors"
                >
                    <span
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0 shadow-2xs"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-slate-700">{entry.value}</span>
                </div>
            ))}
        </div>
    );
};

// Tracks a scrollable element's rendered width
const useElementWidth = () => {
    const nodeRef = useRef(null);
    const observerRef = useRef(null);
    const [width, setWidth] = useState(0);

    const setNode = useCallback((node) => {
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }
        nodeRef.current = node;
        if (node && typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) setWidth(entry.contentRect.width);
            });
            observer.observe(node);
            observerRef.current = observer;
            setWidth(node.clientWidth);
        } else {
            setWidth(0);
        }
    }, []);

    return [nodeRef, setNode, width];
};

// Custom horizontal scrollbar for timeline view
const CustomHScrollbar = ({ scrollRef, contentWidth }) => {
    const trackRef = useRef(null);
    const [thumb, setThumb] = useState({ left: 0, width: 0 });
    const [dragging, setDragging] = useState(false);

    const recalc = () => {
        const el = scrollRef.current;
        const track = trackRef.current;
        if (!el || !track) return;
        const trackWidth = track.clientWidth;
        const visible = el.clientWidth;
        const total = el.scrollWidth;
        const thumbWidth = total > 0 ? Math.max((visible / total) * trackWidth, 36) : trackWidth;
        const maxThumbLeft = Math.max(trackWidth - thumbWidth, 0);
        const maxScroll = Math.max(total - visible, 0);
        const left = maxScroll > 0 ? (el.scrollLeft / maxScroll) * maxThumbLeft : 0;
        setThumb({ left, width: thumbWidth });
    };

    useEffect(() => {
        recalc();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentWidth]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        recalc();
        el.addEventListener('scroll', recalc);
        window.addEventListener('resize', recalc);
        return () => {
            el.removeEventListener('scroll', recalc);
            window.removeEventListener('resize', recalc);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrollRef.current]);

    const scrollToThumbLeft = (thumbLeft) => {
        const el = scrollRef.current;
        const track = trackRef.current;
        if (!el || !track) return;
        const trackWidth = track.clientWidth;
        const maxThumbLeft = Math.max(trackWidth - thumb.width, 0);
        const maxScroll = Math.max(el.scrollWidth - el.clientWidth, 0);
        const clamped = Math.min(Math.max(thumbLeft, 0), maxThumbLeft);
        el.scrollLeft = maxThumbLeft > 0 ? (clamped / maxThumbLeft) * maxScroll : 0;
    };

    const handleThumbPointerDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startLeft = thumb.left;
        setDragging(true);

        const onMove = (moveEvt) => {
            scrollToThumbLeft(startLeft + (moveEvt.clientX - startX));
        };
        const onUp = () => {
            setDragging(false);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const handleTrackPointerDown = (e) => {
        if (e.target !== trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        scrollToThumbLeft(e.clientX - rect.left - thumb.width / 2);
    };

    const trackWidthNow = trackRef.current?.clientWidth || 0;
    const valueNow = trackWidthNow > thumb.width ? Math.round((thumb.left / (trackWidthNow - thumb.width)) * 100) : 0;

    return (
        <div
            ref={trackRef}
            onPointerDown={handleTrackPointerDown}
            className="relative mt-3 h-2 w-full rounded-full cursor-pointer select-none bg-slate-200/80 hover:bg-slate-300/60 transition-colors"
            role="scrollbar"
            aria-orientation="horizontal"
            aria-controls="plan-level-timeline-scroll"
            aria-valuenow={valueNow}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <div
                onPointerDown={handleThumbPointerDown}
                className="absolute top-0 h-2 rounded-full shadow-2xs"
                style={{
                    left: thumb.left,
                    width: thumb.width,
                    backgroundColor: dragging ? '#1d4ed8' : '#3b82f6',
                    transition: dragging ? 'none' : 'background-color 0.15s ease',
                    cursor: dragging ? 'grabbing' : 'grab',
                }}
            />
        </div>
    );
};

const FilterSelect = ({ value, onValueChange, disabled, placeholder, allLabel, items, getKey, getValue, getLabel }) => (
    <Select value={value || 'ALL'} onValueChange={(v) => onValueChange(v === 'ALL' ? '' : v)} disabled={disabled}>
        <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs bg-white border-slate-200 rounded-lg shadow-2xs font-medium">
            <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="max-h-60 text-xs">
            <SelectItem value="ALL">{allLabel}</SelectItem>
            {items.map((item) => (
                <SelectItem key={getKey(item)} value={getValue(item)}>
                    {getLabel(item)}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
);

const KpiTile = ({ icon: Icon, label, value, bg, color, border }) => (
    <div
        className="flex items-center gap-3.5 rounded-xl border p-3.5 bg-white shadow-2xs hover:shadow-sm transition-all duration-200"
        style={{ borderColor: border || '#e2e8f0' }}
    >
        <div
            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs"
            style={{ backgroundColor: bg }}
        >
            <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0">
            <div className="text-xl font-bold leading-tight tracking-tight text-slate-900">{value}</div>
            <div className="text-xs font-medium text-slate-500 truncate mt-0.5">{label}</div>
        </div>
    </div>
);

const EmptyState = ({ text, subtext }) => (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/40">
        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
            <IconChartBar className="h-5 w-5" />
        </div>
        <div className="text-sm font-semibold text-slate-700">{text}</div>
        {subtext && <div className="text-xs text-slate-400 mt-1">{subtext}</div>}
    </div>
);

// Custom X-axis tick
const TimelineTick = ({ x, y, payload, currentLabel }) => {
    const isCurrent = payload.value === currentLabel;
    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0}
                y={0}
                dy={12}
                textAnchor="middle"
                fontSize={11}
                fontWeight={isCurrent ? 700 : 500}
                fill={isCurrent ? '#1d4ed8' : '#475569'}
            >
                {payload.value}
            </text>
            {isCurrent && <circle cx={0} cy={26} r={2.5} fill="#2563eb" />}
        </g>
    );
};

const PlanCurrentLevelChart = ({ isSuperAdmin = false }) => {
    const currentUser = useSelector((state) => state.auth?.user);
    const lockedUnit = !isSuperAdmin ? (currentUser?.unit || '') : '';

    const [selectedUnit, setSelectedUnit] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedLine, setSelectedLine] = useState('');
    const [selectedMachine, setSelectedMachine] = useState('');

    const [timeframe, setTimeframe] = useState('snapshot');
    const [dateRange, setDateRange] = useState(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 29);
        return { startDate: toISODate(start), endDate: toISODate(end) };
    });

    const effectiveUnit = isSuperAdmin ? selectedUnit : lockedUnit;
    const isTimeSeries = timeframe !== 'snapshot';

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
        error: distributionErrorObj,
        refetch,
    } = useGetPlanLevelDistributionQuery({
        unit: effectiveUnit,
        departmentId: selectedDepartment,
        lineId: selectedLine,
        machineId: selectedMachine,
        timeframe,
        startDate: isTimeSeries ? dateRange.startDate : '',
        endDate: isTimeSeries ? dateRange.endDate : '',
    });

    const result = distributionData?.data;
    const isTimeSeriesResult = result?.mode === 'timeseries';
    const buckets = useMemo(() => (isTimeSeriesResult ? (result?.buckets || []) : []), [isTimeSeriesResult, result]);
    const levels = useMemo(() => result?.levels || [], [result]);
    const kpis = result?.kpis || EMPTY_KPIS;

    // Pre-calculate color for each level to ensure fast and consistent rendering
    const levelColorMap = useMemo(() => {
        const map = {};
        levels.forEach((lvl, idx) => {
            map[lvl] = getLevelColor(lvl, idx);
        });
        return map;
    }, [levels]);

    // Snapshot mode: the plan (required level) x current-level bar chart
    const planChartData = isTimeSeriesResult ? [] : (result?.chartData || []);

    // Time-series modes: total headcount per current-level across time
    const timelineData = useMemo(() => {
        if (!isTimeSeriesResult) return [];
        return buckets.map(b => {
            const row = { label: b.label, isCurrent: b.isCurrent };
            levels.forEach(level => { row[level] = 0; });
            (b.chartData || []).forEach(planRow => {
                levels.forEach(level => { row[level] += planRow[level] || 0; });
            });
            return row;
        });
    }, [isTimeSeriesResult, buckets, levels]);
    const currentBucketLabel = useMemo(() => timelineData.find(d => d.isCurrent)?.label, [timelineData]);

    const [scrollRef, setScrollRef, containerWidth] = useElementWidth();
    const naturalChartWidth = timelineData.length * CHART_ITEM_WIDTH;
    const chartWidth = Math.max(containerWidth, naturalChartWidth);

    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el || timelineData.length === 0) return;
        const currentIdx = timelineData.findIndex(d => d.isCurrent);
        if (currentIdx === -1) return;
        const bucketCenter = currentIdx * CHART_ITEM_WIDTH + CHART_ITEM_WIDTH / 2;
        const maxScroll = Math.max(el.scrollWidth - el.clientWidth, 0);
        el.scrollLeft = Math.min(Math.max(bucketCenter - el.clientWidth / 2, 0), maxScroll);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timelineData]);

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
    const handlePreset = (preset) => {
        const [start, end] = preset.getRange();
        setDateRange({ startDate: toISODate(start), endDate: toISODate(end) });
    };

    const hasFilters = selectedUnit || selectedDepartment || selectedLine || selectedMachine;
    const isLoading = distributionLoading;
    const todayISO = toISODate(new Date());

    return (
        <Card className="border border-slate-200/80 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-4 border-b border-slate-100 bg-slate-50/30">
                <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 flex-shrink-0 mt-0.5">
                        <IconChartBar className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">
                                Plan vs Current Level Distribution
                            </CardTitle>
                            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/70 px-2 py-0.5 rounded-full">
                                {timeframe === 'snapshot' ? 'Skill Matrix Snapshot' : `${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Trend`}
                            </span>
                        </div>
                        <CardDescription className="text-xs text-slate-500 mt-1">
                            {TIMEFRAME_DESCRIPTIONS[timeframe]}
                        </CardDescription>
                    </div>
                </div>
                <Button
                    onClick={() => refetch()}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="flex items-center gap-1.5 h-9 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs font-medium self-start"
                >
                    <IconRefresh className={`h-4 w-4 text-slate-500 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
                    Refresh
                </Button>
            </CardHeader>

            <CardContent className="space-y-5 p-5">
                {/* Cascading Filters */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
                        <IconFilter className="w-3.5 h-3.5" />
                        <span>Filters:</span>
                    </div>

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
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="h-9 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-1"
                        >
                            <IconX className="w-3.5 h-3.5" />
                            Reset Filters
                        </Button>
                    )}
                </div>

                {/* Timeframe & Date Range Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <Tabs value={timeframe} onValueChange={setTimeframe}>
                        <TabsList className="bg-slate-100 p-1 rounded-lg">
                            {TIMEFRAME_TABS.map(t => (
                                <TabsTrigger
                                    key={t.value}
                                    value={t.value}
                                    className="text-xs px-3 py-1.5 rounded-md font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-2xs"
                                >
                                    {t.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    {isTimeSeries && (
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs">
                                <IconCalendar className="w-3.5 h-3.5 text-slate-500" />
                                <input
                                    type="date"
                                    value={dateRange.startDate}
                                    max={dateRange.endDate}
                                    onChange={(e) => setDateRange(r => ({ ...r, startDate: e.target.value }))}
                                    className="text-xs bg-transparent border-0 focus:outline-none text-slate-700 font-medium cursor-pointer"
                                />
                                <span className="text-slate-400 text-xs">→</span>
                                <input
                                    type="date"
                                    value={dateRange.endDate}
                                    min={dateRange.startDate}
                                    max={todayISO}
                                    onChange={(e) => setDateRange(r => ({ ...r, endDate: e.target.value }))}
                                    className="text-xs bg-transparent border-0 focus:outline-none text-slate-700 font-medium cursor-pointer"
                                />
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {DATE_PRESETS.map(p => (
                                    <Button
                                        key={p.key}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[11px] px-2.5 rounded-md bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs font-medium"
                                        onClick={() => handlePreset(p)}
                                    >
                                        {p.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* KPI Ribbon */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiTile
                        icon={IconUsers}
                        label="Total Employees"
                        value={kpis.totalUsers}
                        bg="#eff6ff"
                        color="#2563eb"
                        border="#dbeafe"
                    />
                    <KpiTile
                        icon={IconCircleCheck}
                        label="Plan Compliance Rate"
                        value={`${kpis.complianceRate}%`}
                        bg="#f0fdf4"
                        color="#16a34a"
                        border="#dcfce7"
                    />
                    <KpiTile
                        icon={IconAlertTriangle}
                        label="Under-Training Count"
                        value={kpis.underTrainedCount}
                        bg="#fff7ed"
                        color="#ea580c"
                        border="#ffedd5"
                    />
                    <KpiTile
                        icon={IconHelpCircle}
                        label="No Plan Assigned"
                        value={kpis.unassignedCount}
                        bg="#f8fafc"
                        color="#64748b"
                        border="#e2e8f0"
                    />
                </div>

                {/* Chart Section */}
                {isLoading ? (
                    <Skeleton className="h-[380px] w-full rounded-xl" />
                ) : distributionError ? (
                    <div className="text-center py-12 border-2 border-dashed border-red-200 rounded-xl bg-red-50/40 text-red-600 text-sm font-medium">
                        {distributionErrorObj?.message || 'Failed to load distribution data.'}
                    </div>
                ) : isTimeSeries ? (
                    timelineData.length === 0 ? (
                        <EmptyState
                            text="No level history data found for the selected range."
                            subtext="Try adjusting the date range or filter options."
                        />
                    ) : (
                        <div>
                            <style>{`#plan-level-timeline-scroll::-webkit-scrollbar { display: none; height: 0; width: 0; }`}</style>
                            <div
                                id="plan-level-timeline-scroll"
                                ref={setScrollRef}
                                className="overflow-x-auto"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                <div style={{ width: chartWidth || '100%', height: 380 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={timelineData}
                                            margin={{ top: 28, right: 20, left: -10, bottom: 8 }}
                                            barGap={3}
                                            barCategoryGap="16%"
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                            <XAxis
                                                dataKey="label"
                                                interval={0}
                                                height={44}
                                                tick={(props) => <TimelineTick {...props} currentLabel={currentBucketLabel} />}
                                                axisLine={{ stroke: '#cbd5e1' }}
                                                tickLine={{ stroke: '#cbd5e1' }}
                                            />
                                            <YAxis
                                                allowDecimals={false}
                                                tick={{ fontSize: 12, fill: '#64748b' }}
                                                axisLine={{ stroke: '#cbd5e1' }}
                                                tickLine={false}
                                            />
                                            <Tooltip content={<CustomChartTooltip />} />
                                            <Legend content={<CustomLegend />} />
                                            {levels.map((level, idx) => {
                                                const color = levelColorMap[level] || getLevelColor(level, idx);
                                                return (
                                                    <Bar
                                                        key={level}
                                                        dataKey={level}
                                                        name={level}
                                                        fill={color}
                                                        radius={[4, 4, 0, 0]}
                                                        maxBarSize={36}
                                                    >
                                                        <LabelList
                                                            dataKey={level}
                                                            position="top"
                                                            formatter={(v) => (v > 0 ? v : '')}
                                                            style={{ fontSize: 10, fontWeight: 700, fill: '#334155' }}
                                                        />
                                                    </Bar>
                                                );
                                            })}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <CustomHScrollbar scrollRef={scrollRef} contentWidth={chartWidth} />
                            {chartWidth > containerWidth && (
                                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
                                    <span>← Scroll horizontally to inspect earlier dates</span>
                                    <span>Drag thumb or scroll →</span>
                                </div>
                            )}
                        </div>
                    )
                ) : planChartData.length === 0 ? (
                    <EmptyState
                        text="No skill matrix data found for the selected filters."
                        subtext="Ensure employees have assigned plan levels and skill evaluations."
                    />
                ) : (
                    <div className="w-full h-[380px] pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={planChartData}
                                margin={{ top: 28, right: 20, left: -10, bottom: 6 }}
                                barGap={4}
                                barCategoryGap="20%"
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis
                                    dataKey="plan"
                                    tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
                                    axisLine={{ stroke: '#cbd5e1' }}
                                    tickLine={{ stroke: '#cbd5e1' }}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    axisLine={{ stroke: '#cbd5e1' }}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomChartTooltip />} />
                                <Legend content={<CustomLegend />} />
                                {levels.map((level, idx) => {
                                    const color = levelColorMap[level] || getLevelColor(level, idx);
                                    return (
                                        <Bar
                                            key={level}
                                            dataKey={level}
                                            name={level}
                                            fill={color}
                                            radius={[4, 4, 0, 0]}
                                            maxBarSize={44}
                                        >
                                            <LabelList
                                                dataKey={level}
                                                position="top"
                                                formatter={(v) => (v > 0 ? v : '')}
                                                style={{ fontSize: 11, fontWeight: 700, fill: '#334155' }}
                                            />
                                        </Bar>
                                    );
                                })}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default PlanCurrentLevelChart;
