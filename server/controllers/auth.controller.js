import crypto from "crypto";
import jwt from "jsonwebtoken";

import User from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { accessTokenOptions, refreshTokenOptions } from "../utils/constant.js";
import sendMail from "../utils/mail.util.js";
import ENV from "../configs/env.config.js";
import logAudit from "../utils/auditLogger.js";
import { AvailableUserRoles, AvailableUnits } from "../constants.js";
import validator from "validator";
import { generateWelcomeEmail } from "../utils/emailTemplates.js";

// Generate tokens
export const generateAuthTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(error.message, 500);
  }
};

// Register
export const register = asyncHandler(async (req, res) => {
  let { fullName, userName, email, phoneNumber, role = "STUDENT", password, unit } = req.body;

  if (!fullName || !userName || !email || !phoneNumber || !password || !unit) {
    throw new ApiError("All fields are required", 400);
  }

  if (!validator.isEmail(email)) {
    throw new ApiError("Invalid email address", 400);
  }

  if (password.length < 6) {
    throw new ApiError("Password must be at least 6 characters long", 400);
  }

  if (userName.length < 3 || userName.length > 20) {
    throw new ApiError("Username must be 3-20 characters long", 400);
  }

  email = email.toLowerCase();
  userName = userName.toLowerCase();

  const emailExists = await User.findOne({ email });
  if (emailExists) throw new ApiError("Email already in use", 400);

  const usernameExists = await User.findOne({ userName });
  if (usernameExists) throw new ApiError("Username already in use", 400);

  // Validate role
  if (!AvailableUserRoles.includes(role)) {
    throw new ApiError("Invalid role provided", 400);
  }

  // Validate unit
  if (!AvailableUnits.includes(unit)) {
    throw new ApiError("Invalid unit provided", 400);
  }

  const user = await User.create({ fullName, userName, email, phoneNumber, password, role, unit });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -resetPasswordToken -resetPasswordExpiry"
  );

  if (!createdUser) throw new ApiError("Something went wrong in registering!", 400);

  await logAudit(user._id, "REGISTER", { role });

  return res
    .status(201)
    .json(new ApiResponse(201, { user: createdUser }, "User registered successfully!"));
});

// Login
export const login = asyncHandler(async (req, res) => {
  let { userName, email, password } = req.body;

  if (!password || (!email && !userName)) {
    throw new ApiError("Email/username and password are required", 400);
  }

  if (email) email = email.toLowerCase();
  if (userName) userName = userName.toLowerCase();

  const user = await User.findOne({
    $or: [{ email }, { userName }],
  }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError("Invalid credentials!", 401);
  }

  const { accessToken, refreshToken } = await generateAuthTokens(user._id);

  const fetchedUser = await User.findById(user._id).select(
    "-password -refreshToken -resetPasswordToken -resetPasswordExpiry"
  );

  let redirectUrl = null;
  const role = fetchedUser.role;
  // Determine redirect URL per role using ENV with sensible fallbacks
  if (role === "ADMIN") {
    redirectUrl = ENV.ADMIN_URL;
  } else if (role === "SUPERADMIN") {
    redirectUrl = ENV.SUPERADMIN_URL;
  } else if (role === "INSTRUCTOR") {
    redirectUrl = ENV.INSTRUCTOR_URL;
  } else if (role === "STUDENT") {
    redirectUrl = ENV.STUDENT_URL;
  } else {
    redirectUrl = ENV.FRONTEND_URL;
  }

  await logAudit(user._id, "LOGIN");

  // Set cookies and return JSON payload expected by frontend
  return res
    .status(200)
    .cookie("refreshToken", refreshToken, refreshTokenOptions)
    .cookie("accessToken", accessToken, accessTokenOptions)
    .json(
      new ApiResponse(
        200,
        { user: fetchedUser, redirectUrl },
        "Login successful"
      )
    );
});

// Logout
export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: "" } }, { new: true });

  await logAudit(req.user._id, "LOGOUT");

  return res
    .status(200)
    .clearCookie("accessToken", accessTokenOptions)
    .clearCookie("refreshToken", refreshTokenOptions)
    .json(new ApiResponse(200, null, "User logged out successfully!"));
});

// Profile
export const profile = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError("Not authorized", 401);
  return res.status(200).json(new ApiResponse(200, req.user, "User profile fetched successfully!"));
});

// Forgot Password
export const forgotPassword = asyncHandler(async (req, res) => {
  let { email } = req.body;
  if (!email) throw new ApiError("Email is required", 400);
  email = email.toLowerCase();

  const user = await User.findOne({ email });

  if (!user) {
    return res
      .status(200)
      .json(new ApiResponse(200, null, "If an account exists, a reset link has been sent."));
  }

  let redirectUrl = user.role === "ADMIN" ? ENV.ADMIN_URL : ENV.FRONTEND_URL;

  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const link = `${redirectUrl}/reset-password?token=${resetToken}`;
  await sendMail(user.email, "Reset Password", link, "Reset your password");

  await logAudit(user._id, "FORGOT_PASSWORD");

  return res
    .status(200)
    .json(new ApiResponse(200, null, "If an account exists, a reset link has been sent."));
});

// Refresh Token
export const refreshAccessAndRefreshToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) throw new ApiError("You are not logged in!", 401);

  const decodedToken = jwt.verify(incomingRefreshToken, ENV.JWT_REFRESH_SECRET);
  const user = await User.findById(decodedToken?.id);

  if (!user || user.refreshToken !== incomingRefreshToken) {
    throw new ApiError("Invalid token!", 401);
  }

  const { accessToken, refreshToken: newRefreshToken } = await generateAuthTokens(user._id);

  await logAudit(user._id, "REFRESH_TOKEN");

  return res
    .status(200)
    .cookie("accessToken", accessToken, accessTokenOptions)
    .cookie("refreshToken", newRefreshToken, refreshTokenOptions)
    .json(
      new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Token refreshed successfully!")
    );
});

// Reset Password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password: newPassword } = req.body;

  if (!newPassword) throw new ApiError("Please provide a new password", 400);

  const forgetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");

  const existingUser = await User.findOne({
    resetPasswordToken: forgetPasswordToken,
    resetPasswordExpiry: { $gt: Date.now() },
  }).select("+password");

  if (!existingUser) throw new ApiError("Invalid or expired reset token", 400);

  existingUser.password = newPassword;
  existingUser.resetPasswordToken = undefined;
  existingUser.resetPasswordExpiry = undefined;
  existingUser.refreshToken = "";
  await existingUser.save();

  await logAudit(existingUser._id, "RESET_PASSWORD");

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset successfully! Please login again."));
});
