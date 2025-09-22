import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateResourceMutation } from "@/Redux/AllApi/resourceApi";
import { useGetModulesByCourseQuery } from "@/Redux/AllApi/moduleApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  IconArrowLeft,
  IconUpload,
  IconLink,
  IconFileText,
  IconVideo,
  IconPhoto,
  IconLoader,
  IconPlus,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AddResourcePage = () => {
  const { courseId } = useParams(); // Only courseId from URL
  const navigate = useNavigate();
  const [createResource, { isLoading }] = useCreateResourceMutation();
  
  // Fetch modules for the course
  const { 
    data: modulesData, 
    isLoading: modulesLoading, 
    error: modulesError,
    refetch: refetchModules 
  } = useGetModulesByCourseQuery(courseId, {
    skip: !courseId, // Skip if no courseId
  });
  
  const modules = modulesData?.data || [];

  const [formData, setFormData] = useState({
    moduleId: "", // Start with empty moduleId
    title: "",
    type: "PDF",
    url: "",
    file: null,
    duration: "",
    order: 1,
  });

  const [filePreview, setFilePreview] = useState(null);

  // Debug logging
  useEffect(() => {
    console.log("Course ID:", courseId);
    console.log("Modules data:", modulesData);
    console.log("Modules:", modules);
    console.log("Modules loading:", modulesLoading);
    console.log("Modules error:", modulesError);
  }, [courseId, modulesData, modules, modulesLoading, modulesError]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      file,
      url: "", // Clear URL if file is selected
    }));

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setFormData((prev) => ({
      ...prev,
      url,
      file: null, // Clear file if URL is entered
    }));
    setFilePreview(null);
  };

  const validateForm = () => {
    if (!formData.moduleId) {
      toast.error("Please select a module");
      return false;
    }

    if (!formData.title.trim()) {
      toast.error("Resource title is required");
      return false;
    }

    if (!formData.file && !formData.url) {
      toast.error("Please either upload a file or provide a URL");
      return false;
    }

    if (formData.url && !isValidUrl(formData.url)) {
      toast.error("Please enter a valid URL");
      return false;
    }

    if (formData.duration && (formData.duration < 0 || formData.duration > 1000)) {
      toast.error("Duration must be between 0 and 1000 minutes");
      return false;
    }

    if (formData.order && (formData.order < 1 || formData.order > 100)) {
      toast.error("Order must be between 1 and 100");
      return false;
    }

    return true;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const getResourceTypeFromFile = (file) => {
    if (!file) return "LINK";
    
    const type = file.type;
    if (type.startsWith("video/")) return "VIDEO";
    if (type === "application/pdf") return "PDF";
    if (type.startsWith("image/")) return "IMAGE";
    if (type.startsWith("text/")) return "TEXT";
    return "LINK";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log("Form data:", formData); // Add this for debugging
    
    if (!formData.moduleId) {
      toast.error("Please select a module");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Resource title is required");
      return;
    }

    if (!formData.file && !formData.url) {
      toast.error("Please upload a file or provide a URL");
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('moduleId', formData.moduleId);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('type', formData.type);
      formDataToSend.append('description', formData.description || '');
      
      if (formData.file) {
        formDataToSend.append('file', formData.file);
      } else if (formData.url) {
        formDataToSend.append('url', formData.url);
      }

      console.log("Sending data:", formDataToSend); // Add this for debugging
      
      await createResource(formDataToSend).unwrap();
      
      toast.success("Resource created successfully!");
      navigate(`/admin/courses/${courseId}`);
    } catch (error) {
      console.error("Create resource error:", error);
      let errorMessage = "Failed to create resource";
      
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "VIDEO":
        return <IconVideo className="h-5 w-5" />;
      case "PDF":
        return <IconFileText className="h-5 w-5" />;
      case "IMAGE":
        return <IconPhoto className="h-5 w-5" />;
      case "LINK":
        return <IconLink className="h-5 w-5" />;
      case "TEXT":
        return <IconFileText className="h-5 w-5" />;
      default:
        return <IconFileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/admin/courses/${courseId}`)}
        >
          <IconArrowLeft className="h-4 w-4 mr-2" />
          Back to Course
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Add New Resource
          </h1>
          <p className="text-muted-foreground">
            Upload files or add links to support student learning
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Information</CardTitle>
            <CardDescription>
              Enter the details for your resource
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Module Selection */}
            <div className="grid gap-2">
              <Label htmlFor="moduleId">Module *</Label>
              <Select
                value={formData.moduleId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, moduleId: value }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  {modulesLoading ? (
                    <SelectItem value="loading" disabled>
                      <div className="flex items-center gap-2">
                        <IconLoader className="h-4 w-4 animate-spin" />
                        Loading modules...
                      </div>
                    </SelectItem>
                  ) : modulesError ? (
                    <SelectItem value="error" disabled>
                      Error loading modules
                    </SelectItem>
                  ) : modules.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No modules available. Create modules first.
                    </SelectItem>
                  ) : (
                    modules.map((module) => (
                      <SelectItem key={module._id} value={module._id}>
                        {module.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              {/* Show error message if no modules */}
              {!modulesLoading && !modulesError && modules.length === 0 && (
                <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="font-medium">No modules found for this course.</p>
                  <p className="text-xs mt-1">
                    You need to create modules first before adding resources.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-1"
                    onClick={() => navigate(`/admin/courses/${courseId}`)}
                  >
                    <IconPlus className="h-3 w-3" />
                    Go to Course
                  </Button>
                </div>
              )}
              
              {/* Show error message if modules failed to load */}
              {modulesError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="font-medium">Failed to load modules.</p>
                  <p className="text-xs mt-1">
                    {modulesError?.message || "Please try again later."}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => refetchModules()}
                  >
                    Retry
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Resource Title *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter resource title"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Resource Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select resource type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIDEO">Video</SelectItem>
                  <SelectItem value="PDF">PDF Document</SelectItem>
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="TEXT">Text</SelectItem>
                  <SelectItem value="LINK">External Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Resource Content */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Content</CardTitle>
            <CardDescription>
              Upload a file or provide a URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload */}
            <div className="grid gap-2">
              <Label htmlFor="file">Upload File</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Input
                  id="file"
                  name="file"
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Label
                  htmlFor="file"
                  className="flex flex-col items-center justify-center gap-2 cursor-pointer"
                >
                  <IconUpload className="h-8 w-8 text-gray-400" />
                  <div>
                    <span className="font-medium text-blue-600">
                      Click to upload
                    </span>
                    <span className="text-gray-500"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Supported formats: PDF, Images, Videos, Text files
                  </p>
                </Label>
                {filePreview && (
                  <div className="mt-4">
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="max-w-full h-32 object-contain mx-auto rounded"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* URL Input */}
            <div className="grid gap-2">
              <Label htmlFor="url">Or provide URL</Label>
              <Input
                id="url"
                name="url"
                value={formData.url}
                onChange={handleUrlChange}
                placeholder="https://example.com/resource.pdf"
                type="url"
              />
            </div>

            {/* Additional Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  min="0"
                  max="1000"
                  value={formData.duration}
                  onChange={handleInputChange}
                  placeholder="Optional"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  name="order"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.order}
                  onChange={handleInputChange}
                  placeholder="1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/admin/courses/${courseId}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || modulesLoading} className="gap-2">
            {isLoading && <IconLoader className="h-4 w-4 animate-spin" />}
            {isLoading ? "Creating..." : "Create Resource"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddResourcePage;