import { Schema, model } from "mongoose";

const resourceSchema = new Schema({
    // Resource can belong to course, module, or lesson
    courseId: {
        type: Schema.Types.ObjectId,
        ref: "Course",
        default: null
    },
    moduleId: {
        type: Schema.Types.ObjectId,
        ref: "Module",
        default: null
    },
    lessonId: {
        type: Schema.Types.ObjectId,
        ref: "Lesson",
        default: null
    },
    // Resource scope - helps identify where resource belongs
    scope: {
        type: String,
        enum: ["course", "module", "lesson"],
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ["video", "pdf", "image", "text", "link", "VIDEO", "PDF", "IMAGE", "TEXT", "LINK"],
        required: true,
        set: function(value) {
            return value ? value.toLowerCase() : value;
        }
    },
    description: {
        type: String,
        trim: true
    },
    url: {
        type: String,
        required: true
    },
    publicId: {
        type: String, // Cloudinary public ID
        default: null
    },
    fileSize: {
        type: Number, // File size in bytes
        default: null
    },
    format: {
        type: String, // File format (pdf, jpg, mp4, etc.)
        default: null
    },
    fileName: {
        type: String, // Original file name
        default: null
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true
});

// Pre-save validation to ensure proper resource assignment
resourceSchema.pre('save', function(next) {
    const resource = this;
    
    // Validate scope matches provided IDs
    if (resource.scope === 'course' && !resource.courseId) {
        return next(new Error('Course ID is required for course-scoped resources'));
    }
    if (resource.scope === 'module' && !resource.moduleId) {
        return next(new Error('Module ID is required for module-scoped resources'));
    }
    if (resource.scope === 'lesson' && !resource.lessonId) {
        return next(new Error('Lesson ID is required for lesson-scoped resources'));
    }
    
    // Ensure only one scope is set
    const scopes = [resource.courseId, resource.moduleId, resource.lessonId].filter(Boolean);
    if (scopes.length !== 1) {
        return next(new Error('Resource must belong to exactly one scope (course, module, or lesson)'));
    }
    
    next();
});

export default model("Resource", resourceSchema);
