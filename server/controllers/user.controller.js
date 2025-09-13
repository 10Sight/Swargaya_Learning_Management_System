import mongoose from "mongoose";
import validator from "validator";

import User from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import cloudinary from "../configs/cloudinary.config.js";
import { AvailableUserRoles } from "../constants.js";

//Get All Users
export const getAllUsers = asyncHandler(async (req, res) => {
    //Pagination
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    //Sort User By CreatedAt
    const allowedSortFields = ["createdAt", "fullName", "email", "role"];
    const sortBy = allowedSortFields.includes(req.query.sortBy) ? req.query.sortBy : "createdAt";
    const order = req.query.order === "asc" ? 1 : -1;
    const sortOptions = { [sortBy]: order };
    //Search by Name or email
    const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const search = req.query.search ? escapeRegex(req.query.search) : "";
    const searchQuery = search
        ? {
            $or: [
                {fullName: { $regex: search, $options: "i" }},
                {email: { $regex: search, $options: "i" }}
            ]
        }
        : {};
    //Role Filter
    const role = req.query.role;
    if(role && Object.values(AvailableUserRoles).includes(role)) {
        searchQuery.role = role;
    }
    //Fetch Safe Fields Only
    const safeFields = "fullName email role createdAt";
    //Total Users
    const totalUsers = await User.countDocuments(searchQuery);

    const users = await User.find(searchQuery)
        .select(safeFields)
        .skip(skip)
        .limit(limit)
        .sort(sortOptions);

    res.json(new ApiResponse(200, {
        users, 
        pagination: {
            total: totalUsers,
            page,
            pages: Math.ceil(totalUsers / limit),
            limit
        }
    }, "User fetched successfully"));
});

//For Fetching User by ID
export const getUserById = asyncHandler(async (req, res) => {
    if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError("invalid User ID!", 400)
    }

    const user = await User.findById(req.params.id).select("-password -refreshToken");
    if(!user) {
        throw new ApiError("User not found!", 404);
    }

    res.json(new ApiResponse(200, user, "User fetched successfully!"));
});

//Update User Profile
export const updateProfile = asyncHandler(async (req, res) => {
    const { fullName, phoneNumber, email } = req.body;
    const user = await User.findById(req.user.id);

    if(!user) throw new ApiError("User not fonund", 404);

    if(email && !validator.isEmail(email)) {
        throw new ApiError("Invalid email address", 400);
    }

    if(phoneNumber && !validator.isMobilePhone(phoneNumber, "any")){
        throw new ApiError("Invalid phone number", 400);
    }

    if(fullName) user.fullName = fullName;
    if(phoneNumber) user.phoneNumber = phoneNumber;
    if(email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if(existingUser) {
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
        createdAt: user.createdAt,
    };

    res.json(new ApiResponse(200, safeUser, "Profile updated successfully!"));
});

//Update User Avatar
export const updateAvatar = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if(req.file) {

        if(user.avatar?.publicId) {
            await cloudinary.uploader.destroy(user.avatar.publicId);
        }

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
        id: user._id,
        userName: user.userName,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
    };

    res.json(new ApiResponse(200, safeUser, "Avatar updated successfully"));
});

//Delete User
export const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if(!user) {
        throw new ApiError("User not found", 404);
    }

    if(user.avatar?.publicId) {
        await cloudinary.uploader.destroy(user.avatar.publicId);
    }

    await user.deleteOne();
    res.json(new ApiResponse(200, null, "User deleted successfully"));
});