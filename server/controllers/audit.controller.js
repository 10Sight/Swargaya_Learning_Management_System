import mongoose from "mongoose";
import Audit from "../models/audit.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getAllAudits = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    // Build filters
    const filters = {};
    
    // User filter - support both userId and user email/name search
    if(req.query.userId) {
        if(mongoose.Types.ObjectId.isValid(req.query.userId)) {
            filters.user = req.query.userId;
        } else {
            // If not a valid ObjectId, search by user email or name
            const users = await mongoose.model('User').find({
                $or: [
                    { email: { $regex: req.query.userId, $options: "i" } },
                    { fullName: { $regex: req.query.userId, $options: "i" } }
                ]
            }).select('_id');
            if(users.length > 0) {
                filters.user = { $in: users.map(u => u._id) };
            }
        }
    }
    
    // Action filter
    if(req.query.action) {
        filters.action = { $regex: req.query.action, $options: "i" };
    }
    
    // Search filter - search across multiple fields
    if(req.query.search) {
        filters.$or = [
            { action: { $regex: req.query.search, $options: "i" } },
            { resourceType: { $regex: req.query.search, $options: "i" } },
            { ip: { $regex: req.query.search, $options: "i" } }
        ];
    }
    
    // Date range filters
    if(req.query.dateFrom || req.query.dateTo) {
        filters.createdAt = {};
        if(req.query.dateFrom) {
            filters.createdAt.$gte = new Date(req.query.dateFrom);
        }
        if(req.query.dateTo) {
            filters.createdAt.$lte = new Date(req.query.dateTo);
        }
    }
    
    // IP Address filter
    if(req.query.ipAddress) {
        filters.ip = { $regex: req.query.ipAddress, $options: "i" };
    }
    
    // User Agent filter
    if(req.query.userAgent) {
        filters.userAgent = { $regex: req.query.userAgent, $options: "i" };
    }
    
    // Severity filter
    if(req.query.severity) {
        filters.severity = req.query.severity.toLowerCase();
    }

    const total = await Audit.countDocuments(filters);

    // Build sort options
    const sortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order === 'asc' ? 1 : -1;
    const sort = {};
    sort[sortBy] = order;

    const audits = await Audit.find(filters)
        .populate("user", "fullName email role")
        .skip(skip)
        .limit(limit)
        .sort(sort);

    res.json(
        new ApiResponse(
            200,
            {
                audits,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit),
                    limit,
                },
            },
            "Audit logs fetched successfully"
        )
    );
});

export const getAuditById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if(!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError("Invalid audit ID", 400);
    }

    const audit = await Audit.findById(id).populate("user", "fullName email role");
    if(!audit) throw new ApiError("Audit log not found", 404);

    res.json(new ApiResponse(200, audit, "Audit log fetched successfully"));
});

export const deleteAudit = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if(!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError("Invalid audit ID", 400);
    }

    const audit = await Audit.findById(id);
    if(!audit) throw new ApiError("Audit log not found", 404);

    await audit.deleteOne();

    res.json(new ApiResponse(200, null, "Audit log deleted successfully"));
});