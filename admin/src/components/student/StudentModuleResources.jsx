import React from 'react';
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
} from "lucide-react";

const StudentModuleResources = ({ resources, moduleTitle }) => {
  const getResourceIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'pdf':
      case 'text':
        return <FileText className="h-5 w-5" />;
      case 'image':
        return <FileImage className="h-5 w-5" />;
      case 'link':
        return <ExternalLink className="h-5 w-5" />;
      default:
        return <Download className="h-5 w-5" />;
    }
  };

  const handleResourceView = (url, type, title) => {
    if (type === 'link') {
      window.open(url, '_blank');
    } else {
      // For files, open in new tab for preview
      window.open(url, '_blank');
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
    <Card className="mt-4 border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="h-5 w-5 text-blue-600" />
          Module Resources
          <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800">
            {resources.length} resource{resources.length > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {resources.map((resource, index) => {
            const resourceId = resource._id || resource.id || index;
            
            return (
              <div
                key={resourceId}
                className="flex items-center justify-between p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getResourceIcon(resource.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium">
                        {resource.title || `Resource ${index + 1}`}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {resource.type?.toUpperCase() || 'FILE'}
                      </Badge>
                    </div>
                    {resource.description && (
                      <p className="text-xs text-muted-foreground">
                        {resource.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Preview/View Button */}
                  <Button
                    onClick={() => handleResourceView(resource.url, resource.type, resource.title)}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    {resource.type === 'video' ? (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Play
                      </>
                    ) : resource.type === 'link' ? (
                      <>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Visit
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </>
                    )}
                  </Button>
                  
                  {/* Download Button (for non-link resources) */}
                  {resource.type !== 'link' && (
                    <Button
                      onClick={() => handleDownload(resource.url, resource.title)}
                      variant="outline"
                      size="sm"
                      className="h-8"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
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

export default StudentModuleResources;
