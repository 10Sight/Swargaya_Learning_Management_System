import { config } from "dotenv";

config();

const ENV = {
    PORT: process.env.PORT || 3000,
    BACKEND_URL: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`,
    MONGO_URI: process.env.MONGO_URI,

    NODE_ENV: process.env.NODE_ENV || "development",
    JWT_ACCESS_SECRET: process.env.JWT_SECRET,
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

    // Email configuration
    SMTP_USERNAME: process.env.SMTP_USERNAME,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,

    // Database configuration
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME,

    FRONTEND_URL: process.env.FRONTEND_URL,
    ADMIN_URL: process.env.ADMIN_URL,
    INSTRUCTOR_URL: process.env.INSTRUCTOR_URL,
    STUDENT_URL: process.env.STUDENT_URL,
    SUPERADMIN_URL: process.env.SUPERADMIN_URL,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"]
}

export default ENV;