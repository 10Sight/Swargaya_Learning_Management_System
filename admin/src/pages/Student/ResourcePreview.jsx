import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  Video,
  FileImage,
  FileSpreadsheet,
  Presentation,
  Maximize2,
  Minimize2,
  AlertCircle,
  Eye,
  Loader2,
} from "lucide-react";
import { resolveResourceUrl } from "@/utils/urlHelper";

const isLocalUrl = (url) => {
  if (!url) return false;
  return /localhost|127\.0\.0\.1|192\.168\./i.test(url);
};

const ExcelPreview = ({ url }) => {
  const [sheets, setSheets] = useState(null);
  const [activeSheet, setActiveSheet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadWorkbook = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch file');
        const buffer = await response.arrayBuffer();

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const parsedSheets = workbook.worksheets.map((worksheet) => {
          const rows = [];
          worksheet.eachRow({ includeEmpty: false }, (row) => {
            const cells = [];
            row.eachCell({ includeEmpty: true }, (cell) => {
              cells.push(cell.value !== null && cell.value !== undefined ? String(cell.value) : '');
            });
            rows.push(cells);
          });
          return { name: worksheet.name, rows };
        });

        if (!cancelled) {
          setSheets(parsedSheets);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoadError('Failed to parse spreadsheet. Please try downloading instead.');
          setLoading(false);
        }
      }
    };

    loadWorkbook();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 sm:h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-[#2563eb] mx-auto mb-4" />
          <p className="text-sm sm:text-base text-[#4b5563]">Parsing spreadsheet...</p>
        </div>
      </div>
    );
  }

  if (loadError || !sheets || sheets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 sm:h-96">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 sm:h-12 sm:w-12 text-[#ef4444] mx-auto mb-4" />
          <p className="text-sm sm:text-base text-[#dc2626]">{loadError || 'This spreadsheet has no content to display.'}</p>
        </div>
      </div>
    );
  }

  const currentSheet = sheets[activeSheet];
  const maxCols = currentSheet.rows.reduce((max, row) => Math.max(max, row.length), 0);
  const colLabel = (index) => {
    let label = '';
    let n = index;
    do {
      label = String.fromCharCode(65 + (n % 26)) + label;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return label;
  };

  return (
    <div className="w-full">
      {sheets.length > 1 && (
        <div className="flex flex-wrap gap-1 mb-3 border-b border-[#e5e7eb] pb-2">
          {sheets.map((sheet, index) => (
            <button
              key={sheet.name + index}
              onClick={() => setActiveSheet(index)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-t-md font-medium transition-colors ${
                index === activeSheet
                  ? 'bg-[#2563eb] text-white'
                  : 'bg-[#f3f4f6] text-[#4b5563] hover:bg-[#e5e7eb]'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}
      <div className="w-full overflow-auto rounded-lg border border-[#e5e7eb] max-h-96 sm:max-h-[32rem]">
        <table className="w-full text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-[#f3f4f6] sticky top-0 z-10">
              <th className="border border-[#e5e7eb] px-2 py-1.5 text-[#6b7280] font-medium w-10"></th>
              {Array.from({ length: maxCols }).map((_, colIndex) => (
                <th key={colIndex} className="border border-[#e5e7eb] px-3 py-1.5 text-[#6b7280] font-medium text-left whitespace-nowrap">
                  {colLabel(colIndex)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentSheet.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-[#f9fafb]">
                <td className="border border-[#e5e7eb] px-2 py-1.5 text-[#9ca3af] font-medium bg-[#f9fafb] text-center">
                  {rowIndex + 1}
                </td>
                {Array.from({ length: maxCols }).map((_, colIndex) => (
                  <td key={colIndex} className="border border-[#e5e7eb] px-3 py-1.5 text-[#111827] whitespace-nowrap">
                    {row[colIndex] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const OfficeDocumentFallback = ({ resource, typeLabel }) => {
  const [showCloudViewer, setShowCloudViewer] = useState(false);
  const { url, title } = resource;

  if (showCloudViewer) {
    return (
      <div className="w-full">
        <div className="flex justify-end mb-2">
          <Button onClick={() => setShowCloudViewer(false)} variant="outline" size="sm">
            Back to Options
          </Button>
        </div>
        <iframe
          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
          className="w-full h-96 sm:h-[32rem] rounded-lg border"
          title={title}
        />
      </div>
    );
  }

  return (
    <div className="text-center py-8 sm:py-12">
      <div className="p-6 sm:p-8 bg-[#f3f4f6] rounded-full w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 flex items-center justify-center">
        {typeLabel === 'PowerPoint' ? (
          <Presentation className="h-10 w-10 sm:h-14 sm:w-14 text-[#4b5563]" />
        ) : (
          <FileText className="h-10 w-10 sm:h-14 sm:w-14 text-[#4b5563]" />
        )}
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-[#111827] mb-2">{typeLabel} Preview</h3>
      <Alert className="max-w-lg mx-auto mb-4 text-left">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Live in-browser previews for {typeLabel} files aren't available on a local/development
          server, since the online viewer can't reach files on localhost. Download the file or
          open it directly, or try the cloud viewer if this file is served from a public URL.
        </AlertDescription>
      </Alert>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button asChild variant="outline">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </a>
        </Button>
        <Button onClick={() => setShowCloudViewer(true)} variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          Try Cloud Viewer
        </Button>
      </div>
    </div>
  );
};

const ResourcePreview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { resource, moduleTitle, courseTitle } = location.state || {};

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!resource) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="shadow-lg border-[#fecaca]">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-[#ef4444] mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-bold text-[#111827] mb-2">Resource Not Found</h3>
              <Alert variant="destructive" className="mb-4">
                <AlertDescription className="text-sm">
                  The requested resource could not be found. Please go back and try again.
                </AlertDescription>
              </Alert>
              <Button onClick={() => navigate(-1)} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getResourceIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'video':
        return <Video className="h-5 w-5 sm:h-6 sm:w-6" />;
      case 'pdf':
      case 'text':
        return <FileText className="h-5 w-5 sm:h-6 sm:w-6" />;
      case 'image':
        return <FileImage className="h-5 w-5 sm:h-6 sm:w-6" />;
      case 'msword':
        return <FileText className="h-5 w-5 sm:h-6 sm:w-6" />;
      case 'msexcel':
        return <FileSpreadsheet className="h-5 w-5 sm:h-6 sm:w-6" />;
      case 'msppt':
        return <Presentation className="h-5 w-5 sm:h-6 sm:w-6" />;
      default:
        return <Eye className="h-5 w-5 sm:h-6 sm:w-6" />;
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = resolveResourceUrl(resource.url);
    link.download = resource.title || 'resource';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const renderPreviewContent = () => {
    const { type, title } = resource;
    const url = resolveResourceUrl(resource.url);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64 sm:h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-[#2563eb] mx-auto mb-4" />
            <p className="text-sm sm:text-base text-[#4b5563]">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64 sm:h-96">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 sm:h-12 sm:w-12 text-[#ef4444] mx-auto mb-4" />
            <p className="text-sm sm:text-base text-[#dc2626] mb-4">{error}</p>
            <Button onClick={() => setError(null)} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    switch (type?.toLowerCase()) {
      case 'pdf':
        return (
          <div className="w-full h-full min-h-96">
            <iframe
              src={url}
              className="w-full h-full min-h-96 rounded-lg border"
              title={title}
              onError={() => setError('Failed to load PDF. Please try downloading instead.')}
            />
          </div>
        );

      case 'video':
        return (
          <div className="w-full">
            <video
              controls
              className="w-full max-h-96 sm:max-h-[32rem] rounded-lg shadow-lg"
              onError={() => setError('Failed to load video. Please check the file format.')}
            >
              <source src={url} type="video/mp4" />
              <source src={url} type="video/webm" />
              <source src={url} type="video/ogg" />
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'image':
        return (
          <div className="w-full flex justify-center">
            <img
              src={url}
              alt={title}
              className="max-w-full max-h-96 sm:max-h-[32rem] rounded-lg shadow-lg object-contain"
              onError={() => setError('Failed to load image. Please try downloading instead.')}
            />
          </div>
        );

      case 'text':
        return (
          <div className="w-full">
            <iframe
              src={url}
              className="w-full h-96 sm:h-[32rem] rounded-lg border"
              title={title}
              onError={() => setError('Failed to load text file. Please try downloading instead.')}
            />
          </div>
        );

      case 'msword':
      case 'msppt': {
        const typeLabel = type.toLowerCase() === 'msword' ? 'Word Document' : 'PowerPoint';
        if (!isLocalUrl(url)) {
          return (
            <div className="w-full">
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
                className="w-full h-96 sm:h-[32rem] rounded-lg border"
                title={title}
                onError={() => setError(`Failed to load ${typeLabel}. Please try downloading instead.`)}
              />
            </div>
          );
        }
        return <OfficeDocumentFallback resource={resource} typeLabel={typeLabel === 'Word Document' ? 'Word' : 'PowerPoint'} />;
      }

      case 'msexcel':
        if (!isLocalUrl(url)) {
          return (
            <div className="w-full">
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
                className="w-full h-96 sm:h-[32rem] rounded-lg border"
                title={title}
                onError={() => setError('Failed to load spreadsheet. Please try downloading instead.')}
              />
            </div>
          );
        }
        return <ExcelPreview url={url} title={title} />;

      default:
        return (
          <div className="text-center py-8 sm:py-12">
            <div className="p-6 sm:p-8 bg-[#f3f4f6] rounded-full w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 flex items-center justify-center">
              {getResourceIcon(type)}
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#111827] mb-2">Preview Not Available</h3>
            <p className="text-sm sm:text-base text-[#4b5563] mb-4">
              This file type cannot be previewed directly. Please download to view the content.
            </p>
            <Button onClick={handleDownload} className="bg-[#2563eb] hover:bg-[#1d4ed8]">
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        );
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] ${isFullscreen ? 'p-0' : 'p-4 sm:p-6'}`}>
      <div className={`mx-auto ${isFullscreen ? 'max-w-full h-screen' : 'max-w-6xl'}`}>
        {/* Header */}
        {!isFullscreen && (
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate(-1)}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
                <div>
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#111827] leading-tight">
                    {resource.title || 'Resource Preview'}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    {moduleTitle && (
                      <span className="text-xs sm:text-sm text-[#4b5563]">
                        Module: {moduleTitle}
                      </span>
                    )}
                    {courseTitle && (
                      <span className="text-xs sm:text-sm text-[#4b5563]">
                        • Course: {courseTitle}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Badge
                  className={`px-3 py-1 text-xs sm:text-sm font-medium ${resource.type === 'video' ? 'bg-[#ef4444] text-white' :
                      resource.type === 'pdf' ? 'bg-[#3b82f6] text-white' :
                        resource.type === 'image' ? 'bg-[#22c55e] text-white' :
                          'bg-[#6b7280] text-white'
                    }`}
                >
                  {resource.type?.toUpperCase() || 'FILE'}
                </Badge>

                {resource.type !== 'link' && (
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                )}

                <Button
                  onClick={toggleFullscreen}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Content */}
        <Card className={`shadow-xl ${isFullscreen ? 'h-screen rounded-none border-0' : ''}`}>
          {isFullscreen && (
            <div className="absolute top-4 right-4 z-10">
              <Button
                onClick={toggleFullscreen}
                variant="outline"
                size="sm"
                className="bg-white/90 backdrop-blur-sm"
              >
                <Minimize2 className="h-4 w-4 mr-2" />
                Exit Fullscreen
              </Button>
            </div>
          )}

          <CardContent className={`${isFullscreen ? 'p-4 h-full' : 'p-4 sm:p-6'}`}>
            {resource.description && !isFullscreen && (
              <div className="mb-4 sm:mb-6 p-4 bg-[#eff6ff] rounded-lg border border-[#bfdbfe]">
                <p className="text-sm sm:text-base text-[#1e40af] leading-relaxed">
                  {resource.description}
                </p>
              </div>
            )}

            <div className={`${isFullscreen ? 'h-full flex items-center justify-center' : ''}`}>
              {renderPreviewContent()}
            </div>
          </CardContent>
        </Card>

        {/* Resource Info Footer */}
        {!isFullscreen && resource.description && (
          <div className="mt-4 sm:mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <div className="p-2 bg-[#dbeafe] rounded-lg">
                    {getResourceIcon(resource.type)}
                  </div>
                  Resource Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="font-semibold text-[#111827] mb-1">Title</dt>
                    <dd className="text-[#4b5563]">{resource.title || 'Untitled Resource'}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#111827] mb-1">Type</dt>
                    <dd className="text-[#4b5563]">{resource.type?.toUpperCase() || 'Unknown'}</dd>
                  </div>
                  {resource.description && (
                    <div className="sm:col-span-2">
                      <dt className="font-semibold text-[#111827] mb-1">Description</dt>
                      <dd className="text-[#4b5563] leading-relaxed">{resource.description}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourcePreview;
