import React, { useRef, useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconPrinter, IconDeviceFloppy, IconArrowLeft } from "@tabler/icons-react";
import { toast } from "sonner";
import { useGetOnJobTrainingByIdQuery, useUpdateOnJobTrainingMutation } from "@/Redux/AllApi/OnJobTrainingApi";

// Day 1 Topics (10 Topics)
const DAY_1_TOPICS = [
    { id: "safety_board", label: "Safety Board Explain step-0 to 3", defaultReport: "NA", weight: 2 },
    { id: "standard_kaizen", label: "Standard Kaizen", defaultReport: "√", weight: 2 },
    { id: "motion_study", label: "Motion Study", defaultReport: "NA", weight: 2 },
    { id: "time_study", label: "Time Study", defaultReport: "NA", weight: 2 },
    { id: "line_balancing", label: "Line Balancing", defaultReport: "NA", weight: 2 },
    { id: "material_handling", label: "Material Handling", defaultReport: "NA", weight: 2 },
    { id: "layout_improvement", label: "Layout Improvement", defaultReport: "NA", weight: 2 },
    { id: "skill_matrix_gap", label: "Skill matrix & Gap of skill", defaultReport: "NA", weight: 2 },
    { id: "quality_gate", label: "Quality Gate", defaultReport: "NA", weight: 2 },
    { id: "golden_zone", label: "Golden Zone / Strike Zone", defaultReport: "NA", weight: 2 },
];

// Day 2 Topics (10 Topics)
const DAY_2_TOPICS = [
    { id: "two_video_camera", label: "Two Video Camera Method", defaultReport: "NA", weight: 2 },
    { id: "lub_method", label: "Lub Method", defaultReport: "NA", weight: 2 },
    { id: "four_step_method", label: "4 step Method", defaultReport: "NA", weight: 2 },
    { id: "oee_calc_productivity", label: "OEE Calculation/Productivity", defaultReport: "NA", weight: 2 },
    { id: "rejection_analysis", label: "Rejection Analysis", defaultReport: "NA", weight: 2 },
    { id: "twttp_herca", label: "TWTTP/HERCA", defaultReport: "NA", weight: 2 },
    { id: "kai_kpi_day2", label: "KAI / KPI", defaultReport: "NA", weight: 2 },
    { id: "major_kaizen", label: "Major Kaizen", defaultReport: "NA", weight: 2 },
    { id: "five_s_audit", label: "5s Audit", defaultReport: "NA", weight: 2 },
    { id: "swai_audit", label: "SWAI Audit", defaultReport: "NA", weight: 2 },
];

// Day 3 Topics (9 Topics)
const DAY_3_TOPICS = [
    { id: "layer_process_audit", label: "Layer Process Audit", defaultReport: "NA", weight: 2 },
    { id: "safety_risk_assessment", label: "Safety Risk Assessment", defaultReport: "NA", weight: 2 },
    { id: "ppsr_analysis", label: "PPSR Analysis", defaultReport: "NA", weight: 2 },
    { id: "capa_analysis", label: "CAPA Analysis", defaultReport: "NA", weight: 2 },
    { id: "gap_flush_report", label: "Gap & Flush report", defaultReport: "NA", weight: 2 },
    { id: "alcohol_test", label: "Alcohol Test", defaultReport: "NA", weight: 2 },
    { id: "kai_kpi_day3", label: "KAI / KPI", defaultReport: "NA", weight: 2 },
    { id: "line_doc_dev", label: "Line Document Development", defaultReport: "NA", weight: 2 },
    { id: "manpower_handling", label: "Manpower Handling", defaultReport: "NA", weight: 2 },
];

const DAYS_CONFIG = [
    { dayNum: 1, title: "Day -1 Date", topics: DAY_1_TOPICS },
    { dayNum: 2, title: "Day-2 Date", topics: DAY_2_TOPICS },
    { dayNum: 3, title: "Day-3 Date", topics: DAY_3_TOPICS },
];

