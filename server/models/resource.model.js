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
        enum: ["VIDEO", "PDF", "IMAGE", "TEXT", "LINK"],
        required: true
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
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true
});

export default model("Resource", resourceSchema);
