import mongoose from "mongoose";
import Audit from "../models/audit.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getAllAudits = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filters = {};
    if(req.query.userId && mongoose.Types.ObjectId.isValid(req.query.userId)) {
        filters.user = req.query.userId;
    }
    if(req.query.action) {
        filters.action = { $regex: req.query.action, $options: "i" };
    }

    const total = await Audit.countDocuments(filters);

    const audits = await Audit.find(filters)
        .populate("user", "fullName email role")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

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
        throw new ApiError(400, "Invalid audit ID");
    }

    const audit = await Audit.findById(id).populate("user", "fullName email role");
    if(!audit) throw new ApiError(404, "Audit log not found");

    res.json(new ApiResponse(200, audit, "Audit log fetched successfully"));
});

export const deleteAudit = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if(!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid audit ID");
    }

    const audit = await Audit.findById(id);
    if(!audit) throw new ApiError(404, "Audit log not found");

    await audit.deleteOne();

    res.json(new ApiResponse(200, null, "Audit log deleted successfully"));
});