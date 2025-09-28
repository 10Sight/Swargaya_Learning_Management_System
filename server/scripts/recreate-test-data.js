import mongoose from 'mongoose';
import User from '../models/auth.model.js';
import Course from '../models/course.model.js';
import Batch from '../models/batch.model.js';
import ENV from '../configs/env.config.js';

async function recreateTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(ENV.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('Cleaning existing test data...');

    // Delete existing test data
    await User.deleteMany({ email: { $in: ['instructor@test.com', 'student1@test.com', 'student2@test.com', 'student3@test.com'] } });
    await Course.deleteMany({ title: 'Test Course' });
    await Batch.deleteMany({ name: 'Test Batch' });

    console.log('Test data cleaned successfully');

    // Create test instructor
    console.log('\nCreating test instructor...');
    const instructor = await User.create({
      fullName: 'Test Instructor',
      userName: 'instructor_test',
      email: 'instructor@test.com',
      phoneNumber: '+1234567890',
      password: 'password123', // Schema middleware will hash this properly
      role: 'INSTRUCTOR',
      status: 'ACTIVE'
    });
    console.log('Test instructor created:', instructor.email);

    // Create test course
    console.log('\nCreating test course...');
    const course = await Course.create({
      title: 'Test Course',
      description: 'A test course for instructor portal',
      status: 'PUBLISHED',
      instructor: instructor._id,
      category: 'Programming',
      level: 'BEGINNER',
      price: 0,
      duration: 30,
      modules: []
    });
    console.log('Test course created:', course.title);

    // Create test students
    console.log('\nCreating test students...');
    const students = [];
    for (let i = 1; i <= 3; i++) {
      const student = await User.create({
        fullName: `Test Student ${i}`,
        userName: `student_test_${i}`,
        email: `student${i}@test.com`,
        phoneNumber: `+123456789${i}`,
        password: 'password123', // Schema middleware will hash this properly
        role: 'STUDENT',
        status: 'ACTIVE'
      });
      students.push(student._id);
      console.log(`Test student ${i} created:`, student.email);
    }

    // Create test batch
    console.log('\nCreating test batch...');
    const batch = await Batch.create({
      name: 'Test Batch',
      description: 'A test batch for instructor portal',
      course: course._id,
      instructor: instructor._id,
      students: students,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      status: 'ONGOING'
    });
    console.log('Test batch created:', batch.name);

    console.log('\n=== Test Data Recreation Complete ===');
    console.log(`Instructor: ${instructor.email} (password: password123)`);
    console.log(`Course: ${course.title}`);
    console.log(`Batch: ${batch.name} with ${students.length} students`);
    console.log('Students: student1@test.com, student2@test.com, student3@test.com (password: password123)');
    
    // Show the instructor ID for reference
    console.log(`\nInstructor ID: ${instructor._id}`);
    console.log(`Batch ID: ${batch._id}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error recreating test data:', error);
    process.exit(1);
  }
}

recreateTestData();
