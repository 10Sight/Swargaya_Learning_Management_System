import Unit from "../models/unit.model.js";
import { pool } from "../db/connectDB.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createUnit = asyncHandler(async (req, res) => {
    const { title, location, headName, headContactDetail } = req.body;

    if (!title || !title.trim()) {
        throw new ApiError("Unit title is required", 400);
    }

    const duplicate = await Unit.findOne({ title: title.trim() });
    if (duplicate) {
        throw new ApiError(`A unit with title "${title.trim()}" already exists`, 409);
    }

    const unit = await Unit.create({
        title: title.trim(),
        location: location?.trim() || null,
        headName: headName?.trim() || null,
        headContactDetail: headContactDetail?.trim() || null,
    });

    return res.status(201).json(new ApiResponse(201, unit, "Unit created successfully"));
});

export const getAllUnits = asyncHandler(async (req, res) => {
    const units = await Unit.find();
    return res.status(200).json(new ApiResponse(200, units, "Units fetched successfully"));
});

export const getUnitById = asyncHandler(async (req, res) => {
    const unit = await Unit.findById(req.params.id);
    if (!unit) throw new ApiError("Unit not found", 404);
    return res.status(200).json(new ApiResponse(200, unit, "Unit fetched successfully"));
});

export const updateUnit = asyncHandler(async (req, res) => {
    const unit = await Unit.findById(req.params.id);
    if (!unit) throw new ApiError("Unit not found", 404);

    const { title, location, headName, headContactDetail, isActive } = req.body;

    const oldTitle = unit.title;
    let titleChanged = false;

    if (title !== undefined) {
        const trimmed = title.trim();
        if (!trimmed) throw new ApiError("Unit title cannot be empty", 400);
        const duplicate = await Unit.findOne({ title: trimmed });
        if (duplicate && duplicate.id !== unit.id) {
            throw new ApiError(`A unit with title "${trimmed}" already exists`, 409);
        }
        unit.title = trimmed;
        titleChanged = trimmed !== oldTitle;
    }
    if (location !== undefined) unit.location = location?.trim() || null;
    if (headName !== undefined) unit.headName = headName?.trim() || null;
    if (headContactDetail !== undefined) unit.headContactDetail = headContactDetail?.trim() || null;
    if (isActive !== undefined) unit.isActive = !!isActive;

    await unit.save();

    if (titleChanged) {
        await pool.query(
            "UPDATE users SET unit = ? WHERE unit = ?",
            [unit.title, oldTitle]
        );
    }

    return res.status(200).json(new ApiResponse(200, unit, "Unit updated successfully"));
});

export const deleteUnit = asyncHandler(async (req, res) => {
    const unit = await Unit.findById(req.params.id);
    if (!unit) throw new ApiError("Unit not found", 404);

    // Prevent deletion if users are assigned to this unit
    const [rows] = await pool.query(
        "SELECT COUNT(*) as cnt FROM users WHERE unit = ? AND (isDeleted = 0 OR isDeleted IS NULL)",
        [unit.title]
    );
    if (rows[0].cnt > 0) {
        throw new ApiError(
            `Cannot delete unit "${unit.title}" — ${rows[0].cnt} user(s) are currently assigned to it`,
            409
        );
    }

    await pool.query("DELETE FROM units WHERE id = ?", [unit.id]);
    return res.status(200).json(new ApiResponse(200, null, "Unit deleted successfully"));
});
