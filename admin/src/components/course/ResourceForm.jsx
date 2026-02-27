import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/form/index";
import { IconTrash, IconUpload, IconX, IconFile } from "@tabler/icons-react";

const resourceTypeOptions = [
  { value: "PDF", label: "PDF" },
  { value: "VIDEO", label: "Video" },
  { value: "LINK", label: "External Link" },
  { value: "DOCUMENT", label: "Document" },
  { value: "IMAGE", label: "Image" },
];

export const ResourceForm = ({ resource, onUpdate, onRemove }) => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate file upload process
    const simulateUpload = () => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);

        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploading(false);
            // Generate a mock URL for the uploaded file
            const mockFileUrl = URL.createObjectURL(file);
            onUpdate("url", mockFileUrl);
            onUpdate("uploadedFile", file.name);
          }, 300);
        }
      }, 100);
    };

    simulateUpload();
  };

  const removeUploadedFile = () => {
    onUpdate("url", "");
    onUpdate("uploadedFile", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUrlChange = (value) => {
    onUpdate("url", value);
    // Clear uploaded file if URL is manually entered
    if (value && resource.uploadedFile) {
      onUpdate("uploadedFile", "");
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Resource</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-[#dc2626] hover:text-[#991b1b] hover:bg-[#fef2f2]"
        >
          <IconTrash className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input
            value={resource.title}
            onChange={(e) => onUpdate("title", e.target.value)}
            placeholder="Resource title"
            className="focus:ring-2 focus:ring-[#3b82f6]"
          />
        </div>
        <div className="space-y-2">
          <Label>Type *</Label>
          <FormSelect
            value={resource.type}
            onValueChange={(value) => onUpdate("type", value)}
            options={resourceTypeOptions}
            placeholder="Select type"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Resource Content</Label>

        {/* File Upload Option */}
        <div className="border-2 border-dashed border-[#d1d5db] rounded-lg p-4 text-center hover:border-[#60a5fa] transition-colors">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept={
              resource.type === "PDF" ? ".pdf" :
                resource.type === "IMAGE" ? "image/*" :
                  resource.type === "VIDEO" ? "video/*" :
                    resource.type === "DOCUMENT" ? ".doc,.docx,.txt" :
                      "*"
            }
          />

          {resource.uploadedFile ? (
            <div className="flex items-center justify-between bg-[#eff6ff] p-3 rounded-md">
              <div className="flex items-center gap-2">
                <IconFile className="h-5 w-5 text-[#2563eb]" />
                <span className="text-sm font-medium truncate">{resource.uploadedFile}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeUploadedFile}
                className="h-8 w-8 p-0 text-[#6b7280] hover:text-[#dc2626]"
              >
                <IconX className="h-4 w-4" />
              </Button>
            </div>
          ) : isUploading ? (
            <div className="space-y-2">
              <div className="w-full bg-[#e5e7eb] rounded-full h-2.5">
                <div
                  className="bg-[#2563eb] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-[#4b5563]">Uploading... {uploadProgress}%</p>
            </div>
          ) : (
            <div className="space-y-2">
              <IconUpload className="h-8 w-8 text-[#9ca3af] mx-auto" />
              <p className="text-sm text-[#4b5563]">
                Drag & drop a file or{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[#2563eb] hover:text-[#1e40af] font-medium"
                >
                  browse files
                </button>
              </p>
              <p className="text-xs text-[#6b7280]">
                Supports {resource.type === "PDF" ? "PDF files" :
                  resource.type === "IMAGE" ? "images" :
                    resource.type === "VIDEO" ? "videos" :
                      resource.type === "DOCUMENT" ? "documents" :
                        "all file types"}
              </p>
            </div>
          )}
        </div>

        {/* OR separator */}
        <div className="relative flex items-center">
          <div className="flex-grow border-t border-[#d1d5db]"></div>
          <span className="mx-3 text-sm text-[#6b7280]">OR</span>
          <div className="flex-grow border-t border-[#d1d5db]"></div>
        </div>

        {/* URL Input */}
        <div className="space-y-2">
          <Label>External URL</Label>
          <Input
            value={resource.url && !resource.uploadedFile ? resource.url : ""}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://example.com/resource"
            className="focus:ring-2 focus:ring-[#3b82f6]"
            disabled={!!resource.uploadedFile}
          />
          <p className="text-xs text-[#6b7280]">
            Provide a URL to external resource {resource.uploadedFile && "(disabled when file is uploaded)"}
          </p>
        </div>
      </div>
    </div>
  );
};