import crypto from "crypto";
import jwt from "jsonwebtoken";

import User from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { accessTokenOptions, refreshTokenOptions } from "../utils/constant.js";
import sendMail from "../utils/mail.util.js";
import ENV from "../configs/env.config.js";

//This will generate Authentication Tokens
export const generateAuthTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();
        user.refreshToken = await refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(error.message, 500);
    }
};

//For Registering the User
export const register = asyncHandler(async (req, res) => {
    const {
        fullName,
        userName,
        email,
        phoneNumber,
        role = "STUDENT",
        password
    } = req.body;

    const uniqueUser = await User.findOne({ email });
    if (uniqueUser) {
        throw new ApiError("User already exists", 400);
    }

    const user = await User.create({
        fullName,
        userName,
        email,
        phoneNumber,
        password,
        role,
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken -resetPasswordToken -resetPasswordExpiry"
    );

    if (!createdUser) {
        throw new ApiError("Something went wrong in registering!", 400);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {
            user: createdUser
        }, "User registered successfully!"));
});

//For Login the User
export const login = asyncHandler(async (req, res) => {
    const {
        userName,
        email,
        password
    } = req.body;
    const user = await User.findOne({
        $or: [{ email: email }, { userName: userName }],
    }).select("+password");

    if (!user) {
        throw new ApiError("Invalid Credentials!", 400);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new ApiError("Invalid Credentials!", 400);
    }

    const { accessToken, refreshToken } = await generateAuthTokens(user._id);

    if (user.refreshToken !== refreshToken) {
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
    }

    const fetchedUser = await User.findById(user._id).select(
        "-refreshToken -resetPasswordToken -resetPasswordExpiry"
    );

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, refreshTokenOptions)
        .cookie("accessToken", accessToken, accessTokenOptions)
        .json(new ApiResponse(200, {
            user: fetchedUser
        },
        ));
});

//For Logout the User
export const logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: "" },
        },
        { new: true }
    );

    return res
        .status(200)
        .clearCookie("accessToken", accessTokenOptions)
        .clearCookie("refreshToken", refreshTokenOptions)
        .json(new ApiResponse(200, null, "User logged out successfully!"));
});

//For Fetch Current User Profile
export const profile = asyncHandler(async (req, res) => {
    if(!req.user) {
        throw new ApiError("Not authorized", 401);
    }

    return res  
        .status(200)
        .json(new ApiResponse(200, req.user, "User profile fetched successfully!"));
});

//For Forgot Password
export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if(!user) {
        throw new ApiError("If an account with that email exists, a reset link has been sent.", 400);
    }

    let redirectUrl = "https://10sight.tech";

    if(user.role === "ADMIN") {
        redirectUrl = ENV.ADMIN_URL;
    } else {
        redirectUrl = ENV.FRONTEND_URL;
    }

    const resetToken = await user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const link = `${redirectUrl}/reset-password?token=${resetToken}`;
    await sendMail(user.email, "Reset Password", link, "Reset Password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, null, "If an account with that email exists, a reset link has been sent.")
        );
});

//For Refresh Token
export const refreshAccessAndRefreshToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken) {
        throw new ApiError("You are not logged in!", 401);
    }

    const decodedToken = jwt.verify(
        incomingRefreshToken,
        ENV.JWT_REFRESH_SECRET
    );

    const user = await User.findById(decodedToken?.id).select(
        "-emailVerificationToken -emailVerificationExpiry"
    );

    if(!user) {
        throw new ApiError("Invalid Token!", 401);
    }

    if(user.refreshToken !== incomingRefreshToken) {
        throw new ApiError("Invalid Token!", 401);
    }

    const { accessToken, refreshToken: newRefreshToken } =
        await generateAuthTokens(user?._id);

    return res  
        .status(200)
        .cookie("accessToken", accessToken, accessTokenOptions)
        .cookie("refreshToken", newRefreshToken, refreshTokenOptions)
        .json(
            new ApiResponse(
                200,
                { accessToken, refreshToken: newRefreshToken },
                "Token refreshed successfully!"
            )
        );
});

//For Reset Password
export const resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    let { password: newPassword } = req.body;

    if(!newPassword) {
        throw new ApiError("Please provide a new password", 400);
    }

    const forgetPasswordToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const existingUser = await User.findOne({
        resetPasswordToken: forgetPasswordToken,
        resetPasswordExpiry: { $gt: Date.now() },
    }).select("+password");

    if(!existingUser) {
        throw new ApiError("invalid or expired password reset token", 400);
    }

    existingUser.password = newPassword;
    existingUser.resetPasswordToken = undefined;
    existingUser.resetPasswordExpiry = undefined;
    await existingUser.save();

    res.status(200)
        .json(new ApiResponse(
            200, null, "Password reset successfully! You can login now."
        ));
});