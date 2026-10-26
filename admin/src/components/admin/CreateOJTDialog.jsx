import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { IconLoader, IconPlus } from "@tabler/icons-react";
import { useGetAllDepartmentsQuery } from "@/Redux/AllApi/DepartmentApi";
import { useGetLinesByDepartmentQuery } from "@/Redux/AllApi/LineApi";
import { useGetMachinesByLineQuery } from "@/Redux/AllApi/MachineApi";
import { useCreateOnJobTrainingMutation } from "@/Redux/AllApi/OnJobTrainingApi";
import { useGetAllUsersQuery } from "@/Redux/AllApi/UserApi";
import { useGetActiveConfigQuery } from "@/Redux/AllApi/CourseLevelConfigApi";
import SkillLevelCircle from "@/components/common/SkillLevelCircle";
import { Badge } from "@/components/ui/badge";
import { getSheetsForLevelAndDepartment } from "./ojt/ojtSheetRegistry";
import { toast } from "sonner";

const CreateOJTDialog = ({ open, onOpenChange, studentId, onSuccess }) => {
    // When no studentId is supplied (e.g. launched from the OJT list page rather than
    // a specific student's detail page), the dialog lets the user pick a student.
    const requiresStudentPicker = !studentId;

    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [selectedLevelOrder, setSelectedLevelOrder] = useState("");
    const [selectedSheetKey, setSelectedSheetKey] = useState("");
    const [departmentId, setDepartmentId] = useState("");
    const [lineId, setLineId] = useState("");
    const [machineId, setMachineId] = useState("");
    const [name, setName] = useState(""); // Add state for name
    const [isSubmitting, setIsSubmitting] = useState(false);

    const effectiveStudentId = studentId || selectedStudentId;

    // Queries
    const { data: deptData, isLoading: deptLoading } = useGetAllDepartmentsQuery({ page: 1, limit: 100 });
    const { data: lineData, isLoading: lineLoading } = useGetLinesByDepartmentQuery(departmentId, { skip: !departmentId });
    const { data: machineData, isLoading: machineLoading } = useGetMachinesByLineQuery(lineId, { skip: !lineId });
    const { data: levelConfigData, isLoading: levelsLoading } = useGetActiveConfigQuery();
    const { data: studentsData, isLoading: studentsLoading } = useGetAllUsersQuery(
        { page: 1, limit: 200, role: "STUDENT" },
        { skip: !open || !requiresStudentPicker }
    );

    const [createOJT] = useCreateOnJobTrainingMutation();

    const departments = deptData?.data?.departments || [];
    const lines = lineData?.data || [];
    const machines = machineData?.data || [];
    const students = studentsData?.data?.users || [];

    const selectedDepartment = departments.find(d => String(d._id || d.id) === String(departmentId));
    const departmentName = selectedDepartment?.name || "";

    const levels = React.useMemo(() => {
        const list = levelConfigData?.data?.levels || [
            { name: "L1", order: 0, description: "Beginner" },
            { name: "L2", order: 1, description: "Intermediate" },
            { name: "L3", order: 2, description: "Advanced" },
        ];
        return [...list].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    }, [levelConfigData]);

    const availableTemplates = React.useMemo(() => {
        return getSheetsForLevelAndDepartment({
            levelOrder: selectedLevelOrder,
            departmentName
        });
    }, [selectedLevelOrder, departmentName]);

    useEffect(() => {
        if (!open) {
            setSelectedStudentId("");
            setSelectedLevelOrder("");
            setSelectedSheetKey("");
            setDepartmentId("");
            setLineId("");
            setMachineId("");
            setName("");
        } else if (levels.length > 0 && selectedLevelOrder === "") {
            const firstLevel = levels[0];
            setSelectedLevelOrder(String(firstLevel.order));
            setName(`${firstLevel.name} Practical Evaluation of On the Job Training`);
        }
    }, [open, levels]);

    // Automatically select the best sheet template when level or department changes
    useEffect(() => {
        if (availableTemplates.length > 0) {
            const isCurrentValid = availableTemplates.some(t => t.sheetKey === selectedSheetKey);
            if (!isCurrentValid) {
                // Best matching is first (department-specific if matched, otherwise default)
                setSelectedSheetKey(availableTemplates[0].sheetKey);
            }
        } else {
            setSelectedSheetKey("");
        }
    }, [availableTemplates, selectedSheetKey]);

    const handleLevelChange = (val) => {
        setSelectedLevelOrder(val);
        const lvl = levels.find(l => String(l.order) === String(val));
        if (lvl) {
            setName(`${lvl.name} Practical Evaluation of On the Job Training`);
        }
    };

    const handleSubmit = async () => {
        if (!effectiveStudentId || !departmentId || !lineId || !machineId || !name) {
            toast.error("Please fill all required fields");
            return;
        }

        const chosenLevel = levels.find(l => String(l.order) === String(selectedLevelOrder)) || levels[0];
        const levelOrder = chosenLevel ? Number(chosenLevel.order) : 0;
        const levelName = chosenLevel ? chosenLevel.name : "L1";

        try {
            setIsSubmitting(true);
            await createOJT({
                studentId: effectiveStudentId,
                departmentId,
                lineId,
                machineId,
                name,
                levelOrder,
                levelName,
                sheetKey: selectedSheetKey || null,
            }).unwrap();

            toast.success("OJT Session Created Successfully");
            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            toast.error(error?.data?.message || "Failed to create OJT session");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Start New OJT Session</DialogTitle>
                    <DialogDescription>
                        Select the context for this On Job Training evaluation.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {requiresStudentPicker && (
                        <div className="grid gap-2">
                            <Label>Employee</Label>
                            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {studentsLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                                        students.length === 0 ? <SelectItem value="none" disabled>No Employees Found</SelectItem> :
                                            students.map(s => (
                                                <SelectItem key={s._id || s.id} value={String(s._id || s.id)}>{s.fullName} ({s.userName})</SelectItem>
                                            ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label>Course / Training Level</Label>
                        <Select value={selectedLevelOrder} onValueChange={handleLevelChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Level" />
                            </SelectTrigger>
                            <SelectContent>
                                {levelsLoading ? (
                                    <SelectItem value="loading" disabled>Loading levels...</SelectItem>
                                ) : (
                                    levels.map(lvl => (
                                        <SelectItem key={lvl.order} value={String(lvl.order)}>
                                            <div className="flex items-center gap-2">
                                                <SkillLevelCircle
                                                    levelName={lvl.name}
                                                    levelIndex={lvl.order}
                                                    levels={levels}
                                                    size={16}
                                                />
                                                <span className="font-semibold">{lvl.name}</span>
                                                <span className="text-muted-foreground text-xs">{lvl.description ? `— ${lvl.description}` : `(Level ${Number(lvl.order) + 1})`}</span>
                                            </div>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Training Name</Label>
                        <Input
                            placeholder="e.g. Level-1 Practical Evaluation"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Department</Label>
                        <Select value={departmentId} onValueChange={(val) => { setDepartmentId(val); setLineId(""); setMachineId(""); }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Department" />
                            </SelectTrigger>
                            <SelectContent>
                                {deptLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                                    departments.map(d => (
                                        <SelectItem key={d._id || d.id} value={String(d._id || d.id)}>{d.name}</SelectItem>
                                    ))
                                }
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Template / Layout Selection (Handles multiple sheets for same level & dept-specific sheets) */}
                    {availableTemplates.length > 1 ? (
                        <div className="grid gap-2 p-2.5 rounded-lg border bg-blue-50/50 dark:bg-slate-900/40 border-blue-200 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold text-blue-900 dark:text-blue-300">Sheet Layout / Template</Label>
                                <span className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">{availableTemplates.length} templates available</span>
                            </div>
                            <Select value={selectedSheetKey} onValueChange={setSelectedSheetKey}>
                                <SelectTrigger className="bg-white dark:bg-slate-800 text-xs">
                                    <SelectValue placeholder="Select Sheet Template" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableTemplates.map(tpl => (
                                        <SelectItem key={tpl.sheetKey} value={tpl.sheetKey}>
                                            <div className="flex items-center gap-2 py-0.5">
                                                <span className="font-medium text-xs">{tpl.title}</span>
                                                {tpl.matchesDept && (
                                                    <Badge variant="secondary" className="text-[10px] bg-blue-600 text-white py-0 px-1 font-semibold">
                                                        Dept Match
                                                    </Badge>
                                                )}
                                                <span className="text-[10px] text-muted-foreground ml-auto">
                                                    ({tpl.defaultMarks} Marks)
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : availableTemplates.length === 1 ? (
                        <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2.5 text-xs flex items-center justify-between">
                            <div>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{availableTemplates[0].title}</span>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                    {availableTemplates[0].departmentLabel || "All Departments"} • {availableTemplates[0].defaultMarks} Marks
                                </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-800 border-slate-300">Active Layout</Badge>
                        </div>
                    ) : null}

                    <div className="grid gap-2">
                        <Label>Line</Label>
                        <Select value={lineId} onValueChange={(val) => { setLineId(val); setMachineId(""); }} disabled={!departmentId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Line" />
                            </SelectTrigger>
                            <SelectContent>
                                {lineLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                                    lines.length === 0 ? <SelectItem value="none" disabled>No Lines Found</SelectItem> :
                                        lines.map(l => (
                                            <SelectItem key={l._id || l.id} value={String(l._id || l.id)}>{l.name}</SelectItem>
                                        ))
                                }
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Machine</Label>
                        <Select value={machineId} onValueChange={setMachineId} disabled={!lineId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Machine" />
                            </SelectTrigger>
                            <SelectContent>
                                {machineLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                                    machines.length === 0 ? <SelectItem value="none" disabled>No Machines Found</SelectItem> :
                                        machines.map(m => (
                                            <SelectItem key={m._id || m.id} value={String(m._id || m.id)}>{m.name}</SelectItem>
                                        ))
                                }
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !machineId || !effectiveStudentId}>
                        {isSubmitting ? <IconLoader className="animate-spin h-4 w-4" /> : <IconPlus className="h-4 w-4 mr-2" />}
                        Create Session
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreateOJTDialog;
