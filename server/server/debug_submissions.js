import mongoose from 'mongoose';
import Submission from './models/submission.model.js';
import User from './models/auth.model.js';
import Assignment from './models/assignment.model.js';
import ENV from './configs/env.config.js';

// Connect to MongoDB
mongoose.connect(ENV.MONGO_URI);

async function debugSubmissions() {
  console.log('Debugging Submissions...\n');

  try {
    const submissions = await Submission.find()
      .populate('student', 'fullName userName')
      .populate('assignment', 'title')
      .limit(10);

    console.log(`Found ${submissions.length} submissions:\n`);

    submissions.forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.student?.fullName || 'Unknown'} - ${sub.assignment?.title || 'Unknown'}`);
      console.log(`   ID: ${sub._id}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Legacy fileUrl: ${sub.fileUrl || 'None'}`);
      console.log(`   Attachments: ${sub.attachments?.length || 0} files`);
      
      if (sub.attachments && sub.attachments.length > 0) {
        sub.attachments.forEach((file, fileIndex) => {
          console.log(`     File ${fileIndex}: ${file.originalName} (${file.filename})`);
          console.log(`       Path: ${file.filePath}`);
          console.log(`       Size: ${file.fileSize} bytes`);
          console.log(`       Type: ${file.mimeType}`);
        });
      }
      console.log('');
    });

    // Check if there are any submissions with legacy fileUrl
    const legacyCount = await Submission.countDocuments({ fileUrl: { $exists: true, $ne: null } });
    console.log(`Legacy submissions (with fileUrl): ${legacyCount}`);

    // Check submissions with new attachments
    const newCount = await Submission.countDocuments({ 'attachments.0': { $exists: true } });
    console.log(`New submissions (with attachments): ${newCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugSubmissions();
