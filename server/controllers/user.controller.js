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
    if(role && AvailableUserRoles(role)) {
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
    const user = await User.findById(req.params.id).select("-password -refreshToken");
    if(!user) {
        throw new ApiError("User not found!", 404);
    }

    res.json(new ApiResponse(200, user, "User fetched successfully!"));
});
