import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/auth.model.js';
import Course from '../models/course.model.js';
import Batch from '../models/batch.model.js';
import ENV from '../configs/env.config.js';

async function createTestInstructorData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(ENV.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if instructor user exists
    let instructor = await User.findOne({ email: 'instructor@test.com', role: 'INSTRUCTOR' });
    
    if (!instructor) {
      console.log('Creating test instructor...');
      
      instructor = await User.create({
        fullName: 'Test Instructor',
        userName: 'instructor_test',
        email: 'instructor@test.com',
        phoneNumber: '+1234567890',
        password: 'password123', // Let schema middleware handle hashing
        role: 'INSTRUCTOR',
        status: 'ACTIVE'
      });
      console.log('Test instructor created:', instructor.email);
    } else {
      console.log('Test instructor already exists:', instructor.email);
    }

    // Check if test course exists
    let course = await Course.findOne({ title: 'Test Course' });
    
    if (!course) {
      console.log('Creating test course...');
      course = await Course.create({
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
    } else {
      console.log('Test course already exists:', course.title);
    }

    // Check if test students exist
    const students = [];
    for (let i = 1; i <= 3; i++) {
      let student = await User.findOne({ email: `student${i}@test.com`, role: 'STUDENT' });
      
      if (!student) {
        console.log(`Creating test student ${i}...`);
        
        student = await User.create({
          fullName: `Test Student ${i}`,
          userName: `student_test_${i}`,
          email: `student${i}@test.com`,
          phoneNumber: `+123456789${i}`,
          password: 'password123', // Let schema middleware handle hashing
          role: 'STUDENT',
          status: 'ACTIVE'
        });
        console.log(`Test student ${i} created:`, student.email);
      } else {
        console.log(`Test student ${i} already exists:`, student.email);
      }
      students.push(student._id);
    }

    // Check if test batch exists
    let batch = await Batch.findOne({ name: 'Test Batch' });
    
    if (!batch) {
      console.log('Creating test batch...');
      batch = await Batch.create({
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
    } else {
      // Update batch with students and instructor if needed
      await Batch.findByIdAndUpdate(batch._id, {
        instructor: instructor._id,
        students: students,
        course: course._id
      });
      console.log('Test batch updated:', batch.name);
    }

    console.log('\n=== Test Data Summary ===');
    console.log(`Instructor: ${instructor.email} (password: password123)`);
    console.log(`Course: ${course.title}`);
    console.log(`Batch: ${batch.name} with ${students.length} students`);
    console.log('Students: student1@test.com, student2@test.com, student3@test.com (password: password123)');
    
    // Show the instructor ID for reference
    console.log(`\nInstructor ID: ${instructor._id}`);
    console.log(`Batch ID: ${batch._id}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
}

createTestInstructorData();
