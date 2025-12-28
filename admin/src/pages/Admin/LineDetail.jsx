import React, { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { IconPrinter } from "@tabler/icons-react";
import { useGetAllInstructorsQuery, useGetAllStudentsQuery } from '@/Redux/AllApi/InstructorApi';
import { useGetAllDepartmentsProgressQuery, useGetDepartmentByIdQuery } from '@/Redux/AllApi/DepartmentApi';
import { useGetLinesByDepartmentQuery } from '@/Redux/AllApi/LineApi';
import { useGetActiveConfigQuery } from '@/Redux/AllApi/CourseLevelConfigApi';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { IconLoader } from "@tabler/icons-react";

const LineDetail = () => {
    const { departmentId, lineId } = useParams();
    const componentRef = useRef();

    // Fetch real data with department filter
    const { data: instructorsData, isLoading: isLoadingInstructors } = useGetAllInstructorsQuery({ limit: 1000, departmentId });
    const { data: studentsData, isLoading: isLoadingStudents } = useGetAllStudentsQuery({ limit: 1000, departmentId });
    const { data: allProgressData, isLoading: isLoadingProgress } = useGetAllDepartmentsProgressQuery();

    // Fetch Department and Line Details for Header
    const { data: departmentData } = useGetDepartmentByIdQuery(departmentId);
    const { data: linesData } = useGetLinesByDepartmentQuery(departmentId);

    const departmentName = departmentData?.data?.name || departmentId;
    const currentLine = linesData?.data?.find(l => l._id === lineId);
    const lineName = currentLine?.name || lineId;

    // Fetch active level configuration
    const { data: levelConfigData } = useGetActiveConfigQuery();
    const levelConfig = levelConfigData?.data;
    const availableLevels = levelConfig?.levels || [
        { name: "L1", color: "#3B82F6" },
        { name: "L2", color: "#F97316" },
        { name: "L3", color: "#10B981" },
        { name: "L4", color: "#8B5CF6" },
        { name: "L5", color: "#EC4899" }, // Default fallback
    ];

    const [matrixEntries, setMatrixEntries] = useState([]);

    // Mock stations data...
    const mockStations = [
        { name: "Team Leader", critical: "-", min: "L-4", curr: "L-4" },
        { name: "Station 1", critical: "Non Critical", min: "L-1", curr: "L-1" },
        { name: "Station 2", critical: "Critical", min: "L-2", curr: "L-1" },
        { name: "Station 3", critical: "Critical", min: "L-2", curr: "L-1" },
        { name: "Final Inspection", critical: "Critical", min: "L-2", curr: "L-1" },
    ];

    useEffect(() => {
        if (instructorsData?.data || studentsData?.data) {
            const instructors = instructorsData?.data?.users || [];
            const students = studentsData?.data?.users || [];

            // Combine: Instructors first, then Students
            // Backend already filters by departmentId, so we just check lightly or trust it.
            // But strict filtering client-side acts as double-safety if cached data is used.
            // Using the robust check from before or just trusting data:

            const allUsers = [
                ...instructors.map(i => ({ ...i, type: 'TNR', level: 'L-5' })),
                ...students.map(s => ({ ...s, type: 'EMP', level: 'L-1' }))
            ];

            // Filter users belonging to the current department
            // We apply strict client-side filtering to ensure accuracy even if backend filtering is broad
            const combinedUsers = allUsers.filter(user => {
                const getIds = (field) => {
                    if (!field) return [];
                    if (Array.isArray(field)) return field.map(item => (item?._id || item)?.toString());
                    return [(field?._id || field)?.toString()];
                };

                const userDeptIds = [
                    ...getIds(user.departments), // Handle array 
                    ...getIds(user.department)   // Handle single 
                ];

                return userDeptIds.includes(departmentId);
            });

            // Map to matrix format
            const mappedData = combinedUsers.length > 0 ? combinedUsers.map((user, index) => {
                const stationPattern = mockStations[index % mockStations.length];

                let initialStationName = stationPattern.name;
                let initialCritical = stationPattern.critical;

                if (user.type === 'TNR') {
                    initialStationName = "Team Leader";
                    initialCritical = "Not Applicable";
                }

                const stationWithLevel = {
                    ...stationPattern,
                    name: initialStationName,
                    critical: initialCritical,
                    curr: user.level,
                };

                let displayDepartment = "-";
                if (user.departments && user.departments.length > 0) {
                    displayDepartment = user.departments.map(d => d.name).join(" + ");
                } else if (user.department?.name) {
                    displayDepartment = user.department.name;
                }

                return {
                    srNo: index + 1,
                    name: user.fullName || "Unknown",
                    department: displayDepartment,
                    type: user.type,
                    detCas: "",
                    doj: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : "-",
                    stations: [stationWithLevel]
                };
            }) : [];

            if (combinedUsers.length > 0) {
                setMatrixEntries(mappedData);
            }
        }
    }, [instructorsData, studentsData, isLoadingInstructors, isLoadingStudents, allProgressData]);

    const handleStationNameChange = (index, value) => {
        const updatedEntries = [...matrixEntries];
        updatedEntries[index].stations[0].name = value;
        setMatrixEntries(updatedEntries);
    };

    const handleLevelChange = (index, newLevel) => {
        const updatedEntries = [...matrixEntries];
        updatedEntries[index].stations[0].curr = newLevel;
        setMatrixEntries(updatedEntries);
    };

    const handleDetCasChange = (index, value) => {
        const updatedEntries = [...matrixEntries];
        updatedEntries[index].detCas = value;
        setMatrixEntries(updatedEntries);
    };

    const handleCriticalityChange = (index, value) => {
        const updatedEntries = [...matrixEntries];
        updatedEntries[index].stations[0].critical = value;
        setMatrixEntries(updatedEntries);
    };

    const [headerInfo, setHeaderInfo] = useState({
        formatNo: "F-HRM-03-001",
        revNo: "8",
        revDate: "03-06-2025",
        pageNo: "1"
    });

    const handleHeaderInfoChange = (field, value) => {
        setHeaderInfo(prev => ({ ...prev, [field]: value }));
    };

    const handlePrint = () => {
        window.print();
    };

    const uniqueStations = [...new Set(
        matrixEntries.map(entry => entry.stations[0].name)
            .filter(name => name && name.trim() !== "" && name !== "Team Leader")
    )];

    const parseLevel = (levelStr) => {
        if (!levelStr) return 0;
        const num = parseInt(levelStr.replace(/\D/g, ''));
        return isNaN(num) ? 0 : num;
    };

    // SVG Icon Component - 5 Slice Pie Chart (Same as SkillMatrix)
    const SkillIcon = ({ level, size = 24 }) => {
        const center = size / 2;
        const radius = size / 2.2;
        const createSlicePath = (startAngle, endAngle) => {
            const startRad = (startAngle - 90) * Math.PI / 180;
            const endRad = (endAngle - 90) * Math.PI / 180;
            const x1 = center + radius * Math.cos(startRad);
            const y1 = center + radius * Math.sin(startRad);
            const x2 = center + radius * Math.cos(endRad);
            const y2 = center + radius * Math.sin(endRad);
            return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
        };
        const slices = [
            createSlicePath(0, 72),
            createSlicePath(72, 144),
            createSlicePath(144, 216),
            createSlicePath(216, 288),
            createSlicePath(288, 360)
        ];
        return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {slices.map((d, i) => (
                    <path key={`bg-${i}`} d={d} fill="none" stroke="black" strokeWidth="0.5" />
                ))}
                {slices.map((d, i) => {
                    if (i < level) {
                        return <path key={`fill-${i}`} d={d} fill="black" stroke="black" strokeWidth="0.5" />;
                    }
                    return null;
                })}
                <circle cx={center} cy={center} r={radius} fill="none" stroke="black" strokeWidth="1" />
            </svg>
        );
    };

    if (isLoadingInstructors || isLoadingStudents) {
        return <div className="flex justify-center items-center h-screen"><IconLoader className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <style>
                {`
          @media print {
            @page { size: landscape; margin: 10mm; }
            body * { visibility: hidden; }
            #printable-matrix, #printable-matrix * { visibility: visible; }
            #printable-matrix { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            input { border: none !important; background: transparent !important; }
            .select-trigger { border: none !important; padding: 0 !important; height: auto !important; }
          }
        `}
            </style>

            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm no-print border">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Line Detail Matrix</h1>
                    <p className="text-sm text-gray-500">Department: {departmentName} | Line: {lineName}</p>
                </div>
                <Button variant="outline" className="gap-2" onClick={handlePrint}>
                    <IconPrinter className="w-4 h-4" />
                    Print Matrix
                </Button>
            </div>

            <div id="printable-matrix" className="bg-white text-xs text-black border-2 border-black">
                {/* Header Section - Same as Skill Matrix */}
                <div className="flex border-b border-black">
                    <div className="w-[150px] border-r border-black p-2 flex items-center justify-center">
                        <img src="/motherson+marelli.png" alt="Logo" className="h-10" />
                        <div className="flex flex-col ml-2">
                            <span className="font-bold text-xs text-red-600">motherson</span>
                            <span className="font-bold text-xs text-blue-600">MARELLI</span>
                        </div>
                    </div>
                    <div className="flex-1 border-r border-black flex items-center justify-center">
                        <h1 className="text-2xl font-bold">Skill Matrix - {lineName}</h1>
                    </div>
                    <div className="w-[200px] text-[10px]">
                        {['Format no.', 'Rev.No.', 'Rev. Date', 'Page No.'].map((label, idx) => (
                            <div key={idx} className="flex border-b border-black last:border-b-0">
                                <div className="w-20 border-r border-black p-1 font-semibold">{label}</div>
                                <div className="flex-1 p-0 text-center">
                                    <input
                                        type="text"
                                        className="w-full h-full text-center bg-transparent border-none focus:ring-0 p-1 font-medium"
                                        value={Object.values(headerInfo)[idx]}
                                        onChange={(e) => handleHeaderInfoChange(Object.keys(headerInfo)[idx], e.target.value)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Table Header */}
                <div className="flex border-b border-black text-[10px] font-bold bg-gray-200 text-center">
                    <div className="w-8 border-r border-black p-2 flex items-center justify-center">Sr.No.</div>
                    <div className="w-32 border-r border-black p-2 flex items-center justify-center">OPERATOR NAME</div>
                    <div className="w-24 border-r border-black p-2 flex items-center justify-center">DEPARTMENT</div>
                    <div className="w-12 border-r border-black p-2 flex items-center justify-center">TNR/EMP</div>
                    <div className="w-16 border-r border-black p-2 flex items-center justify-center">DET/CAS</div>
                    <div className="w-20 border-r border-black p-2 flex items-center justify-center">DOJ</div>

                    <div className="flex-1 flex">
                        <div className="w-56 border-r border-black flex flex-col">
                            <div className="border-b border-black p-1 h-8 flex items-center justify-center">Station / Machine Name</div>
                            <div className="flex-1 flex">
                                <div className="flex-1 p-1 flex items-center justify-center border-r border-black">Station / Machine Name</div>
                                <div className="w-20 p-1 flex items-center justify-center">Critical & Non Critical</div>
                            </div>
                        </div>
                        <div className="w-12 border-r border-black p-1 flex items-center justify-center">Minimum Skill Level Required</div>
                        <div className="w-12 border-r border-black p-1 flex items-center justify-center">Current Skill Level</div>

                        {uniqueStations.map((stationName, idx) => (
                            <div key={idx} className="w-16 border-r border-black p-1 flex items-center justify-center break-words text-[9px] leading-tight">
                                {stationName}
                            </div>
                        ))}
                        <div className="w-16 p-1 flex items-center justify-center">EOSH & EnMS</div>
                    </div>
                </div>

                {/* Data Rows */}
                {matrixEntries.map((row, idx) => (
                    <div key={idx} className="flex border-b border-black text-[10px] text-center min-h-[50px]">
                        <div className="w-8 border-r border-black p-2 flex items-center justify-center font-bold">{row.srNo}</div>
                        <div className="w-32 border-r border-black p-2 flex items-center justify-start font-bold text-left">{row.name}</div>
                        <div className="w-24 border-r border-black p-2 flex items-center justify-center font-bold">{row.department}</div>
                        <div className="w-12 border-r border-black p-2 flex items-center justify-center font-bold">{row.type}</div>
                        <div className="w-16 border-r border-black p-2 flex items-center justify-center font-bold">
                            <input
                                type="text"
                                className="w-full h-full text-center bg-transparent border-none focus:ring-0 p-0 text-[10px] font-bold"
                                value={row.detCas}
                                onChange={(e) => handleDetCasChange(idx, e.target.value)}
                            />
                        </div>
                        <div className="w-20 border-r border-black p-2 flex items-center justify-center font-bold">{row.doj}</div>

                        <div className="flex-1 flex">
                            <div className="w-56 border-r border-black flex">
                                <div className="flex-1 border-r border-black flex items-center justify-center font-bold text-xs p-1">
                                    {row.type === 'TNR' ? (
                                        <span>{row.stations[0].name}</span>
                                    ) : (
                                        <input
                                            type="text"
                                            className="w-full h-full text-center bg-transparent border-none focus:ring-0 p-0 text-xs font-bold whitespace-normal"
                                            value={row.stations[0].name}
                                            onChange={(e) => handleStationNameChange(idx, e.target.value)}
                                            placeholder="Enter Station..."
                                        />
                                    )}
                                </div>
                                <div className="w-20 p-1 flex items-center justify-center font-bold border-black">
                                    {row.type === 'TNR' ? (
                                        <span className="text-[9px]">Not Applicable</span>
                                    ) : (
                                        <Select
                                            value={row.stations[0].critical}
                                            onValueChange={(val) => handleCriticalityChange(idx, val)}
                                        >
                                            <SelectTrigger className="w-full h-full border-none p-0 flex justify-center bg-transparent focus:ring-0 select-trigger text-[9px] font-bold">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Critical">Critical</SelectItem>
                                                <SelectItem value="Non-Critical">Non-Critical</SelectItem>
                                                <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>
                            <div className="w-12 border-r border-black p-2 flex items-center justify-center font-bold">{row.stations[0].min}</div>
                            <div className="w-12 border-r border-black p-2 flex items-center justify-center font-bold">{row.stations[0].curr}</div>

                            {uniqueStations.map((stationName, sIdx) => {
                                const isAssignedStation = row.stations[0].name === stationName;
                                const currentLevelStr = row.stations[0].curr || "L-0";
                                const level = parseLevel(currentLevelStr);

                                return (
                                    <div key={sIdx} className="w-16 border-r border-black p-1 flex items-center justify-center">
                                        {isAssignedStation ? (
                                            <Select
                                                value={currentLevelStr}
                                                onValueChange={(val) => handleLevelChange(idx, val)}
                                            >
                                                <SelectTrigger className="w-full h-full border-none p-0 flex justify-center bg-transparent focus:ring-0 select-trigger">
                                                    <SelectValue>
                                                        {level > 0 && <SkillIcon level={level} size={20} />}
                                                    </SelectValue>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableLevels.map((lvl) => (
                                                        <SelectItem key={lvl.name} value={lvl.name}>
                                                            <div className="flex items-center gap-2">
                                                                <SkillIcon level={parseLevel(lvl.name)} size={16} />
                                                                <span>{lvl.name}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="w-full h-full"></div>
                                        )}
                                    </div>
                                );
                            })}
                            <div className="w-16 p-2 flex items-center justify-center">
                                <SkillIcon level={1} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LineDetail;
