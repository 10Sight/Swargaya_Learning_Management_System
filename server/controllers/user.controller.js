// controllers/user.controller.js
import mongoose from "mongoose";
import validator from "validator";

import User from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import cloudinary from "../configs/cloudinary.config.js";
import { AvailableUserRoles, AvailableUnits } from "../constants.js";
import logAudit from "../utils/auditLogger.js";
import Department from "../models/department.model.js";
import sendMail from "../utils/mail.util.js";
import { generateWelcomeEmail } from "../utils/emailTemplates.js";
import ENV from "../configs/env.config.js";

// Get All Users
export const getAllUsers = asyncHandler(async (req, res) => {
  // Pagination
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  // Sorting
  const allowedSortFields = ["createdAt", "fullName", "email", "role"];
  const sortBy = allowedSortFields.includes(req.query.sortBy)
    ? req.query.sortBy
    : "createdAt";
  const order = req.query.order === "asc" ? 1 : -1;
  const sortOptions = { [sortBy]: order };

  // Search by name/email
  const escapeRegex = (str) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const search = req.query.search ? escapeRegex(req.query.search) : "";
  const searchQuery = search
    ? {
      $or: [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    }
    : {};

  // Role filter
  const role = req.query.role;
  if (role && Object.values(AvailableUserRoles).includes(role)) {
    searchQuery.role = role;
  }

  // Unit filter
  const unit = req.query.unit;
  if (unit && AvailableUnits.includes(unit)) {
    searchQuery.unit = unit;
  }

  // Safe fields only
  const safeFields = "_id fullName userName slug email phoneNumber role status department unit createdAt avatar";

  const totalUsers = await User.countDocuments(searchQuery);

  const users = await User.find(searchQuery)
    .select(safeFields)
    .populate("department", "name")
    .skip(skip)
    .limit(limit)
    .sort(sortOptions)
    .sort(sortOptions)
    .lean();

  res.json(
    new ApiResponse(
      200,
      {
        users,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page,
        limit,
      },
      "Users fetched successfully"
    )
  );
});

//Get User by ID
export const getUserById = asyncHandler(async (req, res) => {
  const rawId = String(req.params.id || "");

  let user = null;
  if (mongoose.Types.ObjectId.isValid(rawId)) {
    user = await User.findById(rawId)
      .select("-password -refreshToken")
      .populate("department", "name")
      .lean();
  }

  if (!user) {
    // Fallback: resolve by slug or userName (both stored lowercase)
    const handle = rawId.toLowerCase();
    user = await User.findOne({ $or: [{ slug: handle }, { userName: handle }] })
      .select("-password -refreshToken")
      .populate("department", "name")
      .lean();
  }

  if (!user) throw new ApiError("User not found!", 404);

  res.json(new ApiResponse(200, user, "User fetched successfully!"));
});

//Update Profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phoneNumber, email } = req.body;
  const user = await User.findById(req.user.id);

  if (!user) throw new ApiError("User not found", 404);

  if (email && !validator.isEmail(email)) {
    throw new ApiError("Invalid email address", 400);
  }

  if (phoneNumber && !validator.isMobilePhone(phoneNumber, "any")) {
    throw new ApiError("Invalid phone number", 400);
  }

  if (fullName) user.fullName = fullName;
  if (phoneNumber) user.phoneNumber = phoneNumber;
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError("Email already in use", 400);
    }
    user.email = email;
  }

  await user.save();

  const safeUser = {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    department: user.department,
    createdAt: user.createdAt,
  };

  await logAudit(req.user._id, "UPDATE_PROFILE", { userId: user._id });

  res.json(new ApiResponse(200, safeUser, "Profile updated successfully!"));
});

export const updateAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError("User not found", 404);

  if (req.file) {
    // Delete old avatar
    if (user.avatar?.publicId) {
      await cloudinary.uploader.destroy(user.avatar.publicId);
    }

    // Upload new one
    const upload = await cloudinary.uploader.upload(req.file.path, {
      folder: "avatar",
      width: 300,
      height: 300,
      crop: "fill",
    });

    user.avatar = {
      publicId: upload.public_id,
      url: upload.secure_url,
    };
  }

  await user.save();

  const safeUser = {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    avatar: user.avatar,
  };

  await logAudit(req.user._id, "UPDATE_AVATAR", { userId: user._id });

  res.json(new ApiResponse(200, safeUser, "Avatar updated successfully"));
});

