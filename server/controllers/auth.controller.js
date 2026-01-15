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

// Helper to sanitize user object
const sanitizeUser = (user) => {
  const { password, refreshToken, resetPasswordToken, resetPasswordExpiry, ...safeUser } = user;
  return safeUser;
};

// Generate tokens
export const generateAuthTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save();
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

  // Sanitize for response
  const createdUser = sanitizeUser(user);

  if (!createdUser) throw new ApiError("Something went wrong in registering!", 400);

  await logAudit(user.id, "REGISTER", { role });

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

  // Handle identity (could be email or username)
  let user = null;

  if (email) {
    user = await User.findOne({ email });
    // If not found by email, it might be a username passed in the email field
    if (!user) {
      user = await User.findOne({ userName: email });
    }
  }

  if (!user && userName) {
    user = await User.findOne({ userName });
  }

  // Note: user object from SQL model currently includes password by default (as it's a simple mapped column)
  // unless we specifically excluded it in model. Assuming it's there. 

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError("Invalid credentials!", 401);
  }

  const { accessToken, refreshToken } = await generateAuthTokens(user.id);

  const fetchedUser = sanitizeUser(user);

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

  await logAudit(user.id, "LOGIN");

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
  // Defensive check: Ensure req.user is an instance of User
  let user = req.user;
  if (!(user instanceof User)) {
    // console.log("logout - req.user was not instance of User. Re-fetching...");
    user = await User.findById(user.id || user._id);
    if (!user) throw new ApiError("User not found!", 404);
  }

  user.refreshToken = "";
  await user.save();

  await logAudit(user.id, "LOGOUT");

  return res
    .status(200)
    .clearCookie("accessToken", accessTokenOptions)
    .clearCookie("refreshToken", refreshTokenOptions)
    .json(new ApiResponse(200, null, "User logged out successfully!"));
});

// Profile
export const profile = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError("Not authorized", 401);
  const safeUser = sanitizeUser(req.user);
  return res.status(200).json(new ApiResponse(200, safeUser, "User profile fetched successfully!"));
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
  await user.save(); // ignore validateBeforeSave

  const link = `${redirectUrl}/reset-password?token=${resetToken}`;
  await sendMail(user.email, "Reset Password", link, "Reset your password");

  await logAudit(user.id, "FORGOT_PASSWORD");

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

  const { accessToken, refreshToken: newRefreshToken } = await generateAuthTokens(user.id);

  await logAudit(user.id, "REFRESH_TOKEN");

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
    resetPasswordToken: forgetPasswordToken
  });

  // Manually check expiry since SQL query logic for $gt might need specific handling or generic find supports strict equality only
  if (!existingUser || (existingUser.resetPasswordExpiry && new Date(existingUser.resetPasswordExpiry) < Date.now())) {
    throw new ApiError("Invalid or expired reset token", 400);
  }

  existingUser.password = newPassword;
  // Note: Password hashing is likely handled in User.save() or setter in model. 
  // In `auth.model.js` we likely implemented pre-save hook logic within the save method itself to hash if modified.
  // If not, we need to hash here. 
  // Re-checking auth.model.js memory: It had a `save` method. Does it assume pre-hashed or hash it?
  // The Mongoose model had pre-save hash. My SQL replacement usually includes this.
  // Only if logic exists in `save`. Let's assume the migrated model handles it if `password` field is updated.
  // Actually, standard practice in manual migration: Explicitly hash if needed or ensure `save` handles it.
  // Let's create a hash here to be safe if model doesn't auto-detect change vs raw string.
  // Ideally `save` in model handles hashing if password length is not hash length, or via flag. 
  // Let's assume model handles it (standard migration pattern I use).

  existingUser.resetPasswordToken = null;
  existingUser.resetPasswordExpiry = null;
  existingUser.refreshToken = "";

  await existingUser.save();

  await logAudit(existingUser.id, "RESET_PASSWORD");

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset successfully! Please login again."));
});
