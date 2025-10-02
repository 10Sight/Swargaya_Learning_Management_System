import mongoose from 'mongoose';
import CertificateTemplate from '../models/certificateTemplate.model.js';
import User from '../models/auth.model.js';
import ENV from '../configs/env.config.js';

// Default template HTML
const defaultTemplateHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate of Completion</title>
</head>
<body>
    <div class="certificate">
        <div class="header">
            <h1>Certificate of Completion</h1>
        </div>
        
        <div class="content">
            <p class="intro">This is to certify that</p>
            <h2 class="student-name">{{studentName}}</h2>
            <p class="completion-text">has successfully completed the course</p>
            <h3 class="course-name">{{courseName}}</h3>
            <p class="batch-info">in batch <strong>{{batchName}}</strong></p>
            <p class="level-info">achieving level <strong>{{level}}</strong></p>
            <p class="grade-info">with grade <strong>{{grade}}</strong></p>
        </div>
        
        <div class="footer">
            <div class="signature-section">
                <div class="signature">
                    <p class="instructor-name">{{instructorName}}</p>
                    <hr class="signature-line">
                    <p class="signature-label">Instructor Signature</p>
                </div>
            </div>
            <p class="date">Issued on {{issueDate}}</p>
        </div>
    </div>
</body>
</html>`;

// Default template styles
const defaultStyles = `.certificate {
    width: 800px;
    margin: 0 auto;
    padding: 60px 80px;
    border: 10px solid #2c3e50;
    border-radius: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-family: 'Georgia', serif;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.header h1 {
    font-size: 48px;
    margin-bottom: 30px;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    letter-spacing: 2px;
}

.content {
    margin: 40px 0;
}

.intro {
    font-size: 24px;
    margin-bottom: 20px;
    font-style: italic;
}

.student-name {
    font-size: 42px;
    margin: 30px 0;
    color: #f1c40f;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 3px;
}

.completion-text {
    font-size: 20px;
    margin: 20px 0;
}

.course-name {
    font-size: 32px;
    margin: 25px 0;
    color: #ecf0f1;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
}

.batch-info, .level-info, .grade-info {
    font-size: 18px;
    margin: 15px 0;
}

.footer {
    margin-top: 50px;
    position: relative;
}

.signature-section {
    display: flex;
    justify-content: center;
    margin-bottom: 30px;
}

.signature {
    text-align: center;
    width: 250px;
}

.instructor-name {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 10px;
}

.signature-line {
    border: none;
    border-top: 2px solid white;
    width: 100%;
    margin: 10px 0;
}

.signature-label {
    font-size: 14px;
    font-style: italic;
}

.date {
    font-size: 16px;
    font-style: italic;
    position: absolute;
    bottom: 0;
    right: 0;
}

@media print {
    .certificate {
        border: 8px solid #2c3e50;
        box-shadow: none;
    }
}`;

const seedDefaultTemplate = async () => {
    try {
        await mongoose.connect(ENV.DATABASE_URI);
        console.log('Connected to MongoDB');

        // Check if default template already exists
        const existingDefault = await CertificateTemplate.findOne({ isDefault: true });
        if (existingDefault) {
            console.log('Default certificate template already exists');
            return;
        }

        // Get the first admin user to set as creator
        const adminUser = await User.findOne({ role: 'ADMIN' });
        if (!adminUser) {
            console.error('No admin user found. Please create an admin user first.');
            return;
        }

        // Create default template
        const defaultTemplate = await CertificateTemplate.create({
            name: 'Default Certificate Template',
            description: 'Professional certificate template with elegant gradient design',
            template: defaultTemplateHtml,
            styles: defaultStyles,
            placeholders: [
                { key: "studentName", description: "Student's full name", required: true },
                { key: "courseName", description: "Course title", required: true },
                { key: "batchName", description: "Batch name", required: true },
                { key: "instructorName", description: "Instructor's full name", required: true },
                { key: "level", description: "Student's completion level", required: true },
                { key: "issueDate", description: "Certificate issue date", required: true },
                { key: "grade", description: "Grade or score", required: false }
            ],
            isDefault: true,
            isActive: true,
            createdBy: adminUser._id,
            updatedBy: adminUser._id
        });

        console.log('Default certificate template created successfully:', defaultTemplate._id);

    } catch (error) {
        console.error('Error seeding default certificate template:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Run the seeder if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedDefaultTemplate();
}

export default seedDefaultTemplate;