// Create User (Admin/Super Admin only)
export const createUser = asyncHandler(async (req, res) => {
  const { fullName, userName, email, phoneNumber, role = "STUDENT", password, unit } = req.body;

  if (!fullName || !userName || !email || !phoneNumber || !password || !unit) {
    throw new ApiError("All fields are required", 400);
  }

  if (!validator.isEmail(email)) {
    throw new ApiError("Invalid email address", 400);
  }

  if (!validator.isMobilePhone(phoneNumber, "any")) {
    throw new ApiError("Invalid phone number", 400);
  }

  // Check if user already exists
  const existingUserByEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingUserByEmail) throw new ApiError("Email already in use", 400);

  const existingUserByUsername = await User.findOne({ userName: userName.toLowerCase() });
  if (existingUserByUsername) throw new ApiError("Username already in use", 400);

  // Role validation
  if (!AvailableUserRoles[role]) {
    throw new ApiError("Invalid role", 400);
  }

  // Unit validation
  if (!AvailableUnits.includes(unit)) {
    throw new ApiError("Invalid unit", 400);
  }

  // Store plain text password for email before hashing
  const plainTextPassword = password;

  const user = await User.create({
    fullName,
    userName: userName.toLowerCase(),
    email: email.toLowerCase(),
    phoneNumber,
    role,
    password,
    unit,
    status: "PRESENT"
  });

  const safeUser = await User.findById(user._id)
    .select("-password -refreshToken")
    .populate("department", "name");

  await logAudit(req.user._id, "CREATE_USER", { userId: user._id, role });

  // Send welcome email with credentials
  try {
    // Determine login URL based on role
    let loginUrl = ENV.FRONTEND_URL || 'https://swargaya-learning-management-system-3vcz.onrender.com';
    if (role === 'ADMIN' || role === 'SUPERADMIN') {
      loginUrl = ENV.ADMIN_URL || 'http://localhost:5173';
    } else if (role === 'INSTRUCTOR') {
      loginUrl = ENV.INSTRUCTOR_URL || 'http://localhost:5174';
    } else if (role === 'STUDENT') {
      loginUrl = ENV.STUDENT_URL || 'http://localhost:5175';
    }

    const userData = {
      fullName,
      email: email.toLowerCase(),
      userName: userName.toLowerCase(),
      phoneNumber,
      password: plainTextPassword,
      role
    };

    const emailHtml = generateWelcomeEmail(userData, loginUrl);
    const subject = `Welcome to 10Sight LMS - Your Account Has Been Created`;

    await sendMail(email.toLowerCase(), subject, emailHtml);
  } catch (emailError) {
    // Don't throw error - user creation was successful, email is optional
  }

  res.status(201).json(
    new ApiResponse(201, safeUser, "User created successfully and welcome email sent")
  );
});

// Update User (Admin/Super Admin only)
export const updateUser = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError("Invalid User ID!", 400);
  }

  const { fullName, userName, email, phoneNumber, role, status, unit } = req.body;
  const user = await User.findById(req.params.id);

  if (!user) throw new ApiError("User not found", 404);

  // Update fields if provided
  if (fullName) user.fullName = fullName;
  if (userName) {
    const existingUser = await User.findOne({
      userName: userName.toLowerCase(),
      _id: { $ne: user._id }
    });
    if (existingUser) throw new ApiError("Username already in use", 400);
    user.userName = userName.toLowerCase();
  }
  if (email) {
    if (!validator.isEmail(email)) {
      throw new ApiError("Invalid email address", 400);
    }
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: user._id }
    });
    if (existingUser) throw new ApiError("Email already in use", 400);
    user.email = email.toLowerCase();
  }
  if (phoneNumber) {
    if (!validator.isMobilePhone(phoneNumber, "any")) {
      throw new ApiError("Invalid phone number", 400);
    }
    user.phoneNumber = phoneNumber;
  }
  if (role && AvailableUserRoles[role]) {
    user.role = role;
  }
  if (status && ["PRESENT", "ON_LEAVE", "ABSENT"].includes(status)) {
    user.status = status;
  }
  if (unit) {
    if (!AvailableUnits.includes(unit)) {
      throw new ApiError("Invalid unit", 400);
    }
    user.unit = unit;
  }

  await user.save();

  const safeUser = await User.findById(user._id)
    .select("-password -refreshToken")
    .populate("department", "name");

  await logAudit(req.user._id, "UPDATE_USER", { userId: user._id });

  res.json(new ApiResponse(200, safeUser, "User updated successfully"));
});

