import ENV from "../configs/env.config.js";

export const accessTokenOptions = {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    sameSite: ENV.NODE_ENV === "production" ? "None" : "Lax",
    path: "/",
};

export const refreshTokenOptions = {
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    sameSite: ENV.NODE_ENV === "production" ? "None" : "Lax",
    path: "/",
};
