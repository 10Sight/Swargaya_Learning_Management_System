export const accessTokenOptions = {
    httpOnly: true,
    secure: false,
    sameSite: "lax", // Changed from "strict" to "lax" for development
    path: "/", // Ensure cookie is available for all paths
};

export const refreshTokenOptions = {
    httpOnly: true,
    secure: false,
    sameSite: "lax", // Changed from "strict" to "lax" for development
    path: "/", // Ensure cookie is available for all paths
};
