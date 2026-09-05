import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Video,
  FileText,
  FileImage,
  ExternalLink,
  Eye,
  Play,
  GraduationCap,
  Maximize2,
} from "lucide-react";

const StudentCourseResources = ({ resources, courseTitle }) => {
  const navigate = useNavigate();

  const getResourceIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'video':
        return <Video className="h-4 w-4 sm:h-5 sm:w-5" />;
      case 'pdf':
      case 'text':
        return <FileText className="h-4 w-4 sm:h-5 sm:w-5" />;
      case 'image':
        return <FileImage className="h-4 w-4 sm:h-5 sm:w-5" />;
      case 'link':
        return <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />;
      default:
        return <Download className="h-4 w-4 sm:h-5 sm:w-5" />;
    }
  };

  // Get preview thumbnail or placeholder image
  const getPreviewImage = (resource) => {
    const { type, url, title } = resource;

    // For images, use the actual image URL
    if (type?.toLowerCase() === 'image') {
      return url;
    }

    // For videos, try to get thumbnail (you may need to implement this based on your video service)
    if (type?.toLowerCase() === 'video') {
      // Return a placeholder for now - you can implement video thumbnail logic here
      return '/placeholder-video-thumbnail.jpg';
    }

    // For PDFs, return a PDF placeholder
    if (type?.toLowerCase() === 'pdf') {
      return '/placeholder-pdf.jpg';
    }

    // For other files, return a generic file placeholder
    return '/placeholder-file.jpg';
  };

  const handleResourceView = (resource) => {
    const { url, type, title } = resource;
    if (type === 'link') {
      window.open(url, '_blank');
    } else {
      // Navigate to preview page
      const resourceId = resource._id || resource.id || 'view';
      navigate(`/student/resource-preview/${resourceId}`, {
        state: {
          resource: resource,
          courseTitle: courseTitle
        }
      });
    }
  };

  const handleDownload = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'resource';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!resources || resources.length === 0) {
    return null;
  }

  return (
    <Card className="border-[#fecaca] bg-gradient-to-br from-[#fef2f2] via-[#fff5f5] to-white shadow-xl">
      <CardHeader className="pb-3 sm:pb-4 bg-gradient-to-r from-[#fee2e2] to-[#fef2f2] border-b border-[#fecaca]">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <div className="p-2 bg-[#dc2626] rounded-lg">
            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <span>Course Resources</span>
          <Badge className="bg-[#dc2626] text-white border-0 px-3 py-1 text-xs sm:text-sm">
            {resources.length} resource{resources.length > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
        <p className="text-xs sm:text-sm text-[#b91c1c] mt-2 leading-relaxed">
          Additional course materials and references for your comprehensive learning journey
        </p>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        {/* Sidebar-constrained: always a single-column compact list, never a multi-column grid */}
        <div className="flex flex-col gap-3">
          {resources.map((resource, index) => {
            const resourceId = resource._id || resource.id || index;
            const previewImage = getPreviewImage(resource);

            return (
              <div
                key={resourceId}
                className="group bg-white rounded-lg border-2 border-[#fecaca] overflow-hidden hover:shadow-lg hover:border-[#fca5a5] transition-all duration-300"
              >
                <div className="flex items-start gap-3 p-3">
                  {/* Thumbnail */}
                  <div
                    className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-md bg-gradient-to-br from-[#f3f4f6] to-[#e5e7eb] cursor-pointer overflow-hidden"
                    onClick={() => handleResourceView(resource)}
                  >
                    <img
                      src={previewImage}
                      alt={resource.title || `Resource ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback to icon-based preview if image fails to load
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    {/* Fallback Icon Display */}
                    <div className="absolute inset-0 hidden items-center justify-center bg-gradient-to-br from-[#fee2e2] to-[#fecaca]">
                      {getResourceIcon(resource.type)}
                    </div>

                    {/* Overlay with preview icon */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Maximize2 className="h-4 w-4 text-white" />
                    </div>
                  </div>

                  {/* Resource Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <Badge
                        className={`text-[10px] font-bold px-1.5 py-0.5 shrink-0 ${resource.type === 'video' ? 'bg-[#ef4444] text-white' :
                          resource.type === 'pdf' ? 'bg-[#3b82f6] text-white' :
                            resource.type === 'image' ? 'bg-[#22c55e] text-white' :
                              resource.type === 'link' ? 'bg-[#a855f7] text-white' :
                                'bg-[#6b7280] text-white'
                          }`}
                      >
                        {resource.type?.toUpperCase() || 'FILE'}
                      </Badge>
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-[#111827] leading-tight break-words line-clamp-2">
                      {resource.title || `Resource ${index + 1}`}
                    </h4>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 px-3 pb-3">
                  <Button
                    onClick={() => handleResourceView(resource)}
                    className="flex-1 min-w-0 h-8 text-xs bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                    size="sm"
                  >
                    {resource.type === 'video' ? (
                      <>
                        <Play className="h-3 w-3 mr-1 shrink-0" />
                        <span className="truncate">Play</span>
                      </>
                    ) : resource.type === 'link' ? (
                      <>
                        <ExternalLink className="h-3 w-3 mr-1 shrink-0" />
                        <span className="truncate">Visit</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 mr-1 shrink-0" />
                        <span className="truncate">Preview</span>
                      </>
                    )}
                  </Button>

                  {/* Download Button (for non-link resources) */}
                  {resource.type !== 'link' && (
                    <Button
                      onClick={() => handleDownload(resource.url, resource.title)}
                      variant="outline"
                      className="flex-1 min-w-0 h-8 text-xs hover:bg-[#fef2f2] border-[#fecaca] hover:border-[#fca5a5]"
                      size="sm"
                    >
                      <Download className="h-3 w-3 mr-1 shrink-0" />
                      <span className="truncate">Download</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentCourseResources;
