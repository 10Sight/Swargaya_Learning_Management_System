import mongoose from 'mongoose';
import Submission from './models/submission.model.js';
import User from './models/auth.model.js';
import Assignment from './models/assignment.model.js';
import ENV from './configs/env.config.js';

// Connect to MongoDB
mongoose.connect(ENV.MONGO_URI);

async function debugSubmissions() {
  try {
    const submissions = await Submission.find()
      .populate('student', 'fullName userName')
      .populate('assignment', 'title')
      .limit(10);

    // Check if there are any submissions with legacy fileUrl
    const legacyCount = await Submission.countDocuments({ fileUrl: { $exists: true, $ne: null } });

    // Check submissions with new attachments
    const newCount = await Submission.countDocuments({ 'attachments.0': { $exists: true } });

    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

debugSubmissions();
