// src/pages/BatchDetail.jsx
import React from "react";
import { useParams } from "react-router-dom";
import { useGetBatchByIdQuery } from "@/Redux/AllApi/BatchApi";
import BatchDetailHeader from "@/components/batches/BatchDetailHeader";
import BatchInstructorCard from "@/components/batches/BatchInstructorCard";
import BatchCourseCard from "@/components/batches/BatchCourseCard";
import BatchStudentsTable from "@/components/batches/BatchStudentsTable";
import BatchStats from "@/components/batches/BatchStats";
import BatchSkeleton from "@/components/batches/BatchSkeleton";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconRefresh } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

const BatchDetail = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const {
    data: batchData,
    isLoading,
    error,
    refetch,
  } = useGetBatchByIdQuery(batchId);

  if (isLoading) {
    return <BatchSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="text-red-600 text-lg font-medium">
            {error.status === 404 ? "Batch not found" : "Error loading batch"}
          </div>
          <p className="text-gray-600 text-center">
            {error.data?.message || "Failed to fetch batch details"}
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate("/batches")}
              variant="outline"
              className="gap-2"
            >
              <IconArrowLeft className="h-4 w-4" />
              Back to Batches
            </Button>
            <Button onClick={refetch} className="gap-2">
              <IconRefresh className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const batch = batchData?.data;

  if (!batch) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="text-gray-600 text-lg font-medium">
            Batch not found
          </div>
          <Button
            onClick={() => navigate("/batches")}
            variant="outline"
            className="gap-2"
          >
            <IconArrowLeft className="h-4 w-4" />
            Back to Batches
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => navigate("/batches")}
          className="gap-2"
        >
          <IconArrowLeft className="h-4 w-4" />
          Back to Batches
        </Button>
      </div>

      <BatchDetailHeader batch={batch} />
      <BatchStats batch={batch} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BatchInstructorCard instructor={batch.instructor} batchId={batchId} />
        <BatchCourseCard course={batch.course} />
      </div>
      
      <BatchStudentsTable 
        students={batch.students} 
        batchId={batchId}
        batchName={batch.name}
      />
    </div>
  );
};

export default BatchDetail;