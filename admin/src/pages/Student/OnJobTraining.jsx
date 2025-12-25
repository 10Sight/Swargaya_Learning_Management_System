import React from "react";
import { useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import OnJobTrainingTable from "@/components/admin/OnJobTrainingTable";

const StudentOnJobTraining = () => {
    const { user } = useSelector((state) => state.auth);

    if (!user) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>My On Job Training</CardTitle>
                    <CardDescription>
                        View your On Job Training (OJT) evaluation record.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <OnJobTrainingTable
                        studentName={user.fullName}
                        model={user.department || "N/A"}
                        readOnly={true}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default StudentOnJobTraining;
