import React, { useRef, useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconPrinter, IconDeviceFloppy, IconArrowLeft } from "@tabler/icons-react";
import { toast } from "sonner";
import { useGetOnJobTrainingByIdQuery, useUpdateOnJobTrainingMutation } from "@/Redux/AllApi/OnJobTrainingApi";

// 10 Content topics for each of the 3 days exactly matching the customer sheet
const DAY_1_TOPICS = [
    { id: "product_knowledge", label: "PRODUCT KNOWLEDGE" },
    { id: "pokayoke_verification", label: "POKAYOKE VERIFICATION" },
    { id: "process_parameter", label: "PROCESS PARAMETER" },
    { id: "unsafe_act_condition", label: "UNSAFE ACT & CONDITION" },
    { id: "defect_knowledge", label: "DEFECT KNOWLEDGE" },
    { id: "appearance_knowledge", label: "APPEARANCE KNOWLEDGE & INSPECTION CRITERIA" },
    { id: "special_requirement", label: "SPECIAL REQUIREMENT OF CUSTOMER" },
    { id: "customer_complaint", label: "CUSTOMER COMPLAINT" },
    { id: "quality_alert", label: "QUALITY ALERT" },
    { id: "one_point_lesson", label: "ONE POINT LESSON" },
];

const DAY_2_TOPICS = [
    { id: "production_report", label: "PRODUCTION REPORT" },
    { id: "first_piece_checking", label: "1ST PIECE CHECKING" },
    { id: "sos_amc_approval", label: "SOS, AMC, SET UP APPROVAL" },
    { id: "andon_escalation", label: "ANDON ESCALATION" },
    { id: "rework_procedure", label: "REWORK PROCEDURE" },
    { id: "nc_part_handling", label: "NC PART HANDLING" },
    { id: "ppe_awareness", label: "PPE AWARENESS" },
    { id: "part_handling", label: "PART HANDLING" },
    { id: "qc_report", label: "7QC REPORT" },
    { id: "5s_score_awareness", label: "5S SCORE AWARENESS" },
];

const DAY_3_TOPICS = [
    { id: "suggestion_system", label: "SUGGESTION SYSTEM" },
    { id: "quick_kaizen", label: "QUICK KAIZEN" },
    { id: "sources_contamination", label: "SOURCES OF CONTAMINATION" },
    { id: "machine_troubleshooting", label: "MACHINE TROUBLESHOOTING" },
    { id: "4m_change_management", label: "4M CHANGE MANAGEMENT" },
    { id: "cycle_time_study", label: "CYCLE TIME STUDY" },
    { id: "line_balancing", label: "LINE BALANCING" },
    { id: "basic_wcm_tools", label: "BASIC WCM TOOLS (5S, 3M, 3G)" },
    { id: "ergonomic_muri_mura_muda", label: "ERGONOMIC (MURI, MURA, MUDA)" },
    { id: "quality_circle", label: "QUALITY CIRCLE" },
];

const DAYS_CONFIG = [
    { dayNum: 1, title: "DAY-1 DATE", topics: DAY_1_TOPICS },
    { dayNum: 2, title: "DAY-2 DATE", topics: DAY_2_TOPICS },
    { dayNum: 3, title: "DAY-3 DATE", topics: DAY_3_TOPICS },
];

