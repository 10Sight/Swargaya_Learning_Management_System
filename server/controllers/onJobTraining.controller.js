import OnJobTraining from "../models/onJobTraining.model.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/auth.model.js";
import mongoose from "mongoose";

/**
 * @desc    Get or Create On Job Training for a Student
 * @route   GET /api/v1/on-job-training/:studentId
 * @access  Private (Admin, Instructor, Student)
 */
export const getOnJobTraining = async (req, res, next) => {
    try {
        const { studentId } = req.params;

        // Resolve student ID (handle 'ft5190' username vs ObjectId)
        let user;
        if (mongoose.Types.ObjectId.isValid(studentId)) {
            user = await User.findById(studentId);
        } else {
            user = await User.findOne({ userName: studentId });
        }

        if (!user) {
            return next(new ApiError(`Student not found with ID/Username: ${studentId}`, 404));
        }

        let ojt = await OnJobTraining.findOne({ student: user._id });

        if (!ojt) {
            return res.status(200).json({
                success: true,
                message: "No OJT record found",
                data: null
            });
        }

        res.status(200).json({
            success: true,
            message: "OJT record fetched successfully",
            data: ojt,
        });
    } catch (error) {
        return next(new ApiError(error.message, 500));
    }
};

/**
 * @desc    Create or Update On Job Training
 * @route   POST /api/v1/on-job-training/:studentId
 * @access  Private (Admin, Instructor)
 */
export const saveOnJobTraining = async (req, res, next) => {
    try {
        const { studentId } = req.params;
        const { entries, scoring, totalMarks, totalMarksObtained, totalPercentage, result, remarks } = req.body;

        // Resolve student ID
        let user;
        if (mongoose.Types.ObjectId.isValid(studentId)) {
            user = await User.findById(studentId);
        } else {
            user = await User.findOne({ userName: studentId });
        }

        if (!user) {
            return next(new ApiError(`Student not found with ID/Username: ${studentId}`, 404));
        }

        let ojt = await OnJobTraining.findOne({ student: user._id });

        if (ojt) {
            // Update
            ojt.entries = entries || ojt.entries;
            ojt.scoring = scoring || ojt.scoring;
            ojt.totalMarks = totalMarks;
            ojt.totalMarksObtained = totalMarksObtained;
            ojt.totalPercentage = totalPercentage;
            ojt.result = result;
            ojt.remarks = remarks;
            ojt.updatedBy = req.user.id;

            await ojt.save();
        } else {
            // Create
            ojt = await OnJobTraining.create({
                student: user._id,
                entries,
                scoring,
                totalMarks,
                totalMarksObtained,
                totalPercentage,
                result,
                remarks,
                createdBy: req.user.id,
                updatedBy: req.user.id,
            });
        }

        res.status(200).json({
            success: true,
            message: "OJT record saved successfully",
            data: ojt,
        });
    } catch (error) {
        console.error("OJT Save Error Details:", error);
        return next(new ApiError(error.message, 500));
    }
};
