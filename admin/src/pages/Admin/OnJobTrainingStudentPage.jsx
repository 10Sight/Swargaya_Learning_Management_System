import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetUserByIdQuery } from "@/Redux/AllApi/UserApi";
import {
    useGetStudentOJTsQuery,
    useDeleteOnJobTrainingMutation,
} from "@/Redux/AllApi/OnJobTrainingApi";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    IconArrowLeft,
    IconPlus,
    IconPencil,
    IconTrash,
    IconClipboardCheck,
} from "@tabler/icons-react";
import { toast } from "sonner";
import CreateOJTDialog from "@/components/admin/CreateOJTDialog";
import OnJobTrainingTable from "@/components/admin/OnJobTrainingTable";

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "—");

const OnJobTrainingStudentPage = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingOjtId, setEditingOjtId] = useState(null);

    const { data: studentData, isLoading: studentLoading } = useGetUserByIdQuery(studentId, {
        refetchOnMountOrArgChange: true,
    });
    const {
        data: ojtsData,
        isLoading: ojtsLoading,
        error: ojtsError,
    } = useGetStudentOJTsQuery(studentId, { refetchOnMountOrArgChange: true });

    const [deleteOnJobTraining, { isLoading: isDeleting }] = useDeleteOnJobTrainingMutation();

    const student = studentData?.data;
    const ojts = ojtsData?.data || [];

    const getResultBadge = (result) => (
        <Badge variant={result === "Pass" ? "success" : result === "Fail" ? "destructive" : "secondary"}>
            {result || "Pending"}
        </Badge>
    );

    const handleDelete = async (ojt) => {
        const confirmed = window.confirm(
            `Delete the OJT sheet "${ojt.name || "Evaluation"}" dated ${formatDate(ojt.createdAt)}? This cannot be undone.`
        );
        if (!confirmed) return;

        try {
            await deleteOnJobTraining({ id: ojt.id || ojt._id, studentId }).unwrap();
            toast.success("OJT sheet deleted successfully");
        } catch (error) {
            toast.error(error?.data?.message || "Failed to delete OJT sheet");
        }
    };

    // Inline editable sheet view
    if (editingOjtId) {
        return (
            <OnJobTrainingTable
                ojtId={editingOjtId}
                studentName={student?.fullName}
                model="-"
                readOnly={false}
                onBack={() => setEditingOjtId(null)}
            />
        );
    }

    if (studentLoading || ojtsLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <Card>
                    <CardContent className="p-6">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-12 w-full mb-2" />
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                        <IconArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2">
                            <AvatarImage src={student?.avatar?.url} alt={student?.fullName} />
                            <AvatarFallback className="bg-[#dbeafe] text-[#1e40af]">
                                {(student?.fullName || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">{student?.fullName || "Employee"}</h1>
                            <p className="text-sm text-muted-foreground">@{student?.userName} • DOJ: {formatDate(student?.doj || student?.createdAt)}</p>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-[#2563eb] hover:bg-[#1d4ed8] text-[#ffffff] w-full sm:w-auto"
                >
                    <IconPlus className="h-4 w-4 mr-2" />
                    Start New Session
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>On Job Training Sheets</CardTitle>
                    <CardDescription>All Level-1 Practical Evaluations for this employee</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {ojtsError ? (
                        <div className="text-center py-10 text-[#dc2626]">Failed to load OJT sheets.</div>
                    ) : ojts.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <IconClipboardCheck className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
                            No On Job Training sheets found. Start a new session.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Training Name</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Line</TableHead>
                                    <TableHead>Machine</TableHead>
                                    <TableHead>Result</TableHead>
                                    <TableHead>Doc No.</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ojts.map((ojt) => (
                                    <TableRow key={ojt.id || ojt._id}>
                                        <TableCell>{formatDate(ojt.createdAt)}</TableCell>
                                        <TableCell className="font-medium">{ojt.name || "Evaluation"}</TableCell>
                                        <TableCell>{ojt.department?.name || "-"}</TableCell>
                                        <TableCell>{ojt.line?.name || "-"}</TableCell>
                                        <TableCell>{ojt.machine?.name || "-"}</TableCell>
                                        <TableCell>{getResultBadge(ojt.result)}</TableCell>
                                        <TableCell>{ojt.docNo || "—"}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setEditingOjtId(ojt.id || ojt._id)}
                                                >
                                                    <IconPencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={isDeleting}
                                                    onClick={() => handleDelete(ojt)}
                                                    className="text-[#dc2626]"
                                                >
                                                    <IconTrash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <CreateOJTDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                studentId={studentId}
                onSuccess={() => setIsCreateDialogOpen(false)}
            />
        </div>
    );
};

export default OnJobTrainingStudentPage;
