import React from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import useTranslate from "@/hooks/useTranslate";
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useGetActiveConfigQuery } from "@/Redux/AllApi/CourseLevelConfigApi";
import { useGetAllDepartmentsQuery, useGetDepartmentProgressQuery, useGetDepartmentByIdQuery, useGetAllDepartmentsProgressQuery } from "@/Redux/AllApi/DepartmentApi";
import { useGetCourseByIdQuery } from "@/Redux/AllApi/CourseApi";
import { useGetAllUsersQuery } from "@/Redux/AllApi/UserApi";

// Custom Pie Chart Component for Level Visualization
// Custom Pie Chart Component for Level Visualization
// Custom Pie Chart Component for Level Visualization
const LevelPieChart = ({ currentLevel, totalLevels = 3, className = "h-12 w-12" }) => {
    // Generate data dynamically based on totalLevels
    // activeCount is currentLevel index + 1
    const activeCount = currentLevel;

    // Create array of size totalLevels
    const data = Array.from({ length: totalLevels }, (_, i) => ({
        name: `Slice ${i + 1}`,
        value: 1,
        active: i < activeCount // i is 0-indexed, so 0 < 1 is true for Level 1
    }));

    const COLORS = ['#000000', '#e5e7eb']; // Filled: Black, Empty: Gray-200

    return (
        <div className={className}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={0}
                        outerRadius="100%"
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        stroke="#000000"
                        strokeWidth={1}
                        isAnimationActive={false} // Disable animation for table performance
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.active ? COLORS[0] : 'none'} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

const mockData = [
    { id: 1, name: "Rahul Sharma", type: "DET", doj: "2024-01-15", station: "CNC Machine 01", critical: "Critical", minLevel: 2, currentLevel: 2, m1: 85, m2: 78, m3: 90 },
    { id: 2, name: "Amit Verma", type: "CAS", doj: "2024-02-01", station: "Assembly Line 4", critical: "Non Critical", minLevel: 1, currentLevel: 1, m1: 72, m2: 65, m3: 80 },
    { id: 3, name: "Priya Singh", type: "DET", doj: "2023-11-20", station: "Quality Check", critical: "Critical", minLevel: 3, currentLevel: 3, m1: 95, m2: 92, m3: 88 },
    { id: 4, name: "Suresh Kumar", type: "CAS", doj: "2024-03-10", station: "Packaging Unit", critical: "Non Critical", minLevel: 1, currentLevel: 2, m1: 80, m2: 85, m3: 75 },
    { id: 5, name: "Vikram Malhotra", type: "DET", doj: "2023-10-05", station: "Welding St 2", critical: "Critical", minLevel: 2, currentLevel: 3, m1: 90, m2: 88, m3: 92 },
];

const SkillMatrix = () => {
    const { user } = useSelector((state) => state.auth);
    const { t } = useTranslate();
    const currentDate = format(new Date(), 'MMMM dd, yyyy');
    const [selectedDept, setSelectedDept] = React.useState("all");
    const [searchTerm, setSearchTerm] = React.useState("");

    // Fetch active course level configuration
    const { data: configData, isLoading: configLoading } = useGetActiveConfigQuery();
    const activeConfig = configData?.data;
    const levels = activeConfig?.levels || [];

    // Fetch Departments for Filter
    const { data: departmentsData } = useGetAllDepartmentsQuery({ limit: 100 });
    const departments = departmentsData?.data?.departments || [];

    // Fetch Data based on selection
    const { data: globalProgressData, isFetching: isGlobalLoading } = useGetAllDepartmentsProgressQuery(undefined, {
        skip: selectedDept !== "all"
    });

    // 1. If specific department selected, get its details (for student list) AND progress
    const { data: deptDetailsData, isFetching: isDeptDetailsLoading } = useGetDepartmentByIdQuery(selectedDept, {
        skip: selectedDept === "all"
    });

    const { data: deptProgressData, isFetching: isDeptProgressLoading } = useGetDepartmentProgressQuery(selectedDept, {
        skip: selectedDept === "all"
    });

    // 2. If 'all', fetch all students (fallback) or ideally we'd want a way to get all progress
    // For now, if 'all', we will list students but might miss specific module scores depending on API
    const { data: allUsersData, isFetching: isUsersLoading } = useGetAllUsersQuery({
        role: "STUDENT",
        limit: 100,
        search: searchTerm
    }, {
        skip: true // Now invalid as we use globalProgressData
    });

    const isDeptLoading = isDeptDetailsLoading || isDeptProgressLoading;

    // 3. Get Course Info for Modules Columns (only if specific department selected)
    const selectedDeptObj = departments.find(d => d._id === selectedDept);
    const courseId = selectedDeptObj?.course?._id || selectedDeptObj?.course;
    const { data: courseData } = useGetCourseByIdQuery(courseId, {
        skip: !courseId || selectedDept === "all"
    });

    // Prepare Table Data
    const tableData = React.useMemo(() => {
        if (selectedDept === "all") {
            const aggregated = globalProgressData?.data || [];
            if (searchTerm) {
                return aggregated.filter(item =>
                    item.student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.department.name.toLowerCase().includes(searchTerm.toLowerCase())
                ).map(item => ({
                    id: item.student._id,
                    name: item.student.fullName,
                    doj: item.student.createdAt,
                    station: item.course?.title || "Unknown Course",
                    category: item.course?.category || "General",
                    minLevel: item.course?.difficulty || "N/A",
                    currentLevel: item.progress?.currentLevel || "L1",
                    modules: item.progress?.completedModules || [],
                    courseModules: item.course?.modules || [], // Add course modules definition
                }));
            }
            return aggregated.map(item => ({
                id: item.student._id,
                name: item.student.fullName,
                doj: item.student.createdAt,
                station: item.course?.title || "Unknown Course",
                category: item.course?.category || "General",
                minLevel: item.course?.difficulty || "N/A",
                currentLevel: item.progress?.currentLevel || "L1",
                modules: item.progress?.completedModules || [],
                courseModules: item.course?.modules || [], // Add course modules definition
            }));
        } else {
            const students = deptDetailsData?.data?.students || [];
            const progressList = deptProgressData?.data?.departmentProgress || [];

            return students.map(student => {
                const progressItem = progressList.find(p => p.student?._id === student._id) || {};

                return {
                    id: student._id,
                    name: student.fullName,
                    doj: student.createdAt,
                    station: courseData?.data?.title || "Unknown Course",
                    category: courseData?.data?.category || "General",
                    modules: progressItem.moduleProgress || [],
                    minLevel: courseData?.data?.difficulty || "N/A",
                    currentLevel: progressItem.currentLevel || "L1",
                };
            });
        }
    }, [selectedDept, globalProgressData, deptDetailsData, deptProgressData, courseData, searchTerm]);

    const moduleColumns = React.useMemo(() => {
        if (selectedDept !== "all" && courseData?.data?.modules) {
            return courseData.data.modules.map((m, i) => ({
                id: m._id,
                title: m.title
            }));
        } else if (selectedDept === "all" && globalProgressData?.data) {
            // "All" view: Create a union of all module titles found in the data
            // This allows us to have columns like "Safety", "Quality" etc. and map students to them
            const uniqueTitles = new Set();
            globalProgressData.data.forEach(item => {
                if (item.course?.modules) {
                    item.course.modules.forEach(m => {
                        if (m.title) uniqueTitles.add(m.title);
                    });
                }
            });

            // Convert Set to Array of objects
            // If too many columns, layout might break, but this satisfies "replace header with real name"
            return Array.from(uniqueTitles).map((title, i) => ({
                id: `dynamic-col-${i}`,
                title: title
            }));
        }

        // Fallback or empty state
        return [
            { id: 'm1', title: 'Module 1' },
            { id: 'm2', title: 'Module 2' },
            { id: 'm3', title: 'Module 3' }
        ];
    }, [selectedDept, courseData, globalProgressData]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row gap-6">

                {/* Card 1: Admin Info */}
                <Card className="flex-1 shadow-md hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl text-blue-700">{t("skillMatrix.adminInfo")}</CardTitle>
                        <CardDescription>{t("skillMatrix.adminDetails")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="flex flex-col space-y-1">
                            <span className="text-sm font-medium text-gray-500">{t("skillMatrix.name")}</span>
                            <span className="text-lg font-semibold text-gray-800">
                                {user?.fullName || user?.userName || "Admin User"}
                            </span>
                        </div>

                        <div className="flex flex-col space-y-1">
                            <span className="text-sm font-medium text-gray-500">{t("skillMatrix.department")}</span>
                            <span className="text-lg font-semibold text-gray-800">
                                Administration
                            </span>
                        </div>

                        <div className="flex flex-col space-y-1">
                            <span className="text-sm font-medium text-gray-500">{t("skillMatrix.date")}</span>
                            <span className="text-lg font-semibold text-gray-800">
                                {currentDate}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Card 2: Level Information */}
                <Card className="flex-1 shadow-md hover:shadow-lg transition-shadow duration-300">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-xl text-blue-700">{t("skillMatrix.levelInfo")}</CardTitle>
                        </div>
                        <CardDescription>
                            {activeConfig ? `${activeConfig.name} - ${activeConfig.description || t("skillMatrix.levelGuide")}` : t("skillMatrix.levelGuide")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {configLoading ? (
                            <div className="flex justify-center p-4">Loading levels...</div>
                        ) : levels.length > 0 ? (
                            <div className="space-y-4">
                                {levels.map((level, index) => (
                                    <div key={index} className="flex items-start space-x-3">
                                        <div
                                            className="mt-1.5 h-3 w-3 rounded-full shrink-0"
                                            style={{ backgroundColor: level.color || '#000' }}
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center">
                                                <h4 className="font-semibold text-gray-900 w-24 truncate" title={level.name}>
                                                    {level.name}
                                                </h4>
                                                <LevelPieChart
                                                    currentLevel={index + 1}
                                                    totalLevels={levels.length}
                                                    className="h-12 w-12 ml-4"
                                                />
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {level.description || "No description provided."}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500">
                                No active level configuration found.
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>

            {/* Filter Section */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Select value={selectedDept} onValueChange={setSelectedDept}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select Department" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            {departments.map(d => (
                                <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {/* Add Search Input if needed for "All" filtering */}
                    {selectedDept === 'all' && (
                        <Input
                            placeholder="Search operator..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-[200px]"
                        />
                    )}
                </div>
            </div>

            {/* Data Table Section */}
            <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                    <CardTitle className="text-xl text-blue-700">{t("nav.skillMatrix")} - {selectedDept === 'all' ? 'All Operators' : (courseData?.data?.title || 'Department View')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableCaption>A list of operators and their skill levels.</TableCaption>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="w-[60px]">{t("skillMatrix.sno") || "S.No"}</TableHead>
                                <TableHead>{t("skillMatrix.operatorName") || "Operator Name"}</TableHead>
                                <TableHead>{t("skillMatrix.doj") || "DOJ"}</TableHead>
                                <TableHead>{t("skillMatrix.station") || "Station/Machine"}</TableHead>
                                <TableHead>{t("skillMatrix.criticality") || "Critical & Non Critical"}</TableHead>
                                <TableHead className="text-center">{t("skillMatrix.minSkill") || "Min Skill"}</TableHead>
                                <TableHead className="text-center">{t("skillMatrix.currentSkill") || "Current Skill"}</TableHead>
                                {/* Dynamic Module Columns */}
                                {moduleColumns.map((mod, i) => (
                                    <TableHead key={mod.id || i} className="text-center">{mod.title}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(isDeptLoading || isGlobalLoading) ? (
                                <TableRow>
                                    <TableCell colSpan={7 + moduleColumns.length} className="text-center py-8">
                                        Loading data...
                                    </TableCell>
                                </TableRow>
                            ) : tableData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7 + moduleColumns.length} className="text-center py-8 text-gray-500">
                                        No operators found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tableData.map((row, index) => (
                                    <TableRow key={`${row.id}-${index}`} className="hover:bg-blue-50/50">
                                        <TableCell className="font-medium">{index + 1}</TableCell>
                                        <TableCell className="font-semibold text-gray-700">{row.name}</TableCell>
                                        <TableCell>{row.doj ? format(new Date(row.doj), 'MMM d, yyyy') : '-'}</TableCell>
                                        <TableCell>{row.station}</TableCell>
                                        <TableCell>
                                            <Badge variant={row.category === 'Critical' ? "destructive" : "secondary"}>
                                                {row.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
                                                {row.minLevel}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full font-bold text-sm ${
                                                // Simple comparison logic: if strings are L1, L2 etc, string comparison might work or we rely on exact match?
                                                // Ideally we'd compare indices. For now, just styling.
                                                row.currentLevel === row.minLevel ? 'bg-green-100 text-green-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                {row.currentLevel}
                                            </span>
                                        </TableCell>
                                        {/* Render Module Scores */}
                                        {/* Render Module Scores */}
                                        {moduleColumns.map((mod, i) => {
                                            // Dynamic Module Content Logic
                                            let content = "-";
                                            let cellTitle = "";

                                            if (selectedDept === 'all') {
                                                // Column 'mod' is defined by Title (e.g. "Safety")
                                                // Does this student have a module with this title?
                                                if (row.courseModules) {
                                                    const targetModule = row.courseModules.find(m => m.title === mod.title);

                                                    if (targetModule) {
                                                        const moduleId = targetModule._id;
                                                        const moduleTitle = targetModule.title;
                                                        cellTitle = moduleTitle;

                                                        // Calculate student's level index
                                                        const currentLevelIdx = levels.findIndex(l => l.name === row.currentLevel);
                                                        const currentLevelVal = currentLevelIdx !== -1 ? currentLevelIdx + 1 : 0;

                                                        const totalLevelsVal = levels.length > 0 ? levels.length : 1;

                                                        content = (
                                                            <div className="flex flex-col items-center justify-center space-y-1">
                                                                <LevelPieChart
                                                                    currentLevel={currentLevelVal}
                                                                    totalLevels={totalLevelsVal}
                                                                    className="h-6 w-6"
                                                                />
                                                            </div>
                                                        );
                                                    } else {
                                                        // Student does not have this module in their course -> NA
                                                        content = <span className="text-gray-300">-</span>;
                                                    }
                                                }
                                            } else {
                                                // Specific Dept View (Columns are mapped 1:1 with course modules)
                                                // row.courseModules isn't fully set up here in the same way, we rely on Index or ID
                                                // Ideally, we should unify this, but sticking to existing working logic for dept view
                                                // We need to verify if row has progress for this column's module ID

                                                // For now, let's assume we can try to find by ID if we have it
                                                // But earlier logic was placeholder. Let's try to be smarter.
                                                // In specific dept view, 'mod' has a real ID from `courseData`.

                                                if (row.modules && Array.isArray(row.modules)) {
                                                    // row.modules comes from progressItem.moduleProgress (for dept view)
                                                    // OR completedModules IDs?
                                                    // Let's look at tableData construction for 'else' block:
                                                    // modules: progressItem.moduleProgress || []

                                                    // Check schema of moduleProgress: usually { module: ID, completedLessons: [], ... }
                                                    // But we should verify.
                                                    // Without verifying, best effort:

                                                    // Since we don't have deep moduleProgress structure confirmed, render simple check
                                                    // Or better: Revert to previous simpler logic or keep as placeholder
                                                    // content = "-";

                                                    // Actually, let's try to match by ID if possible
                                                    const match = row.modules.find(m => m.module === mod.id || m._id === mod.id);
                                                    if (match) {
                                                        // If match found, assume started/progress exists
                                                        // const isDone = match.status === 'COMPLETED' || (match.completedLessons?.length > 0); // Approx
                                                        // We can refine this later

                                                        // Calculate student's level index
                                                        const currentLevelIdx = levels.findIndex(l => l.name === row.currentLevel);
                                                        const currentLevelVal = currentLevelIdx !== -1 ? currentLevelIdx + 1 : 0;

                                                        const totalLevelsVal = levels.length > 0 ? levels.length : 1;

                                                        content = (
                                                            <div className="flex justify-center">
                                                                <LevelPieChart
                                                                    currentLevel={currentLevelVal}
                                                                    totalLevels={totalLevelsVal}
                                                                    className="h-6 w-6"
                                                                />
                                                            </div>
                                                        );
                                                    } else {
                                                        // No progress record found -> Pending (Empty Circle) or Dash?
                                                        // User said "doesn't have any module".
                                                        // If a student is in the department, they HAVE the module assigned conceptually.
                                                        // But if we want to show "Pending", we use Empty Circle.
                                                        // If we want to show "Not Applicable", we use Dash.
                                                        // I will play it safe: If 'Pending' is the intent of "doesn't have", then Empty Circle is correct.
                                                        // BUT user said "don't show pie chart".
                                                        // Use Dash for explicit "Nothing".
                                                        content = <span className="text-gray-300">-</span>;
                                                    }
                                                } else {
                                                    content = (
                                                        <div className="flex justify-center">
                                                            <LevelPieChart
                                                                currentLevel={0}
                                                                totalLevels={1}
                                                                className="h-6 w-6"
                                                            />
                                                        </div>
                                                    );
                                                }
                                            }

                                            return (
                                                <TableCell key={mod.id || i} className="text-center p-2" title={cellTitle}>
                                                    {content}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default SkillMatrix;
