const LOCAL_BACKEND_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

/**
 * Resolves the backend API base URL for the current environment.
 * Falls back to the page's own hostname (instead of a hardcoded "localhost")
 * so requests work over LAN IPs and remote hosts without a rebuild.
 */
export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:3000`;
};

/**
 * Normalizes a resource/file URL so it always points at a reachable host.
 * - Legacy "http://localhost:3000/uploads/..." URLs stored in the DB are
 *   rewritten to the current host.
 * - Relative paths ("/uploads/..." or "uploads/...") are prefixed with the
 *   API base URL.
 * - External URLs (YouTube, S3, etc.) are left untouched.
 */
export const resolveResourceUrl = (url) => {
  if (!url) return '';

  if (LOCAL_BACKEND_URL_PATTERN.test(url)) {
    const path = url.replace(LOCAL_BACKEND_URL_PATTERN, '');
    return `${getApiBaseUrl()}${path}`;
  }

  if (ABSOLUTE_URL_PATTERN.test(url)) {
    return url;
  }

  const base = getApiBaseUrl();
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
};
