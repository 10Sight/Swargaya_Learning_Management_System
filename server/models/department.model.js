import { Schema, model } from "mongoose";

const departmentSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        slug: {
            type: String,
            trim: true,
            lowercase: true,
            unique: true,
            index: true,
        },
        course: {
            type: Schema.Types.ObjectId,
            ref: "Course",
        },
        courses: {
            type: [Schema.Types.ObjectId],
            ref: "Course",
            default: []
        },
        instructor: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: false,
            index: true, // Index for instructor queries
        },
        students: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        startDate: {
            type: Date,
            required: false,
            default: null,
        },
        endDate: {
            type: Date,
        },
        capacity: {
            type: Number,
            default: 50,
        },
        status: {
            type: String,
            enum: ["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"],
            default: "UPCOMING",
            index: true, // Index for status filtering
        },
        schedule: [
            {
                day: { type: String },
                startTime: { type: String },
                endTime: { type: String },
            },
        ],
        notes: {
            type: String,
            trim: true,
        },
        statusUpdatedAt: {
            type: Date,
            default: Date.now,
            index: true, // Index for cleanup queries
        },
        departmentQuiz: {
            type: Schema.Types.ObjectId,
            ref: "Quiz",
            required: false,
        },
        departmentAssignment: {
            type: Schema.Types.ObjectId,
            ref: "Assignment",
            required: false,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

import { slugify, ensureUniqueSlug } from "../utils/slugify.js";

departmentSchema.pre('save', async function (next) {
    if (!this.isModified('name') && this.slug) return next();
    const base = slugify(this.name);
    this.slug = await ensureUniqueSlug(this.constructor, base, {}, this._id);
    next();
});

// Method to calculate status based on dates
departmentSchema.methods.calculateStatus = function () {
    if (this.status === 'CANCELLED') {
        return 'CANCELLED'; // Keep cancelled status if manually set
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

    if (this.startDate) {
        const startDate = new Date(this.startDate);
        startDate.setHours(0, 0, 0, 0);

        if (startDate > today) {
            return 'UPCOMING';
        }

        if (this.endDate) {
            const endDate = new Date(this.endDate);
            endDate.setHours(0, 0, 0, 0);

            // If end date is today or before today, mark as completed
            if (endDate <= today) {
                return 'COMPLETED';
            }

            // If start date is today or before today, and end date is after today
            if (startDate <= today && endDate > today) {
                return 'ONGOING';
            }
        } else {
            // No end date, but start date is today or before
            if (startDate <= today) {
                return 'ONGOING';
            }
        }
    }

    // Default to UPCOMING if no dates are set or logic doesn't match
    return 'UPCOMING';
};

// Method to update status based on dates
departmentSchema.methods.updateStatus = async function () {
    const newStatus = this.calculateStatus();
    if (this.status !== newStatus && this.status !== 'CANCELLED') {
        this.status = newStatus;
        await this.save();
    }
    return this.status;
};

// Static method to update all department statuses
departmentSchema.statics.updateAllStatuses = async function () {
    const departments = await this.find({
        status: { $ne: 'CANCELLED' }, // Don't update cancelled departments
        $or: [
            { startDate: { $exists: true } },
            { endDate: { $exists: true } }
        ]
    });

    let updatedCount = 0;
    const results = [];

    for (const department of departments) {
        const oldStatus = department.status;
        const newStatus = department.calculateStatus();

        if (oldStatus !== newStatus) {
            department.status = newStatus;
            await department.save();
            updatedCount++;

            results.push({
                departmentId: department._id,
                name: department.name,
                oldStatus,
                newStatus,
                startDate: department.startDate,
                endDate: department.endDate
            });
        }
    }

    return {
        totalProcessed: departments.length,
        updatedCount,
        results
    };
};

// Static method to find old departments for cleanup
departmentSchema.statics.findOldDepartmentsForCleanup = async function () {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return await this.find({
        status: { $in: ['COMPLETED', 'CANCELLED'] },
        statusUpdatedAt: { $lt: oneWeekAgo },
        isDeleted: { $ne: true }
    }).populate('students', 'fullName email')
        .populate('instructor', 'fullName email')
        .populate('course', 'title');
};

// Static method to cleanup old departments
departmentSchema.statics.cleanupOldDepartments = async function () {
    const results = {
        found: 0,
        deleted: 0,
        errors: [],
        deletedDepartments: []
    };

    try {
        const oldDepartments = await this.findOldDepartmentsForCleanup();
        results.found = oldDepartments.length;

        if (oldDepartments.length === 0) {
            return results;
        }

        const User = model('User');
        const Progress = model('Progress');
        const Submission = model('Submission');
        const AttemptedQuiz = model('AttemptedQuiz');

        for (const department of oldDepartments) {
            try {
                // Store department info for result
                results.deletedDepartments.push({
                    id: department._id,
                    name: department.name,
                    status: department.status,
                    statusUpdatedAt: department.statusUpdatedAt,
                    studentCount: department.students.length,
                    courseName: department.course?.title || 'N/A'
                });

                // 1. Clean up user references (remove department from users)
                // Remove department from students (single department reference)
                await User.updateMany(
                    { _id: { $in: department.students.map(s => s._id) } },
                    { $unset: { department: 1 } }
                );

                // Remove department from instructor (array of departments)
                if (department.instructor) {
                    await User.updateOne(
                        { _id: department.instructor },
                        { $pull: { departments: department._id } }
                    );
                }

                // 2. Clean up related data (optional - can be kept for historical purposes)
                // Remove progress records for this department's course and students
                if (department.course) {
                    await Progress.deleteMany({
                        student: { $in: department.students.map(s => s._id) },
                        course: department.course._id
                    });

                    // Remove submissions for this department's course and students  
                    await Submission.deleteMany({
                        student: { $in: department.students.map(s => s._id) },
                        assignment: { $exists: true }
                    });

                    // Remove quiz attempts for this department's course and students
                    await AttemptedQuiz.deleteMany({
                        student: { $in: department.students.map(s => s._id) },
                        quiz: { $exists: true }
                    });
                }

                // 3. Delete the department itself
                await department.deleteOne();

                results.deleted++;

            } catch (departmentError) {
                results.errors.push({
                    departmentId: department._id,
                    departmentName: department.name,
                    error: departmentError.message
                });
            }
        }

        return results;

    } catch (error) {
        console.error('❌ Critical error in department cleanup:', error);
        results.errors.push({ error: error.message });
        return results;
    }
};

// Pre-save middleware to automatically calculate status and track status changes
departmentSchema.pre('save', function (next) {
    // Track status changes
    if (this.isModified('status') && (this.status === 'COMPLETED' || this.status === 'CANCELLED')) {
        this.statusUpdatedAt = new Date();
    }

    // Only auto-update status if it's not manually set to CANCELLED
    if (this.status !== 'CANCELLED' && (this.isModified('startDate') || this.isModified('endDate') || this.isNew)) {
        const newStatus = this.calculateStatus();
        if (this.status !== newStatus) {
            this.status = newStatus;
            // Track automatic status changes to COMPLETED
            if (newStatus === 'COMPLETED') {
                this.statusUpdatedAt = new Date();
            }
        }
    }

    next();
});

export default model("Department", departmentSchema);
