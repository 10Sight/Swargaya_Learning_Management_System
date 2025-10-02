import { Schema, model } from "mongoose";

const assignmentSchema = new Schema(
    {
        // Legacy fields - keeping for backward compatibility
        course: {
            type: Schema.Types.ObjectId,
            ref: "Course",
            required: true,
            index: true,
        },
        module: {
            type: Schema.Types.ObjectId,
            ref: "Module",
            required: false,
            index: true,
        },
        lesson: {
            type: Schema.Types.ObjectId,
            ref: "Lesson",
            required: false, // Make optional
            default: null,
        },
        // New resource-like scoping system
        courseId: {
            type: Schema.Types.ObjectId,
            ref: "Course",
            default: function() {
                return this.course; // Use legacy course field as fallback
            }
        },
        moduleId: {
            type: Schema.Types.ObjectId,
            ref: "Module",
            default: function() {
                return this.module; // Use legacy module field as fallback
            }
        },
        lessonId: {
            type: Schema.Types.ObjectId,
            ref: "Lesson",
            default: function() {
                return this.lesson; // Use legacy lesson field as fallback
            }
        },
        // Scope - helps identify where assignment belongs
        scope: {
            type: String,
            enum: ["course", "module", "lesson"],
            default: function() {
                // Determine scope based on what IDs are provided
                if (this.lessonId || this.lesson) {
                    return "lesson";
                } else if (this.moduleId || this.module) {
                    return "module";
                } else {
                    return "course";
                }
            }
        },
        instructor: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: false, // Make optional
            default: null,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        resources: [
            {
                type: String,
            },
        ],
        dueDate: {
            type: Date,
            required: true,
        },
        maxScore: {
            type: Number,
            default: 100,
        },
        allowResubmission: {
            type: Boolean,
            default: true,
        },
        status: {
            type: String,
            enum: ["ACTIVE", "CLOSED", "ARCHIVED"],
            default: "ACTIVE",
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true
    }
);

// Pre-save hook to ensure data consistency between new and legacy fields
assignmentSchema.pre('save', function(next) {
    const assignment = this;
    
    // Sync new fields with legacy fields for backward compatibility
    if (assignment.courseId && !assignment.course) {
        assignment.course = assignment.courseId;
    }
    if (assignment.course && !assignment.courseId) {
        assignment.courseId = assignment.course;
    }
    
    if (assignment.moduleId && !assignment.module) {
        assignment.module = assignment.moduleId;
    }
    if (assignment.module && !assignment.moduleId) {
        assignment.moduleId = assignment.module;
    }
    
    if (assignment.lessonId && !assignment.lesson) {
        assignment.lesson = assignment.lessonId;
    }
    if (assignment.lesson && !assignment.lessonId) {
        assignment.lessonId = assignment.lesson;
    }
    
    // Validate scope matches provided IDs
    if (assignment.scope === 'course' && (assignment.moduleId || assignment.lessonId)) {
        return next(new Error('Course-scoped assignment cannot have module or lesson IDs'));
    }
    if (assignment.scope === 'module' && (!assignment.moduleId || assignment.lessonId)) {
        return next(new Error('Module-scoped assignment must have moduleId and cannot have lessonId'));
    }
    if (assignment.scope === 'lesson' && (!assignment.lessonId || !assignment.moduleId)) {
        return next(new Error('Lesson-scoped assignment must have both moduleId and lessonId'));
    }
    
    next();
});

export default model("Assignment", assignmentSchema);
