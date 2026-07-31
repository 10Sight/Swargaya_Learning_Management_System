import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { IconPrinter, IconLoader, IconDeviceFloppy, IconDownload } from "@tabler/icons-react";
import { useGetMyDepartmentsQuery } from '@/Redux/AllApi/DepartmentApi';
import { useGetLinesByDepartmentQuery } from '@/Redux/AllApi/LineApi';
import { useGetMachinesByLineQuery } from '@/Redux/AllApi/MachineApi';
import { useGetActiveConfigQuery } from '@/Redux/AllApi/CourseLevelConfigApi';
import { useGetSkillMatrixQuery, useSaveSkillMatrixMutation } from '@/Redux/AllApi/SkillMatrixApi';
import { toast } from "sonner";
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";

const InstructorSkillMatrix = () => {
    const componentRef = useRef();
    const [selectedDepartment, setSelectedDepartment] = useState("");
    const [selectedLine, setSelectedLine] = useState("");

    // --- Saved Data Fetching ---
    const { data: savedMatrixData, refetch: refetchMatrix } = useGetSkillMatrixQuery({
        departmentId: selectedDepartment,
        lineId: selectedLine
    }, {
        skip: !selectedDepartment || !selectedLine || selectedDepartment === "undefined" || selectedLine === "undefined"
    });

    const [saveSkillMatrix, { isLoading: isSaving }] = useSaveSkillMatrixMutation();

    // --- Data Fetching ---

    // 1. Departments for Dropdown
    const { data: departmentsData, isLoading: isDeptLoading } = useGetMyDepartmentsQuery();

    // 2. Lines for Dropdown (Dependent on Department)
    const { data: linesData, isLoading: isLinesLoading } = useGetLinesByDepartmentQuery(selectedDepartment, {
        skip: !selectedDepartment
    });

    // 3. Machines for Table Columns (Dependent on Line)
    const { data: machinesData, isLoading: isMachinesLoading } = useGetMachinesByLineQuery(selectedLine, {
        skip: !selectedLine || selectedLine === "undefined"
    });

    // 4. Users (Instructors & Students) - Filtered by Department client-side or assume API supports it
    // Note: The existing APIs fetch all used here, we filter client-side.
    // 4. Users (Instructors & Students) - Derived directly from Department Data
    // We no longer fetch all users globally to avoid performance issues and stale data filtering.

    // 5. Config
    const { data: levelConfigData } = useGetActiveConfigQuery();
    const levelConfig = levelConfigData?.data;
    const availableLevels = levelConfig?.levels || [
        { name: "L1", color: "#3B82F6" },
        { name: "L2", color: "#F97316" },
        { name: "L3", color: "#10B981" },
        { name: "L4", color: "#8B5CF6" },
        { name: "L5", color: "#EC4899" },
    ];

    const [matrixEntries, setMatrixEntries] = useState([]);

    // Memoize Department Users for Dropdown and Initial Population
    const departmentUsers = React.useMemo(() => {
        if (!selectedDepartment || !departmentsData?.data?.departments) return [];

        const selectedDept = departmentsData.data.departments.find(d => String(d.id || d._id) === String(selectedDepartment));
        if (!selectedDept) return [];

        const users = [];

        // Add Instructor (TNR)
        // Access nested properties if needed, usually passed as object
        // Add Instructors (TNR)
        if (selectedDept.instructors && Array.isArray(selectedDept.instructors)) {
            selectedDept.instructors.forEach(inst => {
                users.push({
                    ...inst,
                    type: 'TNR',
                    level: 'L5'
                });
            });
        } else if (selectedDept.instructor && typeof selectedDept.instructor === 'object') {
            // Fallback for legacy single instructor
            users.push({
                ...selectedDept.instructor,
                type: 'TNR',
                level: 'L5'
            });
        }

        // Add Students (EMP)
        if (selectedDept.students && Array.isArray(selectedDept.students)) {
            selectedDept.students.forEach(student => {
                // Ensure we handle partial objects properly if needed
                users.push({
                    ...student,
                    type: 'EMP',
                    level: 'L1'
                });
            });
        }

        return users;
    }, [selectedDepartment, departmentsData]);

    // Filtered Users for the selected line
    const lineAssignedUsers = React.useMemo(() => {
        if (!selectedLine || selectedLine === "undefined" || !machinesData?.data) {
            return departmentUsers;
        }

        const assignedIds = new Set();
        machinesData.data.forEach(machine => {
            if (machine.operators && Array.isArray(machine.operators)) {
                machine.operators.forEach(op => {
                    assignedIds.add(String(op.id || op._id));
                });
            }
        });

        return departmentUsers.filter(user => {
            if (user.type === 'TNR') return true;
            return assignedIds.has(String(user._id));
        });
    }, [selectedLine, machinesData, departmentUsers]);

    // Initialize Matrix on Line Selection (Merge Logic)
    useEffect(() => {
        if (selectedLine && machinesData?.data) {
            const activeMachines = machinesData.data;
            const savedEntries = savedMatrixData?.data?.entries || [];

            const nonCriticalMin = availableLevels[1]?.name || "L2";
            const criticalMin = availableLevels[2]?.name || "L3";

            // 1. Map Current Line Assigned Users (The Source of Truth for *Who* is here)
            const mappedData = lineAssignedUsers.map((user, index) => {
                // Check if we have saved data for this user
                const savedUserEntry = savedEntries.find(e => e.userId === user._id);

                // Default stations (New User) — Non-Critical by default
                const defaultStations = activeMachines.map(machine => ({
                    _id: machine.id || machine._id,
                    name: machine.name,
                    critical: "Non-Critical",
                    min: nonCriticalMin,
                    curr: user.level,
                }));

                // Merged Stations (Existing User)
                // We map over ACTIVE machines to ensure if a machine was removed, it's gone,
                // and if added, it appears (with default)
                const mergedStations = activeMachines.map(machine => {
                    const savedStation = savedUserEntry?.stations?.find(s => s.machineId === (machine.id || machine._id));
                    const critical = savedStation?.critical || "Non-Critical";
                    const minFallback = critical === "Critical" ? criticalMin : nonCriticalMin;
                    return {
                        _id: machine.id || machine._id,
                        name: machine.name,
                        critical,
                        min: savedStation?.min || minFallback,
                        curr: savedStation?.curr || user.level, // Prefer saved level, fallback to user default
                    };
                });

                let displayDepartment = "-";
                if (user.departments && user.departments.length > 0) {
                    displayDepartment = user.departments.map(d => d.name).join(" + ");
                } else if (user.department?.name) {
                    displayDepartment = user.department.name;
                }

                // Assigned Stations — restore saved assignments (supporting the legacy
                // single-value format), otherwise default to whichever machines this
                // user is actually listed as an operator on.
                let assignedStationIds;
                if (Array.isArray(savedUserEntry?.assignedStationIds)) {
                    assignedStationIds = savedUserEntry.assignedStationIds.map(String);
                } else if (savedUserEntry?.assignedStationId) {
                    assignedStationIds = [String(savedUserEntry.assignedStationId)];
                } else {
                    assignedStationIds = activeMachines
                        .filter(machine => Array.isArray(machine.operators) && machine.operators.some(op => String(op.id ?? op._id) === String(user._id)))
                        .map(machine => String(machine.id ?? machine._id));
                }

                return {
                    srNo: index + 1,
                    _id: user._id,
                    username: (user.userName || "-").toUpperCase(),
                    education: user.education || "-",
                    name: user.fullName || "Unknown",
                    department: displayDepartment,
                    type: user.type,
                    detCas: savedUserEntry?.detCas || "",
                    doj: user.doj ? new Date(user.doj).toLocaleDateString('en-GB') : (user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : "-"),
                    assignedStationIds,
                    stations: savedUserEntry ? mergedStations : defaultStations,
                    isManual: false
                };
            }).filter(Boolean);

            // 2. Add Manual Rows (Data that exists in Saved but not in Current Users, marked isManual)
            const manualRows = savedEntries.filter(e => e.isManual).map((entry, idx) => {
                // Re-map stations to current active machines
                const mergedStations = activeMachines.map(machine => {
                    const savedStation = entry.stations?.find(s => s.machineId === (machine.id || machine._id));
                    const critical = savedStation?.critical || "Non-Critical";
                    const minFallback = critical === "Critical" ? criticalMin : nonCriticalMin;
                    return {
                        _id: machine.id || machine._id,
                        name: machine.name,
                        critical,
                        min: savedStation?.min || minFallback,
                        curr: savedStation?.curr || "L0",
                    };
                });

                const assignedStationIds = Array.isArray(entry.assignedStationIds)
                    ? entry.assignedStationIds.map(String)
                    : (entry.assignedStationId ? [String(entry.assignedStationId)] : []);

                return {
                    ...entry,
                    srNo: mappedData.length + idx + 1,
                    assignedStationIds,
                    stations: mergedStations
                };
            });

            setMatrixEntries([...mappedData, ...manualRows]);

            // Update Header/Footer from Saved Data if available
            if (savedMatrixData?.data?.headerInfo) {
                setHeaderInfo(savedMatrixData.data.headerInfo);
            }
            if (savedMatrixData?.data?.footerInfo) {
                if (savedMatrixData.data.footerInfo.guidelines) setGuidelines(savedMatrixData.data.footerInfo.guidelines);
                if (savedMatrixData.data.footerInfo.legendNote) setLegendNote(savedMatrixData.data.footerInfo.legendNote);
                if (savedMatrixData.data.footerInfo.revisions) setRevisions(savedMatrixData.data.footerInfo.revisions);
            }

        } else if (!selectedLine) {
            setMatrixEntries([]);
        }
    }, [selectedLine, machinesData, lineAssignedUsers, savedMatrixData]);

    const handleSave = async () => {
        if (!selectedDepartment || !selectedLine || selectedLine === "undefined" || selectedDepartment === "undefined") {
            toast.error("Please select Department and Line first");
            return;
        }

        try {
            // Transform matrixEntries to match Scheme
            const entriesToSave = matrixEntries.map(entry => ({
                userId: entry.isManual ? null : entry._id,
                manualName: entry.isManual ? entry.name : "",
                isManual: entry.isManual,
                doj: entry.doj,
                assignedStationIds: entry.assignedStationIds || [],
                detCas: entry.detCas,
                stations: entry.stations.map(s => ({
                    machineId: s._id,
                    name: s.name,
                    level: 0, // Not used strictly, relying on curr
                    critical: s.critical,
                    min: s.min,
                    curr: s.curr
                }))
            }));

            const payload = {
                department: selectedDepartment,
                line: selectedLine,
                entries: entriesToSave,
                headerInfo: headerInfo,
                footerInfo: {
                    guidelines,
                    legendNote,
                    revisions
                }
            };

            await saveSkillMatrix(payload).unwrap();
            toast.success("Skill Matrix saved successfully!");
            refetchMatrix();
        } catch (error) {
            console.error("Failed to save matrix:", error);
            toast.error(error?.data?.message || "Failed to save Skill Matrix");
        }
    };


    // --- Handlers ---

    const handleAddRow = () => {
        if (!machinesData?.data) return;
        const activeMachines = machinesData.data;

        const stations = activeMachines.map(machine => ({
            _id: machine.id || machine._id,
            name: machine.name,
            critical: "Non-Critical",
            min: availableLevels[1]?.name || "L2",
            curr: "L1",
        }));

        setMatrixEntries(prev => [
            ...prev,
            {
                srNo: prev.length + 1,
                _id: `manual-${Date.now()}`,
                username: "-",
                education: "-",
                name: "",
                department: "-",
                type: "",
                detCas: "",
                doj: "-",
                assignedStationIds: [],
                stations: stations,
                isManual: true // FLAGGED AS MANUAL / EDITABLE
            }
        ]);
    };

    const handleUserSelect = (rowIdx, userId) => {
        const user = departmentUsers.find(u => u._id === userId);
        if (!user) return;

        const updatedEntries = [...matrixEntries];
        const row = updatedEntries[rowIdx];

        let displayDepartment = "-";
        if (user.departments && user.departments.length > 0) {
            displayDepartment = user.departments.map(d => d.name).join(" + ");
        } else if (user.department?.name) {
            displayDepartment = user.department.name;
        }

        // Default the assignment to whichever machines this user is actually
        // listed as an operator on, so a manually-added row reflects reality.
        const activeMachines = machinesData?.data || [];
        const assignedStationIds = activeMachines
            .filter(machine => Array.isArray(machine.operators) && machine.operators.some(op => String(op.id ?? op._id) === String(user._id)))
            .map(machine => String(machine.id ?? machine._id));

        updatedEntries[rowIdx] = {
            ...row,
            _id: user._id, // Update to real ID
            username: (user.userName || "-").toUpperCase(),
            education: user.education || "-",
            name: user.fullName,
            department: displayDepartment,
            type: user.type,
            doj: user.doj ? new Date(user.doj).toLocaleDateString('en-GB') : (user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : "-"),
            stations: row.stations.map(s => ({ ...s, curr: user.level || 'L1' })), // Reset stations to user level
            assignedStationIds,
            isManual: false // Lock it after selection? Or keep true to allow changing?
            // "operator name have to drop down" implies it might stay a dropdown. 
            // Let's keep isManual true if we want it to remain editable, 
            // OR better: Add a field `isSelector: true`. 
            // Let's set `isManual` to false to "commit" it, but maybe allow re-editing? 
            // For now, commit it so it looks like other rows.
        };
        setMatrixEntries(updatedEntries);
    };

    const handleLevelChange = (rowIdx, stationIdx, newLevel) => {
        const updatedEntries = [...matrixEntries];
        updatedEntries[rowIdx].stations[stationIdx].curr = newLevel;
        setMatrixEntries(updatedEntries);
    };

    const handleMinLevelChange = (rowIdx, stationIdx, newLevel) => {
        const updatedEntries = [...matrixEntries];
        updatedEntries[rowIdx].stations[stationIdx].min = newLevel;
        setMatrixEntries(updatedEntries);
    };

    const handleCriticalityChange = (rowIdx, stationIdx, value) => {
        const autoMin = value === "Critical"
            ? (availableLevels[2]?.name || "L3")
            : (availableLevels[1]?.name || "L2");
        const updatedEntries = [...matrixEntries];
        updatedEntries[rowIdx].stations[stationIdx].critical = value;
        updatedEntries[rowIdx].stations[stationIdx].min = autoMin;
        setMatrixEntries(updatedEntries);
    };

    const handleDetCasChange = (index, value) => {
        const updatedEntries = [...matrixEntries];
        updatedEntries[index].detCas = value;
        setMatrixEntries(updatedEntries);
    };

    const handleAssignedStationsToggle = (rowIdx, stationId, checked) => {
        const updatedEntries = [...matrixEntries];
        const row = updatedEntries[rowIdx];
        // Seed from the currently-displayed (possibly fallback) set so the very
        // first toggle doesn't silently drop the implicit default assignment.
        const current = (row.assignedStationIds && row.assignedStationIds.length > 0)
            ? row.assignedStationIds
            : (row.stations[0] ? [row.stations[0]._id] : []);
        const set = new Set(current.map(String));
        if (checked) {
            set.add(String(stationId));
        } else {
            set.delete(String(stationId));
        }
        updatedEntries[rowIdx] = { ...row, assignedStationIds: Array.from(set) };
        setMatrixEntries(updatedEntries);
    };

    // Header Info State
    const [headerInfo, setHeaderInfo] = useState({
        formatNo: "F-HRM-03-001",
        revNo: "8",
        revDate: "03-06-2025",
        pageNo: "1"
    });

    const handleHeaderInfoChange = (field, value) => {
        setHeaderInfo(prev => ({ ...prev, [field]: value }));
    };

    // Legend Note State
    const [legendNote, setLegendNote] = useState(
        "This is a dynamically generated matrix based on current machine and user assignments."
    );

    // Footer Data State
    const [guidelines, setGuidelines] = useState(
        "1) This Skill Matrix Format aplicable for All department.\n" +
        "2) Minimum Skill Level Required for Working on Line/ Machine as per Guideline of Critical & Non critical operation .(GL/MF01/Training/03)\n" +
        "3) Critical & Non Critical Define as per Guideline of Critical & Non Critical operation.(GL/MF01/Training/03)\n" +
        "4) Level-4 is Minimum skill required for Team leader .\n" +
        "5) Level-1 is Minimum Skill requirement for Machine / Non Critical Station operator.\n" +
        "6) Level-2 is minimum Skill requirement for Inspector , Final Inspector & Rework Station Operator.\n" +
        "7) Level -3 is minimum skill requirement for CTQ station operator & mold changer operator.\n" +
        "8) Skill Matrix updated frequency after 3 month.\n" +
        "9) Skill matrix Checked by Line Supervisor or Shift Incharge.\n" +
        "10) After certify a new commerce operator , the skill matrix has to be updated within the 7 Days.\n" +
        "11)EOSH AND EnMS MINIMUM SKILL REQUIRED IS- L1"
    );

    const [revisions, setRevisions] = useState([
        { date: "05-03-2021", revNo: "4", change: "New comers Skill matrix frequency Added", reason: "customer requirement" },
        { date: "28-07-2022", revNo: "5", change: "Skill Matrix review By Supervisor", reason: "customer requirement" },
        { date: "02-09-2024", revNo: "6", change: "Minimum Skill Level define", reason: "VSA Audit NC" },
        { date: "24-05-2025", revNo: "7", change: "Qualification define", reason: "TRL audit point" },
        { date: "03-06-2025", revNo: "8", change: "EnMS ,EOHS content added", reason: "EnMS & EOHS audit required and skill level symbols change" }
    ]);

    const handleRevisionChange = (index, field, value) => {
        const updatedRevisions = [...revisions];
        updatedRevisions[index][field] = value;
        setRevisions(updatedRevisions);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExport = async () => {
        if (!selectedLine || matrixEntries.length === 0) {
            toast.error("No data to export");
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Skill Matrix');

        // --- Styles ---
        const borderStyle = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        const centerStyle = { vertical: 'middle', horizontal: 'center', wrapText: true };
        const headerFont = { bold: true };

        // --- Header Section ---
        // Validate headerInfo and set defaults if missing
        const hInfo = headerInfo || {};
        const getVal = (val, defaultVal = "-") => val || defaultVal;

        // Custom Header Layout (Approximating the UI)
        worksheet.mergeCells('A1:C4'); // Logo Area
        const logoCell = worksheet.getCell('A1');
        logoCell.value = "10Sight"; // Placeholder for Logo
        logoCell.alignment = centerStyle;
        logoCell.font = { size: 16, bold: true };
        logoCell.border = borderStyle;

        worksheet.mergeCells('D1:Q4'); // Title Area
        const titleCell = worksheet.getCell('D1');
        titleCell.value = `SKILL MATRIX\nLine: ${lineName}\nDepartment: ${selectedDeptName}`;
        titleCell.alignment = centerStyle;
        titleCell.font = { size: 14, bold: true };
        titleCell.border = borderStyle;

        // Header Info (Right Side)
        const addHeaderInfoRow = (row, label, value) => {
            worksheet.mergeCells(`R${row}:S${row}`);
            worksheet.getCell(`R${row}`).value = label;
            worksheet.getCell(`R${row}`).border = borderStyle;
            worksheet.getCell(`R${row}`).font = { bold: true };

            worksheet.mergeCells(`T${row}:U${row}`);
            worksheet.getCell(`T${row}`).value = value;
            worksheet.getCell(`T${row}`).border = borderStyle;
            worksheet.getCell(`T${row}`).alignment = { horizontal: 'center' };
        };

        addHeaderInfoRow(1, "Format No:", getVal(hInfo.formatNo));
        addHeaderInfoRow(2, "Rev. No:", getVal(hInfo.revNo));
        addHeaderInfoRow(3, "Rev. Date:", getVal(hInfo.revDate));
        addHeaderInfoRow(4, "Page No:", getVal(hInfo.pageNo));

        worksheet.addRow([]); // Spacer

        // --- Table Headers ---
        // Row 6: Main Headers
        const headerRowIndex = 6;
        const headers = ["Sr No", "ID", "Name", "Department", "Type", "Emp.id", "Education", "DOJ", "Assigned Station"];

        // Machine Columns
        const machines = machinesData?.data || [];
        machines.forEach(m => headers.push(m.name));

        // Legend Columns
        headers.push("Machine Name", "Criticality", "Min Skill", "Current Skill");

        const headerRow = worksheet.getRow(headerRowIndex);
        headerRow.values = headers;

        headerRow.eachCell((cell) => {
            cell.font = headerFont;
            cell.alignment = centerStyle;
            cell.border = borderStyle;
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
        });

        // --- Data Rows ---
        matrixEntries.forEach((entry, index) => {
            // Resolve the assigned stations the same way the UI does: fall back to the
            // first station so a never-explicitly-assigned row still displays one.
            const assignedIds = (entry.assignedStationIds && entry.assignedStationIds.length > 0)
                ? entry.assignedStationIds.map(String)
                : (entry.stations[0] ? [String(entry.stations[0]._id)] : []);
            const assignedStations = entry.stations.filter(s => assignedIds.includes(String(s._id)));

            const rowData = [
                entry.srNo,
                entry.isManual ? "-" : entry._id, // Hide ID for manual rows if needed, or show manual ID
                entry.name,
                entry.department,
                entry.type,
                entry.username || "-",
                entry.education || "-",
                entry.doj,
                assignedStations.map(s => s.name).join(", ") || "-"
            ];

            // Machine Skills (Icons in UI -> Text in Excel)
            // Only the operator's assigned station(s) show a skill level; TNR rows show all.
            machines.forEach((machine) => {
                const machineId = machine.id || machine._id;
                const isAssigned = entry.type === 'TNR' || assignedIds.includes(String(machineId));
                if (!isAssigned) {
                    rowData.push("");
                    return;
                }
                const station = entry.stations.find(s => s._id === machineId);
                // In UI it shows icon. In Excel we can show Level No (e.g. 4)
                if (station) {
                    const levelNum = station.curr ? parseInt(station.curr.replace('L', '').split('-')[0]) || 0 : 0;
                    rowData.push(levelNum > 0 ? `L${levelNum}` : "");
                } else {
                    rowData.push("-");
                }
            });

            // Assigned Station Details (Legend Columns) — one line per assigned station.
            // In the UI these are inputs/selects.
            rowData.push(
                assignedStations.map(s => s.name).join("\n") || "-",
                assignedStations.map(s => s.critical || "-").join("\n") || "-",
                assignedStations.map(s => s.min || "-").join("\n") || "-",
                assignedStations.map(s => s.curr || "-").join("\n") || "-"
            );

            const currentRow = worksheet.addRow(rowData);
            currentRow.eachCell((cell) => {
                cell.border = borderStyle;
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            });
        });

        worksheet.addRow([]); // Spacer

        // --- Footer Sections ---
        const footerStartRow = worksheet.rowCount + 2;

        // Guidelines
        worksheet.mergeCells(`A${footerStartRow}:J${footerStartRow + 6}`);
        const guidelineCell = worksheet.getCell(`A${footerStartRow}`);
        guidelineCell.value = "NOTES / GUIDELINE:\n" + (guidelines || "");
        guidelineCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        guidelineCell.border = borderStyle;

        // Legend Note
        worksheet.mergeCells(`K${footerStartRow}:M${footerStartRow + 6}`);
        const legendCell = worksheet.getCell(`K${footerStartRow}`);
        const legendLines = availableLevels.map(lvl => `${lvl.name}: ${lvl.description || ""}`).join("\n");
        legendCell.value = "LEVEL LEGEND:\n" +
            legendLines + "\n\nNote: " + (legendNote || "-");
        legendCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        legendCell.border = borderStyle;

        // Revision History
        // Simple table for revision history
        worksheet.mergeCells(`N${footerStartRow}:U${footerStartRow}`);
        const revTitle = worksheet.getCell(`N${footerStartRow}`);
        revTitle.value = "REVISION HISTORY";
        revTitle.font = { bold: true };
        revTitle.alignment = centerStyle;
        revTitle.border = borderStyle;

        const revHeaders = ["Rev Date", "Rev No", "What Change", "Why Change"];
        // We'll put headers in next row, but merged cells make it tricky.
        // Let's simplified: List revisions below title
        let revRowIdx = footerStartRow + 1;

        // Headers
        worksheet.getCell(`N${revRowIdx}`).value = "Date";
        worksheet.getCell(`O${revRowIdx}`).value = "No";
        worksheet.mergeCells(`P${revRowIdx}:R${revRowIdx}`); worksheet.getCell(`P${revRowIdx}`).value = "Change";
        worksheet.mergeCells(`S${revRowIdx}:U${revRowIdx}`); worksheet.getCell(`S${revRowIdx}`).value = "Reason";

        // Style Headers
        [`N${revRowIdx}`, `O${revRowIdx}`, `P${revRowIdx}`, `S${revRowIdx}`].forEach(ref => {
            const c = worksheet.getCell(ref);
            c.font = { bold: true };
            c.border = borderStyle;
            c.alignment = centerStyle;
        });

        revRowIdx++;

        (revisions || []).forEach(rev => {
            if (revRowIdx > footerStartRow + 6) return; // Limit rows
            worksheet.getCell(`N${revRowIdx}`).value = rev.date;
            worksheet.getCell(`O${revRowIdx}`).value = rev.revNo;

            worksheet.mergeCells(`P${revRowIdx}:R${revRowIdx}`);
            worksheet.getCell(`P${revRowIdx}`).value = rev.change;

            worksheet.mergeCells(`S${revRowIdx}:U${revRowIdx}`);
            worksheet.getCell(`S${revRowIdx}`).value = rev.reason;

            [`N${revRowIdx}`, `O${revRowIdx}`, `P${revRowIdx}`, `S${revRowIdx}`].forEach(ref => {
                const c = worksheet.getCell(ref);
                c.border = borderStyle;
                c.alignment = centerStyle;
            });
            revRowIdx++;
        });


        // --- Signatures ---
        const sigRow = worksheet.rowCount + 2;
        worksheet.mergeCells(`A${sigRow}:G${sigRow}`);
        worksheet.getCell(`A${sigRow}`).value = "Prepared By";
        worksheet.getCell(`A${sigRow}`).border = borderStyle;

        worksheet.mergeCells(`H${sigRow}:N${sigRow}`);
        worksheet.getCell(`H${sigRow}`).value = "Checked By";
        worksheet.getCell(`H${sigRow}`).border = borderStyle;

        worksheet.mergeCells(`O${sigRow}:U${sigRow}`);
        worksheet.getCell(`O${sigRow}`).value = "Approved By";
        worksheet.getCell(`O${sigRow}`).border = borderStyle;

        const sigValRow = sigRow + 1;
        worksheet.mergeCells(`A${sigValRow}:G${sigValRow + 2}`);
        worksheet.getCell(`A${sigValRow}`).border = borderStyle;

        worksheet.mergeCells(`H${sigValRow}:N${sigValRow + 2}`);
        worksheet.getCell(`H${sigValRow}`).border = borderStyle;

        worksheet.mergeCells(`O${sigValRow}:U${sigValRow + 2}`);
        worksheet.getCell(`O${sigValRow}`).border = borderStyle;


        // Set column widths
        worksheet.columns.forEach(column => {
            column.width = 15;
        });

        // Generate file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `SkillMatrix_${selectedDeptName}_${lineName}.xlsx`);
    };

    const parseLevel = (levelStr) => {
        if (!levelStr) return 0;
        const idx = availableLevels.findIndex(l => l.name === levelStr);
        if (idx !== -1) return idx;
        const num = parseInt(levelStr.replace(/\D/g, ''));
        return isNaN(num) ? 0 : Math.max(0, num - 1);
    };

    // SVG Icon Component
    const SkillIcon = ({ level, size = 24 }) => {
        const totalSlices = Math.max(1, availableLevels.length - 1);
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
        const sliceAngle = 360 / totalSlices;
        const slices = Array.from({ length: totalSlices }, (_, i) =>
            createSlicePath(i * sliceAngle, (i + 1) * sliceAngle)
        );
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

    const selectedDeptName = departmentsData?.data?.departments?.find(d => String(d._id) === String(selectedDepartment))?.name || "Select Department";
    const selectedLineDetail = linesData?.data?.find(l => String(l.id || l._id) === String(selectedLine));
    const lineName = selectedLineDetail?.name || "Select Line";

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
            /* Hide select carets/borders in print */
            .select-trigger { border: none !important; outline: none !important; box-shadow: none !important; background: transparent !important; }
            textarea { border: none !important; resize: none !important; }
            input { border: none !important; background: transparent !important; }
          }
            .select-trigger { border: none !important; padding: 0 !important; height: auto !important; }
          }
        `}
            </style>

            {/* Selection Header (No Print) */}
            <div className="no-print bg-white p-4 rounded-lg shadow-sm border space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-[#1f2937]">Skill Matrix Generator</h1>
                        <p className="text-sm text-[#6b7280]">Select Department and Line to generate matrix</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4">
                    <div className="w-[250px]">
                        <Select value={selectedDepartment} onValueChange={(val) => { setSelectedDepartment(val); setSelectedLine(""); }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Department" />
                            </SelectTrigger>
                            <SelectContent>
                                {departmentsData?.data?.departments?.map(dept => (
                                    <SelectItem key={String(dept.id || dept._id)} value={String(dept.id || dept._id)}>{dept.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-[250px]">
                        <Select value={selectedLine} onValueChange={setSelectedLine} disabled={!selectedDepartment}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Line" />
                            </SelectTrigger>
                            <SelectContent>
                                {linesData?.data?.map(line => (
                                    <SelectItem key={String(line.id || line._id)} value={String(line.id || line._id)}>{line.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="ml-auto flex gap-2">
                        <Button onClick={handleAddRow} disabled={!selectedLine} variant="outline" className="gap-2">
                            Add Operator
                        </Button>
                        <Button onClick={handlePrint} disabled={!selectedLine || matrixEntries.length === 0} className="gap-2">
                            <IconPrinter className="h-4 w-4" />
                            Print
                        </Button>
                        <Button onClick={handleExport} disabled={!selectedLine || matrixEntries.length === 0} variant="outline" className="gap-2 border-[#16a34a] text-[#16a34a] hover:bg-[#f0fdf4]">
                            <IconDownload className="h-4 w-4" />
                            Export Excel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving || !selectedLine} className="gap-2 bg-[#16a34a] hover:bg-[#15803d]">
                            {isSaving ? <IconLoader className="animate-spin h-4 w-4" /> : <IconDeviceFloppy className="h-4 w-4" />}
                            Save Data
                        </Button>
                    </div>
                </div>
            </div>

            {/* Matrix Display */}
            {!selectedLine ? (
                <div className="text-center py-10 text-[#6b7280] border-2 border-dashed rounded-lg">
                    Please select a Department and Line to view the Skill Matrix.
                </div>
            ) : isMachinesLoading || isLinesLoading ? (
                <div className="flex justify-center py-10"><IconLoader className="animate-spin" /></div>
            ) : !machinesData?.data?.length ? (
                <div className="text-center py-10 text-[#6b7280] border-2 border-dashed rounded-lg">
                    No machines found for this line.
                </div>
            ) : (
                <div id="printable-matrix" className="bg-white text-xs text-black border-2 border-black">
                    {/* Header Section */}
                    <div className="flex border-b border-black">
                        <div className="w-[150px] border-r border-black p-2 flex items-center justify-center">
                            <img src="/motherson+marelli.png" alt="Logo" className="h-10" />
                            <div className="flex flex-col ml-2">
                                <span className="font-bold text-xs text-[#dc2626]">motherson</span>
                                <span className="font-bold text-xs text-[#2563eb]">MARELLI</span>
                            </div>
                        </div>
                        <div className="flex-1 border-r border-black flex items-center justify-center">
                            <h1 className="text-2xl font-bold">Skill Matrix - {lineName}</h1>
                        </div>
                        <div className="w-[200px] text-[10px]">
                            {['Format no.', 'Rev.No.', 'Rev. Date', 'Page No.'].map((label, idx) => (
                                <div key={label} className="flex border-b border-black last:border-b-0">
                                    <div className="w-20 border-r border-black p-1 font-semibold">{label}</div>
                                    <div className="flex-1 p-0 text-center">
                                        <input
                                            type="text"
                                            className="w-full h-full text-center bg-transparent border-none focus:ring-0 p-1 font-medium"
                                            value={headerInfo[Object.keys(headerInfo)[idx]] || ""}
                                            onChange={(e) => handleHeaderInfoChange(Object.keys(headerInfo)[idx], e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex border-b border-black text-xs font-semibold bg-[#f9fafb]">
                        <div className="w-[30%] border-r border-black p-1">Plant : MMLI,Pune</div>
                        <div className="flex-1 p-1 text-right pr-10">Department : <span className="ml-4">{selectedDeptName}</span></div>
                    </div>

                    {/* Table Header */}
                    <div className="flex border-b border-black text-[10px] font-bold bg-[#e5e7eb] text-center">
                        <div className="w-8 border-r border-black p-2 flex items-center justify-center">Sr.No.</div>
                        <div className="w-32 border-r border-black p-2 flex items-center justify-center">OPERATOR NAME</div>
                        <div className="w-12 border-r border-black p-2 flex items-center justify-center">TNR/EMP</div>
                        <div className="w-16 border-r border-black p-2 flex items-center justify-center">Emp.id</div>
                        <div className="w-20 border-r border-black p-2 flex items-center justify-center">Education</div>
                        <div className="w-16 border-r border-black p-2 flex items-center justify-center">DET/CAS</div>
                        <div className="w-20 border-r border-black p-2 flex items-center justify-center">DOJ</div>
                        <div className="w-32 border-r border-black p-2 flex items-center justify-center bg-[#f3f4f6]">Station / Machine Name</div>
                        <div className="w-24 border-r border-black p-2 flex items-center justify-center bg-[#f3f4f6] text-[9px] leading-tight">Critical & Non Critical</div>
                        <div className="w-16 border-r border-black p-2 flex items-center justify-center bg-[#f3f4f6] text-[9px] leading-tight">Minimum Skill Level Required</div>
                        <div className="w-16 border-r border-black p-2 flex items-center justify-center bg-[#f3f4f6] text-[9px] leading-tight">Current Skill Level</div>

                        <div className="flex-1 flex overflow-x-auto">
                            {(machinesData?.data || []).map((machine) => (
                                <div key={String(machine.id ?? machine._id)} className="w-20 border-r border-black p-1 flex items-center justify-center text-[9px] font-bold break-words text-center min-w-[60px]">
                                    {machine.name}
                                </div>
                            ))}
                            <div className="w-16 p-1 flex items-center justify-center text-[9px] font-bold">EOSH & EnMS</div>
                        </div>
                    </div>

                    {/* Data Rows */}
                    {matrixEntries.map((row, idx) => {
                        // Fall back to the first station so a never-explicitly-assigned
                        // row still shows one skill circle instead of none at all.
                        const assignedIds = (row.assignedStationIds && row.assignedStationIds.length > 0)
                            ? row.assignedStationIds.map(String)
                            : (row.stations[0] ? [String(row.stations[0]._id)] : []);
                        const assignedStations = row.stations.filter(s => assignedIds.includes(String(s._id)));
                        return (
                        <div key={row._id} className="flex border-b border-black text-[10px] text-center min-h-[50px]">
                            <div className="w-8 border-r border-black p-2 flex items-center justify-center font-bold">{row.srNo}</div>
                            <div className="w-32 border-r border-black p-2 flex items-center justify-start font-bold text-left min-w-[128px]">
                                {row.isManual ? (
                                    <Select onValueChange={(val) => handleUserSelect(idx, val)}>
                                        <SelectTrigger className="w-full h-8 text-[10px]">
                                            <SelectValue placeholder="Select Operator" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departmentUsers.map(u => (
                                                <SelectItem key={String(u._id)} value={String(u._id)}>{u.fullName}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    row.name
                                )}
                            </div>
                            <div className="w-12 border-r border-black p-2 flex items-center justify-center font-bold">{row.type}</div>
                            <div className="w-16 border-r border-black p-2 flex items-center justify-center font-bold">{row.username || "-"}</div>
                            <div className="w-20 border-r border-black p-2 flex items-center justify-center font-bold">{row.education || "-"}</div>
                            <div className="w-16 border-r border-black p-2 flex items-center justify-center font-bold">
                                <input
                                    type="text"
                                    className="w-full h-full text-center bg-transparent border-none focus:ring-0 p-0 text-[10px] font-bold"
                                    value={row.detCas}
                                    onChange={(e) => handleDetCasChange(idx, e.target.value)}
                                />
                            </div>
                            <div className="w-20 border-r border-black p-2 flex items-center justify-center font-bold">{row.doj}</div>

                            {/* Assigned Station Details — one stacked line per assigned machine */}
                            {(() => {
                                if (row.type === 'TNR') {
                                    return (
                                        <>
                                            <div className="w-32 border-r border-black p-1 flex items-center justify-center">
                                                <span className="text-[9px] font-bold">Team Leader</span>
                                            </div>
                                            <div className="w-24 border-r border-black p-2 flex items-center justify-center font-bold text-[9px]">
                                                <span className="text-[9px] font-bold">Not Applicable</span>
                                            </div>
                                            <div className="w-16 border-r border-black p-2 flex items-center justify-center font-bold">L5</div>
                                            <div className="w-16 border-r border-black p-2 flex items-center justify-center font-bold">{assignedStations[0]?.curr || "-"}</div>
                                        </>
                                    );
                                }
                                return (
                                    <>
                                        <div className="w-32 border-r border-black p-1 flex flex-col items-stretch justify-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="w-full flex flex-col gap-1 bg-transparent hover:bg-black/5 rounded px-1"
                                                    >
                                                        {assignedStations.length > 0
                                                            ? assignedStations.map(s => (
                                                                <span key={String(s._id)} className="h-5 flex items-center justify-center text-[9px] font-bold truncate">
                                                                    {s.name}
                                                                </span>
                                                            ))
                                                            : (
                                                                <span className="h-5 flex items-center justify-center text-[9px] font-bold">— Select —</span>
                                                            )}
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                                                    {row.stations.map(s => (
                                                        <DropdownMenuCheckboxItem
                                                            key={String(s._id)}
                                                            checked={assignedIds.includes(String(s._id))}
                                                            onSelect={(e) => e.preventDefault()}
                                                            onCheckedChange={(checked) => handleAssignedStationsToggle(idx, s._id, checked)}
                                                        >
                                                            {s.name}
                                                        </DropdownMenuCheckboxItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div className="w-24 border-r border-black p-1 flex flex-col items-center justify-center font-bold text-[9px] gap-1">
                                            {assignedStations.length === 0 ? "-" : assignedStations.map(s => {
                                                const sIdx = row.stations.findIndex(st => String(st._id) === String(s._id));
                                                return (
                                                    <Select key={String(s._id)} value={s.critical || ""} onValueChange={(val) => handleCriticalityChange(idx, sIdx, val)}>
                                                        <SelectTrigger className="w-full h-5 border-none p-0 text-[9px] font-bold bg-transparent">
                                                            <div className="truncate">{s.critical || "-"}</div>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Critical">Critical</SelectItem>
                                                            <SelectItem value="Non-Critical">Non-Critical</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                );
                                            })}
                                        </div>
                                        <div className="w-16 border-r border-black p-1 flex flex-col items-center justify-center font-bold gap-1">
                                            {assignedStations.length === 0 ? "-" : assignedStations.map(s => {
                                                const sIdx = row.stations.findIndex(st => String(st._id) === String(s._id));
                                                return (
                                                    <Select key={String(s._id)} value={String(s.min || "")} onValueChange={(val) => handleMinLevelChange(idx, sIdx, val)}>
                                                        <SelectTrigger className="w-full h-5 border-none p-0 text-[10px] font-bold bg-transparent">
                                                            <SelectValue placeholder="-" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableLevels.map((lvl) => (
                                                                <SelectItem key={lvl.name} value={lvl.name} className="text-xs">
                                                                    {lvl.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                );
                                            })}
                                        </div>
                                        <div className="w-16 border-r border-black p-1 flex flex-col items-center justify-center font-bold gap-1">
                                            {assignedStations.length === 0 ? "-" : assignedStations.map(s => (
                                                <span key={String(s._id)} className="h-5 flex items-center justify-center text-[10px]">{s.curr || "-"}</span>
                                            ))}
                                        </div>
                                    </>
                                );
                            })()}

                            <div className="flex-1 flex overflow-x-auto">
                                {row.stations.map((station, sIdx) => {
                                    const isAssigned = row.type === 'TNR' || assignedIds.includes(String(station._id));
                                    const currentLevelStr = station.curr || "L0";
                                    const level = parseLevel(currentLevelStr);

                                    return (
                                        <div key={String(station._id)} className="w-20 border-r border-black flex items-center justify-center min-w-[60px] p-1">
                                            {isAssigned && (
                                                <Select
                                                    value={currentLevelStr}
                                                    onValueChange={(val) => handleLevelChange(idx, sIdx, val)}
                                                >
                                                    <SelectTrigger className="w-full h-full border-none p-0 flex justify-center bg-transparent focus:ring-0 select-trigger">
                                                        <div>
                                                            <SkillIcon level={level} size={20} />
                                                        </div>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableLevels.map((lvl) => (
                                                            <SelectItem key={String(lvl.name)} value={String(lvl.name)}>
                                                                <div className="flex items-center gap-2">
                                                                    <SkillIcon level={parseLevel(lvl.name)} size={16} />
                                                                    <span>{lvl.name}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                    );
                                })}
                                <div className="w-16 p-2 flex items-center justify-center">
                                    <SkillIcon level={parseLevel("L1")} />
                                </div>
                            </div>
                        </div>
                        );
                    })}

                    {/* Footer Legend */}
                    <div className="flex border-t border-black min-h-[100px]">
                        <div className="w-[350px] border-r border-black p-2 text-[10px]">
                            <div className="font-bold mb-1">Level Legend:</div>
                            {availableLevels.map((lvl) => (
                                <div key={lvl.name} className="flex items-center gap-2 mb-2">
                                    <SkillIcon level={parseLevel(lvl.name)} size={20} />
                                    <div className="flex flex-col">
                                        <span className="font-bold">{lvl.name}</span>
                                        <span className="text-[9px] text-[#4b5563] leading-tight">{lvl.description || ""}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 p-2 text-[10px] flex flex-col">
                            <div className="font-bold underline mb-1">Note:</div>
                            <textarea
                                className="w-full h-full text-[10px] resize-none border-none outline-none bg-transparent whitespace-pre-wrap"
                                value={legendNote}
                                onChange={(e) => setLegendNote(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Notes & GuideLine + Revision History Section */}
                    <div className="flex border-t border-black min-h-[150px]">
                        {/* Notes / Guidelines (Editable) */}
                        <div className="w-[60%] border-r border-black p-2 flex flex-col">
                            <div className="font-bold text-[10px] mb-1">Note/ Guideline :-</div>
                            <textarea
                                className="w-full h-full text-[9px] leading-tight resize-none border-none outline-none bg-transparent whitespace-pre-wrap"
                                value={guidelines}
                                onChange={(e) => setGuidelines(e.target.value)}
                            />
                        </div>

                        {/* Revision History (Editable) */}
                        <div className="w-[40%] text-[9px]">
                            {/* Header */}
                            <div className="flex bg-[#fde047] font-bold border-b border-black text-center">
                                <div className="w-16 border-r border-black p-1">Rev Date</div>
                                <div className="w-10 border-r border-black p-1">Rev no</div>
                                <div className="flex-1 border-r border-black p-1">What Change</div>
                                <div className="w-20 p-1">Why Change</div>
                            </div>
                            {/* Rows */}
                            {revisions.map((rev, idx) => (
                                <div key={`${rev.revNo}-${idx}`} className="flex border-b border-black text-center h-[30px]">
                                    <div className="w-16 border-r border-black p-0 h-full">
                                        <input
                                            value={rev.date}
                                            onChange={(e) => handleRevisionChange(idx, 'date', e.target.value)}
                                            className="w-full h-full text-center bg-transparent border-none outline-none p-1"
                                        />
                                    </div>
                                    <div className="w-10 border-r border-black p-0 h-full">
                                        <input
                                            value={rev.revNo}
                                            onChange={(e) => handleRevisionChange(idx, 'revNo', e.target.value)}
                                            className="w-full h-full text-center bg-transparent border-none outline-none p-1"
                                        />
                                    </div>
                                    <div className="flex-1 border-r border-black p-0 h-full">
                                        <input
                                            value={rev.change}
                                            onChange={(e) => handleRevisionChange(idx, 'change', e.target.value)}
                                            className="w-full h-full text-center bg-transparent border-none outline-none p-1"
                                        />
                                    </div>
                                    <div className="w-20 p-0 h-full">
                                        <input
                                            value={rev.reason}
                                            onChange={(e) => handleRevisionChange(idx, 'reason', e.target.value)}
                                            className="w-full h-full text-center bg-transparent border-none outline-none p-1"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Info / Signatures */}
                    <div className="border-t border-black">
                        <div className="p-1 text-[10px] font-bold border-b border-black pl-2">
                            Rev. History - Rev-06- Operation wise Minimum Skill define
                        </div>
                        <div className="flex justify-between text-[8px] p-2 pt-8 pb-2">
                            <div>Prepared by ( DOSJO ) :-</div>
                            <div>Checked by ( Supervisor ) :-</div>
                            <div>Approved Vy ( HOD ) :-</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstructorSkillMatrix;
