import crypto from "crypto";
import jwt from "jsonwebtoken";

import User from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { accessTokenOptions, refreshTokenOptions } from "../utils/constant.js";
import sendMail from "../utils/mail.util.js";

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