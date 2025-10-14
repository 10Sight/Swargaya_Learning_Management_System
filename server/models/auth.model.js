import { Schema, model } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { ApiError } from "../utils/ApiError.js";
import { AvailableUserStatus, AvailableUserRoles, AvailableSocialLogins } from "../constants.js";
import ENV from "../configs/env.config.js";

const userSchema = new Schema(
    {
        fullName: {
            type: String,
            required: true,
            index: true,
        },
        userName: {
            type: String,
            required: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            index: true, // Compound index will be created automatically due to unique
        },
        phoneNumber: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        avatar: {
            publicId: {
                type: String,
                default: "",
            },
            url: {
                type: String,
                default: "",
            },
        },
        refreshToken: String,
        resetPasswordToken: String,
        resetPasswordExpiry: Date,
        role: {
            type: String,
            enum: AvailableUserRoles,
            default: AvailableUserRoles.STUDENT,
            index: true, // Index for role-based filtering
        },
        status: {
            type: String,
            enum: AvailableUserStatus,
            default: AvailableUserStatus.ACTIVE,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        enrolledCourses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
        createdCourses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
        lastLogin: {
            type: Date,
            default: null,
        },
        loginHistory: [{
            ip: String,
            device: String,
            loggedInAt: {
                type: Date,
                default: Date.now
            },
        }],
        isDeleted: {
            type: Boolean,
            default: false,
        },
        batch: {
            type: Schema.Types.ObjectId,
            ref: "Batch",
            index: true, // Index for batch-based queries (for students)
        },
        batches: [{
            type: Schema.Types.ObjectId,
            ref: "Batch",
            index: true, // Index for batch-based queries (for instructors)
        }],
    },
    {
        timestamps: true,
    }
);

userSchema.pre("save", async function (next) {
    try {
        if (!this.isModified("password")) return next();
        this.password = await bcrypt.hash(this.password, 10);

        // Note: Instructors can now be assigned to multiple batches
        // Batch assignment validation is now handled in the batch controller
        next();
    } catch (error) {
        return next(new ApiError(error.message, 500));
    }
});

userSchema.methods = {
    comparePassword: async function (password) {
        try {
            return await bcrypt.compare(password, this.password);
        } catch (error) {
            return false;
        }
    },
    generateRefreshToken: function () {
        return jwt.sign({ id: this._id }, ENV.JWT_REFRESH_SECRET, {
            expiresIn: ENV.JWT_REFRESH_EXPIRES_IN,
        });
    },
    generateAccessToken: function () {
        return jwt.sign({ id: this._id }, ENV.JWT_ACCESS_SECRET, {
            expiresIn: ENV.JWT_ACCESS_EXPIRES_IN,
        });
    },
    generatePasswordResetToken: async function () {
        const resetToken = crypto.randomBytes(20).toString("hex");

        this.resetPasswordToken = crypto
          .createHash("sha256")
          .update(resetToken)
          .digest("hex");
        this.resetPasswordExpiry = Date.now() + 5 * 60 * 1000;

        return resetToken;
    },
};

export default model("User", userSchema);