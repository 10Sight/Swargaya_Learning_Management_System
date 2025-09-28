import { config } from "dotenv";

config();

const ENV = {
    PORT: process.env.PORT || 3000,
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
    
    // Frontend URLs
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
    ADMIN_URL: process.env.ADMIN_URL || "http://localhost:5174",
    INSTRUCTOR_URL: process.env.INSTRUCTOR_URL,
    STUDENT_URL: process.env.STUDENT_URL,
    SUPERADMIN_URL: process.env.SUPERADMIN_URL,
}

export default ENV;