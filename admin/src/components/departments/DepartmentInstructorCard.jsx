// src/components/departments/DepartmentInstructorCard.jsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { IconUser, IconMail, IconPhone, IconPencil, IconLoader, IconX, IconUserPlus } from "@tabler/icons-react";
import { useGetAllUsersQuery } from "@/Redux/AllApi/UserApi";
import {
  useAssignInstructorMutation,
  useRemoveInstructorMutation,
} from "@/Redux/AllApi/DepartmentApi";
import { toast } from "sonner";

const DepartmentInstructorCard = ({ instructor, instructors, departmentId }) => {
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [selectedTrainerIds, setSelectedTrainerIds] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);

  const { data: trainersData, isLoading: trainersLoading, error: trainersError } =
    useGetAllUsersQuery(
      { page: 1, limit: 100, role: "INSTRUCTOR" },
      { skip: !isManageOpen, refetchOnFocus: false, refetchOnReconnect: false }
    );

  const [assignInstructor] = useAssignInstructorMutation();
  const [removeInstructor, { isLoading: isRemoving }] = useRemoveInstructorMutation();

  const availableTrainers = trainersData?.data?.users || [];
  const currentTrainers = (instructors && instructors.length > 0 ? instructors : instructor ? [instructor] : []);

  const openManageDialog = () => {
    setSelectedTrainerIds([]);
    setIsManageOpen(true);
  };

  const toggleTrainerSelection = (trainerId) => {
    setSelectedTrainerIds((prev) =>
      prev.includes(trainerId)
        ? prev.filter((id) => id !== trainerId)
        : [...prev, trainerId]
    );
  };

  const handleAssignSelected = async () => {
    if (selectedTrainerIds.length === 0) return;

    setIsAssigning(true);
    try {
      await Promise.all(
        selectedTrainerIds.map((trainerId) =>
          assignInstructor({ departmentId, instructorId: trainerId }).unwrap()
        )
      );
      toast.success("Trainer(s) assigned successfully");
      setSelectedTrainerIds([]);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to assign one or more trainers");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveTrainer = async (trainerId) => {
    try {
      await removeInstructor({ departmentId, instructorId: trainerId }).unwrap();
      toast.success("Trainer removed successfully");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to remove trainer");
    }
  };

  const renderManageDialog = () => (
    <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconUser className="h-5 w-5" />
            Manage Trainers
          </DialogTitle>
          <DialogDescription>
            Assign or remove trainers for this department.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {currentTrainers.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Current Trainers</h4>
              <div className="space-y-2">
                {currentTrainers.map((trainer) => (
                  <div key={trainer._id} className="flex items-center justify-between p-3 rounded-lg border bg-[#eff6ff]/50 border-[#dbeafe]">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={trainer.avatar?.url} />
                        <AvatarFallback>{trainer.fullName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{trainer.fullName}</p>
                        <p className="text-xs text-muted-foreground">{trainer.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isRemoving}
                      onClick={() => handleRemoveTrainer(trainer._id)}
                      className="h-8 text-[#ef4444] hover:text-[#b91c1c] hover:bg-[#fef2f2]"
                    >
                      {isRemoving ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconX className="h-4 w-4 mr-1" />}
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h4 className="text-sm font-medium text-muted-foreground mb-3">Available Trainers</h4>

          {trainersLoading ? (
            <div className="flex justify-center py-8">
              <IconLoader className="h-6 w-6 animate-spin" />
            </div>
          ) : trainersError ? (
            <div className="text-center text-[#dc2626] py-4">Error loading trainers</div>
          ) : availableTrainers.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">No trainers available</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableTrainers.map((trainer) => {
                const isAssigned = currentTrainers.some((t) => t._id === trainer._id);
                const isChecked = selectedTrainerIds.includes(trainer._id);

                return (
                  <div
                    key={trainer._id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isAssigned ? "bg-muted opacity-60" : "cursor-pointer hover:bg-muted"
                    }`}
                    onClick={() => !isAssigned && toggleTrainerSelection(trainer._id)}
                  >
                    <Checkbox
                      checked={isAssigned || isChecked}
                      disabled={isAssigned}
                      onCheckedChange={() => !isAssigned && toggleTrainerSelection(trainer._id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={trainer.avatar?.url} alt={trainer.fullName} />
                      <AvatarFallback className="text-xs">
                        {trainer.fullName?.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{trainer.fullName}</p>
                      <p className="text-sm text-muted-foreground">{trainer.email}</p>
                    </div>
                    {isAssigned && (
                      <Badge variant="secondary" className="text-xs">Assigned</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsManageOpen(false)}>
            Close
          </Button>
          <Button
            onClick={handleAssignSelected}
            disabled={selectedTrainerIds.length === 0 || isAssigning}
            className="gap-2"
          >
            {isAssigning ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconUserPlus className="h-4 w-4" />}
            {isAssigning ? "Assigning..." : "Assign Selected Trainers"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (currentTrainers.length === 0) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconUser className="h-5 w-5" />
              Trainers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                No trainer assigned to this department
              </div>
              <Button onClick={openManageDialog}>
                Assign Trainer
              </Button>
            </div>
          </CardContent>
        </Card>
        {renderManageDialog()}
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <IconUser className="h-5 w-5" />
            Trainers
          </CardTitle>
          <Button variant="outline" size="sm" onClick={openManageDialog}>
            <IconPencil className="h-4 w-4 mr-2" />
            Manage
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {currentTrainers.map(inst => (
              <div key={inst._id} className="flex flex-col items-center text-center gap-4 pb-4 border-b last:border-0 last:pb-0">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={inst.avatar?.url} alt={inst.fullName} />
                  <AvatarFallback className="text-xl">
                    {inst.fullName
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h3 className="text-xl font-semibold">{inst.fullName}</h3>
                  <Badge variant="outline" className="mt-1">
                    Trainer
                  </Badge>
                </div>

                <div className="w-full space-y-2">
                  <div className="flex items-center gap-2 text-sm justify-center">
                    <IconMail className="h-4 w-4 text-muted-foreground" />
                    <span>{inst.email}</span>
                  </div>

                  {inst.phone && (
                    <div className="flex items-center gap-2 text-sm justify-center">
                      <IconPhone className="h-4 w-4 text-muted-foreground" />
                      <span>{inst.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {renderManageDialog()}
    </>
  );
};

export default DepartmentInstructorCard;
