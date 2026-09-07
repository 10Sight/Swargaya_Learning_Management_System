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

const CHART_ITEM_WIDTH = 90; // px reserved per bucket so bars/labels never get cramped

// Tracks a scrollable element's rendered width so the timeline chart can be sized to
// max(container width, bucket count * CHART_ITEM_WIDTH). Uses a callback ref (not a plain
// useRef + effect-on-mount) because the target div is conditionally rendered — it doesn't exist
// on first mount (default tab is "Snapshot"), so a one-time effect would observe `null` and
// never attach once the user switches to a timeframe tab. A callback ref re-fires every time
// the node is attached/detached, so the ResizeObserver always ends up on the real element.
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

// A purpose-built horizontal scrollbar for the timeline chart: the browser/OS scrollbar on
// `scrollRef`'s element is hidden entirely, and this track+thumb (click-to-jump, drag-to-scroll)
// drives `scrollLeft` directly, so the control looks and behaves the same on every browser/OS
// instead of inheriting whatever native scrollbar style the viewer happens to have.
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
        const thumbWidth = total > 0 ? Math.max((visible / total) * trackWidth, 32) : trackWidth;
        const maxThumbLeft = Math.max(trackWidth - thumbWidth, 0);
        const maxScroll = Math.max(total - visible, 0);
        const left = maxScroll > 0 ? (el.scrollLeft / maxScroll) * maxThumbLeft : 0;
        setThumb({ left, width: thumbWidth });
    };

    // Re-measure whenever the chart's content width changes (new date range, timeframe, filters).
    useEffect(() => {
        recalc();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentWidth]);

    // Keep the thumb synced with the container's own scroll position/size, independent of re-renders.
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
        if (e.target !== trackRef.current) return; // let the thumb's own handler take clicks on it
        const rect = trackRef.current.getBoundingClientRect();
        scrollToThumbLeft(e.clientX - rect.left - thumb.width / 2);
    };

    const trackWidthNow = trackRef.current?.clientWidth || 0;
    const valueNow = trackWidthNow > thumb.width ? Math.round((thumb.left / (trackWidthNow - thumb.width)) * 100) : 0;

    return (
        <div
            ref={trackRef}
            onPointerDown={handleTrackPointerDown}
            className="relative mt-2 h-2 w-full rounded-full cursor-pointer select-none"
            style={{ backgroundColor: '#e5e7eb' }}
            role="scrollbar"
            aria-orientation="horizontal"
            aria-controls="plan-level-timeline-scroll"
            aria-valuenow={valueNow}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <div
                onPointerDown={handleThumbPointerDown}
                className="absolute top-0 h-2 rounded-full"
                style={{
                    left: thumb.left,
                    width: thumb.width,
                    backgroundColor: dragging ? '#2563eb' : '#93c5fd',
                    transition: dragging ? 'none' : 'background-color 0.15s ease',
                    cursor: dragging ? 'grabbing' : 'grab',
                }}
            />
        </div>
    );
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

const EmptyState = ({ text }) => (
    <div className="text-center py-10 border-2 border-dashed rounded-lg" style={{ color: '#6b7280' }}>
        {text}
    </div>
);

// Custom X-axis tick: bold, accent-colored label plus a small dot under whichever bucket
// contains today, so the current date/month reads immediately in a dense timeline.
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
                fontWeight={isCurrent ? 700 : 400}
                fill={isCurrent ? '#1d4ed8' : '#4b5563'}
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
    const levelColors = useMemo(() => getLevelColors(levels.length), [levels.length]);

    // Snapshot mode: the plan (required level) x current-level bar chart, exactly as before.
    const planChartData = isTimeSeriesResult ? [] : (result?.chartData || []);

    // Time-series modes: total headcount per current-level, summed across every plan bucket,
    // for each date/week/month — this is what answers "how is the workforce leveling up".
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

    // Default the horizontal scroll position to today's bucket (centered, when there's room)
    // instead of leaving the chart scrolled to the start of the range — every fresh load of
    // timelineData (new timeframe, date range, or filters) re-centers on "now" again.
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
        <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <IconChartBar className="h-5 w-5" />
                        Plan vs Current Level Distribution
                    </CardTitle>
                    <CardDescription>
                        {TIMEFRAME_DESCRIPTIONS[timeframe]}
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

                {/* Timeframe: a single tab bar decides both the date grouping and which chart shows
                    below (Snapshot -> plan vs level bars, Daily/Weekly/Monthly -> level trend over time). */}
                <div className="flex flex-col gap-3 border-t pt-4" style={{ borderColor: '#e5e7eb' }}>
                    <Tabs value={timeframe} onValueChange={setTimeframe}>
                        <TabsList>
                            {TIMEFRAME_TABS.map(t => (
                                <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    {isTimeSeries && (
                        <div className="flex flex-wrap items-center gap-2">
                            <IconCalendar className="w-4 h-4 flex-shrink-0" style={{ color: '#6b7280' }} />
                            <input
                                type="date"
                                value={dateRange.startDate}
                                max={dateRange.endDate}
                                onChange={(e) => setDateRange(r => ({ ...r, startDate: e.target.value }))}
                                className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                                style={{ borderColor: '#d1d5db' }}
                            />
                            <span style={{ color: '#6b7280' }}>to</span>
                            <input
                                type="date"
                                value={dateRange.endDate}
                                min={dateRange.startDate}
                                max={todayISO}
                                onChange={(e) => setDateRange(r => ({ ...r, endDate: e.target.value }))}
                                className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6]"
                                style={{ borderColor: '#d1d5db' }}
                            />
                            <div className="flex flex-wrap gap-1.5 ml-1">
                                {DATE_PRESETS.map(p => (
                                    <Button
                                        key={p.key}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs"
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
                    <Skeleton className="h-[320px] w-full rounded-lg" />
                ) : distributionError ? (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg" style={{ color: '#dc2626' }}>
                        {distributionErrorObj?.message || 'Failed to load distribution data.'}
                    </div>
                ) : isTimeSeries ? (
                    timelineData.length === 0 ? (
                        <EmptyState text="No level history data found for the selected range." />
                    ) : (
                        <div>
                            {/* Inline style tag, not a Tailwind arbitrary-variant class: an inline `style`
                                prop cannot target a pseudo-element like ::-webkit-scrollbar at all, and the
                                Tailwind class equivalent depends on the project's Tailwind/JIT setup actually
                                emitting it — this plain CSS rule hides the native scrollbar unconditionally,
                                on every Chromium/Safari browser, regardless of build config. */}
                            <style>{`#plan-level-timeline-scroll::-webkit-scrollbar { display: none; height: 0; width: 0; }`}</style>
                            <div
                                id="plan-level-timeline-scroll"
                                ref={setScrollRef}
                                className="overflow-x-auto"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                <div style={{ width: chartWidth || '100%', height: 360 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={timelineData} margin={{ top: 24, right: 16, left: 0, bottom: 8 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" vertical horizontal={false} />
                                            <XAxis
                                                dataKey="label"
                                                interval={0}
                                                height={44}
                                                tick={(props) => <TimelineTick {...props} currentLabel={currentBucketLabel} />}
                                            />
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
                                                        style={{ fontSize: 10, fontWeight: 600, fill: '#1e293b' }}
                                                    />
                                                </Bar>
                                            ))}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <CustomHScrollbar scrollRef={scrollRef} contentWidth={chartWidth} />
                        </div>
                    )
                ) : planChartData.length === 0 ? (
                    <EmptyState text="No skill matrix data found for the selected filters." />
                ) : (
                    <div style={{ width: '100%', height: 360 }}>
                        <ResponsiveContainer>
                            <BarChart data={planChartData} margin={{ top: 24, right: 16, left: 0, bottom: 4 }}>
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
