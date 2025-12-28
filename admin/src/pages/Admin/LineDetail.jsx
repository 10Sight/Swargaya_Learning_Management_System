import React, { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";
import { useGetDepartmentByIdQuery } from '@/Redux/AllApi/DepartmentApi';
import { useGetLinesByDepartmentQuery } from '@/Redux/AllApi/LineApi';
import { IconLoader } from "@tabler/icons-react";
import MachineManager from '@/components/departments/MachineManager';
import { useNavigate } from 'react-router-dom';

const LineDetail = () => {
    const { departmentId, lineId } = useParams();
    const navigate = useNavigate();

    // Fetch Department and Line Details for Header
    const { data: departmentData, isLoading: isDeptLoading } = useGetDepartmentByIdQuery(departmentId);
    const { data: linesData, isLoading: isLinesLoading } = useGetLinesByDepartmentQuery(departmentId);

    const departmentName = departmentData?.data?.name || "Loading Department...";
    const currentLine = linesData?.data?.find(l => l._id === lineId);
    const lineName = currentLine?.name || "Loading Line...";

    if (isDeptLoading || isLinesLoading) {
        return <div className="flex justify-center items-center h-screen"><IconLoader className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <IconArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Line Detail</h1>
                        <p className="text-sm text-gray-500">Department: {departmentName} &gt; Line: {lineName}</p>
                    </div>
                </div>
            </div>

            <MachineManager lineId={lineId} />
        </div>
    );
};

export default LineDetail;
