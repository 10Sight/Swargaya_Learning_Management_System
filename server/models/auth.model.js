import { Schema, model } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { ApiError } from "../utils/ApiError.js";
import { AvailableUserStatus, AvailableUserRoles, AvailableSocialLogins, UserStatusEnum, UserRolesEnum, AvailableUnits } from "../constants.js";
import ENV from "../configs/env.config.js";
import { slugify, ensureUniqueSlug } from "../utils/slugify.js";

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
        slug: {
            type: String,
            trim: true,
            lowercase: true,
            unique: true,
            index: true,
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
            default: UserRolesEnum.STUDENT,
            index: true, // Index for role-based filtering
        },
        status: {
            type: String,
            enum: AvailableUserStatus,
            default: UserStatusEnum.PRESENT,
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
        department: {
            type: Schema.Types.ObjectId,
            ref: "Department",
            index: true, // Index for department-based queries (for students)
        },
        departments: [{
            type: Schema.Types.ObjectId,
            ref: "Department",
            index: true, // Index for department-based queries (for instructors)
        }],
        unit: {
            type: String,
            enum: AvailableUnits,
            required: true,
            index: true, // Index for unit-based queries
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre("save", async function (next) {
    try {
        // Generate slug from userName (preferred) or fullName when needed
        if (this.isModified("userName") || this.isModified("fullName") || !this.slug) {
            const base = slugify(this.userName || this.fullName);
            this.slug = await ensureUniqueSlug(this.constructor, base, {}, this._id);
        }

        // Hash password only if modified
        if (this.isModified("password")) {
            this.password = await bcrypt.hash(this.password, 10);
        }

        // Note: Instructors can now be assigned to multiple departments
        // Department assignment validation is now handled in the department controller
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