const Level4OJTTable = ({
    ojtId,
    studentName = "Associate Name",
    model: initialModel = "Model / Component",
    readOnly = false,
    onBack,
}) => {
    const componentRef = useRef();

    const { data: ojtData, isLoading, refetch } = useGetOnJobTrainingByIdQuery(ojtId, { skip: !ojtId });
    const [updateOnJobTraining, { isLoading: isSaving }] = useUpdateOnJobTrainingMutation();

    const [docDetails, setDocDetails] = useState({
        docNo: "MMI/OJT/01/004",
        revNo: "3",
        revDate: "2/5/2024",
    });

    const [headerInfo, setHeaderInfo] = useState({
        section: "Molding / Assembly / HCBC",
        lineMachine: "",
        associateName: studentName,
        doj: "",
    });

    // Days evaluation data
    const [daysData, setDaysData] = useState({
        1: { date: "", topics: {}, signAssociate: "", signTrainer: "", signTL: "", signShiftIncharge: "" },
        2: { date: "", topics: {}, signAssociate: "", signTrainer: "", signTL: "", signShiftIncharge: "" },
        3: { date: "", topics: {}, signAssociate: "", signTrainer: "", signTL: "", signShiftIncharge: "" },
    });

    const [remarks, setRemarks] = useState("");
    const [preparedBy, setPreparedBy] = useState("");
    const [approvedBy, setApprovedBy] = useState("");

    // Load data from backend
    useEffect(() => {
        if (ojtData?.data) {
            const data = ojtData.data;

            setDocDetails({
                docNo: data.docNo || "MMI/OJT/01/004",
                revNo: data.revNo || "3",
                revDate: data.revDate || "2/5/2024",
            });

            setHeaderInfo({
                section: data.department?.name || data.model || "Molding / Assembly / HCBC",
                lineMachine: `${data.line?.name || ""} / ${data.machine?.name || ""}`.trim().replace(/^\/|\/$/g, "") || "",
                associateName: data.student?.fullName || studentName,
                doj: data.student?.doj
                    ? new Date(data.student.doj).toLocaleDateString()
                    : data.student?.createdAt
                    ? new Date(data.student.createdAt).toLocaleDateString()
                    : "",
            });

            if (data.entries && typeof data.entries === "object") {
                if (data.entries.daysData) {
                    setDaysData(data.entries.daysData);
                }
            }

            if (data.scoring && typeof data.scoring === "object") {
                setPreparedBy(data.scoring.preparedBy || "");
                setApprovedBy(data.scoring.approvedBy || "");
            }

            setRemarks(data.remarks || "");
        }
    }, [ojtData, studentName]);

    // Max marks = 29 questions * 2 marks = 58 marks
    const totalMaxMarks = useMemo(() => {
        let count = 0;
        DAYS_CONFIG.forEach((d) => (count += d.topics.length));
        return count * 2;
    }, []);

    // Total obtained marks
    const totalObtainedMarks = useMemo(() => {
        let sum = 0;
        DAYS_CONFIG.forEach(({ dayNum, topics }) => {
            const currentDayTopics = daysData[dayNum]?.topics || {};
            topics.forEach((t) => {
                const item = currentDayTopics[t.id];
                if (item?.mark !== undefined && item?.mark !== "" && !isNaN(Number(item.mark))) {
                    sum += Number(item.mark);
                } else if (item?.status === "OK") {
                    sum += t.weight;
                }
            });
        });
        return sum;
    }, [daysData]);

    const resultPercentage = useMemo(() => {
        if (!totalMaxMarks || totalMaxMarks <= 0) return 0;
        return ((totalObtainedMarks / totalMaxMarks) * 100).toFixed(1);
    }, [totalObtainedMarks, totalMaxMarks]);

    const isPassed = Number(resultPercentage) >= 80;

    // Handlers
    const handleDateChange = (dayNum, dateVal) => {
        setDaysData((prev) => ({
            ...prev,
            [dayNum]: {
                ...prev[dayNum],
                date: dateVal,
            },
        }));
    };

    const handleSignChange = (dayNum, field, signVal) => {
        setDaysData((prev) => ({
            ...prev,
            [dayNum]: {
                ...prev[dayNum],
                [field]: signVal,
            },
        }));
    };

    const handleTopicStatusChange = (dayNum, topicId, status, defaultWeight = 2) => {
        setDaysData((prev) => {
            const currentDay = prev[dayNum] || {};
            const currentTopics = currentDay.topics || {};
            const currentTopic = currentTopics[topicId] || {};

            let mark = 0;
            if (status === "OK") mark = defaultWeight;
            else if (status === "NOK" || status === "NA") mark = 0;

            return {
                ...prev,
                [dayNum]: {
                    ...currentDay,
                    topics: {
                        ...currentTopics,
                        [topicId]: {
                            ...currentTopic,
                            status,
                            mark,
                        },
                    },
                },
            };
        });
    };

    const handleTopicMarkChange = (dayNum, topicId, markVal) => {
        setDaysData((prev) => {
            const currentDay = prev[dayNum] || {};
            const currentTopics = currentDay.topics || {};
            const currentTopic = currentTopics[topicId] || {};

            return {
                ...prev,
                [dayNum]: {
                    ...currentDay,
                    topics: {
                        ...currentTopics,
                        [topicId]: {
                            ...currentTopic,
                            mark: markVal,
                        },
                    },
                },
            };
        });
    };

    const handleSave = async () => {
        if (!ojtId) {
            toast.info("Preview Mode: changes are not saved to database.");
            return;
        }

        try {
            await updateOnJobTraining({
                id: ojtId,
                name: "Level-4 Practical Evaluation of On the Job Training",
                docNo: docDetails.docNo,
                revNo: docDetails.revNo,
                revDate: docDetails.revDate,
                entries: { daysData },
                scoring: {
                    totalMaxMarks,
                    totalObtainedMarks,
                    preparedBy,
                    approvedBy,
                },
                totalMarks: totalMaxMarks,
                totalMarksObtained: totalObtainedMarks,
                totalPercentage: resultPercentage,
                result: isPassed ? "Pass" : "Fail",
                remarks,
            }).unwrap();

            toast.success("Level-4 Evaluation Saved Successfully");
            refetch();
        } catch (error) {
            toast.error(error?.data?.message || "Failed to save evaluation");
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4 w-fit min-w-full pb-8 pr-10 sm:pr-16">
            {/* Action Bar */}
            <div className="flex items-center justify-between no-print gap-3">
                <div className="flex items-center gap-2">
                    {onBack && (
                        <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
                            <IconArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                    )}
                    <span className="text-sm font-semibold text-foreground">
                        Level-4 Practical Evaluation Sheet
                    </span>
                    <Badge variant={isPassed ? "default" : "secondary"} className={isPassed ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}>
                        {isPassed ? "Pass (≥80%)" : "Pending / Below 80%"}
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                        <IconPrinter className="h-4 w-4" />
                        Print / PDF
                    </Button>
                    {!readOnly && (
                        <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                            <IconDeviceFloppy className="h-4 w-4" />
                            {isSaving ? "Saving..." : "Save Evaluation"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Printable Evaluation Sheet */}
            <div className="w-fit min-w-full pb-8 pr-10 sm:pr-16">
                <div className="w-max min-w-[1100px] border-2 border-black p-3 sm:p-5 bg-white text-[10px] leading-tight text-black shadow-sm" ref={componentRef}>

                        {/* Top Header Block */}
                        <div className="grid grid-cols-12 border-b-2 border-black pb-1 mb-1 items-center">
                            <div className="col-span-2 flex items-center gap-2 pl-2">
                                <img src="/motherson+marelli.png" alt="Motherson Marelli Logo" className="h-9 md:h-11 object-contain" />
                            </div>
                            <div className="col-span-7 text-center font-bold text-base uppercase tracking-wide">
                                Level-4 Practical Evaluation of On the Job Training
                            </div>
                            <div className="col-span-3 text-[10px] border-l-2 border-black pl-2">
                                <div className="grid grid-cols-2 py-0.5 border-b border-black">
                                    <span className="font-semibold">Doc No.</span>
                                    <span>{docDetails.docNo}</span>
                                </div>
                                <div className="grid grid-cols-2 py-0.5 border-b border-black">
                                    <span className="font-semibold">Rev.no.</span>
                                    <span>{docDetails.revNo}</span>
                                </div>
                                <div className="grid grid-cols-2 py-0.5">
                                    <span className="font-semibold">Rev Date</span>
                                    <span>{docDetails.revDate}</span>
                                </div>
                            </div>
                        </div>

                        {/* Section & Associate Metadata */}
                        <div className="grid grid-cols-2 border-b-2 border-black pb-1 mb-2 text-xs">
                            <div className="space-y-1 pr-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold w-36">Section :</span>
                                    <input
                                        type="text"
                                        disabled={readOnly}
                                        value={headerInfo.section}
                                        onChange={(e) => setHeaderInfo({ ...headerInfo, section: e.target.value })}
                                        className="flex-1 border-b border-dotted border-black bg-transparent outline-none px-1"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold w-36">Name of Associate :</span>
                                    <span className="flex-1 font-semibold border-b border-dotted border-black px-1">
                                        {headerInfo.associateName || "—"}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1 pl-2 border-l border-black">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold w-28">Line/Machine:</span>
                                    <input
                                        type="text"
                                        disabled={readOnly}
                                        value={headerInfo.lineMachine}
                                        onChange={(e) => setHeaderInfo({ ...headerInfo, lineMachine: e.target.value })}
                                        className="flex-1 border-b border-dotted border-black bg-transparent outline-none px-1"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold w-28">Date of joining :</span>
                                    <span className="flex-1 border-b border-dotted border-black px-1">
                                        {headerInfo.doj || "—"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Main 3 Days Table */}
                        <div className="border border-black mb-3">
                            {DAYS_CONFIG.map(({ dayNum, title, topics }) => {
                                const currentDay = daysData[dayNum] || {};
                                const currentTopics = currentDay.topics || {};

                                return (
                                    <div key={dayNum} className="border-b-2 border-black last:border-b-0">
                                        <table className="w-full border-collapse text-center text-[10px]">
                                            <thead>
                                                {/* Row 1: CONTENT Header */}
                                                <tr className="bg-slate-50 border-b border-black">
                                                    <th className="border-r border-black p-1 w-24 font-bold bg-amber-100">
                                                        {title}
                                                    </th>
                                                    <th className="border-r border-black p-1 w-20 font-bold bg-amber-200">
                                                        CONTENT
                                                    </th>
                                                    {topics.map((t) => (
                                                        <th key={t.id} className="border-r border-black p-1 font-semibold text-[9px] leading-tight max-w-[95px]">
                                                            {t.label}
                                                        </th>
                                                    ))}
                                                    <th className="border-r border-black p-1 w-16 text-[9px] font-semibold">Associate sign</th>
                                                    <th className="border-r border-black p-1 w-16 text-[9px] font-semibold">WIS TRAINER SIGN</th>
                                                    <th className="border-r border-black p-1 w-16 text-[9px] font-semibold">TL Sign</th>
                                                    <th className="p-1 w-16 text-[9px] font-semibold">Shift Incharge Sign</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Row 2: √ / x */}
                                                <tr className="border-b border-black h-8">
                                                    <td rowSpan={3} className="border-r border-black p-1 font-bold">
                                                        <input
                                                            type="date"
                                                            disabled={readOnly}
                                                            value={currentDay.date || ""}
                                                            onChange={(e) => handleDateChange(dayNum, e.target.value)}
                                                            className="w-full text-center bg-transparent border-0 outline-none text-[10px]"
                                                        />
                                                    </td>
                                                    <td className="border-r border-black p-1 font-bold bg-amber-100">
                                                        √ / x
                                                    </td>
                                                    {topics.map((t) => {
                                                        const status = currentTopics[t.id]?.status || "";
                                                        return (
                                                            <td key={t.id} className="border-r border-black p-0.5">
                                                                {readOnly ? (
                                                                    <span className={`font-bold ${status === "OK" ? "text-emerald-700" : status === "NOK" ? "text-red-700" : ""}`}>
                                                                        {status === "OK" ? "√" : status === "NOK" ? "x" : status || "—"}
                                                                    </span>
                                                                ) : (
                                                                    <select
                                                                        value={status}
                                                                        onChange={(e) => handleTopicStatusChange(dayNum, t.id, e.target.value, t.weight)}
                                                                        className="w-full bg-transparent text-center font-bold text-xs outline-none cursor-pointer"
                                                                    >
                                                                        <option value="">—</option>
                                                                        <option value="OK">√</option>
                                                                        <option value="NOK">x</option>
                                                                        <option value="NA">NA</option>
                                                                    </select>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="border-r border-black p-1">
                                                        <input
                                                            type="text"
                                                            disabled={readOnly}
                                                            placeholder="Sign"
                                                            value={currentDay.signAssociate || ""}
                                                            onChange={(e) => handleSignChange(dayNum, "signAssociate", e.target.value)}
                                                            className="w-full text-center bg-transparent outline-none text-[9px]"
                                                        />
                                                    </td>
                                                    <td className="border-r border-black p-1">
                                                        <input
                                                            type="text"
                                                            disabled={readOnly}
                                                            placeholder="Sign"
                                                            value={currentDay.signTrainer || ""}
                                                            onChange={(e) => handleSignChange(dayNum, "signTrainer", e.target.value)}
                                                            className="w-full text-center bg-transparent outline-none text-[9px]"
                                                        />
                                                    </td>
                                                    <td className="border-r border-black p-1">
                                                        <input
                                                            type="text"
                                                            disabled={readOnly}
                                                            placeholder="Sign"
                                                            value={currentDay.signTL || ""}
                                                            onChange={(e) => handleSignChange(dayNum, "signTL", e.target.value)}
                                                            className="w-full text-center bg-transparent outline-none text-[9px]"
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <input
                                                            type="text"
                                                            disabled={readOnly}
                                                            placeholder="Sign"
                                                            value={currentDay.signShiftIncharge || ""}
                                                            onChange={(e) => handleSignChange(dayNum, "signShiftIncharge", e.target.value)}
                                                            className="w-full text-center bg-transparent outline-none text-[9px]"
                                                        />
                                                    </td>
                                                </tr>

                                                {/* Row 3: Analysis report Hard Copy */}
                                                <tr className="border-b border-black h-7 bg-slate-100/70 font-semibold text-[9px]">
                                                    <td className="border-r border-black p-1 font-bold bg-amber-100 leading-tight">
                                                        Analysis report Hard Copy
                                                    </td>
                                                    {topics.map((t) => {
                                                        const report = currentTopics[t.id]?.report || t.defaultReport;
                                                        return (
                                                            <td key={t.id} className="border-r border-black p-0.5">
                                                                <span className={report === "√" ? "font-bold text-blue-800" : "text-muted-foreground"}>
                                                                    {report}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                    <td colSpan={4} className="p-1 text-[9px] text-muted-foreground">
                                                        Physical Verification
                                                    </td>
                                                </tr>

                                                {/* Row 4: OBT. Mark */}
                                                <tr className="h-7 bg-slate-50/50">
                                                    <td className="border-r border-black p-1 font-bold text-[9px] bg-amber-100">
                                                        OBT. Mark
                                                    </td>
                                                    {topics.map((t) => {
                                                        const mark = currentTopics[t.id]?.mark;
                                                        return (
                                                            <td key={t.id} className="border-r border-black p-0.5">
                                                                <input
                                                                    type="text"
                                                                    disabled={readOnly}
                                                                    value={mark !== undefined ? mark : ""}
                                                                    onChange={(e) => handleTopicMarkChange(dayNum, t.id, e.target.value)}
                                                                    className="w-full text-center font-semibold bg-transparent outline-none"
                                                                    placeholder="2"
                                                                />
                                                            </td>
                                                        );
                                                    })}
                                                    <td colSpan={4} className="p-1 text-[9px] text-muted-foreground italic">
                                                        Verified by Shift Team
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Summary & Result Section */}
                        <div className="grid grid-cols-12 gap-2 border-2 border-black p-2 mb-2">
                            {/* Summary Metrics */}
                            <div className="col-span-8 grid grid-cols-3 gap-2 border border-black p-2 bg-slate-50">
                                <div className="border-r border-black pr-2">
                                    <div className="font-bold text-xs uppercase text-slate-700">Total Content Mark</div>
                                    <div className="font-black text-lg text-blue-950 mt-1">{totalMaxMarks}</div>
                                </div>
                                <div className="border-r border-black pr-2">
                                    <div className="font-bold text-xs uppercase text-slate-700">Total OBT. Mark</div>
                                    <div className="font-black text-lg text-blue-700 mt-1">{totalObtainedMarks}</div>
                                </div>
                                <div>
                                    <div className="font-bold text-xs uppercase text-slate-700">Evaluation Result %</div>
                                    <div className="font-black text-lg text-foreground mt-1">{resultPercentage}%</div>
                                </div>
                            </div>

                            {/* Evaluation Criteria Yellow Box */}
                            <div className="col-span-4 border-2 border-black bg-amber-300 p-2 flex flex-col justify-center items-center">
                                <div className="font-bold text-xs uppercase mb-1">Evaluation criteria</div>
                                <div className="border-2 border-black bg-yellow-400 p-2 w-full text-center font-black text-sm tracking-wide">
                                    <div>Pass ≥ 80%</div>
                                    <div>Fail &lt; 80%</div>
                                </div>
                                <div className="mt-1 text-center font-bold text-xs">
                                    Current Status:{" "}
                                    <span className={isPassed ? "text-emerald-900" : "text-red-900"}>
                                        {isPassed ? "PASS" : "FAIL"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Guidelines, Remarks & Signatures */}
                        <div className="grid grid-cols-12 gap-2 border border-black p-2 mb-2 text-[10px]">
                            {/* Guidelines Column */}
                            <div className="col-span-6 pr-2 border-r border-black space-y-1">
                                <div className="font-bold uppercase border-b border-black pb-0.5">Guideline:-</div>
                                <ul className="space-y-0.5 list-disc pl-4 text-[9px] leading-tight">
                                    <li>If operator know about content tick ok(√).</li>
                                    <li>If operator do not know about content tick NOK (x).</li>
                                    <li><span className="font-bold">*Each Question Contains 2 marks weightage.</span></li>
                                    <li>Evaluation Criteria is Above 80% is pass and Below 80% is Fail.</li>
                                    <li>Analysis Report Hard Copy-</li>
                                </ul>
                                <div className="grid grid-cols-2 gap-1 text-[8px] border border-black p-1 bg-slate-50 mt-1">
                                    <div><span className="font-bold">NA:</span> Not Applicable</div>
                                    <div><span className="font-bold">√:</span> Applicable (Hard Copy Attached)</div>
                                </div>
                            </div>

                            {/* Remarks Column */}
                            <div className="col-span-6 pl-2 flex flex-col">
                                <div className="font-bold uppercase border-b border-black pb-0.5 mb-1">Remark:-</div>
                                <textarea
                                    disabled={readOnly}
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="Enter supervisor observation / remarks..."
                                    rows={4}
                                    className="w-full flex-1 border border-slate-200 p-1 text-[10px] resize-none outline-none bg-transparent"
                                />
                            </div>
                        </div>

                        {/* Signatures Footer */}
                        <div className="grid grid-cols-2 border-t-2 border-black pt-2 text-xs font-bold">
                            <div className="flex items-center gap-2">
                                <span className="w-24">Prepared by:</span>
                                <input
                                    type="text"
                                    disabled={readOnly}
                                    placeholder="Evaluator / Trainer Name"
                                    value={preparedBy}
                                    onChange={(e) => setPreparedBy(e.target.value)}
                                    className="border-b border-dotted border-black flex-1 outline-none bg-transparent font-medium"
                                />
                            </div>
                            <div className="flex items-center gap-2 pl-4">
                                <span className="w-24">Approved by:</span>
                                <input
                                    type="text"
                                    disabled={readOnly}
                                    placeholder="HOD / Shift Incharge Name"
                                    value={approvedBy}
                                    onChange={(e) => setApprovedBy(e.target.value)}
                                    className="border-b border-dotted border-black flex-1 outline-none bg-transparent font-medium"
                                />
                            </div>
                        </div>

                    </div>
                </div>
            </div>
    );
};

export default Level4OJTTable;
