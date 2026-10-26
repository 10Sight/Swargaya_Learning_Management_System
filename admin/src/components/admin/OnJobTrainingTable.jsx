import React from "react";
import { useGetOnJobTrainingByIdQuery } from "@/Redux/AllApi/OnJobTrainingApi";
import { getOJTSheetConfig } from "./ojt/ojtSheetRegistry";

/**
 * OnJobTrainingTable is the central dispatcher for OJT sheets.
 * It fetches the OJT record by `ojtId`, checks its `levelOrder` (configured from course_level_configs),
 * and dynamically renders the corresponding dedicated sheet component (Level 1, Level 2, etc.)
 */
const OnJobTrainingTable = ({ ojtId, studentName = "Associate Name", model = "Model Name", readOnly = false, onBack }) => {
    const { data: ojtData, isLoading, isError } = useGetOnJobTrainingByIdQuery(ojtId, { skip: !ojtId });

    if (isLoading) {
        return (
            <div className="p-8 text-center text-sm text-muted-foreground">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                <div>Loading evaluation sheet...</div>
            </div>
        );
    }

    if (isError || !ojtData?.data) {
        return (
            <div className="p-6 text-center text-sm text-red-500">
                Failed to load On Job Training evaluation data.
            </div>
        );
    }

    const sheetConfig = getOJTSheetConfig({
        sheetKey: ojtData.data.sheetKey,
        levelOrder: ojtData.data.levelOrder ?? 0,
        departmentName: ojtData.data.department?.name,
    });
    const SheetComponent = sheetConfig.component;

    return (
        <SheetComponent
            ojtId={ojtId}
            studentName={studentName || ojtData.data.student?.fullName || "Associate Name"}
            model={model || ojtData.data.model || "Model Name"}
            readOnly={readOnly}
            onBack={onBack}
        />
    );
};

export default OnJobTrainingTable;