// Get All Instructors (Admin/Super Admin only)
export const getAllInstructors = asyncHandler(async (req, res) => {
  // Pagination
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  // Sorting
  const allowedSortFields = ["createdAt", "fullName", "email", "status"];
  const sortBy = allowedSortFields.includes(req.query.sortBy)
    ? req.query.sortBy
    : "createdAt";
  const order = req.query.order === "asc" ? 1 : -1;
  const sortOptions = { [sortBy]: order };

  // Search by name/email/username
  const escapeRegex = (str) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const search = req.query.search ? escapeRegex(req.query.search) : "";

  // Base query - only instructors and not deleted
  const searchQuery = {
    role: "INSTRUCTOR",
    isDeleted: { $ne: true }
  };

  // Add search conditions
  if (search) {
    searchQuery.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { userName: { $regex: search, $options: "i" } },
    ];
  }

  // Status filter
  if (req.query.status && ["PRESENT", "ON_LEAVE", "ABSENT"].includes(req.query.status)) {
    searchQuery.status = req.query.status;
  }

  // Department filter
  if (req.query.departmentId && mongoose.Types.ObjectId.isValid(req.query.departmentId)) {
    searchQuery.$or = [
      { department: req.query.departmentId },
      { departments: req.query.departmentId }
    ];
  }

  // Safe fields only
  const safeFields = "fullName userName slug email phoneNumber role status department departments unit createdAt avatar lastLogin";

  const totalInstructors = await User.countDocuments(searchQuery);

  const instructors = await User.find(searchQuery)
    .select(safeFields)
    .populate("department", "name instructor createdAt")
    .populate("departments", "name")
    .skip(skip)
    .limit(limit)
    .sort(sortOptions);

  // Log this action for security audit
  await logAudit(req.user._id, "VIEW_INSTRUCTORS", { totalInstructors, filters: req.query });

  res.json(
    new ApiResponse(
      200,
      {
        users: instructors,
        totalUsers: totalInstructors,
        totalPages: Math.ceil(totalInstructors / limit),
        currentPage: page,
        limit,
      },
      "Instructors fetched successfully"
    )
  );
});

