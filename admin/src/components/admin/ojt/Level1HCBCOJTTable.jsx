import React, { useRef, useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IconPrinter, IconDeviceFloppy, IconArrowLeft } from "@tabler/icons-react";
import { toast } from "sonner";
import { useGetOnJobTrainingByIdQuery, useUpdateOnJobTrainingMutation } from "@/Redux/AllApi/OnJobTrainingApi";

// 3 Days standard curriculum for HCBC (Hard Coating Base Coating / Surface Coating) as per sheet F/SC/01/005
const DEFAULT_HCBC_CURRICULUM = [
    {
        day: 1,
        dayLabel: "Day 1",
        learning: "Machine basics, Start up instruction, WI,Observation,Material flow, Escalation Process"
    },
    {
        day: 2,
        dayLabel: "Day 2",
        learning: "Machine basics Start up instruction, WI,Observation,Material flow, Escalation Process, Line visuals, Visual inspection,Hands on for 48 jobs"
    },
    {
        day: 3,
        dayLabel: "Day 3",
        learning: "Machine basics Start up instructions , SOS,Observation,Material flow, Escalation Process, Line visuals, Visual inspection,Visual defects, NC parts handling,Hands on for 48 jobs"
    }
];

const Level1HCBCOJTTable = ({
    ojtId,
    studentName = "Associate Name",
    model: initialModel = "HCBC",
    readOnly = false,
    onBack
}) => {
    const componentRef = useRef();

    const { data: ojtData, isLoading, refetch } = useGetOnJobTrainingByIdQuery(ojtId, { skip: !ojtId });
    const [updateOnJobTraining, { isLoading: isSaving }] = useUpdateOnJobTrainingMutation();

    const [docDetails, setDocDetails] = useState({
        docNo: "F/SC/01/005",
        revNo: "0",
        revDate: "10.08.2022"
    });

    const [headerInfo, setHeaderInfo] = useState({
        section: "HCBC",
        lineMachine: "",
        associateName: studentName,
        doj: ""
    });

    // 3 Days evaluation rows
    const [daysData, setDaysData] = useState([
        {
            day: 1,
            dayLabel: "Day 1",
            date: "",
            learning: DEFAULT_HCBC_CURRICULUM[0].learning,
            trainerName: "",
            remarks: "",
            totalProduced: "",
            okParts: "",
            defectiveParts: "",
            associateSign: "",
            tlEngineerSign: ""
        },
        {
            day: 2,
            dayLabel: "Day 2",
            date: "",
            learning: DEFAULT_HCBC_CURRICULUM[1].learning,
            trainerName: "",
            remarks: "",
            totalProduced: "",
            okParts: "",
            defectiveParts: "",
            associateSign: "",
            tlEngineerSign: ""
        },
        {
            day: 3,
            dayLabel: "Day 3",
            date: "",
            learning: DEFAULT_HCBC_CURRICULUM[2].learning,
            trainerName: "",
            remarks: "",
            totalProduced: "",
            okParts: "",
            defectiveParts: "",
            associateSign: "",
            tlEngineerSign: ""
        }
    ]);

    // Ruled lines for remarks
    const [remarkLines, setRemarkLines] = useState(["", "", "", ""]);

    // Signatures
    const [signatures, setSignatures] = useState({
        preparedBy: "",
        checkedBy: "",
        approvedBy: "",
        hrHead: ""
    });

    // Load data from backend when available
    useEffect(() => {
        if (ojtData?.data) {
            const data = ojtData.data;

            setDocDetails({
                docNo: data.docNo || "F/SC/01/005",
                revNo: data.revNo || "0",
                revDate: data.revDate || "10.08.2022"
            });

            setHeaderInfo({
                section: data.department?.name || data.model || "HCBC",
                lineMachine: `${data.line?.name || ""} / ${data.machine?.name || ""}`.trim().replace(/^\/|\/$/g, "") || "",
                associateName: data.student?.fullName || studentName,
                doj: data.student?.doj
                    ? new Date(data.student.doj).toLocaleDateString()
                    : data.student?.createdAt
                    ? new Date(data.student.createdAt).toLocaleDateString()
                    : ""
            });

            // Populate entries
            if (Array.isArray(data.entries) && data.entries.length > 0) {
                setDaysData(prev =>
                    prev.map((item, idx) => {
                        const entry = data.entries[idx] || {};
                        return {
                            ...item,
                            date: entry.date ? entry.date.toString().split("T")[0] : "",
                            learning: entry.learning || DEFAULT_HCBC_CURRICULUM[idx]?.learning || item.learning,
                            trainerName: entry.trainerName || entry.name || "",
                            remarks: entry.remarks ?? "",
                            totalProduced: entry.totalProduced ?? "",
                            okParts: entry.okParts ?? "",
                            defectiveParts: entry.defectiveParts ?? "",
                            associateSign: entry.associateSign ?? "",
                            tlEngineerSign: entry.tlEngineerSign || entry.tlSign || ""
                        };
                    })
                );
            }

            // Populate remarks
            if (data.remarks) {
                const lines = data.remarks.split("\n");
                setRemarkLines([
                    lines[0] || "",
                    lines[1] || "",
                    lines[2] || "",
                    lines[3] || ""
                ]);
            }

            // Populate scoring / signatures
            if (data.scoring && typeof data.scoring === "object") {
                if (data.scoring.signatures) {
                    setSignatures(data.scoring.signatures);
                }
            }
        }
    }, [ojtData, studentName]);

    // Handle row changes with auto calculation of defective parts
    const handleDayChange = (index, field, value) => {
        if (readOnly) return;
        setDaysData(prev => {
            const next = [...prev];
            const current = { ...next[index], [field]: value };

            // Auto calculate defective parts = totalProduced - okParts when both numeric
            if (field === "totalProduced" || field === "okParts") {
                const total = parseFloat(field === "totalProduced" ? value : current.totalProduced);
                const ok = parseFloat(field === "okParts" ? value : current.okParts);

                if (!isNaN(total) && !isNaN(ok)) {
                    const diff = total - ok;
                    current.defectiveParts = diff >= 0 ? String(diff) : "0";
                }
            }

            next[index] = current;
            return next;
        });
    };

    // Calculate totals, OK percentage and Pass/Fail result
    const stats = useMemo(() => {
        let totalProducedSum = 0;
        let totalOkSum = 0;
        let defectiveSum = 0;
        let validDaysCount = 0;

        daysData.forEach(d => {
            const prod = parseFloat(d.totalProduced);
            const ok = parseFloat(d.okParts);
            const def = parseFloat(d.defectiveParts);

            if (!isNaN(prod) && prod > 0) {
                totalProducedSum += prod;
                validDaysCount += 1;
            }
            if (!isNaN(ok)) {
                totalOkSum += ok;
            }
            if (!isNaN(def)) {
                defectiveSum += def;
            }
        });

        // The SOP requirement:
        // Result: Pass ≥ 60%, Fail ≤ 60%
        const okPercentage = totalProducedSum > 0 ? (totalOkSum / totalProducedSum) * 100 : 0;
        const isPassed = okPercentage >= 60 && totalProducedSum > 0;

        return {
            totalProducedSum,
            totalOkSum,
            defectiveSum,
            okPercentage,
            validDaysCount,
            isPassed,
            statusText: validDaysCount === 0
                ? "Not Evaluated"
                : isPassed
                ? `Pass (${okPercentage.toFixed(1)}% ≥ 60%)`
                : `Fail (${okPercentage.toFixed(1)}% < 60%)`
        };
    }, [daysData]);

    const handleSave = async () => {
        try {
            const combinedRemarks = remarkLines.filter(Boolean).join("\n");
            const totalMaxMarks = 100; // Evaluation percentage scale
            const obtainedMarks = Math.round(stats.okPercentage * 10) / 10;
            const percentage = stats.okPercentage.toFixed(1);

            await updateOnJobTraining({
                id: ojtId,
                sheetKey: "L1_HCBC",
                docNo: docDetails.docNo,
                revNo: docDetails.revNo,
                revDate: docDetails.revDate,
                entries: daysData,
                scoring: {
                    totalProduced: stats.totalProducedSum,
                    totalOkParts: stats.totalOkSum,
                    defectiveParts: stats.defectiveSum,
                    okPercentage: stats.okPercentage,
                    evaluationResult: stats.isPassed ? "Pass" : "Fail",
                    signatures
                },
                totalMarks: totalMaxMarks,
                totalMarksObtained: obtainedMarks,
                totalPercentage: percentage,
                result: stats.isPassed ? "Pass" : "Fail",
                remarks: combinedRemarks
            }).unwrap();

            toast.success("Level-1 HCBC Evaluation Saved Successfully");
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
            {/* Top Action Bar */}
            <div className="flex items-center justify-between no-print gap-3">
                <div className="flex items-center gap-2">
                    {onBack && (
                        <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
                            <IconArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                    )}
                    <span className="text-sm font-semibold text-foreground">
                        Level-1 HCBC Practical Evaluation (F/SC/01/005)
                    </span>
                    <Badge
                        variant={stats.isPassed ? "default" : "secondary"}
                        className={
                            stats.validDaysCount === 0
                                ? "bg-slate-500 text-white"
                                : stats.isPassed
                                ? "bg-emerald-600 text-white"
                                : "bg-rose-600 text-white"
                        }
                    >
                        {stats.statusText}
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                        <IconPrinter className="h-4 w-4" />
                        Print Form
                    </Button>
                    {!readOnly && (
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        >
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
                                Level-1 Practical Evaluation of On the Job Training
                            </div>
                            <div className="col-span-3 text-[10px] border-l-2 border-black pl-2">
                                <div className="grid grid-cols-2 py-0.5 border-b border-black">
                                    <span className="font-semibold">Doc. No.</span>
                                    {readOnly ? (
                                        <span>{docDetails.docNo}</span>
                                    ) : (
                                        <Input
                                            className="h-4 p-0 text-[10px] border-none focus-visible:ring-0"
                                            value={docDetails.docNo}
                                            onChange={e => setDocDetails(prev => ({ ...prev, docNo: e.target.value }))}
                                        />
                                    )}
                                </div>
                                <div className="grid grid-cols-2 py-0.5 border-b border-black">
                                    <span className="font-semibold">Rev.no.</span>
                                    {readOnly ? (
                                        <span>{docDetails.revNo}</span>
                                    ) : (
                                        <Input
                                            className="h-4 p-0 text-[10px] border-none focus-visible:ring-0"
                                            value={docDetails.revNo}
                                            onChange={e => setDocDetails(prev => ({ ...prev, revNo: e.target.value }))}
                                        />
                                    )}
                                </div>
                                <div className="grid grid-cols-2 py-0.5">
                                    <span className="font-semibold">Rev Date :-</span>
                                    {readOnly ? (
                                        <span>{docDetails.revDate}</span>
                                    ) : (
                                        <Input
                                            className="h-4 p-0 text-[10px] border-none focus-visible:ring-0"
                                            value={docDetails.revDate}
                                            onChange={e => setDocDetails(prev => ({ ...prev, revDate: e.target.value }))}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section / Associate Info Sub-header */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs py-2 px-1 border-b-2 border-black">
                            <div className="flex items-center gap-2">
                                <span className="font-bold underline">Section :</span>
                                <span className="font-semibold">
                                    {readOnly ? (
                                        headerInfo.section
                                    ) : (
                                        <Input
                                            className="h-5 px-1 py-0 text-xs border-b border-t-0 border-l-0 border-r-0 rounded-none border-black focus-visible:ring-0 w-48 inline-block"
                                            value={headerInfo.section}
                                            onChange={e => setHeaderInfo(prev => ({ ...prev, section: e.target.value }))}
                                        />
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold underline">Line/Machine:</span>
                                <span className="font-semibold flex-1">
                                    {readOnly ? (
                                        headerInfo.lineMachine
                                    ) : (
                                        <Input
                                            className="h-5 px-1 py-0 text-xs border-b border-t-0 border-l-0 border-r-0 rounded-none border-black focus-visible:ring-0 w-full"
                                            value={headerInfo.lineMachine}
                                            onChange={e => setHeaderInfo(prev => ({ ...prev, lineMachine: e.target.value }))}
                                            placeholder="Enter Line/Machine"
                                        />
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold underline">Name of Associate :</span>
                                <span className="font-semibold border-b border-black flex-1 min-h-[20px] px-1">
                                    {headerInfo.associateName}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold underline">Date of joining</span>
                                <span className="font-semibold flex-1">
                                    {readOnly ? (
                                        headerInfo.doj
                                    ) : (
                                        <Input
                                            type="date"
                                            className="h-5 px-1 py-0 text-xs border-b border-t-0 border-l-0 border-r-0 rounded-none border-black focus-visible:ring-0 w-44"
                                            value={headerInfo.doj}
                                            onChange={e => setHeaderInfo(prev => ({ ...prev, doj: e.target.value }))}
                                        />
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Main 3-Day Evaluation Table */}
                        <div className="my-1">
                            <table className="w-full border-collapse border border-black text-center text-[10.5px]">
                                <thead>
                                    <tr className="bg-slate-100 font-bold border-b border-black">
                                        <th className="border-r border-black p-2 w-[70px]">Day</th>
                                        <th className="border-r border-black p-2 w-[95px]">Date</th>
                                        <th className="border-r border-black p-2 text-left min-w-[340px]">Learning</th>
                                        <th className="border-r border-black p-2 w-[110px]">name</th>
                                        <th className="border-r border-black p-2 w-[120px]">Remarks</th>
                                        <th className="border-r border-black p-2 w-[110px] bg-blue-50/50">Total Parts Produced</th>
                                        <th className="border-r border-black p-2 w-[100px] bg-emerald-50 text-emerald-950">Total OK parts</th>
                                        <th className="border-r border-black p-2 w-[100px] bg-rose-50 text-rose-950">Defective parts</th>
                                        <th className="border-r border-black p-2 w-[90px]">Associate sign</th>
                                        <th className="p-2 w-[85px]">TL /Engineer Sign</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {daysData.map((row, idx) => (
                                        <tr key={row.day} className="border-b border-black hover:bg-slate-50/50">
                                            {/* Day */}
                                            <td className="border-r border-black p-2 font-bold bg-slate-50">
                                                {row.dayLabel}
                                            </td>

                                            {/* Date */}
                                            <td className="border-r border-black p-1">
                                                {readOnly ? (
                                                    <span>{row.date || "—"}</span>
                                                ) : (
                                                    <Input
                                                        type="date"
                                                        value={row.date}
                                                        onChange={e => handleDayChange(idx, "date", e.target.value)}
                                                        className="h-7 w-full text-center p-0 border-none focus-visible:ring-0 text-[10px]"
                                                    />
                                                )}
                                            </td>

                                            {/* Learning content */}
                                            <td className="border-r border-black p-2 text-left leading-relaxed font-medium">
                                                {row.learning}
                                            </td>

                                            {/* Trainer / Evaluator Name */}
                                            <td className="border-r border-black p-1">
                                                {readOnly ? (
                                                    <span>{row.trainerName || "—"}</span>
                                                ) : (
                                                    <Input
                                                        value={row.trainerName}
                                                        onChange={e => handleDayChange(idx, "trainerName", e.target.value)}
                                                        placeholder="Trainer name"
                                                        className="h-7 w-full text-center p-1 border-none focus-visible:ring-0 text-[10px]"
                                                    />
                                                )}
                                            </td>

                                            {/* Remarks */}
                                            <td className="border-r border-black p-1">
                                                {readOnly ? (
                                                    <span>{row.remarks || "—"}</span>
                                                ) : (
                                                    <Input
                                                        value={row.remarks}
                                                        onChange={e => handleDayChange(idx, "remarks", e.target.value)}
                                                        placeholder="Remarks"
                                                        className="h-7 w-full text-center p-1 border-none focus-visible:ring-0 text-[10px]"
                                                    />
                                                )}
                                            </td>

                                            {/* Total Parts Produced */}
                                            <td className="border-r border-black p-1 bg-blue-50/30">
                                                {readOnly ? (
                                                    <span className="font-bold text-blue-900 text-xs">
                                                        {row.totalProduced !== "" ? row.totalProduced : "—"}
                                                    </span>
                                                ) : (
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={row.totalProduced}
                                                        onChange={e => handleDayChange(idx, "totalProduced", e.target.value)}
                                                        placeholder="e.g. 48"
                                                        className="h-7 w-full text-center p-1 font-bold text-blue-900 border-none focus-visible:ring-0 text-xs"
                                                    />
                                                )}
                                            </td>

                                            {/* Total OK parts */}
                                            <td className="border-r border-black p-1 bg-emerald-50/40">
                                                {readOnly ? (
                                                    <span className="font-bold text-emerald-800 text-xs">
                                                        {row.okParts !== "" ? row.okParts : "—"}
                                                    </span>
                                                ) : (
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={row.okParts}
                                                        onChange={e => handleDayChange(idx, "okParts", e.target.value)}
                                                        placeholder="OK parts"
                                                        className="h-7 w-full text-center p-1 font-bold text-emerald-800 border-none focus-visible:ring-0 text-xs"
                                                    />
                                                )}
                                            </td>

                                            {/* Defective parts */}
                                            <td className="border-r border-black p-1 bg-rose-50/40">
                                                {readOnly ? (
                                                    <span className="font-semibold text-rose-800 text-xs">
                                                        {row.defectiveParts !== "" ? row.defectiveParts : "—"}
                                                    </span>
                                                ) : (
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={row.defectiveParts}
                                                        onChange={e => handleDayChange(idx, "defectiveParts", e.target.value)}
                                                        placeholder="Defective"
                                                        className="h-7 w-full text-center p-1 font-semibold text-rose-800 border-none focus-visible:ring-0 text-xs"
                                                    />
                                                )}
                                            </td>

                                            {/* Associate sign */}
                                            <td className="border-r border-black p-1">
                                                {readOnly ? (
                                                    <span>{row.associateSign || "—"}</span>
                                                ) : (
                                                    <Input
                                                        value={row.associateSign}
                                                        onChange={e => handleDayChange(idx, "associateSign", e.target.value)}
                                                        placeholder="Sign"
                                                        className="h-7 w-full text-center p-1 border-none focus-visible:ring-0 text-[10px]"
                                                    />
                                                )}
                                            </td>

                                            {/* TL /Engineer Sign */}
                                            <td className="p-1">
                                                {readOnly ? (
                                                    <span>{row.tlEngineerSign || "—"}</span>
                                                ) : (
                                                    <Input
                                                        value={row.tlEngineerSign}
                                                        onChange={e => handleDayChange(idx, "tlEngineerSign", e.target.value)}
                                                        placeholder="Sign"
                                                        className="h-7 w-full text-center p-1 border-none focus-visible:ring-0 text-[10px]"
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Total Row */}
                                    <tr className="border-b border-black font-bold">
                                        <td colSpan="5" className="border-r border-black p-2 text-right tracking-wider uppercase text-[11px] bg-slate-50">
                                            Total
                                        </td>
                                        <td className="border-r border-black p-2 text-center text-xs font-black text-blue-900 bg-blue-100/50">
                                            {stats.totalProducedSum}
                                        </td>
                                        <td className="border-r border-black p-2 text-center text-xs font-black text-emerald-800 bg-emerald-100/50">
                                            {stats.totalOkSum}
                                        </td>
                                        <td className="border-r border-black p-2 text-center text-xs font-bold text-rose-800 bg-rose-100/50">
                                            {stats.defectiveSum}
                                        </td>
                                        <td className="border-r border-black p-1"></td>
                                        <td className="p-1"></td>
                                    </tr>

                                    {/* % Row */}
                                    <tr className="border-b border-black font-bold">
                                        <td colSpan="5" className="border-r border-black p-2 text-right uppercase text-[11px] bg-slate-50">
                                            %
                                        </td>
                                        <td className="border-r border-black p-2 text-center text-xs text-muted-foreground bg-slate-100">
                                            —
                                        </td>
                                        <td className="border-r border-black p-2 text-center text-xs font-black text-emerald-800 bg-emerald-100/60">
                                            {stats.totalProducedSum > 0 ? `${stats.okPercentage.toFixed(1)}%` : "—"}
                                        </td>
                                        <td className="border-r border-black p-2 text-center text-xs font-bold text-rose-800 bg-rose-100/60">
                                            {stats.totalProducedSum > 0 ? `${((stats.defectiveSum / stats.totalProducedSum) * 100).toFixed(1)}%` : "—"}
                                        </td>
                                        <td className="border-r border-black p-1"></td>
                                        <td className="p-1"></td>
                                    </tr>

                                    {/* Result Pass ≥ 60%, Fail ≤ 60% */}
                                    <tr className="border-b border-black font-bold">
                                        <td colSpan="5" className="border-r border-black p-2 text-right uppercase text-[11px] bg-slate-100">
                                            Result <br />
                                            <span className="text-[10px] normal-case text-muted-foreground font-semibold">
                                                Pass &ge; 60%, Fail &le; 60%
                                            </span>
                                        </td>
                                        <td colSpan="3" className={`p-2 text-center text-xs font-black tracking-wide ${stats.isPassed ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
                                            {stats.validDaysCount === 0 ? "Pending Evaluation" : stats.isPassed ? `PASS (${stats.okPercentage.toFixed(1)}% ≥ 60%)` : `FAIL (${stats.okPercentage.toFixed(1)}% ≤ 60%)`}
                                        </td>
                                        <td className="border-r border-black p-1"></td>
                                        <td className="p-1"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Ruled Remarks Section */}
                        <div className="border border-black my-1">
                            <div className="p-1 font-bold text-xs bg-slate-100 border-b border-black">
                                Remark :
                            </div>
                            <div className="divide-y divide-black">
                                {remarkLines.map((line, idx) => (
                                    <div key={idx} className="h-6 px-2 flex items-center bg-white">
                                        {readOnly ? (
                                            <span className="text-xs">{line}</span>
                                        ) : (
                                            <input
                                                type="text"
                                                value={line}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setRemarkLines(prev => {
                                                        const next = [...prev];
                                                        next[idx] = val;
                                                        return next;
                                                    });
                                                }}
                                                placeholder={idx === 0 ? "Trainer / Engineer remarks & feedback during 3 days HCBC evaluation..." : ""}
                                                className="w-full text-xs border-none bg-transparent focus:outline-none p-0"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Signatures Block */}
                        <div className="grid grid-cols-4 border border-black text-center font-bold text-xs mt-2">
                            <div className="border-r border-black p-1.5 bg-slate-100">Prepared By</div>
                            <div className="border-r border-black p-1.5 bg-slate-100">Checked By</div>
                            <div className="border-r border-black p-1.5 bg-slate-100">Approved By (HOD)</div>
                            <div className="p-1.5 bg-slate-100">HR Head</div>

                            {/* Signature inputs */}
                            <div className="border-r border-black h-12 p-1 flex items-end justify-center">
                                {readOnly ? (
                                    <span className="text-xs">{signatures.preparedBy}</span>
                                ) : (
                                    <Input
                                        className="h-6 border-none text-center text-xs p-0 focus-visible:ring-0"
                                        placeholder="Sign / Name"
                                        value={signatures.preparedBy}
                                        onChange={e => setSignatures(prev => ({ ...prev, preparedBy: e.target.value }))}
                                    />
                                )}
                            </div>
                            <div className="border-r border-black h-12 p-1 flex items-end justify-center">
                                {readOnly ? (
                                    <span className="text-xs">{signatures.checkedBy}</span>
                                ) : (
                                    <Input
                                        className="h-6 border-none text-center text-xs p-0 focus-visible:ring-0"
                                        placeholder="Sign / Name"
                                        value={signatures.checkedBy}
                                        onChange={e => setSignatures(prev => ({ ...prev, checkedBy: e.target.value }))}
                                    />
                                )}
                            </div>
                            <div className="border-r border-black h-12 p-1 flex items-end justify-center">
                                {readOnly ? (
                                    <span className="text-xs">{signatures.approvedBy}</span>
                                ) : (
                                    <Input
                                        className="h-6 border-none text-center text-xs p-0 focus-visible:ring-0"
                                        placeholder="Sign / Name"
                                        value={signatures.approvedBy}
                                        onChange={e => setSignatures(prev => ({ ...prev, approvedBy: e.target.value }))}
                                    />
                                )}
                            </div>
                            <div className="h-12 p-1 flex items-end justify-center">
                                {readOnly ? (
                                    <span className="text-xs">{signatures.hrHead}</span>
                                ) : (
                                    <Input
                                        className="h-6 border-none text-center text-xs p-0 focus-visible:ring-0"
                                        placeholder="Sign / Name"
                                        value={signatures.hrHead}
                                        onChange={e => setSignatures(prev => ({ ...prev, hrHead: e.target.value }))}
                                    />
                                )}
                            </div>
                        </div>

                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .no-print {
                        display: none !important;
                    }
                    div[class*="overflow-x-auto"] {
                        overflow: visible !important;
                    }
                    .print\\:border-none {
                        border: none !important;
                    }
                    .print\\:shadow-none {
                        box-shadow: none !important;
                    }
                    /* Make card printable */
                    [class*="min-w-[1050px]"],
                    [class*="min-w-[1050px]"] * {
                        visibility: visible;
                    }
                    [class*="min-w-[1050px]"] {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        min-width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    input {
                        border: none !important;
                        background: transparent !important;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Level1HCBCOJTTable;
