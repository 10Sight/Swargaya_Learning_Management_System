import React, { useRef, useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IconPrinter, IconDeviceFloppy, IconArrowLeft } from "@tabler/icons-react";
import { toast } from "sonner";
import { useGetOnJobTrainingByIdQuery, useUpdateOnJobTrainingMutation } from "@/Redux/AllApi/OnJobTrainingApi";

// 3 Days standard curriculum for Moulding department as per sheet F/IM/01/010
const DEFAULT_DAYS_CURRICULUM = [
    {
        day: 1,
        dayLabel: "Day 1",
        learning: "Machine basics, SOS, Material flow, Escalation Process. Part Handling, Degating"
    },
    {
        day: 2,
        dayLabel: "Day 2",
        learning: "Machine Basic operation (Manual, Semiauto, Auto) Visual inspection, Endon Escalation, Production Report, Defect Knowledge."
    },
    {
        day: 3,
        dayLabel: "Day 3",
        learning: "Mould Loading Unloading, AMC, 5'S Check sheet, start up Check sheet. Accessories like MTC, conveyor, HRS, Robo working."
    }
];

const Level1MouldingOJTTable = ({
    ojtId,
    studentName = "Associate Name",
    model: initialModel = "Moulding",
    readOnly = false,
    onBack
}) => {
    const componentRef = useRef();

    const { data: ojtData, isLoading, refetch } = useGetOnJobTrainingByIdQuery(ojtId, { skip: !ojtId });
    const [updateOnJobTraining, { isLoading: isSaving }] = useUpdateOnJobTrainingMutation();

    const [docDetails, setDocDetails] = useState({
        docNo: "F/IM/01/010",
        revNo: "4",
        revDate: "10.08.2022"
    });

    const [headerInfo, setHeaderInfo] = useState({
        section: "Moulding",
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
            learning: DEFAULT_DAYS_CURRICULUM[0].learning,
            customerComplain: "",
            trainerName: "",
            remarks: "",
            following: "",
            notFollowing: "",
            associateSign: "",
            tlSign: ""
        },
        {
            day: 2,
            dayLabel: "Day 2",
            date: "",
            learning: DEFAULT_DAYS_CURRICULUM[1].learning,
            customerComplain: "",
            trainerName: "",
            remarks: "",
            following: "",
            notFollowing: "",
            associateSign: "",
            tlSign: ""
        },
        {
            day: 3,
            dayLabel: "Day 3",
            date: "",
            learning: DEFAULT_DAYS_CURRICULUM[2].learning,
            customerComplain: "",
            trainerName: "",
            remarks: "",
            following: "",
            notFollowing: "",
            associateSign: "",
            tlSign: ""
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
                docNo: data.docNo || "F/IM/01/010",
                revNo: data.revNo || "4",
                revDate: data.revDate || "10.08.2022"
            });

            setHeaderInfo({
                section: data.department?.name || data.model || "Moulding",
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
                            learning: entry.learning || DEFAULT_DAYS_CURRICULUM[idx]?.learning || item.learning,
                            customerComplain: entry.customerComplain ?? "",
                            trainerName: entry.trainerName ?? "",
                            remarks: entry.remarks ?? "",
                            following: entry.following !== undefined ? entry.following : "",
                            notFollowing: entry.notFollowing !== undefined ? entry.notFollowing : "",
                            associateSign: entry.associateSign ?? "",
                            tlSign: entry.tlSign ?? ""
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

    // Handle day row changes with auto calculation of 'notFollowing'
    const handleDayChange = (index, field, value) => {
        if (readOnly) return;
        setDaysData(prev => {
            const next = [...prev];
            const current = { ...next[index], [field]: value };

            // If user enters 'following', auto calculate 'notFollowing' = 50 - following if numeric
            if (field === "following") {
                const num = parseFloat(value);
                if (!isNaN(num) && num >= 0 && num <= 50) {
                    current.notFollowing = String(50 - num);
                } else if (value === "") {
                    current.notFollowing = "";
                }
            }

            next[index] = current;
            return next;
        });
    };

    // Calculate totals and result
    const stats = useMemo(() => {
        let totalFollowing = 0;
        let totalNotFollowing = 0;
        let validDaysCount = 0;

        daysData.forEach(d => {
            const f = parseFloat(d.following);
            const nf = parseFloat(d.notFollowing);

            if (!isNaN(f)) {
                totalFollowing += f;
                validDaysCount += 1;
            }
            if (!isNaN(nf)) {
                totalNotFollowing += nf;
            }
        });

        // The SOP requirement:
        // "If Operator following learning Avg. 40 sample in 3 Days then He pass the evaluation.
        // If Avg is below 40 then repeat the OJT process"
        const averageFollowing = validDaysCount > 0 ? (totalFollowing / validDaysCount) : 0;
        const isCompleted = validDaysCount === 3;
        const isPassed = averageFollowing >= 40 && validDaysCount > 0;

        return {
            totalFollowing,
            totalNotFollowing,
            averageFollowing,
            validDaysCount,
            isCompleted,
            isPassed,
            statusText: validDaysCount === 0
                ? "Not Evaluated"
                : isPassed
                ? `Pass (Avg: ${averageFollowing.toFixed(1)} / 50)`
                : `Repeat OJT (Avg: ${averageFollowing.toFixed(1)} / 50)`
        };
    }, [daysData]);

    const handleSave = async () => {
        try {
            const combinedRemarks = remarkLines.filter(Boolean).join("\n");
            const totalMaxMarks = 50; // Evaluation out of 50 samples
            const obtainedMarks = Math.round(stats.averageFollowing * 10) / 10;
            const percentage = stats.validDaysCount > 0 ? ((stats.totalFollowing / (stats.validDaysCount * 50)) * 100).toFixed(1) : "0";

            await updateOnJobTraining({
                id: ojtId,
                sheetKey: "L1_MOULDING",
                docNo: docDetails.docNo,
                revNo: docDetails.revNo,
                revDate: docDetails.revDate,
                entries: daysData,
                scoring: {
                    totalFollowing: stats.totalFollowing,
                    totalNotFollowing: stats.totalNotFollowing,
                    averageFollowing: stats.averageFollowing,
                    evaluationResult: stats.isPassed ? "Pass" : "Repeat OJT",
                    signatures
                },
                totalMarks: totalMaxMarks,
                totalMarksObtained: obtainedMarks,
                totalPercentage: percentage,
                result: stats.isPassed ? "Pass" : "Repeat OJT",
                remarks: combinedRemarks
            }).unwrap();

            toast.success("Level-1 Moulding Evaluation Saved Successfully");
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
                        Level-1 Moulding Practical Evaluation (F/IM/01/010)
                    </span>
                    <Badge
                        variant={stats.isPassed ? "default" : "secondary"}
                        className={
                            stats.validDaysCount === 0
                                ? "bg-slate-500 text-white"
                                : stats.isPassed
                                ? "bg-emerald-600 text-white"
                                : "bg-amber-600 text-white"
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
                                    <span className="font-semibold">Doc no:</span>
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
                                    <span className="font-semibold">Rev no:</span>
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
                                    <span className="font-semibold">Rev Date:</span>
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
                                <span className="font-bold underline">Date of joining:</span>
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
                                        <th className="border-r border-black p-2 w-[100px]">Date</th>
                                        <th className="border-r border-black p-2 text-left min-w-[320px]">Learning</th>
                                        <th className="border-r border-black p-2 w-[90px]">Customer Complain</th>
                                        <th className="border-r border-black p-2 w-[110px]">Trainer Name</th>
                                        <th className="border-r border-black p-2 w-[110px]">Remarks</th>
                                        <th className="border-r border-black p-2 w-[110px] bg-emerald-50 text-emerald-950">
                                            Following As learning <br />
                                            <span className="font-normal text-[9.5px]">(Check for 50 parts)</span>
                                        </th>
                                        <th className="border-r border-black p-2 w-[110px] bg-rose-50 text-rose-950">
                                            Not Following learning <br />
                                            <span className="font-normal text-[9.5px]">(Check for 50 parts)</span>
                                        </th>
                                        <th className="border-r border-black p-2 w-[90px]">Associate sign</th>
                                        <th className="p-2 w-[80px]">TL Sign</th>
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

                                            {/* Customer Complain */}
                                            <td className="border-r border-black p-1">
                                                {readOnly ? (
                                                    <span>{row.customerComplain || "—"}</span>
                                                ) : (
                                                    <Input
                                                        value={row.customerComplain}
                                                        onChange={e => handleDayChange(idx, "customerComplain", e.target.value)}
                                                        placeholder="Nil / None"
                                                        className="h-7 w-full text-center p-1 border-none focus-visible:ring-0 text-[10px]"
                                                    />
                                                )}
                                            </td>

                                            {/* Trainer Name */}
                                            <td className="border-r border-black p-1">
                                                {readOnly ? (
                                                    <span>{row.trainerName || "—"}</span>
                                                ) : (
                                                    <Input
                                                        value={row.trainerName}
                                                        onChange={e => handleDayChange(idx, "trainerName", e.target.value)}
                                                        placeholder="Trainer"
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

                                            {/* Following (50 parts) */}
                                            <td className="border-r border-black p-1 bg-emerald-50/40">
                                                {readOnly ? (
                                                    <span className="font-bold text-emerald-800 text-xs">
                                                        {row.following !== "" ? row.following : "—"}
                                                    </span>
                                                ) : (
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="50"
                                                        value={row.following}
                                                        onChange={e => handleDayChange(idx, "following", e.target.value)}
                                                        placeholder="0-50"
                                                        className="h-7 w-full text-center p-1 font-bold text-emerald-800 border-none focus-visible:ring-0 text-xs"
                                                    />
                                                )}
                                            </td>

                                            {/* Not Following (50 parts) */}
                                            <td className="border-r border-black p-1 bg-rose-50/40">
                                                {readOnly ? (
                                                    <span className="font-semibold text-rose-800 text-xs">
                                                        {row.notFollowing !== "" ? row.notFollowing : "—"}
                                                    </span>
                                                ) : (
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="50"
                                                        value={row.notFollowing}
                                                        onChange={e => handleDayChange(idx, "notFollowing", e.target.value)}
                                                        placeholder="0-50"
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

                                            {/* TL Sign */}
                                            <td className="p-1">
                                                {readOnly ? (
                                                    <span>{row.tlSign || "—"}</span>
                                                ) : (
                                                    <Input
                                                        value={row.tlSign}
                                                        onChange={e => handleDayChange(idx, "tlSign", e.target.value)}
                                                        placeholder="Sign"
                                                        className="h-7 w-full text-center p-1 border-none focus-visible:ring-0 text-[10px]"
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Total Row */}
                                    <tr className="border-b border-black font-bold">
                                        <td colSpan="6" className="border-r border-black p-2 text-right tracking-wider uppercase text-[11px] bg-slate-50">
                                            Total
                                        </td>
                                        <td className="border-r border-black p-2 text-center text-xs font-black text-emerald-800 bg-emerald-100/50">
                                            {stats.totalFollowing} <span className="text-[9px] font-normal text-muted-foreground">/ {stats.validDaysCount * 50}</span>
                                        </td>
                                        <td className="border-r border-black p-2 text-center text-xs font-bold text-rose-800 bg-rose-100/50">
                                            {stats.totalNotFollowing} <span className="text-[9px] font-normal text-muted-foreground">/ {stats.validDaysCount * 50}</span>
                                        </td>
                                        <td className="border-r border-black p-1"></td>
                                        <td className="p-1"></td>
                                    </tr>

                                    {/* Evaluation Result Row */}
                                    <tr className="border-b border-black font-bold">
                                        <td colSpan="6" className="border-r border-black p-2 text-left text-[10px] italic text-slate-700 bg-slate-50/70">
                                            * If Operator following learning Avg. 40 sample in 3 Days then He pass the evaluation.
                                            <br />
                                            &nbsp;&nbsp;If Avg is below 40 then repeat the OJT process
                                        </td>
                                        <td className="border-r border-black p-2 text-right uppercase text-[11px] bg-slate-100">
                                            Evaluation Result
                                        </td>
                                        <td colSpan="3" className={`p-2 text-center text-xs font-black tracking-wide ${stats.isPassed ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}>
                                            {stats.validDaysCount === 0 ? "Pending Evaluation" : stats.isPassed ? `PASS (Avg: ${stats.averageFollowing.toFixed(1)} / 50)` : `REPEAT OJT (Avg: ${stats.averageFollowing.toFixed(1)} / 50)`}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Full Width Competency Note */}
                        <div className="border border-black p-1.5 my-1 text-[10.5px] font-medium bg-slate-50">
                            <span className="font-bold">Note:</span> If operator is complete his basic competency (refer format - Upgradation Plan F/IM/01/009) with &gt; 60% then he is eligible for On Job Training.
                        </div>

                        {/* Ruled Remarks Section */}
                        <div className="border border-black my-1">
                            <div className="p-1 font-bold text-xs bg-slate-100 border-b border-black">
                                Remark:
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
                                                placeholder={idx === 0 ? "Trainer / Incharge comments & observed performance during 3 days training..." : ""}
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

export default Level1MouldingOJTTable;
