// src/components/batches/BatchDetailHeader.jsx
import React from "react";
import { Badge } from "@/components/ui/badge";
import { IconCalendar, IconSchool, IconUsers } from "@tabler/icons-react";
import { format } from "date-fns";

const BatchDetailHeader = ({ batch }) => {
  const getStatusBadge = (status) => {
    const statusConfig = {
      UPCOMING: { variant: "secondary", label: "Upcoming" },
      ONGOING: { variant: "default", label: "Ongoing" },
      COMPLETED: { variant: "success", label: "Completed" },
      CANCELLED: { variant: "destructive", label: "Cancelled" },
    };

    const config = statusConfig[status] || {
      variant: "outline",
      label: status,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-card rounded-lg border shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-primary/10">
            <IconSchool className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{batch.name}</h1>
            {/* <p className="text-muted-foreground">ID: {batch.email}</p> */}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(batch.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <IconCalendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Start Date</p>
            <p className="font-medium">
              {batch.startDate
                ? format(new Date(batch.startDate), "PPP")
                : "Not set"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconCalendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">End Date</p>
            <p className="font-medium">
              {batch.endDate
                ? format(new Date(batch.endDate), "PPP")
                : "Not set"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconUsers className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Capacity</p>
            <p className="font-medium">
              {batch.students?.length || 0} / {batch.capacity || "Unlimited"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchDetailHeader;