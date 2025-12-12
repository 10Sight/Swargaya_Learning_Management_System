import mongoose from 'mongoose';
import Course from '../models/course.model.js';
import Module from '../models/module.model.js';
import Lesson from '../models/lesson.model.js';
import Quiz from '../models/quiz.model.js';
import Department from '../models/department.model.js';
import User from '../models/auth.model.js';
import { slugify, ensureUniqueSlug } from '../utils/slugify.js';

async function backfill() {
  const updated = { course: 0, module: 0, lesson: 0, quiz: 0, department: 0, user: 0 };

  const courses = await Course.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] });
  for (const c of courses) {
    const base = slugify(c.title);
    c.slug = await ensureUniqueSlug(Course, base, {}, c._id);
    await c.save();
    updated.course++;
  }

  const modules = await Module.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] });
  for (const m of modules) {
    const base = slugify(m.title);
    m.slug = await ensureUniqueSlug(Module, base, { course: m.course }, m._id);
    await m.save();
    updated.module++;
  }

  const lessons = await Lesson.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] });
  for (const l of lessons) {
    const base = slugify(l.title);
    l.slug = await ensureUniqueSlug(Lesson, base, { module: l.module }, l._id);
    await l.save();
    updated.lesson++;
  }

  const quizzes = await Quiz.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] });
  for (const q of quizzes) {
    const base = slugify(q.title);
    q.slug = await ensureUniqueSlug(Quiz, base, {}, q._id);
    await q.save();
    updated.quiz++;
  }

  const departments = await Department.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] });
  for (const b of departments) {
    const base = slugify(b.name);
    b.slug = await ensureUniqueSlug(Department, base, {}, b._id);
    await b.save();
    updated.department++;
  }

  const users = await User.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] });
  for (const u of users) {
    const base = slugify(u.userName || u.fullName);
    u.slug = await ensureUniqueSlug(User, base, {}, u._id);
    await u.save();
    updated.user++;
  }

  return updated;
}

(async () => {
  try {
    const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/lms';
    await mongoose.connect(MONGO_URL);
    const res = await backfill();
    console.log('Backfill complete', res);
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
