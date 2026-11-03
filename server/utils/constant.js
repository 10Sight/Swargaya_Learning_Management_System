import ENV from "../configs/env.config.js";

// Cookies can only have `secure: true` when served over HTTPS.
// If served over plain HTTP (e.g. http://31.97.229.146:5173), browsers will reject
// cookies with `secure: true`. Only enable secure if explicitly requested or on HTTPS.
const isHttps = process.env.COOKIE_SECURE === "true" ||
    (ENV.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false" && !ENV.FRONTEND_URL?.startsWith("http://"));

export const accessTokenOptions = {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "None" : "Lax",
    path: "/",
};

export const refreshTokenOptions = {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "None" : "Lax",
    path: "/",
};
