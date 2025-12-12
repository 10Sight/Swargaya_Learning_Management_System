import { Schema, model } from "mongoose";

const certificateTemplateSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        description: {
            type: String,
            trim: true,
        },
        template: {
            type: String,
            required: true,
            // HTML template with placeholders like {{studentName}}, {{courseName}}, etc.
        },
        styles: {
            type: String,
            // CSS styles for the template
            default: "",
        },
        placeholders: [{
            key: {
                type: String,
                required: true,
                // e.g., "studentName", "courseName", "departmentName", "instructorName", "level", "issueDate"
            },
            description: {
                type: String,
                required: true,
                // e.g., "Student's full name", "Course title"
            },
            required: {
                type: Boolean,
                default: true,
            }
        }],
        isDefault: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true
    }
);

// Ensure only one default template exists
certificateTemplateSchema.pre('save', async function (next) {
    if (this.isDefault && this.isModified('isDefault')) {
        // Remove default flag from other templates
        await this.constructor.updateMany(
            { _id: { $ne: this._id } },
            { $set: { isDefault: false } }
        );
    }
    next();
});

export default model("CertificateTemplate", certificateTemplateSchema);
