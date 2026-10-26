import React, { useRef, useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconPrinter, IconDeviceFloppy, IconArrowLeft } from "@tabler/icons-react";
import { toast } from "sonner";
import { useGetOnJobTrainingByIdQuery, useUpdateOnJobTrainingMutation } from "@/Redux/AllApi/OnJobTrainingApi";

// Day 1 Topics (Total weightage: 5G, 5W1H, 5WHY, 4M1E, Standard Kaizen, OEE, FTQ, Quality Gates, Productivity)
const DAY_1_TOPICS = [
    { id: "5g_analysis", label: "5G Analysis", hasReport: false, defaultReport: "NA", weight: 2 },
    { id: "5w1h_analysis", label: "5W 1H ANALYSIS", hasReport: true, defaultReport: "√", weight: 2 },
    { id: "5why_analysis", label: "5 WHY ANALYSIS", hasReport: true, defaultReport: "√", weight: 2 },
    { id: "4m1e_analysis", label: "4M 1E ANALYSIS", hasReport: true, defaultReport: "√", weight: 2 },
    { id: "standard_kaizen", label: "Standard Kaizen", hasReport: true, defaultReport: "√", weight: 10, colSpan: 5 },
    { id: "oee_calculation", label: "OEE Calculation", hasReport: false, defaultReport: "NA", weight: 2 },
    { id: "ftq_calculation", label: "FTQ Calculation", hasReport: false, defaultReport: "NA", weight: 2 },
    { id: "quality_gates", label: "Quality Gates & QA Network", hasReport: false, defaultReport: "NA", weight: 2 },
    { id: "productivity_calc", label: "Productivity Calculation", hasReport: false, defaultReport: "NA", weight: 2 },
];

// Day 2 Topics (Control Plan, PFMEA, Customer Issues, Andon + Decision Making on 10 NC Parts)
const DAY_2_STANDARD_TOPICS = [
    { id: "control_plan", label: "Control Plan Adherence", hasReport: false, defaultReport: "NA", weight: 2 },
    { id: "pfm", label: "PFM / PFMEA", hasReport: false, defaultReport: "NA", weight: 2 },
    { id: "customer_issues", label: "CUSTOMER ISSUES", hasReport: false, defaultReport: "NA", weight: 2 },
    { id: "andon_escalation", label: "ANDON ESCALATION", hasReport: false, defaultReport: "NA", weight: 2 },
];

// 10 NC Parts for Day 2 (1 mark each = 10 marks)
const NC_PARTS = Array.from({ length: 10 }, (_, i) => ({
    id: `nc_part_${i + 1}`,
    label: `P-${i + 1}`,
    weight: 1,
}));

// Day 3 Topics (Company Policy, KPI, Quality Circle, Machine Setting, 4M Change, Customer Characteristics, Kanban, LOTO, Aspect & Impact)
const DAY_3_TOPICS = [
    { id: "company_policy", label: "Company Policy", hasReport: false, defaultReport: "NA", weight: 2 },
    { id: "kpi_kai", label: "KPI / KAI", hasReport: false, defaultReport: "NA", weight: 2 },
    { id: "quality_circle", label: "Quality Circle", hasReport: false, defaultReport: "NA", weight: 2 },
    { id: "machine_setting", label: "Machine Setting & Troubleshooting", hasReport: false, defaultReport: "NA", weight: 2 },
    { id: "4m_change", label: "4M change Management", hasReport: false, defaultReport: "NA", weight: 6, colSpan: 4 },
    { id: "customer_special", label: "Customer Special Characteristics", hasReport: false, defaultReport: "NA", weight: 2 },
    { id: "kanban_system", label: "Kanban System", hasReport: false, defaultReport: "NA", weight: 2 },
    { id: "loto_system", label: "LOTO system", hasReport: false, defaultReport: "NA", weight: 2 },
    { id: "aspect_impact", label: "Aspect & Impact", hasReport: false, defaultReport: "NA", weight: 2 },
];

