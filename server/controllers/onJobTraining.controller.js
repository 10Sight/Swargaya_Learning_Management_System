import OnJobTraining from "../models/onJobTraining.model.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/auth.model.js";
import Department from "../models/department.model.js"; // Import if needed for validation
import Line from "../models/line.model.js";             // Import if needed for validation
import Machine from "../models/machine.model.js";       // Import if needed for validation
import mongoose from "mongoose";

/**
 * @desc    Create a new On Job Training record
 * @route   POST /api/v1/on-job-training/create
 * @access  Private (Admin, Instructor)
 */
export const createOnJobTraining = async (req, res, next) => {
    try {
        const { studentId, departmentId, lineId, machineId, name } = req.body;

        if (!studentId || !departmentId || !lineId || !machineId) {
            return next(new ApiError("All fields (Student, Department, Line, Machine) are required", 400));
        }

        // Validate Student
        let user;
        if (mongoose.Types.ObjectId.isValid(studentId)) {
            user = await User.findById(studentId);
        } else {
            user = await User.findOne({ userName: studentId });
        }
        if (!user) return next(new ApiError("Student not found", 404));

        // Create new OJT record
        // We initialize with empty entries or default values if needed
        const newOJT = await OnJobTraining.create({
            student: user._id,
            name: name || "Level-1 Practical Evaluation of On the Job Training",
            department: departmentId,
            line: lineId,
            machine: machineId,
            createdBy: req.user.id,
            updatedBy: req.user.id,
            entries: [], // Initialize empty
            result: "Pending"
        });

        // We should ideally populate to return useful info immediately
        await newOJT.populate([
            { path: 'department', select: 'name' },
            { path: 'line', select: 'name' },
            { path: 'machine', select: 'name' }
        ]);

        res.status(201).json({
            success: true,
            message: "On Job Training created successfully",
            data: newOJT
        });

    } catch (error) {
        return next(new ApiError(error.message, 500));
    }
};

/**
 * @desc    Get All On Job Trainings for a Student
 * @route   GET /api/v1/on-job-training/student/:studentId
 * @access  Private
 */
export const getStudentOnJobTrainings = async (req, res, next) => {
    try {
        const { studentId } = req.params;

        // Resolve student ID
        let user;
        if (mongoose.Types.ObjectId.isValid(studentId)) {
            user = await User.findById(studentId);
        } else {
            user = await User.findOne({ userName: studentId });
        }
        if (!user) return next(new ApiError("Student not found", 404));

        const ojts = await OnJobTraining.find({ student: user._id })
            .populate("department", "name")
            .populate("line", "name")
            .populate("machine", "name _id machineName") // machineName might be the field
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: ojts.length,
            data: ojts
        });

    } catch (error) {
        return next(new ApiError(error.message, 500));
    }
};

/**
 * @desc    Get Single OJT by ID
 * @route   GET /api/v1/on-job-training/:id
 * @access  Private
 */
export const getOnJobTrainingById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const ojt = await OnJobTraining.findById(id)
            .populate("department", "name")
            .populate("line", "name")
            .populate("machine", "name machineName")
            .populate("student", "fullName email avatar");

        if (!ojt) {
            return next(new ApiError("OJT record not found", 404));
        }

        res.status(200).json({
            success: true,
            data: ojt
        });
    } catch (error) {
        return next(new ApiError(error.message, 500));
    }
};

/**
 * @desc    Update OJT Record
 * @route   PATCH /api/v1/on-job-training/:id
 * @access  Private
 */
export const updateOnJobTraining = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { entries, scoring, totalMarks, totalMarksObtained, totalPercentage, result, remarks } = req.body;

        const ojt = await OnJobTraining.findById(id);
        if (!ojt) {
            return next(new ApiError("OJT record not found", 404));
        }

        // Update fields if provided
        if (entries) ojt.entries = entries;
        if (scoring) ojt.scoring = scoring; // Ensure frontend sends full object or handle partial deep merge if needed. Usually full object replace is safer for simple structures.
        if (totalMarks !== undefined) ojt.totalMarks = totalMarks;
        if (totalMarksObtained !== undefined) ojt.totalMarksObtained = totalMarksObtained;
        if (totalPercentage !== undefined) ojt.totalPercentage = totalPercentage;
        if (result) ojt.result = result;
        if (remarks !== undefined) ojt.remarks = remarks;

        ojt.updatedBy = req.user.id;

        await ojt.save();

        res.status(200).json({
            success: true,
            message: "OJT updated successfully",
            data: ojt
        });

    } catch (error) {
        return next(new ApiError(error.message, 500));
    }
};

// Delete if necessary?
// export const deleteOnJobTraining = ...
