import React, { useState } from 'react';
import { useGetAllBatchesQuery } from "@/Redux/AllApi/BatchApi";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { IconExternalLink, IconUsers, IconCalendar } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

const InstructorBatches = ({ instructorId }) => {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetAllBatchesQuery({
    page,
    limit: 5
  });

  // Filter batches by instructor
  const batches = data?.data?.batches 
    ? data.data.batches.filter(batch => 
        batch.instructor && batch.instructor._id === instructorId)
    : [];

  const totalPages = data?.data?.totalPages || 1;

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success">Active</Badge>;
      case "UPCOMING":
        return <Badge variant="warning">Upcoming</Badge>;
      case "COMPLETED":
        return <Badge variant="outline">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Error loading batches
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Batches</h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/batches?instructor=${instructorId}`)}
        >
          View All
        </Button>
      </div>

      {batches.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch._id}>
                  <TableCell className="font-medium">{batch.name}</TableCell>
                  <TableCell>
                    {batch.course?.title || "Unknown Course"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <IconUsers className="h-4 w-4" />
                      <span>{batch.students?.length || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <IconCalendar className="h-4 w-4" />
                      <span>
                        {new Date(batch.startDate).toLocaleDateString()} -{" "}
                        {new Date(batch.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(batch.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/batches/${batch._id}`)}
                    >
                      <IconExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No batches assigned to this instructor
        </div>
      )}
    </div>
  );
};

export default InstructorBatches;