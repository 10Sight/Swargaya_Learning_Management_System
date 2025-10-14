import SystemSettings from "../models/systemSettings.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get current system settings
export const getSystemSettings = asyncHandler(async (req, res) => {
    let settings = await SystemSettings.findOne().populate("lastModifiedBy", "fullName email");
    
    // If no settings exist, create default settings
    if (!settings) {
        settings = new SystemSettings({
            lastModifiedBy: req.user?.id || null
        });
        await settings.save();
        // Populate after save
        settings = await SystemSettings.findById(settings._id).populate("lastModifiedBy", "fullName email");
    }

    res.json(new ApiResponse(200, settings, "System settings fetched successfully"));
});

// Update system settings
export const updateSystemSettings = asyncHandler(async (req, res) => {
    const updateData = { ...req.body };
    
    // Add metadata
    updateData.lastModifiedBy = req.user?.id || null;
    
    // Validate sensitive fields
    if (updateData.adminEmail && !/^\S+@\S+\.\S+$/.test(updateData.adminEmail)) {
        throw new ApiError("Invalid admin email format", 400);
    }
    
    if (updateData.fromEmail && updateData.fromEmail && !/^\S+@\S+\.\S+$/.test(updateData.fromEmail)) {
        throw new ApiError("Invalid from email format", 400);
    }
    
    // Validate numeric ranges
    if (updateData.sessionTimeout && (updateData.sessionTimeout < 5 || updateData.sessionTimeout > 480)) {
        throw new ApiError("Session timeout must be between 5 and 480 minutes", 400);
    }
    
    if (updateData.maxLoginAttempts && (updateData.maxLoginAttempts < 3 || updateData.maxLoginAttempts > 10)) {
        throw new ApiError("Max login attempts must be between 3 and 10", 400);
    }
    
    if (updateData.passwordMinLength && (updateData.passwordMinLength < 6 || updateData.passwordMinLength > 32)) {
        throw new ApiError("Password minimum length must be between 6 and 32 characters", 400);
    }
    
    if (updateData.maxFileUploadSize && (updateData.maxFileUploadSize < 1 || updateData.maxFileUploadSize > 100)) {
        throw new ApiError("Max file upload size must be between 1 and 100 MB", 400);
    }
    
    if (updateData.backupRetention && (updateData.backupRetention < 7 || updateData.backupRetention > 365)) {
        throw new ApiError("Backup retention must be between 7 and 365 days", 400);
    }
    
    if (updateData.notificationRetention && (updateData.notificationRetention < 7 || updateData.notificationRetention > 365)) {
        throw new ApiError("Notification retention must be between 7 and 365 days", 400);
    }
    
    if (updateData.maxConcurrentUsers && (updateData.maxConcurrentUsers < 100 || updateData.maxConcurrentUsers > 10000)) {
        throw new ApiError("Max concurrent users must be between 100 and 10,000", 400);
    }
    
    // Validate enum values
    const validTimeFormats = ["12h", "24h"];
    if (updateData.timeFormat && !validTimeFormats.includes(updateData.timeFormat)) {
        throw new ApiError("Invalid time format. Must be '12h' or '24h'", 400);
    }
    
    const validEncryptions = ["none", "tls", "ssl"];
    if (updateData.smtpEncryption && !validEncryptions.includes(updateData.smtpEncryption)) {
        throw new ApiError("Invalid SMTP encryption. Must be 'none', 'tls', or 'ssl'", 400);
    }
    
    const validLogLevels = ["error", "warn", "info", "debug"];
    if (updateData.logLevel && !validLogLevels.includes(updateData.logLevel)) {
        throw new ApiError("Invalid log level. Must be 'error', 'warn', 'info', or 'debug'", 400);
    }

    try {
        // Find and update or create if doesn't exist
        let settings = await SystemSettings.findOne();
        
        if (settings) {
            // Update existing settings
            Object.assign(settings, updateData);
            await settings.save();
        } else {
            // Create new settings if none exist
            settings = new SystemSettings(updateData);
            await settings.save();
        }
        
        // Populate and return updated settings
        settings = await SystemSettings.findById(settings._id).populate("lastModifiedBy", "fullName email");
        
        res.json(new ApiResponse(200, settings, "System settings updated successfully"));
    } catch (error) {
        if (error.name === "ValidationError") {
            const errorMessages = Object.values(error.errors).map(err => err.message);
            throw new ApiError(errorMessages.join(", "), 400);
        }
        throw error;
    }
});

// Reset system settings to default
export const resetSystemSettings = asyncHandler(async (req, res) => {
    try {
        // Delete existing settings
        await SystemSettings.deleteOne({});
        
        // Create new default settings
        const defaultSettings = new SystemSettings({
            lastModifiedBy: req.user?.id || null
        });
        
        await defaultSettings.save();
        
        // Populate and return default settings
        const settings = await SystemSettings.findById(defaultSettings._id).populate("lastModifiedBy", "fullName email");
        
        res.json(new ApiResponse(200, settings, "System settings reset to default successfully"));
    } catch (error) {
        throw new ApiError("Failed to reset system settings", 500);
    }
});

// Get system settings history (if needed for audit purposes)
export const getSystemSettingsHistory = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    // This would require a separate audit log for settings changes
    // For now, we'll just return the current settings with version info
    const settings = await SystemSettings.find()
        .populate("lastModifiedBy", "fullName email")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await SystemSettings.countDocuments();

    res.json(new ApiResponse(200, {
        settings,
        pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
            limit,
        },
    }, "System settings history fetched successfully"));
});

// Validate system configuration (useful for system health checks)
export const validateSystemConfiguration = asyncHandler(async (req, res) => {
    const settings = await SystemSettings.findOne();
    
    if (!settings) {
        throw new ApiError("System settings not found", 404);
    }

    const validation = {
        isValid: true,
        warnings: [],
        errors: [],
    };

    // Check email configuration
    if (settings.emailNotifications) {
        if (!settings.smtpHost || !settings.fromEmail) {
            validation.warnings.push("Email notifications are enabled but SMTP configuration is incomplete");
        }
    }

    // Check maintenance mode
    if (settings.maintenanceMode) {
        validation.warnings.push("System is currently in maintenance mode");
    }

    // Check security settings
    if (settings.passwordMinLength < 8) {
        validation.warnings.push("Password minimum length is less than recommended (8 characters)");
    }

    if (!settings.passwordRequireSpecial || !settings.passwordRequireNumbers || !settings.passwordRequireUppercase) {
        validation.warnings.push("Password complexity requirements are not fully enabled");
    }

    // Check file upload settings
    if (settings.maxFileUploadSize > 50) {
        validation.warnings.push("Large file upload size may impact performance");
    }

    // Check backup settings
    if (!settings.autoBackup) {
        validation.warnings.push("Automatic backups are disabled");
    }

    validation.isValid = validation.errors.length === 0;

    res.json(new ApiResponse(200, validation, "System configuration validation completed"));
});
