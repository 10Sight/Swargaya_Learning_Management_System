import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  IconExternalLink,
  IconDownload,
  IconMaximize,
  IconZoomIn,
  IconZoomOut,
  IconAlertTriangle,
  IconLoader,
} from "@tabler/icons-react";
import { getResourceTypeConfig, getResourceIcon } from "@/utils/resourceConfig";
import { resolveResourceUrl } from "@/utils/urlHelper";

// Backend hosts are frequently localhost/private during development; Microsoft's
// Office Online viewer can only fetch publicly reachable URLs, so we detect that
// up front and fall back to a download card instead of a permanently blank iframe.
const isPubliclyReachable = (url) => {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return !(
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
};

const FallbackCard = ({ icon, title, message, url }) => {
  const Icon = icon;
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center py-16 px-6">
      <Icon className="h-12 w-12 text-[#9ca3af]" />
      <p className="font-medium text-[#111827]">{title}</p>
      {message && <p className="text-sm text-[#6b7280] max-w-md">{message}</p>}
      {url && (
        <Button asChild className="gap-2 mt-2">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <IconExternalLink className="h-4 w-4" />
            Open in New Tab
          </a>
        </Button>
      )}
    </div>
  );
};

const PdfViewer = ({ url }) => (
  <iframe
    src={`${url}#toolbar=1&navpanes=0`}
    title="PDF preview"
    className="w-full h-full min-h-[70vh] rounded-md border border-[#e5e7eb]"
  />
);

const VideoViewer = ({ url }) => (
  <video controls className="w-full max-h-[75vh] rounded-md bg-black mx-auto" src={url}>
    Your browser does not support the video tag.
  </video>
);

const ImageViewer = ({ url, title }) => {
  const [zoomed, setZoomed] = useState(false);
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full overflow-auto max-h-[70vh] flex justify-center bg-[#f9fafb] rounded-md border border-[#e5e7eb] p-2">
        <img
          src={url}
          alt={title}
          className={zoomed ? "max-w-none cursor-zoom-out" : "max-w-full max-h-[68vh] object-contain cursor-zoom-in"}
          onClick={() => setZoomed((z) => !z)}
        />
      </div>
      <Button variant="outline" size="sm" onClick={() => setZoomed((z) => !z)} className="gap-2">
        {zoomed ? <IconZoomOut className="h-4 w-4" /> : <IconZoomIn className="h-4 w-4" />}
        {zoomed ? "Zoom Out" : "Zoom In"}
      </Button>
    </div>
  );
};

const OfficeViewer = ({ url, title }) => {
  if (!isPubliclyReachable(url)) {
    return (
      <FallbackCard
        icon={IconAlertTriangle}
        title="Preview unavailable on this network"
        message="Microsoft Office Online can only preview files hosted on a public URL. Download the file or open it directly instead."
        url={url}
      />
    );
  }
  const embedSrc = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  return (
    <iframe
      src={embedSrc}
      title={title}
      className="w-full h-full min-h-[70vh] rounded-md border border-[#e5e7eb]"
    />
  );
};

