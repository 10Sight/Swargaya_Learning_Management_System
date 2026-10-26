/**
 * Helper utilities for analyzing resource files, detecting Microsoft Office documents,
 * and identifying file-type mismatches (e.g., resources labeled as PDF but having PPTX uploaded).
 */

export const OFFICE_EXTENSIONS = ["pptx", "ppt", "xlsx", "xls", "docx", "doc"];

/**
 * Extracts the file extension cleanly from a resource or URL string.
 * Strips query parameters and hashes.
 */
export const getFileExtension = (resourceOrUrl) => {
  if (!resourceOrUrl) return "";

  let candidate = "";

  if (typeof resourceOrUrl === "string") {
    candidate = resourceOrUrl;
  } else if (typeof resourceOrUrl === "object") {
    candidate =
      resourceOrUrl.fileName ||
      resourceOrUrl.originalName ||
      resourceOrUrl.url ||
      resourceOrUrl.fileUrl ||
      resourceOrUrl.format ||
      "";
  }

  if (!candidate) return "";

  // Strip query params and URL hash
  const cleanPath = candidate.split("?")[0].split("#")[0];

  if (!cleanPath.includes(".")) {
    // If it's just an extension string like 'pptx' or 'pdf'
    if (cleanPath.length <= 5 && !cleanPath.includes("/")) {
      return cleanPath.toLowerCase().trim();
    }
    return "";
  }

  const parts = cleanPath.split(".");
  const ext = parts.pop() || "";
  return ext.toLowerCase().trim();
};

/**
 * Determines whether a resource is a Microsoft Office document (PPTX, XLSX, DOCX, etc.)
 * which cannot be previewed directly in web browsers due to Microsoft access/CORS limitations.
 */
export const isOfficeDocument = (resource) => {
  if (!resource) return false;

  const ext = getFileExtension(resource);
  if (OFFICE_EXTENSIONS.includes(ext)) {
    return true;
  }

  const declaredType = (resource.type || "").toLowerCase();
  if (["msword", "msexcel", "msppt"].includes(declaredType)) {
    return true;
  }

  return false;
};

export const getFriendlyFileTypeName = (extension) => {
  const ext = (extension || "").toLowerCase();
  switch (ext) {
    case "pptx":
    case "ppt":
      return "PowerPoint";
    case "xlsx":
    case "xls":
      return "Excel";
    case "docx":
    case "doc":
      return "Word";
    case "pdf":
      return "PDF";
    case "mp4":
    case "webm":
    case "mov":
      return "Video";
    case "jpg":
    case "jpeg":
    case "png":
    case "webp":
      return "Image";
    default:
      return ext ? ext.toUpperCase() : "File";
  }
};

/**
 * Analyzes a resource and returns structured metadata including:
 * - actual file extension
 * - friendly type name
 * - whether it is an Office document
 * - whether it has a type mismatch (e.g. labeled as PDF but uploaded as PPTX/other)
 * - human-friendly warning messages (easy to understand for everyone)
 */
export const getResourceFileInfo = (resource) => {
  if (!resource) {
    return {
      extension: "",
      friendlyName: "File",
      isOffice: false,
      isTypeMismatch: false,
      mismatchWarning: null,
      mismatchBadge: null,
      canPreviewInBrowser: false,
    };
  }

  const extension = getFileExtension(resource);
  const declaredType = (resource.type || "").toLowerCase();
  const isOffice = isOfficeDocument(resource);
  const friendlyName = getFriendlyFileTypeName(extension);

  let isTypeMismatch = false;
  let mismatchWarning = null;
  let mismatchBadge = null;

  // Check mismatch: specifically if labeled as PDF but actual file has a different extension
  if (declaredType === "pdf") {
    if (extension && extension !== "pdf") {
      isTypeMismatch = true;
      mismatchBadge = `Uploaded as ${friendlyName} (.${extension.toUpperCase()})`;
      mismatchWarning = `This file was marked as PDF, but the uploaded file is actually a ${friendlyName} file (.${extension.toUpperCase()}).`;
    }
  } else if (declaredType === "video") {
    const videoExts = ["mp4", "webm", "ogg", "mov", "avi", "mkv"];
    if (extension && !videoExts.includes(extension)) {
      isTypeMismatch = true;
      mismatchBadge = `Uploaded as .${extension.toUpperCase()} (not Video)`;
      mismatchWarning = `This file was marked as Video, but the uploaded file is .${extension.toUpperCase()}.`;
    }
  } else if (declaredType === "image") {
    const imgExts = ["jpg", "jpeg", "png", "webp", "gif", "svg"];
    if (extension && !imgExts.includes(extension)) {
      isTypeMismatch = true;
      mismatchBadge = `Uploaded as .${extension.toUpperCase()} (not Image)`;
      mismatchWarning = `This file was marked as Image, but the uploaded file is .${extension.toUpperCase()}.`;
    }
  }

  // Can the browser reliably preview this file natively?
  // - Office files cannot open in browser.
  // - If it's labeled as PDF but is actually an Office file, it cannot preview.
  const canPreviewInBrowser =
    !isOffice &&
    !(declaredType === "pdf" && extension && extension !== "pdf") &&
    Boolean(resource.url || resource.fileUrl);

  return {
    extension,
    friendlyName,
    isOffice,
    isTypeMismatch,
    mismatchWarning,
    mismatchBadge,
    canPreviewInBrowser,
    fileName: resource.fileName || resource.originalName || "",
  };
};
