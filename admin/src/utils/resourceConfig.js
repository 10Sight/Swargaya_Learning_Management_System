import {
  IconFileTypePdf,
  IconPhoto,
  IconVideo,
  IconFileTypeDocx,
  IconFileTypeXls,
  IconFileTypePpt,
  IconFileText,
  IconLink,
  IconFile,
} from "@tabler/icons-react";

// Single source of truth for every resource type: labels, icons, accepted
// extensions/MIME types, and preview capability. Client validation, dynamic
// `accept` attributes, and the viewer registry all read from this map so a
// new resource type only needs to be defined once, here.
export const RESOURCE_CONFIG = {
  pdf: {
    label: "PDF Document",
    icon: IconFileTypePdf,
    extensions: ["pdf"],
    mimeTypes: ["application/pdf"],
    canPreview: true,
    previewKind: "pdf",
  },
  image: {
    label: "Image",
    icon: IconPhoto,
    extensions: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
    canPreview: true,
    previewKind: "image",
  },
  video: {
    label: "Video",
    icon: IconVideo,
    extensions: ["mp4", "webm", "ogg", "mov", "avi", "mkv"],
    mimeTypes: ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"],
    canPreview: true,
    previewKind: "video",
  },
  msword: {
    label: "Word Document",
    icon: IconFileTypeDocx,
    extensions: ["doc", "docx"],
    mimeTypes: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    canPreview: true,
    previewKind: "office",
  },
  msexcel: {
    label: "Excel Spreadsheet",
    icon: IconFileTypeXls,
    extensions: ["xls", "xlsx", "csv"],
    mimeTypes: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "application/csv",
    ],
    canPreview: true,
    previewKind: "excel",
  },
  msppt: {
    label: "PowerPoint Presentation",
    icon: IconFileTypePpt,
    extensions: ["ppt", "pptx"],
    mimeTypes: [
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    canPreview: true,
    previewKind: "office",
  },
  text: {
    label: "Text File",
    icon: IconFileText,
    extensions: ["txt"],
    mimeTypes: ["text/plain"],
    canPreview: true,
    previewKind: "text",
  },
  link: {
    label: "External Link",
    icon: IconLink,
    extensions: [],
    mimeTypes: [],
    canPreview: true,
    previewKind: "link",
  },
};

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export const RESOURCE_TYPE_OPTIONS = Object.entries(RESOURCE_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
  icon: config.icon,
}));

export const getResourceTypeConfig = (type) => RESOURCE_CONFIG[type?.toLowerCase()] || null;

export const getResourceIcon = (type) => getResourceTypeConfig(type)?.icon || IconFile;

// Native <input accept> string for the given resource type: extensions and
// MIME types combined so the OS file picker filters as tightly as possible.
export const getAcceptString = (type) => {
  const config = getResourceTypeConfig(type);
  if (!config || config.extensions.length === 0) return "";
  const exts = config.extensions.map((ext) => `.${ext}`);
  return [...exts, ...config.mimeTypes].join(",");
};

// Layer 2 of the defense-in-depth validation: verifies both the extension
// and the declared MIME type against the config before the file can leave
// the browser, so a mislabeled or renamed file never reaches the network.
export const validateFileForType = (file, type) => {
  if (!file) return { isValid: false, error: "No file provided" };
  if (!type) return { isValid: false, error: "Please select a resource type first" };

  const normalizedType = type.toLowerCase();
  if (normalizedType === "link") {
    return { isValid: false, error: "Link resources do not accept file uploads" };
  }

  const config = RESOURCE_CONFIG[normalizedType];
  if (!config) return { isValid: false, error: `Unsupported resource type: ${type}` };

  const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
  const mime = file.type ? file.type.toLowerCase() : "";

  const isExtValid = config.extensions.includes(ext);
  const isMimeValid = mime ? config.mimeTypes.includes(mime) : true;

  if (!isExtValid || !isMimeValid) {
    return {
      isValid: false,
      error: `Invalid file format for ${config.label}. Only (${config.extensions.map((e) => `.${e}`).join(", ")}) files are allowed.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { isValid: false, error: "File size exceeds maximum allowed limit of 50MB" };
  }

  return { isValid: true };
};

// Best-effort auto-detection of a resource type from a File or a URL/filename string.
export const getFileCategory = (fileOrUrl) => {
  if (!fileOrUrl) return null;
  const name = typeof fileOrUrl === "string" ? fileOrUrl.split("?")[0].split("#")[0] : fileOrUrl.name || "";
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  if (!ext) return null;

  for (const [type, config] of Object.entries(RESOURCE_CONFIG)) {
    if (config.extensions.includes(ext)) return type;
  }
  return null;
};
