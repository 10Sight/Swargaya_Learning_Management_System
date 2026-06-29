import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    IconArrowLeft, IconLoader, IconSearch,
    IconUserCheck, IconUserX, IconUserPlus, IconUser, IconUsers
} from "@tabler/icons-react";
import { toast } from "sonner";
import { useGetMachineByIdQuery, useUpdateMachineMutation } from "@/Redux/AllApi/MachineApi";
import { useGetDepartmentByIdQuery } from "@/Redux/AllApi/DepartmentApi";

const AssignMachineOperator = () => {
    const { departmentId, lineId, machineId } = useParams();
    const navigate = useNavigate();
    const [search, setSearch] = useState("");

    const { data: machineData, isLoading: isMachineLoading } = useGetMachineByIdQuery(machineId);
    const { data: departmentData, isLoading: isDeptLoading } = useGetDepartmentByIdQuery(departmentId);
    const [updateMachine, { isLoading: isUpdating }] = useUpdateMachineMutation();

    const machine = machineData?.data;
    const department = departmentData?.data;
    const students = department?.students || [];
    const assignedOperators = machine?.operators || [];

    const assignedIds = new Set(assignedOperators.map(op => String(op.id)));

    const available = students.filter(s => {
        const sid = String(s.id || s._id);
        if (assignedIds.has(sid)) return false;
        const q = search.toLowerCase();
        return s.fullName?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
    });

    const handleAssign = async (userId) => {
        try {
            await updateMachine({ id: machineId, assignOperatorId: userId }).unwrap();
            toast.success("Operator assigned successfully");
        } catch (err) {
            toast.error(err?.data?.message || "Failed to assign operator");
        }
    };

    const handleUnassign = async (userId) => {
        try {
            await updateMachine({ id: machineId, unassignOperatorId: userId }).unwrap();
            toast.success("Operator removed successfully");
        } catch (err) {
            toast.error(err?.data?.message || "Failed to remove operator");
        }
    };

    if (isMachineLoading || isDeptLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <IconLoader className="animate-spin h-8 w-8 text-[#2563eb]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <IconArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-[#1f2937]">Assign Operators</h1>
                    <p className="text-sm text-[#6b7280]">
                        {department?.name} › Machine: {machine?.name}
                    </p>
                </div>
                <Badge className="bg-[#dbeafe] text-[#2563eb] hover:bg-[#dbeafe]">
                    <IconUsers className="h-3 w-3 mr-1" />
                    {assignedOperators.length} Assigned
                </Badge>
            </div>

            {/* Machine Details strip */}
            <Card>
                <CardContent className="py-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-[#6b7280] uppercase tracking-wide mb-1">Machine</p>
                            <p className="font-semibold text-[#1f2937]">{machine?.name || "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-[#6b7280] uppercase tracking-wide mb-1">Department</p>
                            <p className="font-semibold text-[#1f2937]">{department?.name || "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-[#6b7280] uppercase tracking-wide mb-1">Total Employees</p>
                            <p className="font-semibold text-[#1f2937]">{students.length}</p>
                        </div>
                        <div>
                            <p className="text-xs text-[#6b7280] uppercase tracking-wide mb-1">Status</p>
                            <Badge
                                className={
                                    assignedOperators.length > 0
                                        ? "bg-[#dcfce7] text-[#16a34a] hover:bg-[#dcfce7]"
                                        : "bg-[#fef3c7] text-[#d97706] hover:bg-[#fef3c7]"
                                }
                            >
                                {assignedOperators.length > 0 ? "Staffed" : "Unstaffed"}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Two-panel layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left panel — Available Employees */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <IconUser className="h-4 w-4 text-[#6b7280]" />
                                Available Employees
                                <Badge variant="outline" className="text-xs font-normal">
                                    {available.length}
                                </Badge>
                            </CardTitle>
                        </div>
                        <div className="relative mt-2">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
                            <Input
                                placeholder="Search by name or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                        {available.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-[#9ca3af]">
                                <IconUser className="h-8 w-8 mb-2 opacity-40" />
                                <p className="text-sm">
                                    {students.length === 0
                                        ? "No employees in this department"
                                        : search
                                        ? "No employees match your search"
                                        : "All employees are already assigned"}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {available.map((student) => {
                                    const studentId = student.id || student._id;
                                    return (
                                        <div
                                            key={studentId}
                                            className="flex items-center justify-between p-3 rounded-lg border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] transition-colors"
                                        >
                                            <div className="min-w-0 flex-1 mr-3">
                                                <p className="font-medium text-[#1f2937] truncate">{student.fullName}</p>
                                                <p className="text-xs text-[#6b7280] truncate">{student.email}</p>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="gap-1.5 shrink-0"
                                                onClick={() => handleAssign(studentId)}
                                                disabled={isUpdating}
                                            >
                                                {isUpdating
                                                    ? <IconLoader className="h-3.5 w-3.5 animate-spin" />
                                                    : <IconUserPlus className="h-3.5 w-3.5" />}
                                                Assign
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right panel — Assigned Operators */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <IconUserCheck className="h-4 w-4 text-[#16a34a]" />
                            Assigned Operators
                            <Badge className="bg-[#dcfce7] text-[#16a34a] hover:bg-[#dcfce7] text-xs font-normal">
                                {assignedOperators.length}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                        {assignedOperators.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center text-[#9ca3af]">
                                <IconUsers className="h-8 w-8 mb-2 opacity-40" />
                                <p className="text-sm">No operators assigned yet</p>
                                <p className="text-xs mt-1">Assign employees from the left panel</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {assignedOperators.map((op) => (
                                    <div
                                        key={op.id}
                                        className="flex items-center justify-between p-3 rounded-lg border border-[#d1fae5] bg-[#f0fdf4] hover:bg-[#dcfce7] transition-colors"
                                    >
                                        <div className="min-w-0 flex-1 mr-3">
                                            <div className="flex items-center gap-1.5">
                                                <p className="font-medium text-[#1f2937] truncate">{op.fullName}</p>
                                                <IconUserCheck className="h-3.5 w-3.5 text-[#16a34a] shrink-0" />
                                            </div>
                                            <p className="text-xs text-[#6b7280] truncate">{op.email}</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5 shrink-0 text-[#dc2626] border-[#dc2626] hover:bg-[#fee2e2] hover:text-[#dc2626]"
                                            onClick={() => handleUnassign(op.id)}
                                            disabled={isUpdating}
                                        >
                                            {isUpdating
                                                ? <IconLoader className="h-3.5 w-3.5 animate-spin" />
                                                : <IconUserX className="h-3.5 w-3.5" />}
                                            Unassign
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
};

export default AssignMachineOperator;
