import { Schema, model } from "mongoose";

const batchSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        course: {
            type: Schema.Types.ObjectId,
            ref: "Course",
            required: false,
            index: true,
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
        batchQuiz: {
            type: Schema.Types.ObjectId,
            ref: "Quiz",
            required: false,
        },
        batchAssignment: {
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

// Method to calculate status based on dates
batchSchema.methods.calculateStatus = function() {
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
batchSchema.methods.updateStatus = async function() {
    const newStatus = this.calculateStatus();
    if (this.status !== newStatus && this.status !== 'CANCELLED') {
        this.status = newStatus;
        await this.save();
    }
    return this.status;
};

// Static method to update all batch statuses
batchSchema.statics.updateAllStatuses = async function() {
    const batches = await this.find({ 
        status: { $ne: 'CANCELLED' }, // Don't update cancelled batches
        $or: [
            { startDate: { $exists: true } },
            { endDate: { $exists: true } }
        ]
    });
    
    let updatedCount = 0;
    const results = [];
    
    for (const batch of batches) {
        const oldStatus = batch.status;
        const newStatus = batch.calculateStatus();
        
        if (oldStatus !== newStatus) {
            batch.status = newStatus;
            await batch.save();
            updatedCount++;
            
            results.push({
                batchId: batch._id,
                name: batch.name,
                oldStatus,
                newStatus,
                startDate: batch.startDate,
                endDate: batch.endDate
            });
        }
    }
    
    return {
        totalProcessed: batches.length,
        updatedCount,
        results
    };
};

// Static method to find old batches for cleanup
batchSchema.statics.findOldBatchesForCleanup = async function() {
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

// Static method to cleanup old batches
batchSchema.statics.cleanupOldBatches = async function() {
    const results = {
        found: 0,
        deleted: 0,
        errors: [],
        deletedBatches: []
    };
    
    try {
        const oldBatches = await this.findOldBatchesForCleanup();
        results.found = oldBatches.length;
        
        if (oldBatches.length === 0) {
            return results;
        }
        
        const User = model('User');
        const Progress = model('Progress');
        const Submission = model('Submission');
        const AttemptedQuiz = model('AttemptedQuiz');
        
        for (const batch of oldBatches) {
            try {
                // Store batch info for result
                results.deletedBatches.push({
                    id: batch._id,
                    name: batch.name,
                    status: batch.status,
                    statusUpdatedAt: batch.statusUpdatedAt,
                    studentCount: batch.students.length,
                    courseName: batch.course?.title || 'N/A'
                });
                
                // 1. Clean up user references (remove batch from users)
                // Remove batch from students (single batch reference)
                await User.updateMany(
                    { _id: { $in: batch.students.map(s => s._id) } },
                    { $unset: { batch: 1 } }
                );
                
                // Remove batch from instructor (array of batches)
                if (batch.instructor) {
                    await User.updateOne(
                        { _id: batch.instructor },
                        { $pull: { batches: batch._id } }
                    );
                }
                
                // 2. Clean up related data (optional - can be kept for historical purposes)
                // Remove progress records for this batch's course and students
                if (batch.course) {
                    await Progress.deleteMany({
                        student: { $in: batch.students.map(s => s._id) },
                        course: batch.course._id
                    });
                    
                    // Remove submissions for this batch's course and students  
                    await Submission.deleteMany({
                        student: { $in: batch.students.map(s => s._id) },
                        assignment: { $exists: true }
                    });
                    
                    // Remove quiz attempts for this batch's course and students
                    await AttemptedQuiz.deleteMany({
                        student: { $in: batch.students.map(s => s._id) },
                        quiz: { $exists: true }
                    });
                }
                
                // 3. Delete the batch itself
                await batch.deleteOne();
                
                results.deleted++;
                
            } catch (batchError) {
                results.errors.push({
                    batchId: batch._id,
                    batchName: batch.name,
                    error: batchError.message
                });
            }
        }
        
        return results;
        
    } catch (error) {
        console.error('❌ Critical error in batch cleanup:', error);
        results.errors.push({ error: error.message });
        return results;
    }
};

// Pre-save middleware to automatically calculate status and track status changes
batchSchema.pre('save', function(next) {
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

export default model("Batch", batchSchema);
