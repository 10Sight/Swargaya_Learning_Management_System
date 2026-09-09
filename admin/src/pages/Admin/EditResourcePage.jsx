import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetResourceByIdQuery, useUpdateResourceMutation } from "@/Redux/AllApi/resourceApi";
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
  IconLoader,
  IconFileText,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RESOURCE_TYPE_OPTIONS, getAcceptString, validateFileForType } from "@/utils/resourceConfig";

const EditResourcePage = () => {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const { data: resourceData, isFetching, isError } = useGetResourceByIdQuery(resourceId, { skip: !resourceId });
  const [updateResource, { isLoading: isUpdating }] = useUpdateResourceMutation();

  const resource = resourceData?.data;
  const isUploadedFile = Boolean(resource?.publicId || resource?.fileName);

  const [formData, setFormData] = useState({
    title: "",
    type: "pdf",
    description: "",
    url: "",
    file: null,
  });

  useEffect(() => {
    if (resource) {
      setFormData({
        title: resource.title || "",
        type: resource.type || "pdf",
        description: resource.description || "",
        url: isUploadedFile ? "" : (resource.url || ""),
        file: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId, resource?.updatedAt]);

  const handleInputChange = (field, value) => {
    if (field === "type") {
      setFormData((prev) => {
        if (prev.file && !validateFileForType(prev.file, value).isValid) {
          toast.info("Selected file removed because it doesn't match the new resource type");
          return { ...prev, type: value, file: null };
        }
        return { ...prev, type: value };
      });
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validation = validateFileForType(file, formData.type);
    if (!validation.isValid) {
      toast.error(validation.error);
      event.target.value = "";
      return;
    }

    setFormData((prev) => ({ ...prev, file, url: "" }));
  };

  const removeFile = () => setFormData((prev) => ({ ...prev, file: null }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Resource title is required");
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title.trim());
      formDataToSend.append("type", formData.type);
      if (formData.description.trim()) {
        formDataToSend.append("description", formData.description.trim());
      }
      if (formData.file) {
        formDataToSend.append("file", formData.file);
      } else if (formData.url.trim()) {
        formDataToSend.append("url", formData.url.trim());
      }

      await updateResource({ resourceId, data: formDataToSend }).unwrap();
      toast.success("Resource updated successfully!");
      navigate(-1);
    } catch (error) {
      console.error("Update resource error:", error);
      toast.error(error?.data?.message || "Failed to update resource");
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-16">
        <IconLoader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !resource) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Resource not found.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <IconArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <IconArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Resource</h1>
          <p className="text-muted-foreground">
            Update this resource's details, file, or link
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Resource Information</CardTitle>
            <CardDescription>Update the details for this resource</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Resource Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter resource title"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Resource Type *</Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select resource type" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe this resource..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resource Content</CardTitle>
            <CardDescription>
              Replace the file or URL, or leave unchanged to keep the current one
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resource.url && !formData.file && (
              <p className="text-xs text-[#6b7280] break-all">
                Current: {resource.fileName || resource.url}
              </p>
            )}

            <div className="grid gap-2">
              <Label>Replace File</Label>
              <div className="border-2 border-dashed border-[#d1d5db] rounded-lg p-6 text-center hover:border-[#60a5fa] transition-colors">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  accept={getAcceptString(formData.type) || "*"}
                />

                {formData.file ? (
                  <div className="flex items-center justify-between bg-[#eff6ff] p-4 rounded-md">
                    <div className="flex items-center gap-3">
                      <IconFileText className="h-6 w-6 text-[#2563eb]" />
                      <div className="text-left">
                        <p className="text-sm font-medium truncate">{formData.file.name}</p>
                        <p className="text-xs text-[#4b5563]">
                          {(formData.file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      className="h-8 w-8 p-0 text-[#6b7280] hover:text-[#dc2626]"
                    >
                      ❌
                    </Button>
                  </div>
                ) : (
                  <label htmlFor="file-upload" className="cursor-pointer block">
                    <IconUpload className="h-10 w-10 text-[#9ca3af] mx-auto mb-3" />
                    <p className="text-sm text-[#4b5563]">
                      Drop a file here or{" "}
                      <span className="text-[#2563eb] hover:text-[#1e40af] font-medium">
                        browse files
                      </span>
                    </p>
                  </label>
                )}
              </div>
            </div>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-[#d1d5db]"></div>
              <span className="mx-4 text-sm text-[#6b7280] bg-white px-2">OR</span>
              <div className="flex-grow border-t border-[#d1d5db]"></div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="url">External URL</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                placeholder="https://example.com/resource.pdf"
                disabled={!!formData.file}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isUpdating} className="gap-2">
            {isUpdating && <IconLoader className="h-4 w-4 animate-spin" />}
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditResourcePage;
