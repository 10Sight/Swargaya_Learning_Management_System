import mongoose from "mongoose";

import Batch from "../models/batch.model.js";
import User from "../models/auth.model.js";
import Course from "../models/course.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createBatch = asyncHandler(async (req, res) => {
    const { name, instructorId, courseId, startDate, endDate, capacity } = req.body;

    if(!name) throw new ApiError("Batch name is required", 400);

    if(instructorId && !mongoose.Types.ObjectId.isValid(instructorId)) {
        throw new ApiError("Invalid instructor ID", 400);
    }

    if(courseId && !mongoose.Types.ObjectId.isValid(courseId)) {
        throw new ApiError("Invalid course ID", 400);
    }

    let instructor = null;
    if(instructorId) {
        instructor = await User.findById(instructorId);
        if(!instructor || instructor.role !== "INSTRUCTOR") {
            throw new ApiError("Invalid instructor selected", 400);
        }
    }

    let course = null;
    if(courseId) {
        course = await Course.findById(courseId);
        if(!course) {
            throw new ApiError("Invalid course selected", 400);
        }
    }

    const batchData = {
        name,
        instructor: instructorId || null,
        course: courseId || null,
        students: [],
    };
    
    if (startDate) batchData.startDate = new Date(startDate);
    if (endDate) batchData.endDate = new Date(endDate);
    if (capacity) batchData.capacity = parseInt(capacity);
    
    const batch = await Batch.create(batchData);

    res.status(201)
        .json(new ApiResponse(201, batch, "Batch created successfully"));
});

export const assignInstructor = asyncHandler(async (req, res) => {
    const { batchId, instructorId } = req.body;

    if(!mongoose.Types.ObjectId.isValid(batchId)) {
        throw new ApiError("Invalid batch ID", 400);
    }

    if(!mongoose.Types.ObjectId.isValid(instructorId)) {
        throw new ApiError("Invalid Instructor ID", 400);
    }

    const batch = await Batch.findById(batchId);
    if(!batch) throw new ApiError("Batch not found", 404);

    const instructor = await User.findById(instructorId);
    if(!instructor || instructor.role !== "INSTRUCTOR") {
        throw new ApiError("Invalid instructor selected", 400);
    }

    // Check if instructor is already assigned to another batch
    if(instructor.batch && instructor.batch.toString() !== batchId) {
        throw new ApiError("Instructor is already assigned to another batch", 400);
    }

    // Check if batch already has an instructor
    if(batch.instructor && batch.instructor.toString() !== instructorId) {
        throw new ApiError("Batch already has an instructor assigned", 400);
    }

    // Update batch with instructor
    batch.instructor = instructorId;
    await batch.save();

    // Update instructor with batch
    instructor.batch = batchId;
    await instructor.save();

    res.json(new ApiResponse(200, batch, "Instructor assigned successfully"));
});

export const removeInstructor = asyncHandler(async (req, res) => {
    const { batchId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(batchId)) {
        throw new ApiError("Invalid batch ID", 400);
    }

    const batch = await Batch.findById(batchId);
    if (!batch) throw new ApiError("Batch not found", 404);

    // Check if batch has an instructor
    if (!batch.instructor) {
        throw new ApiError("No instructor assigned to this batch", 400);
    }

    const instructorId = batch.instructor;
    
    // Remove instructor from batch
    batch.instructor = undefined;
    await batch.save();

    // Remove batch from instructor
    const instructor = await User.findById(instructorId);
    if (instructor && instructor.batch && instructor.batch.toString() === batchId) {
        instructor.batch = undefined;
        await instructor.save();
    }

    res.json(new ApiResponse(200, batch, "Instructor removed successfully"));
});

export const addStudentToBatch = asyncHandler(async (req, res) => {
    const { batchId, studentId } = req.body;

    if(!mongoose.Types.ObjectId.isValid(batchId)) {
        throw new ApiError("Invalid batch ID", 400);
    }

    if(!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ApiError("Invalid Student ID", 400);
    }

    const batch = await Batch.findById(batchId);
    if(!batch) throw new ApiError("Batch not found", 404);

    const student = await User.findById(studentId);
    if(!student || student.role !== "STUDENT") {
        throw new ApiError("Invalid student selected", 400);
    }

    // Check if student is already assigned to another batch
    if(student.batch && student.batch.toString() !== batchId) {
        throw new ApiError("Student is already assigned to another batch", 400);
    }

    // Check if batch is at capacity
    if(batch.capacity && batch.students.length >= batch.capacity) {
        throw new ApiError("Batch is at full capacity", 400);
    }

    // Check if student is already in this batch
    if(batch.students.includes(studentId)) {
        throw new ApiError("Student is already in this batch", 400);
    }

    // Add student to batch
    batch.students.push(studentId);
    await batch.save();

    // Update student with batch
    student.batch = batchId;
    await student.save();

    res.json(new ApiResponse(200, batch, "Student added to batch successfully"));
});

export const removeStudentFromBatch = asyncHandler(async (req, res) => {
    const { batchId, studentId } = req.body;

    if(!mongoose.Types.ObjectId.isValid(batchId)) {
        throw new ApiError("Invalid batch ID", 400);
    }

    if(!mongoose.Types.ObjectId.isValid(studentId)) {
        throw new ApiError("Invalid student ID", 400);
    }

    const batch = await Batch.findById(batchId);
    if(!batch) throw new ApiError("Batch not found", 404);

    const student = await User.findById(studentId);
    if(!student) throw new ApiError("Student not found", 404);

    // Remove student from batch
    batch.students = batch.students.filter(
        (id) => id.toString() !== studentId.toString()
    );
    await batch.save();

    // Remove batch from student
    student.batch = null;
    await student.save();

    res.json(new ApiResponse(200, batch, "Student removed from batch successfully"));
});

export const getAllBatches = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const searchQuery = search
        ? { name: { $regex: search, $options: "i" } }
        : {};

    const total = await Batch.countDocuments(searchQuery);

    const batches = await Batch.find(searchQuery)
    .populate("instructor", "fullName email")
    .populate("students", "fullName email")
    .populate("course", "title name") // Add this line
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

    res.json(
        new ApiResponse(200,
            {
                batches,
                totalBatches: total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit,
            },
            "Batches fetched successfully"
        )
    );
});

export const getBatchById = asyncHandler(async (req, res) => {
    if(!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ApiError("Invalid batch ID", 400);
    }

    const batch = await Batch.findById(req.params.id)
    .populate("instructor", "fullName email")
    .populate("students", "fullName email status createdAt")
    .populate("course", "title name description difficulty status");

    if(!batch) throw new ApiError("Batch not found", 404);

    res.json(new ApiResponse(200, batch, "Batch fetched successfully"));
});

export const updateBatch = asyncHandler(async (req, res) => {
    const { name, status, courseId, startDate, endDate, capacity } = req.body;

    const batch = await Batch.findById(req.params.id);
    if(!batch) throw new ApiError("Batch not found", 404);

    if(name) batch.name = name;
    if(status) batch.status = status;
    if(courseId) batch.course = courseId; 
    if(startDate) batch.startDate = new Date(startDate);
    if(endDate) batch.endDate = new Date(endDate);
    if(capacity) batch.capacity = parseInt(capacity);

    await batch.save();

    res.json(new ApiResponse(200, batch, "Batch updated successfully"));
});

export const deleteBatch = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const batch = await Batch.findById(id);
    if(!batch) throw new ApiError("Batch not found", 404);

    await batch.deleteOne();

    res.json(new ApiResponse(200, null, "Batch deleted successfully"));
});

