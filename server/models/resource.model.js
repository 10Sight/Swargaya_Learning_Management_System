import { Schema, model } from "mongoose";

const resourceSchema = new Schema({
    moduleId: {
        type: Schema.Types.ObjectId,
        ref: "Module",
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

export default model("Resource", resourceSchema);
