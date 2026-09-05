// Server-side mirror of admin/src/utils/resourceConfig.js. Kept as a separate
// module (rather than shared) because the client and server are independent
// deployables, but the extension/MIME matrix must stay in sync with it.
export const RESOURCE_TYPE_MATRIX = {
    pdf: {
        extensions: ["pdf"],
        mimeTypes: ["application/pdf"],
    },
    image: {
        extensions: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
    },
    video: {
        extensions: ["mp4", "webm", "ogg", "mov", "avi", "mkv"],
        mimeTypes: ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo"],
    },
    msword: {
        extensions: ["doc", "docx"],
        mimeTypes: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    },
    msexcel: {
        extensions: ["xls", "xlsx", "csv"],
        mimeTypes: [
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/csv",
            "application/csv",
        ],
    },
    msppt: {
        extensions: ["ppt", "pptx"],
        mimeTypes: [
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ],
    },
    text: {
        extensions: ["txt"],
        mimeTypes: ["text/plain"],
    },
    link: {
        extensions: [],
        mimeTypes: [],
    },
};

// Layer 3: multer file filter checks extension + MIME against the full matrix
// (any type is acceptable at upload time; the declared-type match happens later).
export const isAllowedUpload = (originalname, mimetype) => {
    const ext = originalname.includes(".") ? originalname.split(".").pop().toLowerCase() : "";
    const mime = (mimetype || "").toLowerCase();
    return Object.values(RESOURCE_TYPE_MATRIX).some(
        (config) => config.extensions.includes(ext) && config.mimeTypes.includes(mime)
    );
};

// Layer 4: cross-validates the declared `type` field against the actual
// uploaded file's extension/MIME before the resource is committed to the DB.
export const validateDeclaredType = (type, file) => {
    if (!file) return { isValid: true };
    const normalizedType = (type || "").toLowerCase();
    const config = RESOURCE_TYPE_MATRIX[normalizedType];
    if (!config) return { isValid: false, error: `Unsupported resource type: ${type}` };
    if (config.extensions.length === 0) {
        return { isValid: false, error: `Resource type '${type}' does not accept file uploads` };
    }

    const ext = file.originalname.includes(".") ? file.originalname.split(".").pop().toLowerCase() : "";
    const mime = (file.mimetype || "").toLowerCase();

    const isExtValid = config.extensions.includes(ext);
    const isMimeValid = mime ? config.mimeTypes.includes(mime) : true;

    if (!isExtValid || !isMimeValid) {
        return { isValid: false, error: `Uploaded file does not match declared type '${type}'` };
    }

    return { isValid: true };
};
