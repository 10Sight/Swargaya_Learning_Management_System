import mongoose from 'mongoose';
import ENV from '../configs/env.config.js';
import Lesson from '../models/lesson.model.js';

(async () => {
  try {
    if (!ENV.MONGO_URI) {
      console.error('MONGO_URI not set');
      process.exit(1);
    }
    await mongoose.connect(ENV.MONGO_URI, { dbName: mongoose.connection?.client?.s?.options?.dbName || undefined });
    console.log('Connected to MongoDB');

    const cursor = Lesson.find({ $or: [ { slides: { $exists: false } }, { slides: { $size: 0 } } ] }).cursor();
    let updated = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      const contentHtml = (doc.content && String(doc.content).trim().length > 0) ? String(doc.content) : '';
      const slides = contentHtml
        ? [{ order: 1, contentHtml, bgColor: '#ffffff', images: [] }]
        : [];
      doc.slides = slides;
      await doc.save();
      updated += 1;
      console.log(`Backfilled slides for lesson ${doc._id}`);
    }

    console.log(`Backfill complete. Lessons updated: ${updated}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  }
})();