const Level2OJTTable = ({
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
        docNo: "MMI/OJT/01/002",
        revNo: "3",
        revDate: "2/5/2024",
    });

    const [headerInfo, setHeaderInfo] = useState({
        section: "Molding / Assembly",
        lineMachine: "",
        associateName: studentName,
        doj: "",
    });

    // 3 Days evaluation data
    const [daysData, setDaysData] = useState({
        1: { date: "", totalProd: "", okPart: "", rejPart: "", cycleTime: "", topics: {}, signAssociate: "", signTrainer: "", signTL: "", signShiftIncharge: "" },
        2: { date: "", totalProd: "", okPart: "", rejPart: "", cycleTime: "", topics: {}, signAssociate: "", signTrainer: "", signTL: "", signShiftIncharge: "" },
        3: { date: "", totalProd: "", okPart: "", rejPart: "", cycleTime: "", topics: {}, signAssociate: "", signTrainer: "", signTL: "", signShiftIncharge: "" },
    });

    // Scoring & Target rubric
    const [rubricScores, setRubricScores] = useState({
        totalProdMark: "", // 0 to 3
        okProdMark: "",    // 0 to 3 or Fail
        rejectionMark: "", // 3 or Fail
        cycleTimeMark: "", // 0 to 3 or Fail
    });

    const [cbtMark, setCbtMark] = useState("");
    const [remarks, setRemarks] = useState("");
    const [preparedBy, setPreparedBy] = useState("");
    const [approvedBy, setApprovedBy] = useState("");

    // Load data from backend
    useEffect(() => {
        if (ojtData?.data) {
            const data = ojtData.data;

            setDocDetails({
                docNo: data.docNo || "MMI/OJT/01/002",
                revNo: data.revNo || "3",
                revDate: data.revDate || "2/5/2024",
            });

            setHeaderInfo({
                section: data.department?.name || data.model || "Molding / Assembly",
                lineMachine: `${data.line?.name || ""} / ${data.machine?.name || ""}`.trim().replace(/^\/|\/$/g, "") || "",
                associateName: data.student?.fullName || studentName,
                doj: data.student?.doj
                    ? new Date(data.student.doj).toLocaleDateString()
                    : data.student?.createdAt
                    ? new Date(data.student.createdAt).toLocaleDateString()
                    : "",
            });

            // Parse entries (saved as array or day-keyed object)
            if (data.entries && typeof data.entries === "object") {
                if (data.entries.daysData) {
                    setDaysData(data.entries.daysData);
                } else if (Array.isArray(data.entries) && data.entries.length >= 3) {
                    setDaysData({
                        1: data.entries[0] || {},
                        2: data.entries[1] || {},
                        3: data.entries[2] || {},
                    });
                }
            }

            // Parse scoring
            if (data.scoring && typeof data.scoring === "object") {
                setRubricScores({
                    totalProdMark: data.scoring.totalProdMark ?? "",
                    okProdMark: data.scoring.okProdMark ?? "",
                    rejectionMark: data.scoring.rejectionMark ?? "",
                    cycleTimeMark: data.scoring.cycleTimeMark ?? "",
                });
                setCbtMark(data.scoring.cbtMark ?? "");
                setPreparedBy(data.scoring.preparedBy ?? "");
                setApprovedBy(data.scoring.approvedBy ?? "");
            }

            setRemarks(data.remarks || "");
        }
    }, [ojtData, studentName]);

    // Calculate total content marks obtained from the 30 questions (2 marks each for OK '√')
    const totalContentMarksObtained = useMemo(() => {
        let sum = 0;
        [1, 2, 3].forEach((dayNum) => {
            const dayTopics = daysData[dayNum]?.topics || {};
            Object.values(dayTopics).forEach((topic) => {
                if (topic?.status === "OK") {
                    sum += Number(topic?.mark !== undefined && topic?.mark !== "" ? topic.mark : 2);
                } else if (topic?.mark && !isNaN(Number(topic.mark))) {
                    sum += Number(topic.mark);
                }
            });
        });
        return sum;
    }, [daysData]);

    const maxContentMarks = 30 * 2; // 30 questions * 2 marks = 60 marks

    // Rubric marks sum (up to 12 marks)
    const rubricMarksSum = useMemo(() => {
        const prod = Number(rubricScores.totalProdMark) || 0;
        const ok = Number(rubricScores.okProdMark) || 0;
        const rej = Number(rubricScores.rejectionMark) || 0;
        const ct = Number(rubricScores.cycleTimeMark) || 0;
        return prod + ok + rej + ct;
    }, [rubricScores]);

    // Overall total obtained & percentage
    const totalObtained = useMemo(() => {
        const cbt = Number(cbtMark) || 0;
        return totalContentMarksObtained + rubricMarksSum + cbt;
    }, [totalContentMarksObtained, rubricMarksSum, cbtMark]);

    // Default total marks for Level 2 = 60 content + 12 rubric + optional CBT (default base = 72)
    const totalMaxMarks = 72;

    const resultPercentage = useMemo(() => {
        if (!totalMaxMarks || totalMaxMarks <= 0) return 0;
        return ((totalObtained / totalMaxMarks) * 100).toFixed(1);
    }, [totalObtained, totalMaxMarks]);

    const isPassed = Number(resultPercentage) >= 80;

    // Handlers
    const handleDayMetricChange = (dayNum, field, val) => {
        setDaysData((prev) => ({
            ...prev,
            [dayNum]: {
                ...prev[dayNum],
                [field]: val,
            },
        }));
    };

    const handleTopicStatusChange = (dayNum, topicId, status) => {
        setDaysData((prev) => {
            const currentDay = prev[dayNum] || {};
            const currentTopics = currentDay.topics || {};
            const currentTopic = currentTopics[topicId] || {};

            let mark = 0;
            if (status === "OK") mark = 2;
            else if (status === "NOK") mark = 0;
            else if (status === "NA") mark = 0;

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
                name: "Level-2 Practical Evaluation of On the Job Training",
                docNo: docDetails.docNo,
                revNo: docDetails.revNo,
                revDate: docDetails.revDate,
                entries: { daysData },
                scoring: {
                    ...rubricScores,
                    cbtMark,
                    contentMarks: totalContentMarksObtained,
                    preparedBy,
                    approvedBy,
                },
                totalMarks: totalMaxMarks,
                totalMarksObtained: totalObtained,
                totalPercentage: resultPercentage,
                result: isPassed ? "Pass" : "Fail",
                remarks,
            }).unwrap();

            toast.success("Level-2 Evaluation Saved Successfully");
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
                        Level-2 Practical Evaluation Sheet
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
                <div className="w-max min-w-[1050px] border-2 border-black p-3 sm:p-5 bg-white text-[11px] leading-tight text-black shadow-sm" ref={componentRef}>

                        {/* Top Header Block */}
                        <div className="grid grid-cols-12 border-b-2 border-black pb-1 mb-1 items-center">
                            <div className="col-span-2 flex items-center gap-2 pl-2">
                                <img src="/motherson+marelli.png" alt="Motherson Marelli Logo" className="h-9 md:h-11 object-contain" />
                            </div>
                            <div className="col-span-7 text-center font-bold text-base uppercase tracking-wide">
                                Level-2 Practical Evaluation of On the Job Training
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

                        {/* Associate & Section Metadata Header */}
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
                                                    <th className="border-r border-black p-1 w-12 font-bold bg-amber-200">
                                                        CONTENT
                                                    </th>
                                                    <th className="border-r border-black p-1 w-16 font-semibold">TOTAL PRODUCTION PART</th>
                                                    <th className="border-r border-black p-1 w-14 font-semibold">OK PART</th>
                                                    <th className="border-r border-black p-1 w-14 font-semibold">REJECTION PART</th>
                                                    <th className="border-r border-black p-1 w-14 font-semibold">CYCLE TIME</th>

                                                    {/* 10 Topic Headers */}
                                                    {topics.map((t) => (
                                                        <th key={t.id} className="border-r border-black p-1 font-semibold text-[9px] max-w-[85px] leading-tight">
                                                            {t.label}
                                                        </th>
                                                    ))}

                                                    {/* 4 Signatures */}
                                                    <th className="border-r border-black p-1 w-16 text-[9px] font-semibold">Associate sign</th>
                                                    <th className="border-r border-black p-1 w-16 text-[9px] font-semibold">WIS TRAINER SIGN</th>
                                                    <th className="border-r border-black p-1 w-16 text-[9px] font-semibold">TL Sign</th>
                                                    <th className="p-1 w-16 text-[9px] font-semibold">Shift Incharge Sign</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {/* Row 2: √ / x (Check status) */}
                                                <tr className="border-b border-black h-8">
                                                    <td rowSpan={2} className="border-r border-black p-1 font-bold">
                                                        <input
                                                            type="date"
                                                            disabled={readOnly}
                                                            value={currentDay.date || ""}
                                                            onChange={(e) => handleDayMetricChange(dayNum, "date", e.target.value)}
                                                            className="w-full text-center bg-transparent border-0 outline-none text-[10px]"
                                                        />
                                                    </td>
                                                    <td className="border-r border-black p-1 font-bold bg-amber-100">
                                                        √ / x
                                                    </td>
                                                    <td className="border-r border-black p-1">
                                                        <input
                                                            type="text"
                                                            disabled={readOnly}
                                                            placeholder="Target"
                                                            value={currentDay.totalProd || ""}
                                                            onChange={(e) => handleDayMetricChange(dayNum, "totalProd", e.target.value)}
                                                            className="w-full text-center bg-transparent outline-none"
                                                        />
                                                    </td>
                                                    <td className="border-r border-black p-1">
                                                        <input
                                                            type="text"
                                                            disabled={readOnly}
                                                            placeholder="OK"
                                                            value={currentDay.okPart || ""}
                                                            onChange={(e) => handleDayMetricChange(dayNum, "okPart", e.target.value)}
                                                            className="w-full text-center bg-transparent outline-none"
                                                        />
                                                    </td>
                                                    <td className="border-r border-black p-1">
                                                        <input
                                                            type="text"
                                                            disabled={readOnly}
                                                            placeholder="Rej"
                                                            value={currentDay.rejPart || ""}
                                                            onChange={(e) => handleDayMetricChange(dayNum, "rejPart", e.target.value)}
                                                            className="w-full text-center bg-transparent outline-none"
                                                        />
                                                    </td>
                                                    <td className="border-r border-black p-1">
                                                        <input
                                                            type="text"
                                                            disabled={readOnly}
                                                            placeholder="Sec"
                                                            value={currentDay.cycleTime || ""}
                                                            onChange={(e) => handleDayMetricChange(dayNum, "cycleTime", e.target.value)}
                                                            className="w-full text-center bg-transparent outline-none"
                                                        />
                                                    </td>

                                                    {/* 10 Topic Status Selectors */}
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
                                                                        onChange={(e) => handleTopicStatusChange(dayNum, t.id, e.target.value)}
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

                                                    {/* Signatures Row 1 */}
                                                    <td className="border-r border-black p-1">
                                                        <input
                                                            type="text"
                                                            disabled={readOnly}
                                                            placeholder="Sign"
                                                            value={currentDay.signAssociate || ""}
                                                            onChange={(e) => handleDayMetricChange(dayNum, "signAssociate", e.target.value)}
                                                            className="w-full text-center bg-transparent outline-none text-[9px]"
                                                        />
                                                    </td>
                                                    <td className="border-r border-black p-1">
                                                        <input
                                                            type="text"
                                                            disabled={readOnly}
                                                            placeholder="Sign"
                                                            value={currentDay.signTrainer || ""}
                                                            onChange={(e) => handleDayMetricChange(dayNum, "signTrainer", e.target.value)}
                                                            className="w-full text-center bg-transparent outline-none text-[9px]"
                                                        />
                                                    </td>
                                                    <td className="border-r border-black p-1">
                                                        <input
                                                            type="text"
                                                            disabled={readOnly}
                                                            placeholder="Sign"
                                                            value={currentDay.signTL || ""}
                                                            onChange={(e) => handleDayMetricChange(dayNum, "signTL", e.target.value)}
                                                            className="w-full text-center bg-transparent outline-none text-[9px]"
                                                        />
                                                    </td>
                                                    <td className="p-1">
                                                        <input
                                                            type="text"
                                                            disabled={readOnly}
                                                            placeholder="Sign"
                                                            value={currentDay.signShiftIncharge || ""}
                                                            onChange={(e) => handleDayMetricChange(dayNum, "signShiftIncharge", e.target.value)}
                                                            className="w-full text-center bg-transparent outline-none text-[9px]"
                                                        />
                                                    </td>
                                                </tr>

                                                {/* Row 3: OBTAINED MARK */}
                                                <tr className="bg-slate-50/50 h-7">
                                                    <td className="border-r border-black p-1 font-bold text-[9px] bg-amber-100">
                                                        OBTAINED MARK
                                                    </td>
                                                    <td colSpan={4} className="border-r border-black p-1 text-[9px] text-muted-foreground italic">
                                                        Target vs Actual Output
                                                    </td>

                                                    {/* 10 Topic Marks */}
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
                                                                    placeholder="0"
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

                        {/* Bottom Rubric, Summary & Guidelines Section */}
                        <div className="grid grid-cols-12 gap-2 border-2 border-black p-2 mb-2">

                            {/* Left Rubric Table: 7 Columns */}
                            <div className="col-span-7 border border-black">
                                <table className="w-full border-collapse text-center text-[10px]">
                                    <thead>
                                        <tr className="bg-slate-100 border-b border-black font-bold">
                                            <th className="border-r border-black p-1 text-left w-36">Criteria / Target</th>
                                            <th className="border-r border-black p-1">Total Production</th>
                                            <th className="border-r border-black p-1">Ok Production</th>
                                            <th className="border-r border-black p-1" colSpan={2}>Rejection</th>
                                            <th className="p-1" colSpan={2}>'Average Cycle Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-black">
                                            <td className="border-r border-black p-1 text-left font-medium">Target Achived Above - 100%</td>
                                            <td className="border-r border-black p-1 font-bold">3</td>
                                            <td className="border-r border-black p-1 font-bold">3</td>
                                            <td className="border-r border-black p-1 text-[9px]">Below - 0%</td>
                                            <td className="border-r border-black p-1 font-bold">3</td>
                                            <td className="border-r border-black p-1 text-[9px]">Above - 95%</td>
                                            <td className="p-1 font-bold">3</td>
                                        </tr>
                                        <tr className="border-b border-black">
                                            <td className="border-r border-black p-1 text-left font-medium">Target Achived Above - 95%</td>
                                            <td className="border-r border-black p-1 font-bold">2</td>
                                            <td className="border-r border-black p-1 font-bold">2</td>
                                            <td className="border-r border-black p-1 text-[9px]">Above - 0.5%</td>
                                            <td className="border-r border-black p-1 text-red-600 font-bold">Fail</td>
                                            <td className="border-r border-black p-1 text-[9px]">Above - 90%</td>
                                            <td className="p-1 font-bold">2</td>
                                        </tr>
                                        <tr className="border-b border-black">
                                            <td className="border-r border-black p-1 text-left font-medium">Target Achived Above - 85%</td>
                                            <td className="border-r border-black p-1 font-bold">1</td>
                                            <td className="border-r border-black p-1 font-bold">1</td>
                                            <td className="border-r border-black p-1 text-[9px]">Below - 1%</td>
                                            <td className="border-r border-black p-1 text-red-600 font-bold">Fail</td>
                                            <td className="border-r border-black p-1 text-[9px]">Above - 85%</td>
                                            <td className="p-1 font-bold">1</td>
                                        </tr>
                                        <tr className="border-b border-black">
                                            <td className="border-r border-black p-1 text-left font-medium">Target Achived Below - 85%</td>
                                            <td className="border-r border-black p-1 font-bold">0</td>
                                            <td className="border-r border-black p-1 text-red-600 font-bold">Fail</td>
                                            <td className="border-r border-black p-1 text-[9px]">Above - 1%</td>
                                            <td className="border-r border-black p-1 text-red-600 font-bold">Fail</td>
                                            <td className="border-r border-black p-1 text-[9px]">Below - 85%</td>
                                            <td className="p-1 text-red-600 font-bold">Fail</td>
                                        </tr>
                                        {/* Assigned Rubric Mark Input Row */}
                                        <tr className="bg-amber-50 font-bold">
                                            <td className="border-r border-black p-1 text-left">Awarded Marks:</td>
                                            <td className="border-r border-black p-0.5">
                                                <input
                                                    type="number"
                                                    disabled={readOnly}
                                                    min="0"
                                                    max="3"
                                                    value={rubricScores.totalProdMark}
                                                    onChange={(e) => setRubricScores({ ...rubricScores, totalProdMark: e.target.value })}
                                                    className="w-full text-center bg-transparent outline-none"
                                                    placeholder="0-3"
                                                />
                                            </td>
                                            <td className="border-r border-black p-0.5">
                                                <input
                                                    type="number"
                                                    disabled={readOnly}
                                                    min="0"
                                                    max="3"
                                                    value={rubricScores.okProdMark}
                                                    onChange={(e) => setRubricScores({ ...rubricScores, okProdMark: e.target.value })}
                                                    className="w-full text-center bg-transparent outline-none"
                                                    placeholder="0-3"
                                                />
                                            </td>
                                            <td colSpan={2} className="border-r border-black p-0.5">
                                                <input
                                                    type="number"
                                                    disabled={readOnly}
                                                    min="0"
                                                    max="3"
                                                    value={rubricScores.rejectionMark}
                                                    onChange={(e) => setRubricScores({ ...rubricScores, rejectionMark: e.target.value })}
                                                    className="w-full text-center bg-transparent outline-none"
                                                    placeholder="0-3"
                                                />
                                            </td>
                                            <td colSpan={2} className="p-0.5">
                                                <input
                                                    type="number"
                                                    disabled={readOnly}
                                                    min="0"
                                                    max="3"
                                                    value={rubricScores.cycleTimeMark}
                                                    onChange={(e) => setRubricScores({ ...rubricScores, cycleTimeMark: e.target.value })}
                                                    className="w-full text-center bg-transparent outline-none"
                                                    placeholder="0-3"
                                                />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Middle Summary Marks Box: 2 Columns */}
                            <div className="col-span-2 border border-black p-1 flex flex-col justify-between text-[10px]">
                                <div className="space-y-1">
                                    <div className="border-b border-black pb-1">
                                        <div className="font-semibold text-slate-700">Total Content mark</div>
                                        <div className="font-black text-sm text-blue-900">
                                            {totalContentMarksObtained} <span className="text-[10px] text-muted-foreground font-normal">/ {maxContentMarks}</span>
                                        </div>
                                    </div>
                                    <div className="border-b border-black pb-1">
                                        <div className="font-semibold text-slate-700">Total CBT / OJT Mark</div>
                                        <div className="flex items-center gap-1 font-bold">
                                            <input
                                                type="number"
                                                disabled={readOnly}
                                                value={cbtMark}
                                                onChange={(e) => setCbtMark(e.target.value)}
                                                placeholder="CBT"
                                                className="w-14 border border-slate-300 px-1 py-0.5 text-center text-xs outline-none"
                                            />
                                            <span className="text-[10px] text-muted-foreground">+ Rubric ({rubricMarksSum})</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-700">Evaluation Result %</div>
                                        <div className="font-black text-base text-foreground">
                                            {resultPercentage}%
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Evaluation Criteria Box (Yellow Highlight): 3 Columns */}
                            <div className="col-span-3 border border-black flex flex-col justify-center items-center p-2 bg-amber-300">
                                <div className="font-bold text-xs uppercase mb-1">Evaluation criteria</div>
                                <div className="border-2 border-black bg-yellow-400 p-2 w-full text-center font-black text-sm tracking-wide">
                                    <div>Pass ≥ 80 %</div>
                                    <div>Fail &lt; 80 %</div>
                                </div>
                                <div className="mt-2 text-center font-bold">
                                    Current Status:{" "}
                                    <span className={isPassed ? "text-emerald-900" : "text-red-900"}>
                                        {isPassed ? "PASS" : "FAIL"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Guidelines, Remarks & Change Management */}
                        <div className="grid grid-cols-12 gap-2 border border-black p-2 mb-2 text-[10px]">
                            {/* Guidelines Column */}
                            <div className="col-span-5 pr-2 border-r border-black">
                                <div className="font-bold uppercase border-b border-black pb-0.5 mb-1">Guideline:-</div>
                                <ul className="space-y-0.5 list-disc pl-4 text-[9px] leading-tight">
                                    <li>If operator know about content tick ok(√).</li>
                                    <li>If operator do not know about content tick NOK (x).</li>
                                    <li>If not applicable any content write NA.</li>
                                    <li><span className="font-bold">*Each Question Contains 2 marks weightage.</span></li>
                                    <li>Evaluation Criteria is Above 80% is pass and Below 80% is Fail.</li>
                                    <li>The OJT format applicable for all department (Molding , HCBC, Assembly)</li>
                                </ul>
                            </div>

                            {/* Remarks Column */}
                            <div className="col-span-3 px-2 border-r border-black flex flex-col">
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

                            {/* Change Management Table */}
                            <div className="col-span-4 pl-1">
                                <div className="font-bold uppercase border-b border-black pb-0.5 mb-1 bg-yellow-300 text-center text-[9px]">
                                    CHANGE MANAGEMENT
                                </div>
                                <table className="w-full border-collapse text-[8px] text-center border border-black">
                                    <thead>
                                        <tr className="bg-slate-100 border-b border-black font-semibold">
                                            <th className="border-r border-black p-0.5">REV.DATE</th>
                                            <th className="border-r border-black p-0.5">REV.NO</th>
                                            <th className="border-r border-black p-0.5">WHAT CHANGE</th>
                                            <th className="p-0.5">WHY CHANGE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-black">
                                            <td className="border-r border-black p-0.5">6/10/2020</td>
                                            <td className="border-r border-black p-0.5">2</td>
                                            <td className="border-r border-black p-0.5">COMPANY LOGO</td>
                                            <td className="p-0.5">INTERNAL OBSERVATION</td>
                                        </tr>
                                        <tr className="bg-yellow-100 font-semibold">
                                            <td className="border-r border-black p-0.5">2/5/2024</td>
                                            <td className="border-r border-black p-0.5">3</td>
                                            <td className="border-r border-black p-0.5">COMMON SHEET DEVELOPED FOR ALL DEPARTMENT</td>
                                            <td className="p-0.5">VAS AUDIT OBSERVATION</td>
                                        </tr>
                                    </tbody>
                                </table>
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

export default Level2OJTTable;
