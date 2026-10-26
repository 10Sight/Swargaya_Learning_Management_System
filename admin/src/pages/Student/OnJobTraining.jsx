import { useState } from "react";
import { useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconClipboardList, IconEye, IconArrowLeft } from "@tabler/icons-react";
import OnJobTrainingTable from "@/components/admin/OnJobTrainingTable";
import SkillLevelCircle from "@/components/common/SkillLevelCircle";
import { useGetStudentOJTsQuery } from "@/Redux/AllApi/OnJobTrainingApi";
import { useGetActiveConfigQuery } from "@/Redux/AllApi/CourseLevelConfigApi";

const StudentOnJobTraining = () => {
    const { user } = useSelector((state) => state.auth);
    const [selectedOjt, setSelectedOjt] = useState(null);

    const { data: levelConfigData } = useGetActiveConfigQuery();
    const levels = levelConfigData?.data?.levels || [];

    const { data: ojtData, isLoading } = useGetStudentOJTsQuery(user?.id, {
        skip: !user?.id
    });

    if (!user) return <div>Loading...</div>;

    if (selectedOjt) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xl font-bold">On Job Training Evaluation</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => setSelectedOjt(null)}>
                            <IconArrowLeft className="h-4 w-4 mr-2" />
                            Back to List
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <OnJobTrainingTable
                            ojtId={selectedOjt.id || selectedOjt._id}
                            studentName={user.fullName}
                            model={user.department?.name || "N/A"} // Assuming user object has department name or check how it's stored
                            readOnly={true}
                            onBack={() => setSelectedOjt(null)}
                        />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>My On Job Training</CardTitle>
                    <CardDescription>
                        View your On Job Training (OJT) evaluation records.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-4">Loading your training records...</div>
                    ) : ojtData?.data?.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Level</TableHead>
                                    <TableHead>Training Name</TableHead>
                                    <TableHead>Line / Machine</TableHead>
                                    <TableHead>Created Date</TableHead>
                                    <TableHead>Result</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ojtData.data.map((ojtItem) => {
                                    const levelOrder = ojtItem.levelOrder !== undefined && ojtItem.levelOrder !== null ? Number(ojtItem.levelOrder) : 0;
                                    const levelName = ojtItem.levelName || `L${levelOrder + 1}`;
                                    return (
                                        <TableRow key={ojtItem.id || ojtItem._id}>
                                            <TableCell>
                                                <Badge variant="outline" className="inline-flex items-center gap-1.5 font-bold border-blue-400 text-blue-700 bg-blue-50 py-1 px-2">
                                                    <SkillLevelCircle
                                                        levelName={levelName}
                                                        levelIndex={levelOrder}
                                                        levels={levels}
                                                        size={14}
                                                    />
                                                    <span>{levelName}</span>
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">{ojtItem.name || "Practical Evaluation"}</TableCell>
                                            <TableCell>
                                                {ojtItem.line?.name} / {ojtItem.machine?.name}
                                            </TableCell>
                                        <TableCell>
                                            {new Date(ojtItem.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={ojtItem.result === "Pass" ? "success" : ojtItem.result === "Fail" ? "destructive" : "secondary"}>
                                                {ojtItem.result || "Pending"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => setSelectedOjt(ojtItem)}>
                                                <IconEye className="h-4 w-4 mr-2" />
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-12">
                            <IconClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Training Records Found</h3>
                            <p className="text-muted-foreground">
                                You don't have any On Job Training evaluations yet.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default StudentOnJobTraining;
