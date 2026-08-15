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
import { toast } from "sonner";

const CreateOJTDialog = ({ open, onOpenChange, studentId, onSuccess }) => {
    // When no studentId is supplied (e.g. launched from the OJT list page rather than
    // a specific student's detail page), the dialog lets the user pick a student.
    const requiresStudentPicker = !studentId;

    const [selectedStudentId, setSelectedStudentId] = useState("");
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
    const { data: studentsData, isLoading: studentsLoading } = useGetAllUsersQuery(
        { page: 1, limit: 200, role: "STUDENT" },
        { skip: !open || !requiresStudentPicker }
    );

    const [createOJT] = useCreateOnJobTrainingMutation();

    const departments = deptData?.data?.departments || [];
    const lines = lineData?.data || [];
    const machines = machineData?.data || [];
    const students = studentsData?.data?.users || [];

    useEffect(() => {
        if (!open) {
            setSelectedStudentId("");
            setDepartmentId("");
            setLineId("");
            setMachineId("");
            setName(""); // Reset name
        }
    }, [open]);

    const handleSubmit = async () => {
        if (!effectiveStudentId || !departmentId || !lineId || !machineId || !name) { // Added !name to validation
            toast.error("Please fill all fields"); // Updated error message
            return;
        }

        try {
            setIsSubmitting(true);
            await createOJT({
                studentId: effectiveStudentId,
                departmentId,
                lineId,
                machineId,
                name, // Pass name
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
