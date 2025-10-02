import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/Helper/axiosInstance";

const AddLessonPage = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    duration: 10,
    order: 1,
  });
  
  const [moduleData, setModuleData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingModule, setIsLoadingModule] = useState(true);

  // Fetch module data on component mount
  useEffect(() => {
    const fetchModuleData = async () => {
      if (!moduleId) {
        toast.error("Module ID is missing");
        navigate(-1);
        return;
      }

      try {
        const response = await axiosInstance.get(`/api/modules/${moduleId}`);
        if (response.data.success) {
          setModuleData(response.data.data);
        } else {
          toast.error("Failed to fetch module data");
        }
      } catch (error) {
        console.error("Error fetching module:", error);
        const errorMessage = 
          error.response?.data?.message || "Failed to fetch module data";
        toast.error(errorMessage);
        // Don't navigate back, just show error - user can still create lesson
      } finally {
        setIsLoadingModule(false);
      }
    };

    fetchModuleData();
  }, [moduleId, navigate]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error("Please enter a lesson title");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await axiosInstance.post(
        `/api/modules/${moduleId}/lessons`,
        formData
      );

      if (response.data.success) {
        toast.success("Lesson created successfully!");
        navigate(-1); // Go back to previous page
      }
    } catch (error) {
      console.error("Error creating lesson:", error);
      const errorMessage = 
        error.response?.data?.message || 
        "Failed to create lesson. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Lesson</h1>
          <p className="text-muted-foreground">
            {isLoadingModule 
              ? "Loading module information..." 
              : moduleData 
              ? `Create a new lesson for "${moduleData.title}"` 
              : "Create a new lesson for the selected module"
            }
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Lesson Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Module Info Display */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Module
              </label>
              {isLoadingModule ? (
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {moduleData?.title || "Unknown Module"}
                    </span>
                  </div>
                  {moduleData?.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {moduleData.description}
                    </p>
                  )}
                  {moduleData?.course && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Course: {moduleData.course.title}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Lesson Title *
              </label>
              <Input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter lesson title"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">
                Lesson Content
              </label>
              <Textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="Enter lesson content, instructions, or description"
                rows={8}
                disabled={isSubmitting}
              />
            </div>

            {/* Duration and Order */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="duration" className="text-sm font-medium">
                  Duration (minutes)
                </label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  min="1"
                  max="1440"
                  value={formData.duration}
                  onChange={handleInputChange}
                  placeholder="10"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="order" className="text-sm font-medium">
                  Lesson Order
                </label>
                <Input
                  id="order"
                  name="order"
                  type="number"
                  min="1"
                  value={formData.order}
                  onChange={handleInputChange}
                  placeholder="1"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Lesson
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddLessonPage;
