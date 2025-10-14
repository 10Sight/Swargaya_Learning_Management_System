import { Schema, model } from "mongoose";

const systemSettingsSchema = new Schema(
  {
    // General Settings
    siteName: {
      type: String,
      default: "Learning Management System",
      maxlength: 100,
    },
    siteDescription: {
      type: String,
      default: "Advanced Learning Management System",
      maxlength: 500,
    },
    siteUrl: {
      type: String,
      default: "https://lms.example.com",
      maxlength: 200,
    },
    adminEmail: {
      type: String,
      default: "admin@example.com",
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    timezone: {
      type: String,
      default: "UTC",
      maxlength: 50,
    },
    language: {
      type: String,
      default: "en",
      maxlength: 10,
    },
    dateFormat: {
      type: String,
      default: "YYYY-MM-DD",
      maxlength: 20,
    },
    timeFormat: {
      type: String,
      enum: ["12h", "24h"],
      default: "24h",
    },

    // Security Settings
    sessionTimeout: {
      type: Number,
      default: 30,
      min: 5,
      max: 480, // minutes
    },
    maxLoginAttempts: {
      type: Number,
      default: 5,
      min: 3,
      max: 10,
    },
    passwordMinLength: {
      type: Number,
      default: 8,
      min: 6,
      max: 32,
    },
    passwordRequireSpecial: {
      type: Boolean,
      default: true,
    },
    passwordRequireNumbers: {
      type: Boolean,
      default: true,
    },
    passwordRequireUppercase: {
      type: Boolean,
      default: true,
    },
    twoFactorAuth: {
      type: Boolean,
      default: false,
    },
    ipWhitelist: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    // Email Settings
    smtpHost: {
      type: String,
      default: "",
      maxlength: 100,
    },
    smtpPort: {
      type: Number,
      default: 587,
      min: 1,
      max: 65535,
    },
    smtpUsername: {
      type: String,
      default: "",
      maxlength: 100,
    },
    smtpPassword: {
      type: String,
      default: "",
      maxlength: 200,
    },
    smtpEncryption: {
      type: String,
      enum: ["none", "tls", "ssl"],
      default: "tls",
    },
    fromEmail: {
      type: String,
      default: "",
      match: [/^$|^\S+@\S+\.\S+$/, "Please enter a valid email or leave empty"],
    },
    fromName: {
      type: String,
      default: "",
      maxlength: 100,
    },

    // System Settings
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: String,
      default: "System is under maintenance. Please check back later.",
      maxlength: 500,
    },
    maxFileUploadSize: {
      type: Number,
      default: 10,
      min: 1,
      max: 100, // MB
    },
    allowedFileTypes: {
      type: String,
      default: "jpg,jpeg,png,pdf,doc,docx,txt",
      maxlength: 200,
    },
    autoBackup: {
      type: Boolean,
      default: true,
    },
    backupRetention: {
      type: Number,
      default: 30,
      min: 7,
      max: 365, // days
    },

    // Notification Settings
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    systemNotifications: {
      type: Boolean,
      default: true,
    },
    notificationRetention: {
      type: Number,
      default: 90,
      min: 7,
      max: 365, // days
    },

    // Performance Settings
    cacheEnabled: {
      type: Boolean,
      default: true,
    },
    compressionEnabled: {
      type: Boolean,
      default: true,
    },
    logLevel: {
      type: String,
      enum: ["error", "warn", "info", "debug"],
      default: "info",
    },
    maxConcurrentUsers: {
      type: Number,
      default: 1000,
      min: 100,
      max: 10000,
    },

    // Meta information
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists
systemSettingsSchema.index({ version: 1 }, { unique: true });

// Pre-save middleware to increment version
systemSettingsSchema.pre("save", function (next) {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }
  next();
});

export default model("SystemSettings", systemSettingsSchema);