const ExcelViewer = ({ url, format }) => {
  const [state, setState] = useState({ loading: true, error: null, rows: null });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: null, rows: null });

    const load = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch file");

        if ((format || "").toLowerCase() === "csv") {
          const text = await res.text();
          const rows = text
            .split(/\r?\n/)
            .filter((line) => line.length > 0)
            .slice(0, 200)
            .map((line) => line.split(","));
          if (!cancelled) setState({ loading: false, error: null, rows });
          return;
        }

        const ExcelJS = (await import("exceljs")).default;
        const buffer = await res.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        const rows = [];
        worksheet.eachRow({ includeEmpty: false }, (row) => {
          if (rows.length >= 200) return;
          rows.push(row.values.slice(1).map((v) => (v == null ? "" : String(v))));
        });
        if (!cancelled) setState({ loading: false, error: null, rows });
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: err.message || "Preview failed", rows: null });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [url, format]);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-[#6b7280]">
        <IconLoader className="h-5 w-5 animate-spin" />
        Parsing spreadsheet...
      </div>
    );
  }

  if (state.error || !state.rows || state.rows.length === 0) {
    return (
      <FallbackCard
        icon={IconAlertTriangle}
        title="Couldn't render a preview"
        message={state.error || "This spreadsheet has no readable rows."}
        url={url}
      />
    );
  }

  return (
    <div className="overflow-auto max-h-[70vh] border border-[#e5e7eb] rounded-md">
      <table className="min-w-full text-sm border-collapse">
        <tbody>
          {state.rows.map((row, i) => (
            <tr key={i} className={i === 0 ? "bg-[#f3f4f6] font-medium" : "hover:bg-[#f9fafb]"}>
              {row.map((cell, j) => (
                <td key={j} className="border border-[#e5e7eb] px-3 py-1.5 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TextViewer = ({ url }) => {
  const [state, setState] = useState({ loading: true, error: null, content: "" });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: null, content: "" });

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch file");
        return res.text();
      })
      .then((content) => {
        if (!cancelled) setState({ loading: false, error: null, content });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: err.message || "Preview failed", content: "" });
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-[#6b7280]">
        <IconLoader className="h-5 w-5 animate-spin" />
        Loading text file...
      </div>
    );
  }

  if (state.error) {
    return <FallbackCard icon={IconAlertTriangle} title="Couldn't load file" message={state.error} url={url} />;
  }

  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-sm bg-[#f9fafb] border border-[#e5e7eb] rounded-md p-4 max-h-[70vh] overflow-auto">
      {state.content}
    </pre>
  );
};

const LinkViewer = ({ url }) => (
  <div className="space-y-3">
    <div className="rounded-md border border-[#fde68a] bg-[#fffbeb] px-4 py-2 text-sm text-[#92400e] flex items-center gap-2">
      <IconAlertTriangle className="h-4 w-4 shrink-0" />
      Some sites block embedding. If the preview stays blank, use "Open in New Tab" below.
    </div>
    <iframe src={url} title="Link preview" className="w-full h-[65vh] rounded-md border border-[#e5e7eb]" />
  </div>
);

export const ResourceViewerModal = ({ resource, open, onClose }) => {
  const containerRef = useRef(null);

  if (!resource) return null;

  const config = getResourceTypeConfig(resource.type);
  const Icon = getResourceIcon(resource.type);
  const previewKind = config?.previewKind;

  const handleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  };

  const renderPreview = () => {
    if (!resource.url) {
      return <FallbackCard icon={IconAlertTriangle} title="No content available" />;
    }

    const url = resolveResourceUrl(resource.url);

    switch (previewKind) {
      case "pdf":
        return <PdfViewer url={url} />;
      case "video":
        return <VideoViewer url={url} />;
      case "image":
        return <ImageViewer url={url} title={resource.title} />;
      case "office":
        return <OfficeViewer url={url} title={resource.title} />;
      case "excel":
        return <ExcelViewer url={url} format={resource.format} />;
      case "text":
        return <TextViewer url={url} />;
      case "link":
        return <LinkViewer url={url} />;
      default:
        return (
          <FallbackCard
            icon={IconAlertTriangle}
            title="Preview not supported for this type"
            url={url}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()} className="max-w-4xl">
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-[#4b5563]" />
            <span className="truncate">{resource.title}</span>
          </DialogTitle>
          {resource.description && (
            <DialogDescription className="line-clamp-2">{resource.description}</DialogDescription>
          )}
        </DialogHeader>

        <div ref={containerRef} className="bg-white">
          {renderPreview()}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#f3f4f6]">
          {resource.url && resource.type !== "link" && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={resolveResourceUrl(resource.url)} download={resource.fileName || true}>
                <IconDownload className="h-4 w-4" />
                Download
              </a>
            </Button>
          )}
          {resource.url && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={resolveResourceUrl(resource.url)} target="_blank" rel="noopener noreferrer">
                <IconExternalLink className="h-4 w-4" />
                Open in New Tab
              </a>
            </Button>
          )}
          {previewKind && previewKind !== "link" && (
            <Button variant="outline" size="sm" onClick={handleFullscreen} className="gap-2">
              <IconMaximize className="h-4 w-4" />
              Fullscreen
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResourceViewerModal;