// Get All Students (Admin/Instructor/Super Admin only)
export const getAllStudents = asyncHandler(async (req, res) => {
  // Pagination
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  // Sorting
  const allowedSortFields = ["createdAt", "fullName", "email", "status"];
  const sortBy = allowedSortFields.includes(req.query.sortBy)
    ? req.query.sortBy
    : "createdAt";
  const order = req.query.order === "asc" ? 1 : -1;
  const sortOptions = { [sortBy]: order };

  // Search by name/email/username
  const escapeRegex = (str) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const search = req.query.search ? escapeRegex(req.query.search) : "";

  // Base query - only students and not deleted
  const searchQuery = {
    role: "STUDENT",
    isDeleted: { $ne: true }
  };

  // Add search conditions
  if (search) {
    searchQuery.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { userName: { $regex: search, $options: "i" } },
    ];
  }

  // Status filter
  if (req.query.status && ["PRESENT", "ON_LEAVE", "ABSENT"].includes(req.query.status)) {
    searchQuery.status = req.query.status;
  }

  // Unit filter
  if (req.query.unit && AvailableUnits.includes(req.query.unit)) {
    searchQuery.unit = req.query.unit;
  }

  // Department filter (for instructors to see their students)
  if (req.query.departmentId && mongoose.Types.ObjectId.isValid(req.query.departmentId)) {
    searchQuery.$or = [
      { department: req.query.departmentId },
      { departments: req.query.departmentId }
    ];
  }

  // If the requesting user is an instructor, limit to their departments
  if (req.user.role === "INSTRUCTOR") {
    const instructor = await User.findById(req.user._id).select("departments");
    if (instructor && instructor.departments && instructor.departments.length > 0) {
      searchQuery.department = { $in: instructor.departments };
    } else {
      // If instructor has no departments assigned, return empty result
      searchQuery.department = null;
    }
  }

  // Safe fields only
  const safeFields = "fullName userName slug email phoneNumber role status department unit createdAt avatar lastLogin enrolledCourses";

  const totalStudents = await User.countDocuments(searchQuery);

  const students = await User.find(searchQuery)
    .select(safeFields)
    .populate("department", "name instructor createdAt")
    .populate("enrolledCourses", "title status createdAt")
    .skip(skip)
    .limit(limit)
    .sort(sortOptions);

  // Log this action for security audit
  await logAudit(req.user._id, "VIEW_STUDENTS", { totalStudents, filters: req.query });

  res.json(
    new ApiResponse(
      200,
      {
        users: students,
        totalUsers: totalStudents,
        totalPages: Math.ceil(totalStudents / limit),
        currentPage: page,
        limit,
      },
      "Students fetched successfully"
    )
  );
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError("Invalid User ID!", 400);
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError("User not found", 404);

  // Remove avatar if exists
  if (user.avatar?.publicId) {
    await cloudinary.uploader.destroy(user.avatar.publicId);
  }

  if (req.user.role === "SUPERADMIN") {
    await user.deleteOne();
    await logAudit(req.user._id, "DELETE_USER_PERMANENT", { userId: user._id });
  } else {
    user.isDeleted = true;
    await user.save();
    await logAudit(req.user._id, "DELETE_USER_SOFT", { userId: user._id });
  }

  res.json(new ApiResponse(200, null, "User deleted successfully"));
});

// Super admin functions for managing soft-deleted users
export const getSoftDeletedUsers = asyncHandler(async (req, res) => {
  // Pagination
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  // Sorting
  const allowedSortFields = ["updatedAt", "fullName", "email", "role"];
  const sortBy = allowedSortFields.includes(req.query.sortBy)
    ? req.query.sortBy
    : "updatedAt";
  const order = req.query.order === "asc" ? 1 : -1;
  const sortOptions = { [sortBy]: order };

  // Search by name/email
  const escapeRegex = (str) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const search = req.query.search ? escapeRegex(req.query.search) : "";

  // Base query - only soft-deleted users
  const searchQuery = {
    isDeleted: true
  };

  // Add search conditions
  if (search) {
    searchQuery.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { userName: { $regex: search, $options: "i" } },
    ];
  }

  // Role filter
  const role = req.query.role;
  if (role && Object.values(AvailableUserRoles).includes(role)) {
    searchQuery.role = role;
  }

  // Safe fields only
  const safeFields = "fullName userName email phoneNumber role status department unit createdAt updatedAt avatar";

  const totalUsers = await User.countDocuments(searchQuery);

  const users = await User.find(searchQuery)
    .select(safeFields)
    .populate("department", "name")
    .skip(skip)
    .limit(limit)
    .sort(sortOptions)
    .lean(); // Use lean for better performance

  res.json(
    new ApiResponse(
      200,
      {
        users,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page,
        limit,
      },
      "Soft-deleted users fetched successfully"
    )
  );
});

export const restoreUser = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError("Invalid User ID!", 400);
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError("User not found", 404);

  if (!user.isDeleted) {
    throw new ApiError("User is not deleted", 400);
  }

  user.isDeleted = false;
  await user.save();

  const safeUser = await User.findById(user._id)
    .select("-password -refreshToken")
    .populate("department", "name");

  await logAudit(req.user._id, "RESTORE_USER", { userId: user._id });

  res.json(new ApiResponse(200, safeUser, "User restored successfully"));
});
