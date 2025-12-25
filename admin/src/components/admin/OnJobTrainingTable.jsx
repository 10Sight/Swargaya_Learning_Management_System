import React, { useRef, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconPrinter, IconDownload, IconDeviceFloppy } from "@tabler/icons-react";
import { toast } from "sonner";
import { useGetOnJobTrainingQuery, useSaveOnJobTrainingMutation } from "@/Redux/AllApi/OnJobTrainingApi";

const OnJobTrainingTable = ({ studentName = "Associate Name", model = "Model Name", readOnly = false }) => {
    const { studentId } = useParams();
    const componentRef = useRef();

    // API Hooks
    const { data: ojtData, isLoading, refetch } = useGetOnJobTrainingQuery(studentId);
    const [saveOnJobTraining, { isLoading: isSaving }] = useSaveOnJobTrainingMutation();

    // Local State
    const [entries, setEntries] = useState(Array(15).fill({}));
    const [remarks, setRemarks] = useState("");

    // Summary State
    const [summary, setSummary] = useState({
        totalMarksObtained: "",
        totalPercentage: "",
        result: "",
    });

    // Initialize state when data is fetched
    useEffect(() => {
        if (ojtData?.data) {
            const fetchedEntries = ojtData.data.entries || [];
            // Merge fetched entries with empty rows to ensure 15 rows always
            const mergedEntries = Array(15).fill({}).map((_, i) => fetchedEntries[i] || {});
            setEntries(mergedEntries);

            setRemarks(ojtData.data.remarks || "");
            setSummary({
                totalMarksObtained: ojtData.data.totalMarksObtained || "",
                totalPercentage: ojtData.data.totalPercentage || "",
                result: ojtData.data.result || "",
            });
        }
    }, [ojtData]);

    const handlePrint = () => {
        window.print();
    };

    const handleEntryChange = (index, field, value) => {
        if (readOnly) return;
        const newEntries = [...entries];
        newEntries[index] = { ...newEntries[index], [field]: value };
        setEntries(newEntries);
    };

    const handleSummaryChange = (field, value) => {
        if (readOnly) return;
        setSummary(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        try {
            const payload = {
                studentId,
                data: {
                    entries,
                    remarks,
                    totalMarksObtained: summary.totalMarksObtained,
                    totalPercentage: summary.totalPercentage,
                    result: summary.result,
                }
            };

            await saveOnJobTraining(payload).unwrap();
            toast.success("Evaluation saved successfully!");
            refetch();
        } catch (error) {
            toast.error(error?.data?.message || "Failed to save evaluation");
        }
    };

    if (isLoading) return <div className="p-4 text-center">Loading evaluation data...</div>;

    return (
        <div className="space-y-6 print:space-y-0 text-xs sm:text-xs">
            <style>
                {`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-content, #printable-content * {
              visibility: visible;
            }
            #printable-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
            input {
                border: none !important;
                background: transparent !important;
                padding: 0 !important;
                text-align: center;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}
            </style>
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm no-print border">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">On Job Training Evaluation</h1>
                    <p className="text-sm text-gray-500">
                        Level-1 Practical Evaluation of On the Job Training
                    </p>
                </div>
                <div className="flex gap-2">
                    {!readOnly && (
                        <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-blue-600 hover:bg-blue-700">
                            <IconDeviceFloppy className="w-4 h-4" />
                            {isSaving ? "Saving..." : "Save Data"}
                        </Button>
                    )}
                    <Button variant="outline" className="gap-2" onClick={handlePrint}>
                        <IconPrinter className="w-4 h-4" />
                        Print Form
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden border-none shadow-none">
                <CardContent className="p-0 overflow-x-auto">
                    <div className="p-2 min-w-[1200px] bg-white" ref={componentRef} id="printable-content">
                        {/* Header Details */}
                        <div className="flex justify-between items-start mb-2 border-b-2 border-black pb-2">
                            <div className="flex items-center gap-4">
                                <img src="/motherson+marelli.png" alt="Logo" className="h-8 md:h-10" />
                                <h2 className="font-bold text-lg border-b border-black">Level-1 Practical Evaluation of On the Job Training</h2>
                            </div>
                            <div className="grid grid-cols-1 border border-black text-xs">
                                <div className="flex border-b border-black">
                                    <span className="p-1 border-r border-black font-semibold bg-gray-100 w-20">Doc. No.</span>
                                    <span className="p-1 w-32"></span>
                                </div>
                                <div className="flex border-b border-black">
                                    <span className="p-1 border-r border-black font-semibold bg-gray-100 w-20">Rev. No.</span>
                                    <span className="p-1 w-32">06</span>
                                </div>
                                <div className="flex">
                                    <span className="p-1 border-r border-black font-semibold bg-gray-100 w-20">Rev. Date</span>
                                    <span className="p-1 w-32">15-06-2024</span>
                                </div>
                            </div>
                        </div>

                        <div className="mb-4 grid grid-cols-2 gap-8 text-xs">
                            <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                                <span className="font-bold">Model:</span>
                                <div className="border-b border-black h-5 px-2 font-medium">{model}</div>
                                <span className="font-bold">Name of Associate:</span>
                                <div className="border-b border-black h-5 px-2 font-medium">{studentName}</div>
                            </div>
                            <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
                                <span className="font-bold">Line/Machine:</span>
                                <Input disabled={readOnly} className="border-none border-b border-black h-5 px-2 rounded-none focus-visible:ring-0" placeholder="Enter Line/Machine" />
                                <span className="font-bold">Date of Joining:</span>
                                <Input disabled={readOnly} className="border-none border-b border-black h-5 px-2 rounded-none focus-visible:ring-0" placeholder="DD-MM-YYYY" />
                            </div>
                        </div>

                        {/* Main Table */}
                        <div className="border border-black mb-4">
                            <table className="w-full text-center text-xs border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 font-bold">
                                        <th rowSpan="2" className="border border-black p-1 w-16">Date</th>
                                        <th rowSpan="2" className="border border-black p-1 w-12">HOURS</th>
                                        <th rowSpan="2" className="border border-black p-1 w-20">PRODUCTION TARGET</th>
                                        <th rowSpan="2" className="border border-black p-1 w-20">TOTAL PART PRODUCTION</th>
                                        <th rowSpan="2" className="border border-black p-1 w-16">OK PARTS</th>
                                        <th rowSpan="2" className="border border-black p-1 w-16">Rejection</th>
                                        <th colSpan="2" className="border border-black p-1">CYCLE TIME</th>
                                        <th rowSpan="2" className="border border-black p-1 bg-gray-200">NC Tag (critical)</th>
                                        <th rowSpan="2" className="border border-black p-1">ESCALATION SYSTEM</th>
                                        <th rowSpan="2" className="border border-black p-1">SOS FOLLOW</th>
                                        <th rowSpan="2" className="border border-black p-1 bg-gray-200">Customer Complaint (critical)</th>
                                        <th rowSpan="2" className="border border-black p-1">PPE USES</th>
                                        <th rowSpan="2" className="border border-black p-1">Associate sign</th>
                                        <th rowSpan="2" className="border border-black p-1">MTS Trainer Sign</th>
                                        <th rowSpan="2" className="border border-black p-1">TL Sign</th>
                                        <th rowSpan="2" className="border border-black p-1">Shift Incharge Sign</th>
                                    </tr>
                                    <tr className="bg-gray-100 font-bold">
                                        <th className="border border-black p-1 w-12">Target</th>
                                        <th className="border border-black p-1 w-12">Actual</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((row, index) => (
                                        <tr key={index}>
                                            <td className="border border-black p-0 h-8">
                                                <Input disabled={readOnly} className="h-full w-full border-none text-center p-0 focus-visible:ring-0"
                                                    value={row.date?.toString().split('T')[0] || ""}
                                                    onChange={e => handleEntryChange(index, 'date', e.target.value)} type="date" />
                                            </td>
                                            <td className="border border-black p-0"><Input disabled={readOnly} className="h-full w-full border-none text-center p-0 focus-visible:ring-0" value={row.hours || ""} onChange={e => handleEntryChange(index, 'hours', e.target.value)} /></td>
                                            <td className="border border-black p-0"><Input disabled={readOnly} className="h-full w-full border-none text-center p-0 focus-visible:ring-0" value={row.productionTarget || ""} onChange={e => handleEntryChange(index, 'productionTarget', e.target.value)} /></td>
                                            <td className="border border-black p-0"><Input disabled={readOnly} className="h-full w-full border-none text-center p-0 focus-visible:ring-0" value={row.totalPartProduction || ""} onChange={e => handleEntryChange(index, 'totalPartProduction', e.target.value)} /></td>
                                            <td className="border border-black p-0"><Input disabled={readOnly} className="h-full w-full border-none text-center p-0 focus-visible:ring-0" value={row.okParts || ""} onChange={e => handleEntryChange(index, 'okParts', e.target.value)} /></td>
                                            <td className="border border-black p-0"><Input disabled={readOnly} className="h-full w-full border-none text-center p-0 focus-visible:ring-0" value={row.rejection || ""} onChange={e => handleEntryChange(index, 'rejection', e.target.value)} /></td>
                                            <td className="border border-black p-0"><Input disabled={readOnly} className="h-full w-full border-none text-center p-0 focus-visible:ring-0" value={row.cycleTimeTarget || ""} onChange={e => handleEntryChange(index, 'cycleTimeTarget', e.target.value)} /></td>
                                            <td className="border border-black p-0"><Input disabled={readOnly} className="h-full w-full border-none text-center p-0 focus-visible:ring-0" value={row.cycleTimeActual || ""} onChange={e => handleEntryChange(index, 'cycleTimeActual', e.target.value)} /></td>
                                            <td className="border border-black p-0 bg-gray-50"><Input disabled={readOnly} className="h-full w-full border-none text-center p-0 bg-transparent focus-visible:ring-0" value={row.ncTag || ""} onChange={e => handleEntryChange(index, 'ncTag', e.target.value)} /></td>
                                            <td className="border border-black p-0"><Input disabled={readOnly} className="h-full w-full border-none text-center p-0 focus-visible:ring-0" value={row.escalationSystem || ""} onChange={e => handleEntryChange(index, 'escalationSystem', e.target.value)} /></td>
                                            <td className="border border-black p-0"><Input disabled={readOnly} className="h-full w-full border-none text-center p-0 focus-visible:ring-0" value={row.sosFollow || ""} onChange={e => handleEntryChange(index, 'sosFollow', e.target.value)} /></td>
                                            <td className="border border-black p-0 bg-gray-50"><Input disabled={readOnly} className="h-full w-full border-none text-center p-0 bg-transparent focus-visible:ring-0" value={row.customerComplaint || ""} onChange={e => handleEntryChange(index, 'customerComplaint', e.target.value)} /></td>
                                            <td className="border border-black p-0"><Input disabled={readOnly} className="h-full w-full border-none text-center p-0 focus-visible:ring-0" value={row.ppeUses || ""} onChange={e => handleEntryChange(index, 'ppeUses', e.target.value)} /></td>
                                            <td className="border border-black p-0"><Input disabled={readOnly} className="h-full w-full border-none text-center p-0 focus-visible:ring-0" value={row.associateSign || ""} onChange={e => handleEntryChange(index, 'associateSign', e.target.value)} /></td>
                                            <td className="border border-black p-0"><Input disabled={readOnly} className="h-full w-full border-none text-center p-0 focus-visible:ring-0" value={row.mtsTrainerSign || ""} onChange={e => handleEntryChange(index, 'mtsTrainerSign', e.target.value)} /></td>
                                            <td className="border border-black p-0"><Input disabled={readOnly} className="h-full w-full border-none text-center p-0 focus-visible:ring-0" value={row.tlSign || ""} onChange={e => handleEntryChange(index, 'tlSign', e.target.value)} /></td>
                                            <td className="border border-black p-0"><Input disabled={readOnly} className="h-full w-full border-none text-center p-0 focus-visible:ring-0" value={row.shiftInchargeSign || ""} onChange={e => handleEntryChange(index, 'shiftInchargeSign', e.target.value)} /></td>
                                        </tr>
                                    ))}

                                    {/* Summary Rows */}
                                    <tr>
                                        <td className="border border-black p-1 font-bold">Total</td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1 bg-gray-200"></td>
                                        <td className="border border-black p-1"></td>
                                        <td colSpan={5} rowSpan={3} className="border border-black p-0 align-top">
                                            <div className="flex h-full">
                                                <div className="flex-1 flex flex-col border-r border-black">
                                                    <div className="border-b border-black flex-1 flex items-center justify-center p-1 text-center font-bold text-[10px]">Average Pass &gt; 90%<br />Fail &lt; 90%</div>
                                                    <div className="flex-1"></div>
                                                </div>
                                                <div className="w-20 border-r border-black flex flex-col">
                                                    <div className="border-b border-black p-1 font-bold text-center text-[10px] h-10 flex items-center justify-center">TOTAL MARKS</div>
                                                    <div className="flex-1 flex items-center justify-center font-bold text-lg">36</div>
                                                </div>
                                                <div className="w-20 border-r border-black flex flex-col">
                                                    <div className="border-b border-black p-1 font-bold text-center text-[10px] h-10 flex items-center justify-center">TOTAL MARKS OBTAINED</div>
                                                    <div className="flex-1 p-0">
                                                        <Input disabled={readOnly}
                                                            className="h-full w-full border-none text-center text-lg font-bold p-0 focus-visible:ring-0"
                                                            value={summary.totalMarksObtained}
                                                            onChange={e => handleSummaryChange('totalMarksObtained', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="w-16 border-r border-black flex flex-col">
                                                    <div className="border-b border-black p-1 font-bold text-center text-[10px] h-10 flex items-center justify-center">Total %</div>
                                                    <div className="flex-1 p-0">
                                                        <Input disabled={readOnly}
                                                            className="h-full w-full border-none text-center text-lg font-bold p-0 focus-visible:ring-0"
                                                            value={summary.totalPercentage}
                                                            onChange={e => handleSummaryChange('totalPercentage', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="w-16 flex flex-col">
                                                    <div className="border-b border-black p-1 font-bold text-center text-[10px] h-10 flex items-center justify-center" >Result</div>
                                                    <div className="flex-1 p-0">
                                                        <Input disabled={readOnly}
                                                            className={`h-full w-full border-none text-center text-lg font-bold p-0 focus-visible:ring-0 ${summary.result === 'Pass' ? 'text-green-600' : 'text-red-600'}`}
                                                            value={summary.result}
                                                            placeholder="Pass/Fail"
                                                            onChange={e => handleSummaryChange('result', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td colSpan={3} className="border border-black p-1 bg-gray-200"></td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-1 font-bold">Evaluation %</td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1 bg-gray-200"></td>
                                        <td className="border border-black p-1"></td>
                                        <td colSpan={3} className="border border-black p-1 bg-gray-200"></td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-1 font-bold">Evaluation Mark</td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1 bg-gray-200"></td>
                                        <td className="border border-black p-1"></td>
                                        <td colSpan={3} className="border border-black p-1 bg-gray-200"></td>
                                    </tr>
                                    <tr>
                                        <td colSpan={13} className="border border-black p-1 text-right font-bold pr-4">Result- Pass/ Fail</td>
                                        <td colSpan={5} className="border border-black p-1"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Scoring Matrix */}
                        <div className="border border-black mb-4">
                            <table className="w-full text-center text-xs border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th colSpan={2} className="border border-black p-1 w-32">Total Production</th>
                                        <th colSpan={2} className="border border-black p-1 w-32">OK Production</th>
                                        <th colSpan={2} className="border border-black p-1 w-32">Rejection</th>
                                        <th colSpan={2} className="border border-black p-1 w-32">Average Cycle Time</th>
                                        <th className="border border-black p-1 w-40">Process</th>
                                        <th className="border border-black p-1 w-20">Follow (Aware)</th>
                                        <th className="border border-black p-1 w-20">Not Follow (Not Aware)</th>
                                        {/* Empty columns to match table width */}
                                        <th className="border border-black p-1 bg-gray-50 flex-1"></th>
                                        <th className="border border-black p-1 bg-gray-50 flex-1"></th>
                                        <th className="border border-black p-1 bg-gray-50 flex-1"></th>
                                        <th className="border border-black p-1 bg-gray-50 flex-1"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-black p-1 text-left pl-2">Target Achieved above - 95%</td>
                                        <td className="border border-black p-1 w-8">3</td>
                                        <td className="border border-black p-1 text-left pl-2">Target Achieved Above - 95%</td>
                                        <td className="border border-black p-1 w-8">3</td>
                                        <td className="border border-black p-1 text-left pl-2">Below - 0%</td>
                                        <td className="border border-black p-1 w-8">3</td>
                                        <td className="border border-black p-1 text-left pl-2">Above - 95%</td>
                                        <td className="border border-black p-1 w-8">3</td>
                                        <td className="border border-black p-1">NC Tag</td>
                                        <td className="border border-black p-1">3</td>
                                        <td className="border border-black p-1">Fail</td>
                                        <td colSpan={4} className="border border-black p-1 bg-white"></td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-1 text-left pl-2">Target Achieved Above - 90%</td>
                                        <td className="border border-black p-1 w-8">2</td>
                                        <td className="border border-black p-1 text-left pl-2">Target Achieved Above - 90%</td>
                                        <td className="border border-black p-1 w-8">2</td>
                                        <td className="border border-black p-1 text-left pl-2">Above - 0.5%</td>
                                        <td className="border border-black p-1 w-8">Fail</td>
                                        <td className="border border-black p-1 text-left pl-2">Above - 90%</td>
                                        <td className="border border-black p-1 w-8">1</td>
                                        <td className="border border-black p-1">Escalation</td>
                                        <td className="border border-black p-1">3</td>
                                        <td className="border border-black p-1">0</td>
                                        <td colSpan={4} className="border border-black p-1 bg-white"></td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-1 text-left pl-2">Target Achieved Above - 85%</td>
                                        <td className="border border-black p-1 w-8">1</td>
                                        <td className="border border-black p-1 text-left pl-2">Target Achieved Above - 85%</td>
                                        <td className="border border-black p-1 w-8">1</td>
                                        <td className="border border-black p-1 text-left pl-2">Below - 1%</td>
                                        <td className="border border-black p-1 w-8">Fail</td>
                                        <td className="border border-black p-1 text-left pl-2">Above - 85%</td>
                                        <td className="border border-black p-1 w-8">1</td>
                                        <td className="border border-black p-1">SOS</td>
                                        <td className="border border-black p-1">3</td>
                                        <td className="border border-black p-1">0</td>
                                        <td colSpan={4} className="border border-black p-1 bg-white"></td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-1 text-left pl-2">Target Achieved Below - 85%</td>
                                        <td className="border border-black p-1 w-8">0</td>
                                        <td className="border border-black p-1 text-left pl-2">Target Achieved Below - 85%</td>
                                        <td className="border border-black p-1 w-8">0</td>
                                        <td className="border border-black p-1 text-left pl-2">Above - 1%</td>
                                        <td className="border border-black p-1 w-8">Fail</td>
                                        <td className="border border-black p-1 text-left pl-2">Below - 85%</td>
                                        <td className="border border-black p-1 w-8">0</td>
                                        <td className="border border-black p-1">PPE</td>
                                        <td className="border border-black p-1">3</td>
                                        <td className="border border-black p-1">0</td>
                                        <td colSpan={4} className="border border-black p-1 bg-white"></td>
                                    </tr>
                                    <tr>
                                        <td colSpan={2} rowSpan={2} className="border border-black p-1"></td>
                                        <td colSpan={2} rowSpan={2} className="border border-black p-1"></td>
                                        <td colSpan={2} rowSpan={2} className="border border-black p-1"></td>
                                        <td colSpan={2} rowSpan={2} className="border border-black p-1"></td>
                                        <td className="border border-black p-1">Customer Complaint</td>
                                        <td className="border border-black p-1">3</td>
                                        <td className="border border-black p-1">Fail</td>
                                        <td colSpan={4} className="border border-black p-1 bg-white"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Guidelines & Footer */}
                        <div className="grid grid-cols-1 border border-black text-xs mb-4">
                            <div className="grid grid-cols-[1fr_1fr] border-b border-black">
                                <div className="p-2 border-r border-black">
                                    <h3 className="font-bold underline mb-1">Guideline :-</h3>
                                    <ul className="list-disc pl-4 space-y-0.5">
                                        <li>Evaluation criteria is for quality 100% & overall 85%</li>
                                        <li>If critical operation criteria (NC Tag/Customer Complaint) fail, then result is Fail.</li>
                                        <li>Critical operation - Reprocess / NC part tracking / Customer Complaint.</li>
                                        <li>This format applicable for all Department Employee (New Joining) & External.</li>
                                    </ul>
                                </div>
                                <div className="p-2">
                                    <h3 className="font-bold underline mb-1">Remark :-</h3>
                                    <textarea disabled={readOnly}
                                        className="w-full h-20 border-none resize-none focus:outline-none p-1 bg-transparent"
                                        placeholder="Enter remarks here..."
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                    ></textarea>
                                </div>
                            </div>
                            {/* Change Management Section */}
                            <div className="p-1 font-bold text-center bg-gray-100 border-b border-black">Change Management</div>
                            <div className="grid grid-cols-[100px_1fr_100px_60px_80px_1fr_80px] border-b border-black text-center font-semibold text-[10px]">
                                <div className="border-r border-black p-1">Rev No & Date</div>
                                <div className="border-r border-black p-1">What Change</div>
                                <div className="border-r border-black p-1">Why Change</div>
                                <div className="border-r border-black p-1">Rev No</div>
                                <div className="border-r border-black p-1">Rev. Date</div>
                                <div className="border-r border-black p-1">What Change</div>
                                <div className="p-1">Why Change</div>
                            </div>
                            {/* Row 1 */}
                            <div className="grid grid-cols-[100px_1fr_100px_60px_80px_1fr_80px] min-h-12 text-center text-[10px] border-b border-black">
                                <div className="border-r border-black p-1 flex items-center justify-center">Rev Date: 12/11/2018</div>
                                <div className="border-r border-black p-1 flex items-center justify-start text-left">Customer Complaint Awareness</div>
                                <div className="border-r border-black p-1 flex items-center justify-center">IATF NC</div>
                                <div className="border-r border-black p-1 flex items-center justify-center">5</div>
                                <div className="border-r border-black p-1 flex items-center justify-center">02-03-2024</div>
                                <div className="border-r border-black p-1 flex items-center justify-start text-left">Productivity, Quality & Cycle time & Format common for all department</div>
                                <div className="p-1 flex items-center justify-center">VSA Audit</div>
                            </div>
                            {/* Row 2 */}
                            <div className="grid grid-cols-[100px_1fr_100px_60px_80px_1fr_80px] min-h-12 text-center text-[10px] border-b border-black">
                                <div className="border-r border-black p-1 flex items-center justify-center">Rev 03 Date: 02/09/2020</div>
                                <div className="border-r border-black p-1 flex items-center justify-start text-left">Company Logo Change</div>
                                <div className="border-r border-black p-1 flex items-center justify-center">Internal Audit</div>
                                <div className="border-r border-black p-1 flex items-center justify-center"></div>
                                <div className="border-r border-black p-1 flex items-center justify-center"></div>
                                <div className="border-r border-black p-1 flex items-center justify-start text-left"></div>
                                <div className="p-1 flex items-center justify-center"></div>
                            </div>
                            {/* Row 3 */}
                            <div className="grid grid-cols-[100px_1fr_100px_60px_80px_1fr_80px] min-h-12 text-center text-[10px]">
                                <div className="border-r border-black p-1 flex items-center justify-center">Rev no 4 Date 15/03/2023</div>
                                <div className="border-r border-black p-1 flex items-center justify-start text-left">Critical operation evaluation criteria change</div>
                                <div className="border-r border-black p-1 flex items-center justify-center">Customer requirement</div>
                                <div className="border-r border-black p-1 flex items-center justify-center"></div>
                                <div className="border-r border-black p-1 flex items-center justify-center"></div>
                                <div className="border-r border-black p-1 flex items-center justify-start text-left"></div>
                                <div className="p-1 flex items-center justify-center"></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 border border-black text-xs text-center font-bold">
                            <div className="p-2 border-r border-black">Prepared By</div>
                            <div className="p-2 border-r border-black">Checked By</div>
                            <div className="p-2 border-r border-black">Approved By (HOD)</div>
                            <div className="p-2">HR Head</div>
                        </div>

                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default OnJobTrainingTable;
