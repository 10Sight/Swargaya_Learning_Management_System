import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/form/index";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IconUpload,
  IconX,
  IconFile,
  IconLoader,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { useCreateResourceMutation } from "@/Redux/AllApi/resourceApi";
import { RESOURCE_TYPE_OPTIONS, getAcceptString, validateFileForType } from "@/utils/resourceConfig";
import { ResourceUploadProgressModal } from "./ResourceUploadProgressModal";

const resourceTypeOptions = RESOURCE_TYPE_OPTIONS;

export const ResourceManagementModal = ({
  isOpen,
  onClose,
  scope,
  courseId,
  moduleId,
  lessonId,
  entityName = ""
}) => {
  const fileInputRef = useRef(null);
  const [createResource, { isLoading: isCreatingResource }] = useCreateResourceMutation();

  const [formData, setFormData] = useState({
    title: "",
    type: "",
    description: "",
    url: "",
    file: null,
  });

  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle' | 'uploading' | 'success' | 'error'
  const [uploadError, setUploadError] = useState('');

  const resetForm = () => {
    setFormData({
      title: "",
      type: "",
      description: "",
      url: "",
      file: null,
    });
    setUploadStatus('idle');
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleInputChange = (field, value) => {
    if (field === "type") {
      // Switching types invalidates a previously selected file that doesn't match
      setFormData(prev => {
        if (prev.file && !validateFileForType(prev.file, value).isValid) {
          toast.info(`Existing file removed because it doesn't match the new resource type`);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return { ...prev, type: value, file: null };
        }
        return { ...prev, type: value };
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validation = validateFileForType(file, formData.type);
    if (!validation.isValid) {
      toast.error(validation.error);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFormData(prev => ({
      ...prev,
      file: file,
      url: "" // Clear URL when file is selected
    }));
  };

  const handleUrlChange = (value) => {
    setFormData(prev => ({
      ...prev,
      url: value,
      file: null // Clear file when URL is entered
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = () => {
    setFormData(prev => ({
      ...prev,
      file: null
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error("Resource title is required");
      return false;
    }

    if (!formData.type) {
      toast.error("Resource type is required");
      return false;
    }

    if (!formData.file && !formData.url.trim()) {
      toast.error("Either a file or URL must be provided");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setUploadStatus('uploading');

    try {
      const formDataToSend = new FormData();

      // Add required fields
      formDataToSend.append("title", formData.title.trim());
      formDataToSend.append("type", formData.type);
      formDataToSend.append("scope", scope);

      if (formData.description.trim()) {
        formDataToSend.append("description", formData.description.trim());
      }

      // Add the appropriate ID based on scope
      if (scope === "course" && courseId) {
        formDataToSend.append("courseId", courseId);
      } else if (scope === "module" && moduleId) {
        formDataToSend.append("moduleId", moduleId);
      } else if (scope === "lesson" && lessonId) {
        formDataToSend.append("lessonId", lessonId);
      }

      // Add file or URL
      if (formData.file) {
        formDataToSend.append("file", formData.file);
      } else if (formData.url.trim()) {
        formDataToSend.append("url", formData.url.trim());
      }

      await createResource(formDataToSend).unwrap();

      setUploadStatus('success');
      toast.success(`Resource added to ${scope} successfully!`);
      setTimeout(() => {
        resetForm();
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Create resource error:", error);
      const message = error?.data?.message || `Failed to add resource to ${scope}`;
      setUploadError(message);
      setUploadStatus('error');
      toast.error(message);
    }
  };

  const getFileAccept = () => getAcceptString(formData.type) || "*";

  const getScopeDisplayName = () => {
    switch (scope) {
      case "course": return "Course";
      case "module": return "Module";
      case "lesson": return "Lesson";
      default: return scope;
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Resource to {getScopeDisplayName()}</DialogTitle>
          <DialogDescription>
            Add a new resource to {entityName ? `"${entityName}"` : `this ${scope}`}.
            Resources can be files uploaded to Cloudinary or external links.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Resource Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Enter resource title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Resource Type *</Label>
              <FormSelect
                value={formData.type}
                onValueChange={(value) => handleInputChange("type", value)}
                options={resourceTypeOptions}
                placeholder="Select resource type"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe this resource..."
              rows={3}
            />
          </div>

          {/* File Upload Section */}
          <div className="space-y-4">
            <Label>Resource Content</Label>

            {/* File Upload Option */}
            <div className="border-2 border-dashed border-[#d1d5db] rounded-lg p-6 text-center hover:border-[#60a5fa] transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept={getFileAccept()}
              />

              {formData.file ? (
                <div className="flex items-center justify-between bg-[#eff6ff] p-4 rounded-md">
                  <div className="flex items-center gap-3">
                    <IconFile className="h-6 w-6 text-[#2563eb]" />
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
                    <IconX className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <IconUpload className="h-12 w-12 text-[#9ca3af] mx-auto" />
                  <div>
                    <p className="text-sm text-[#4b5563]">
                      Drop a file here or{" "}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[#2563eb] hover:text-[#1e40af] font-medium"
                      >
                        browse files
                      </button>
                    </p>
                    <p className="text-xs text-[#6b7280] mt-1">
                      File will be uploaded to Cloudinary
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* OR separator */}
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-[#d1d5db]"></div>
              <span className="mx-4 text-sm text-[#6b7280] bg-white px-2">OR</span>
              <div className="flex-grow border-t border-[#d1d5db]"></div>
            </div>

            {/* URL Input */}
            <div className="space-y-2">
              <Label htmlFor="url">External URL</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://example.com/resource"
                disabled={!!formData.file}
              />
              <p className="text-xs text-[#6b7280]">
                {formData.file
                  ? "URL input is disabled when a file is selected"
                  : "Provide a URL to an external resource"
                }
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={isCreatingResource}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isCreatingResource}
            className="gap-2"
          >
            {isCreatingResource && <IconLoader className="h-4 w-4 animate-spin" />}
            {isCreatingResource ? "Adding..." : "Add Resource"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ResourceUploadProgressModal
      open={uploadStatus !== 'idle'}
      file={formData.file}
      resourceType={formData.type}
      status={uploadStatus}
      errorMessage={uploadError}
      onClose={() => setUploadStatus('idle')}
    />
    </>
  );
};