const Level3OJTTable = ({
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
        docNo: "MMI/OJT/01/003",
        revNo: "2",
        revDate: "2/5/2024",
    });

    const [headerInfo, setHeaderInfo] = useState({
        section: "Molding / HCBC / Assembly",
        lineMachine: "",
        associateName: studentName,
        doj: "",
    });

    // Day 1 state
    const [day1Data, setDay1Data] = useState({
        date: "",
        topics: {
            "5g_analysis": { status: "", mark: "", report: "NA" },
            "5w1h_analysis": { status: "", mark: "", report: "√" },
            "5why_analysis": { status: "", mark: "", report: "√" },
            "4m1e_analysis": { status: "", mark: "", report: "√" },
            "standard_kaizen": { status: "", mark: "", report: "√" },
            "oee_calculation": { status: "", mark: "", report: "NA" },
            "ftq_calculation": { status: "", mark: "", report: "NA" },
            "quality_gates": { status: "", mark: "", report: "NA" },
            "productivity_calc": { status: "", mark: "", report: "NA" },
        },
        signAssociate: "",
        signTrainer: "",
        signTL: "",
        signShiftIncharge: "",
    });

    // Day 2 state
    const [day2Data, setDay2Data] = useState({
        date: "",
        topics: {
            "control_plan": { status: "", mark: "", report: "NA" },
            "pfm": { status: "", mark: "", report: "NA" },
            "customer_issues": { status: "", mark: "", report: "NA" },
            "andon_escalation": { status: "", mark: "", report: "NA" },
        },
        ncParts: Array.from({ length: 10 }, () => ({ status: "", mark: "" })),
        signAssociate: "",
        signTrainer: "",
        signTL: "",
        signShiftIncharge: "",
    });

    // Day 3 state
    const [day3Data, setDay3Data] = useState({
        date: "",
        topics: {
            "company_policy": { status: "", mark: "", report: "NA" },
            "kpi_kai": { status: "", mark: "", report: "NA" },
            "quality_circle": { status: "", mark: "", report: "NA" },
            "machine_setting": { status: "", mark: "", report: "NA" },
            "4m_change": { status: "", mark: "", report: "NA" },
            "customer_special": { status: "", mark: "", report: "NA" },
            "kanban_system": { status: "", mark: "", report: "NA" },
            "loto_system": { status: "", mark: "", report: "NA" },
            "aspect_impact": { status: "", mark: "", report: "NA" },
        },
        signAssociate: "",
        signTrainer: "",
        signTL: "",
        signShiftIncharge: "",
    });

    const [remarks, setRemarks] = useState("");
    const [preparedBy, setPreparedBy] = useState("");
    const [approvedBy, setApprovedBy] = useState("");

    // Load initial data from backend
    useEffect(() => {
        if (ojtData?.data) {
            const data = ojtData.data;

            setDocDetails({
                docNo: data.docNo || "MMI/OJT/01/003",
                revNo: data.revNo || "2",
                revDate: data.revDate || "2/5/2024",
            });

            setHeaderInfo({
                section: data.department?.name || data.model || "Molding / HCBC / Assembly",
                lineMachine: `${data.line?.name || ""} / ${data.machine?.name || ""}`.trim().replace(/^\/|\/$/g, "") || "",
                associateName: data.student?.fullName || studentName,
                doj: data.student?.doj
                    ? new Date(data.student.doj).toLocaleDateString()
                    : data.student?.createdAt
                    ? new Date(data.student.createdAt).toLocaleDateString()
                    : "",
            });

            if (data.entries && typeof data.entries === "object") {
                if (data.entries.day1Data) setDay1Data(data.entries.day1Data);
                if (data.entries.day2Data) setDay2Data(data.entries.day2Data);
                if (data.entries.day3Data) setDay3Data(data.entries.day3Data);
            }

            if (data.scoring && typeof data.scoring === "object") {
                setPreparedBy(data.scoring.preparedBy || "");
                setApprovedBy(data.scoring.approvedBy || "");
            }

            setRemarks(data.remarks || "");
        }
    }, [ojtData, studentName]);

    // Total marks calculation
    const totalContentMarks = useMemo(() => {
        let max = 0;
        DAY_1_TOPICS.forEach((t) => (max += t.weight));
        DAY_2_STANDARD_TOPICS.forEach((t) => (max += t.weight));
        NC_PARTS.forEach((p) => (max += p.weight));
        DAY_3_TOPICS.forEach((t) => (max += t.weight));
        return max; // 26 (Day 1) + 18 (Day 2) + 22 (Day 3) = 66
    }, []);

    // Total Obtained Mark
    const totalObtainedMark = useMemo(() => {
        let sum = 0;

        // Day 1 marks
        DAY_1_TOPICS.forEach((t) => {
            const item = day1Data.topics?.[t.id];
            if (item?.mark !== undefined && item?.mark !== "" && !isNaN(Number(item.mark))) {
                sum += Number(item.mark);
            } else if (item?.status === "OK") {
                sum += t.weight;
            }
        });

        // Day 2 standard topics
        DAY_2_STANDARD_TOPICS.forEach((t) => {
            const item = day2Data.topics?.[t.id];
            if (item?.mark !== undefined && item?.mark !== "" && !isNaN(Number(item.mark))) {
                sum += Number(item.mark);
            } else if (item?.status === "OK") {
                sum += t.weight;
            }
        });

        // Day 2 NC parts (10 parts)
        (day2Data.ncParts || []).forEach((part) => {
            if (part?.mark !== undefined && part?.mark !== "" && !isNaN(Number(part.mark))) {
                sum += Number(part.mark);
            } else if (part?.status === "OK") {
                sum += 1;
            }
        });

        // Day 3 topics
        DAY_3_TOPICS.forEach((t) => {
            const item = day3Data.topics?.[t.id];
            if (item?.mark !== undefined && item?.mark !== "" && !isNaN(Number(item.mark))) {
                sum += Number(item.mark);
            } else if (item?.status === "OK") {
                sum += t.weight;
            }
        });

        return sum;
    }, [day1Data, day2Data, day3Data]);

    const resultPercentage = useMemo(() => {
        if (!totalContentMarks || totalContentMarks <= 0) return 0;
        return ((totalObtainedMark / totalContentMarks) * 100).toFixed(1);
    }, [totalObtainedMark, totalContentMarks]);

    const isPassed = Number(resultPercentage) >= 80;

    // Handlers
    const handleDay1TopicChange = (topicId, field, value) => {
        setDay1Data((prev) => {
            const current = prev.topics?.[topicId] || {};
            let newMark = current.mark;
            if (field === "status") {
                const topicDef = DAY_1_TOPICS.find((t) => t.id === topicId);
                if (value === "OK") newMark = topicDef?.weight || 2;
                else if (value === "NOK" || value === "NA") newMark = 0;
            }
            return {
                ...prev,
                topics: {
                    ...prev.topics,
                    [topicId]: {
                        ...current,
                        [field]: value,
                        ...(field === "status" ? { mark: newMark } : {}),
                    },
                },
            };
        });
    };

    const handleDay2StandardTopicChange = (topicId, field, value) => {
        setDay2Data((prev) => {
            const current = prev.topics?.[topicId] || {};
            let newMark = current.mark;
            if (field === "status") {
                const topicDef = DAY_2_STANDARD_TOPICS.find((t) => t.id === topicId);
                if (value === "OK") newMark = topicDef?.weight || 2;
                else if (value === "NOK" || value === "NA") newMark = 0;
            }
            return {
                ...prev,
                topics: {
                    ...prev.topics,
                    [topicId]: {
                        ...current,
                        [field]: value,
                        ...(field === "status" ? { mark: newMark } : {}),
                    },
                },
            };
        });
    };

    const handleDay2NCPartChange = (index, field, value) => {
        setDay2Data((prev) => {
            const updated = [...(prev.ncParts || Array(10).fill({}))];
            const current = updated[index] || {};
            let newMark = current.mark;
            if (field === "status") {
                if (value === "OK") newMark = 1;
                else if (value === "NOK" || value === "NA") newMark = 0;
            }
            updated[index] = {
                ...current,
                [field]: value,
                ...(field === "status" ? { mark: newMark } : {}),
            };
            return {
                ...prev,
                ncParts: updated,
            };
        });
    };

    const handleDay3TopicChange = (topicId, field, value) => {
        setDay3Data((prev) => {
            const current = prev.topics?.[topicId] || {};
            let newMark = current.mark;
            if (field === "status") {
                const topicDef = DAY_3_TOPICS.find((t) => t.id === topicId);
                if (value === "OK") newMark = topicDef?.weight || 2;
                else if (value === "NOK" || value === "NA") newMark = 0;
            }
            return {
                ...prev,
                topics: {
                    ...prev.topics,
                    [topicId]: {
                        ...current,
                        [field]: value,
                        ...(field === "status" ? { mark: newMark } : {}),
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
                name: "Level-3 Practical Evaluation of On the Job Training",
                docNo: docDetails.docNo,
                revNo: docDetails.revNo,
                revDate: docDetails.revDate,
                entries: {
                    day1Data,
                    day2Data,
                    day3Data,
                },
                scoring: {
                    totalContentMarks,
                    totalObtainedMark,
                    preparedBy,
                    approvedBy,
                },
                totalMarks: totalContentMarks,
                totalMarksObtained: totalObtainedMark,
                totalPercentage: resultPercentage,
                result: isPassed ? "Pass" : "Fail",
                remarks,
            }).unwrap();

            toast.success("Level-3 Evaluation Saved Successfully");
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
                        Level-3 Practical Evaluation Sheet
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
                                Level-3 Practical Evaluation of On the Job Training
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

                            {/* ======================= DAY - 1 ======================= */}
                            <div className="border-b-2 border-black">
                                <table className="w-full border-collapse text-center text-[10px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-black">
                                            <th className="border-r border-black p-1 w-24 font-bold bg-amber-100">Day-1 Date</th>
                                            <th className="border-r border-black p-1 w-20 font-bold bg-amber-200">CONTENT</th>
                                            {DAY_1_TOPICS.map((t) => (
                                                <th
                                                    key={t.id}
                                                    colSpan={t.colSpan || 1}
                                                    className="border-r border-black p-1 font-semibold text-[9px] leading-tight"
                                                >
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
                                                    value={day1Data.date || ""}
                                                    onChange={(e) => setDay1Data({ ...day1Data, date: e.target.value })}
                                                    className="w-full text-center bg-transparent border-0 outline-none text-[10px]"
                                                />
                                            </td>
                                            <td className="border-r border-black p-1 font-bold bg-amber-100">√ / x</td>
                                            {DAY_1_TOPICS.map((t) => {
                                                const status = day1Data.topics?.[t.id]?.status || "";
                                                return (
                                                    <td key={t.id} colSpan={t.colSpan || 1} className="border-r border-black p-0.5">
                                                        {readOnly ? (
                                                            <span className={`font-bold ${status === "OK" ? "text-emerald-700" : status === "NOK" ? "text-red-700" : ""}`}>
                                                                {status === "OK" ? "√" : status === "NOK" ? "x" : status || "—"}
                                                            </span>
                                                        ) : (
                                                            <select
                                                                value={status}
                                                                onChange={(e) => handleDay1TopicChange(t.id, "status", e.target.value)}
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
                                                    value={day1Data.signAssociate || ""}
                                                    onChange={(e) => setDay1Data({ ...day1Data, signAssociate: e.target.value })}
                                                    className="w-full text-center bg-transparent outline-none text-[9px]"
                                                />
                                            </td>
                                            <td className="border-r border-black p-1">
                                                <input
                                                    type="text"
                                                    disabled={readOnly}
                                                    placeholder="Sign"
                                                    value={day1Data.signTrainer || ""}
                                                    onChange={(e) => setDay1Data({ ...day1Data, signTrainer: e.target.value })}
                                                    className="w-full text-center bg-transparent outline-none text-[9px]"
                                                />
                                            </td>
                                            <td className="border-r border-black p-1">
                                                <input
                                                    type="text"
                                                    disabled={readOnly}
                                                    placeholder="Sign"
                                                    value={day1Data.signTL || ""}
                                                    onChange={(e) => setDay1Data({ ...day1Data, signTL: e.target.value })}
                                                    className="w-full text-center bg-transparent outline-none text-[9px]"
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    disabled={readOnly}
                                                    placeholder="Sign"
                                                    value={day1Data.signShiftIncharge || ""}
                                                    onChange={(e) => setDay1Data({ ...day1Data, signShiftIncharge: e.target.value })}
                                                    className="w-full text-center bg-transparent outline-none text-[9px]"
                                                />
                                            </td>
                                        </tr>

                                        {/* Row 3: OBT. Mark */}
                                        <tr className="border-b border-black h-7 bg-slate-50/50">
                                            <td className="border-r border-black p-1 font-bold text-[9px] bg-amber-100">OBT. Mark</td>
                                            {DAY_1_TOPICS.map((t) => {
                                                const mark = day1Data.topics?.[t.id]?.mark;
                                                return (
                                                    <td key={t.id} colSpan={t.colSpan || 1} className="border-r border-black p-0.5">
                                                        <input
                                                            type="text"
                                                            disabled={readOnly}
                                                            value={mark !== undefined ? mark : ""}
                                                            onChange={(e) => handleDay1TopicChange(t.id, "mark", e.target.value)}
                                                            className="w-full text-center font-semibold bg-transparent outline-none"
                                                            placeholder={`Max ${t.weight}`}
                                                        />
                                                    </td>
                                                );
                                            })}
                                            <td colSpan={4} className="p-1 text-[9px] text-muted-foreground italic">
                                                Verified by Shift Team
                                            </td>
                                        </tr>

                                        {/* Row 4: Analysis report Hard Copy */}
                                        <tr className="h-7 bg-slate-100/70 font-semibold text-[9px]">
                                            <td className="border-r border-black p-1 font-bold bg-amber-100 leading-tight">
                                                Analysis report Hard Copy
                                            </td>
                                            {DAY_1_TOPICS.map((t) => {
                                                const report = day1Data.topics?.[t.id]?.report || t.defaultReport;
                                                return (
                                                    <td key={t.id} colSpan={t.colSpan || 1} className="border-r border-black p-0.5">
                                                        <span className={report === "√" ? "font-bold text-blue-800" : "text-muted-foreground"}>
                                                            {report}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                            <td colSpan={4} className="p-1 text-[9px] text-muted-foreground">
                                                Physical Report Verified
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* ======================= DAY - 2 ======================= */}
                            <div className="border-b-2 border-black">
                                <table className="w-full border-collapse text-center text-[10px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-black">
                                            <th className="border-r border-black p-1 w-24 font-bold bg-amber-100">Day-2 Date</th>
                                            <th className="border-r border-black p-1 w-20 font-bold bg-amber-200">CONTENT</th>
                                            {DAY_2_STANDARD_TOPICS.map((t) => (
                                                <th key={t.id} className="border-r border-black p-1 font-semibold text-[9px] leading-tight max-w-[80px]">
                                                    {t.label}
                                                </th>
                                            ))}
                                            <th colSpan={10} className="border-r border-black p-1 font-bold text-[9px] bg-amber-50">
                                                Evaluate Decision making on NC parts? (10 part & 10 mark)
                                            </th>
                                            <th className="border-r border-black p-1 w-16 text-[9px] font-semibold">Associate sign</th>
                                            <th className="border-r border-black p-1 w-16 text-[9px] font-semibold">WIS TRAINER SIGN</th>
                                            <th className="border-r border-black p-1 w-16 text-[9px] font-semibold">TL Sign</th>
                                            <th className="p-1 w-16 text-[9px] font-semibold">Shift Incharge Sign</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Sub-header row for 10 NC Parts */}
                                        <tr className="border-b border-black bg-slate-100 text-[8px] font-semibold">
                                            <td className="border-r border-black"></td>
                                            <td className="border-r border-black bg-amber-100">NC Part #</td>
                                            {DAY_2_STANDARD_TOPICS.map((t) => (
                                                <td key={t.id} className="border-r border-black text-muted-foreground">—</td>
                                            ))}
                                            {NC_PARTS.map((p) => (
                                                <td key={p.id} className="border-r border-black p-0.5">{p.label}</td>
                                            ))}
                                            <td colSpan={4} className="border-black"></td>
                                        </tr>

                                        {/* Row 2: √ / x */}
                                        <tr className="border-b border-black h-8">
                                            <td rowSpan={3} className="border-r border-black p-1 font-bold">
                                                <input
                                                    type="date"
                                                    disabled={readOnly}
                                                    value={day2Data.date || ""}
                                                    onChange={(e) => setDay2Data({ ...day2Data, date: e.target.value })}
                                                    className="w-full text-center bg-transparent border-0 outline-none text-[10px]"
                                                />
                                            </td>
                                            <td className="border-r border-black p-1 font-bold bg-amber-100">√ / x</td>
                                            {DAY_2_STANDARD_TOPICS.map((t) => {
                                                const status = day2Data.topics?.[t.id]?.status || "";
                                                return (
                                                    <td key={t.id} className="border-r border-black p-0.5">
                                                        {readOnly ? (
                                                            <span className={`font-bold ${status === "OK" ? "text-emerald-700" : status === "NOK" ? "text-red-700" : ""}`}>
                                                                {status === "OK" ? "√" : status === "NOK" ? "x" : status || "—"}
                                                            </span>
                                                        ) : (
                                                            <select
                                                                value={status}
                                                                onChange={(e) => handleDay2StandardTopicChange(t.id, "status", e.target.value)}
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
                                            {NC_PARTS.map((p, idx) => {
                                                const status = day2Data.ncParts?.[idx]?.status || "";
                                                return (
                                                    <td key={p.id} className="border-r border-black p-0.5">
                                                        {readOnly ? (
                                                            <span className={`font-bold ${status === "OK" ? "text-emerald-700" : status === "NOK" ? "text-red-700" : ""}`}>
                                                                {status === "OK" ? "√" : status === "NOK" ? "x" : status || "—"}
                                                            </span>
                                                        ) : (
                                                            <select
                                                                value={status}
                                                                onChange={(e) => handleDay2NCPartChange(idx, "status", e.target.value)}
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
                                                    value={day2Data.signAssociate || ""}
                                                    onChange={(e) => setDay2Data({ ...day2Data, signAssociate: e.target.value })}
                                                    className="w-full text-center bg-transparent outline-none text-[9px]"
                                                />
                                            </td>
                                            <td className="border-r border-black p-1">
                                                <input
                                                    type="text"
                                                    disabled={readOnly}
                                                    placeholder="Sign"
                                                    value={day2Data.signTrainer || ""}
                                                    onChange={(e) => setDay2Data({ ...day2Data, signTrainer: e.target.value })}
                                                    className="w-full text-center bg-transparent outline-none text-[9px]"
                                                />
                                            </td>
                                            <td className="border-r border-black p-1">
                                                <input
                                                    type="text"
                                                    disabled={readOnly}
                                                    placeholder="Sign"
                                                    value={day2Data.signTL || ""}
                                                    onChange={(e) => setDay2Data({ ...day2Data, signTL: e.target.value })}
                                                    className="w-full text-center bg-transparent outline-none text-[9px]"
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    disabled={readOnly}
                                                    placeholder="Sign"
                                                    value={day2Data.signShiftIncharge || ""}
                                                    onChange={(e) => setDay2Data({ ...day2Data, signShiftIncharge: e.target.value })}
                                                    className="w-full text-center bg-transparent outline-none text-[9px]"
                                                />
                                            </td>
                                        </tr>

                                        {/* Row 3: Analysis report Hard Copy */}
                                        <tr className="border-b border-black h-7 bg-slate-100/70 font-semibold text-[9px]">
                                            <td className="border-r border-black p-1 font-bold bg-amber-100 leading-tight">
                                                Analysis report Hard Copy
                                            </td>
                                            {DAY_2_STANDARD_TOPICS.map((t) => (
                                                <td key={t.id} className="border-r border-black p-0.5 text-muted-foreground">NA</td>
                                            ))}
                                            <td colSpan={10} className="border-r border-black p-0.5 text-center text-muted-foreground italic">
                                                NC Parts Evaluation Sheet Attached
                                            </td>
                                            <td colSpan={4} className="p-1 text-muted-foreground">Physical Verification</td>
                                        </tr>

                                        {/* Row 4: OBT. Mark */}
                                        <tr className="h-7 bg-slate-50/50">
                                            <td className="border-r border-black p-1 font-bold text-[9px] bg-amber-100">OBT. Mark</td>
                                            {DAY_2_STANDARD_TOPICS.map((t) => {
                                                const mark = day2Data.topics?.[t.id]?.mark;
                                                return (
                                                    <td key={t.id} className="border-r border-black p-0.5">
                                                        <input
                                                            type="text"
                                                            disabled={readOnly}
                                                            value={mark !== undefined ? mark : ""}
                                                            onChange={(e) => handleDay2StandardTopicChange(t.id, "mark", e.target.value)}
                                                            className="w-full text-center font-semibold bg-transparent outline-none"
                                                            placeholder={`Max ${t.weight}`}
                                                        />
                                                    </td>
                                                );
                                            })}
                                            {NC_PARTS.map((p, idx) => {
                                                const mark = day2Data.ncParts?.[idx]?.mark;
                                                return (
                                                    <td key={p.id} className="border-r border-black p-0.5">
                                                        <input
                                                            type="text"
                                                            disabled={readOnly}
                                                            value={mark !== undefined ? mark : ""}
                                                            onChange={(e) => handleDay2NCPartChange(idx, "mark", e.target.value)}
                                                            className="w-full text-center font-semibold bg-transparent outline-none text-[9px]"
                                                            placeholder="1"
                                                        />
                                                    </td>
                                                );
                                            })}
                                            <td colSpan={4} className="p-1 text-[9px] text-muted-foreground italic">
                                                Decision Score: Max 10 Marks
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* ======================= DAY - 3 ======================= */}
                            <div>
                                <table className="w-full border-collapse text-center text-[10px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-black">
                                            <th className="border-r border-black p-1 w-24 font-bold bg-amber-100">Day-3 Date</th>
                                            <th className="border-r border-black p-1 w-20 font-bold bg-amber-200">CONTENT</th>
                                            {DAY_3_TOPICS.map((t) => (
                                                <th
                                                    key={t.id}
                                                    colSpan={t.colSpan || 1}
                                                    className="border-r border-black p-1 font-semibold text-[9px] leading-tight"
                                                >
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
                                                    value={day3Data.date || ""}
                                                    onChange={(e) => setDay3Data({ ...day3Data, date: e.target.value })}
                                                    className="w-full text-center bg-transparent border-0 outline-none text-[10px]"
                                                />
                                            </td>
                                            <td className="border-r border-black p-1 font-bold bg-amber-100">√ / x</td>
                                            {DAY_3_TOPICS.map((t) => {
                                                const status = day3Data.topics?.[t.id]?.status || "";
                                                return (
                                                    <td key={t.id} colSpan={t.colSpan || 1} className="border-r border-black p-0.5">
                                                        {readOnly ? (
                                                            <span className={`font-bold ${status === "OK" ? "text-emerald-700" : status === "NOK" ? "text-red-700" : ""}`}>
                                                                {status === "OK" ? "√" : status === "NOK" ? "x" : status || "—"}
                                                            </span>
                                                        ) : (
                                                            <select
                                                                value={status}
                                                                onChange={(e) => handleDay3TopicChange(t.id, "status", e.target.value)}
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
                                                    value={day3Data.signAssociate || ""}
                                                    onChange={(e) => setDay3Data({ ...day3Data, signAssociate: e.target.value })}
                                                    className="w-full text-center bg-transparent outline-none text-[9px]"
                                                />
                                            </td>
                                            <td className="border-r border-black p-1">
                                                <input
                                                    type="text"
                                                    disabled={readOnly}
                                                    placeholder="Sign"
                                                    value={day3Data.signTrainer || ""}
                                                    onChange={(e) => setDay3Data({ ...day3Data, signTrainer: e.target.value })}
                                                    className="w-full text-center bg-transparent outline-none text-[9px]"
                                                />
                                            </td>
                                            <td className="border-r border-black p-1">
                                                <input
                                                    type="text"
                                                    disabled={readOnly}
                                                    placeholder="Sign"
                                                    value={day3Data.signTL || ""}
                                                    onChange={(e) => setDay3Data({ ...day3Data, signTL: e.target.value })}
                                                    className="w-full text-center bg-transparent outline-none text-[9px]"
                                                />
                                            </td>
                                            <td className="p-1">
                                                <input
                                                    type="text"
                                                    disabled={readOnly}
                                                    placeholder="Sign"
                                                    value={day3Data.signShiftIncharge || ""}
                                                    onChange={(e) => setDay3Data({ ...day3Data, signShiftIncharge: e.target.value })}
                                                    className="w-full text-center bg-transparent outline-none text-[9px]"
                                                />
                                            </td>
                                        </tr>

                                        {/* Row 3: Analysis report Hard Copy */}
                                        <tr className="border-b border-black h-7 bg-slate-100/70 font-semibold text-[9px]">
                                            <td className="border-r border-black p-1 font-bold bg-amber-100 leading-tight">
                                                Analysis report Hard Copy
                                            </td>
                                            {DAY_3_TOPICS.map((t) => (
                                                <td key={t.id} colSpan={t.colSpan || 1} className="border-r border-black p-0.5 text-muted-foreground">
                                                    NA
                                                </td>
                                            ))}
                                            <td colSpan={4} className="p-1 text-muted-foreground">No External Report</td>
                                        </tr>

                                        {/* Row 4: OBT. Mark */}
                                        <tr className="h-7 bg-slate-50/50">
                                            <td className="border-r border-black p-1 font-bold text-[9px] bg-amber-100">OBT. Mark</td>
                                            {DAY_3_TOPICS.map((t) => {
                                                const mark = day3Data.topics?.[t.id]?.mark;
                                                return (
                                                    <td key={t.id} colSpan={t.colSpan || 1} className="border-r border-black p-0.5">
                                                        <input
                                                            type="text"
                                                            disabled={readOnly}
                                                            value={mark !== undefined ? mark : ""}
                                                            onChange={(e) => handleDay3TopicChange(t.id, "mark", e.target.value)}
                                                            className="w-full text-center font-semibold bg-transparent outline-none"
                                                            placeholder={`Max ${t.weight}`}
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

                        </div>

                        {/* Summary & Result Section */}
                        <div className="grid grid-cols-12 gap-2 border-2 border-black p-2 mb-2">
                            {/* Summary Metrics */}
                            <div className="col-span-8 grid grid-cols-3 gap-2 border border-black p-2 bg-slate-50">
                                <div className="border-r border-black pr-2">
                                    <div className="font-bold text-xs uppercase text-slate-700">Total Content Mark</div>
                                    <div className="font-black text-lg text-blue-950 mt-1">{totalContentMarks}</div>
                                </div>
                                <div className="border-r border-black pr-2">
                                    <div className="font-bold text-xs uppercase text-slate-700">Total OBT. Mark</div>
                                    <div className="font-black text-lg text-blue-700 mt-1">{totalObtainedMark}</div>
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

                        {/* Guidelines, Remarks & Change Management */}
                        <div className="grid grid-cols-12 gap-2 border border-black p-2 mb-2 text-[10px]">
                            {/* Guidelines Column */}
                            <div className="col-span-5 pr-2 border-r border-black space-y-1">
                                <div className="font-bold uppercase border-b border-black pb-0.5">Guideline:-</div>
                                <ul className="space-y-0.5 list-disc pl-4 text-[9px] leading-tight">
                                    <li><span className="font-bold">*Each Question Contains 2 marks weightage.</span></li>
                                    <li>Attached Hard Copy of analysis report with practical evaluation .</li>
                                    <li>Evaluation Criteria is Above 80% is pass and Below 80% is Fail.</li>
                                    <li>Attached Analysis Report Hard Copy if required:</li>
                                </ul>
                                <div className="grid grid-cols-2 gap-1 text-[8px] border border-black p-1 bg-slate-50 mt-1">
                                    <div><span className="font-bold">NA:</span> Not Applicable</div>
                                    <div><span className="font-bold">√:</span> Required (Attached)</div>
                                </div>
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
                                    Change Management
                                </div>
                                <table className="w-full border-collapse text-[8px] text-center border border-black">
                                    <thead>
                                        <tr className="bg-slate-100 border-b border-black font-semibold">
                                            <th className="border-r border-black p-0.5">Rev Date</th>
                                            <th className="border-r border-black p-0.5">Rev.No</th>
                                            <th className="border-r border-black p-0.5">What Change</th>
                                            <th className="p-0.5">Why Change</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-yellow-100 font-semibold">
                                            <td className="border-r border-black p-0.5">2/5/2024</td>
                                            <td className="border-r border-black p-0.5">2</td>
                                            <td className="border-r border-black p-0.5">Common sheet for all department</td>
                                            <td className="p-0.5">Customer requirement</td>
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

export default Level3OJTTable;
