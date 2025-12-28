import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    useGetMachinesByLineQuery,
    useCreateMachineMutation,
    useUpdateMachineMutation,
    useDeleteMachineMutation,
} from "@/Redux/AllApi/MachineApi";
import { IconPlus, IconEdit, IconLoader, IconCheck, IconX, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const MachineManager = ({ lineId }) => {
    const { data: machinesData, isLoading, error } = useGetMachinesByLineQuery(lineId);
    const [createMachine, { isLoading: isCreating }] = useCreateMachineMutation();
    const [updateMachine, { isLoading: isUpdating }] = useUpdateMachineMutation();
    const [deleteMachine, { isLoading: isDeleting }] = useDeleteMachineMutation();

    const [newMachineName, setNewMachineName] = useState("");
    const [newMachineDescription, setNewMachineDescription] = useState("");
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingMachineId, setEditingMachineId] = useState(null);
    const [editName, setEditName] = useState("");

    const handleCreateMachine = async () => {
        if (!newMachineName.trim()) {
            toast.error("Machine name is required");
            return;
        }

        try {
            await createMachine({
                name: newMachineName,
                lineId,
                description: newMachineDescription
            }).unwrap();
            toast.success("Machine created successfully");
            setNewMachineName("");
            setNewMachineDescription("");
            setIsCreateDialogOpen(false);
        } catch (error) {
            toast.error(error.data?.message || "Failed to create machine");
        }
    };

    const handleDeleteMachine = async (e, machineId) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this machine? This action cannot be undone.")) {
            return;
        }

        try {
            await deleteMachine(machineId).unwrap();
            toast.success("Machine deleted successfully");
        } catch (error) {
            toast.error(error.data?.message || "Failed to delete machine");
        }
    };

    const startEditing = (e, machine) => {
        e.stopPropagation();
        setEditingMachineId(machine._id);
        setEditName(machine.name);
    };

    const cancelEditing = (e) => {
        e.stopPropagation();
        setEditingMachineId(null);
        setEditName("");
    };

    const saveEdit = async (e) => {
        e.stopPropagation();
        if (!editName.trim()) {
            toast.error("Machine name cannot be empty");
            return;
        }

        try {
            await updateMachine({
                id: editingMachineId,
                name: editName
            }).unwrap();
            toast.success("Machine updated successfully");
            setEditingMachineId(null);
            setEditName("");
        } catch (error) {
            toast.error(error.data?.message || "Failed to update machine");
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Line Machines</CardTitle>
                    <CardDescription>Manage machines for this line</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
                        <IconPlus className="h-4 w-4" />
                        Add Machine
                    </Button>

                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogContent className="sm:max-w-[425px] bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
                            <DialogHeader>
                                <DialogTitle>Add New Machine</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Machine Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g., Robot Arm 1"
                                        value={newMachineName}
                                        onChange={(e) => setNewMachineName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Input
                                        id="description"
                                        placeholder="Brief description of the machine"
                                        value={newMachineDescription}
                                        onChange={(e) => setNewMachineDescription(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreateMachine} disabled={isCreating}>
                                    {isCreating ? <IconLoader className="h-4 w-4 animate-spin" /> : "Create Machine"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-8"><IconLoader className="animate-spin" /></div>
                ) : error ? (
                    <div className="text-red-500 p-4">Error loading machines: {error.message}</div>
                ) : machinesData?.data?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No machines found for this line. Create one to get started.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Machine Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {machinesData?.data?.map((machine) => (
                                <TableRow
                                    key={machine._id}
                                    className="hover:bg-gray-100"
                                >
                                    <TableCell className="font-medium">
                                        {editingMachineId === machine._id ? (
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="max-w-[200px]"
                                            />
                                        ) : (
                                            machine.name
                                        )}
                                    </TableCell>
                                    <TableCell>{machine.description || "-"}</TableCell>
                                    <TableCell className="text-right">
                                        {editingMachineId === machine._id ? (
                                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={(e) => saveEdit(e)} disabled={isUpdating}>
                                                    <IconCheck className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={cancelEditing}>
                                                    <IconX className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={(e) => startEditing(e, machine)}>
                                                    <IconEdit className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={(e) => handleDeleteMachine(e, machine._id)}>
                                                    {isDeleting ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconTrash className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};

export default MachineManager;
