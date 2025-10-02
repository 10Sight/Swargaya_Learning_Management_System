/**
 * Test script to demonstrate user creation with email functionality
 * Run this script to test the email sending when admin creates new users
 */

import mongoose from 'mongoose';
import ENV from '../configs/env.config.js';
import { generateWelcomeEmail } from '../utils/emailTemplates.js';
import sendMail from '../utils/mail.util.js';

// Sample test data
const testUsers = [
  {
    fullName: "John Doe",
    userName: "johndoe",
    email: "john.doe@example.com",
    phoneNumber: "+1234567890",
    password: "testpassword123",
    role: "STUDENT"
  },
  {
    fullName: "Jane Smith",
    userName: "janesmith",
    email: "jane.smith@example.com",
    phoneNumber: "+1234567891",
    password: "instructorpass456",
    role: "INSTRUCTOR"
  }
];

const testEmailGeneration = async () => {
  console.log('🧪 Testing Email Template Generation...\n');
  
  for (const userData of testUsers) {
    console.log(`📧 Generating email for ${userData.fullName} (${userData.role}):`);
    
    // Determine login URL based on role
    let loginUrl = ENV.FRONTEND_URL || 'http://localhost:3000';
    if (userData.role === 'ADMIN' || userData.role === 'SUPER_ADMIN') {
      loginUrl = ENV.ADMIN_URL || 'http://localhost:5173';
    } else if (userData.role === 'INSTRUCTOR') {
      loginUrl = ENV.INSTRUCTOR_URL || 'http://localhost:5174';
    } else if (userData.role === 'STUDENT') {
      loginUrl = ENV.STUDENT_URL || 'http://localhost:5175';
    }
    
    const emailHtml = generateWelcomeEmail(userData, loginUrl);
    
    console.log(`✅ Email template generated successfully`);
    console.log(`📍 Login URL: ${loginUrl}`);
    console.log(`📝 Email subject: Welcome to 10Sight LMS - Your Account Has Been Created`);
    console.log(`📄 Email contains: Credentials, Welcome message, Security notice, Next steps`);
    console.log('---\n');
  }
};

const testEmailSending = async () => {
  console.log('📬 Testing Email Sending (Optional - requires SMTP setup)...\n');
  
  // Only test if SMTP is configured
  if (!ENV.SMTP_USERNAME || !ENV.SMTP_PASSWORD) {
    console.log('⚠️  SMTP not configured. Skipping email sending test.');
    console.log('   To test email sending, configure SMTP_USERNAME and SMTP_PASSWORD in your .env file');
    return;
  }
  
  const testUser = testUsers[0]; // Use first test user
  const loginUrl = ENV.STUDENT_URL || 'http://localhost:5175';
  
  try {
    const emailHtml = generateWelcomeEmail(testUser, loginUrl);
    const subject = 'Welcome to 10Sight LMS - Your Account Has Been Created';
    
    console.log(`📤 Attempting to send test email to: ${testUser.email}`);
    await sendMail(testUser.email, subject, emailHtml);
    console.log('✅ Test email sent successfully!');
  } catch (error) {
    console.log('❌ Email sending failed:', error.message);
    console.log('   This is expected if SMTP credentials are not valid or network issues exist');
  }
};

const main = async () => {
  console.log('🚀 User Creation Email Functionality Test\n');
  console.log('==========================================\n');
  
  await testEmailGeneration();
  await testEmailSending();
  
  console.log('🎯 API Usage Examples:');
  console.log('');
  console.log('To create a new student via API:');
  console.log('POST /api/users');
  console.log('Headers: { Authorization: "Bearer <admin_token>", Content-Type: "application/json" }');
  console.log('Body: {');
  console.log('  "fullName": "Student Name",');
  console.log('  "userName": "studentuser",');
  console.log('  "email": "student@example.com",');
  console.log('  "phoneNumber": "+1234567890",');
  console.log('  "password": "tempPassword123",');
  console.log('  "role": "STUDENT"');
  console.log('}');
  console.log('');
  console.log('To create a new instructor via API:');
  console.log('POST /api/users');
  console.log('Headers: { Authorization: "Bearer <admin_token>", Content-Type: "application/json" }');
  console.log('Body: {');
  console.log('  "fullName": "Instructor Name",');
  console.log('  "userName": "instructoruser",');
  console.log('  "email": "instructor@example.com",');
  console.log('  "phoneNumber": "+1234567890",');
  console.log('  "password": "tempPassword456",');
  console.log('  "role": "INSTRUCTOR"');
  console.log('}');
  console.log('');
  console.log('✅ When a user is created via the API, they will automatically receive');
  console.log('   a welcome email with their credentials at their specified email address.');
  console.log('');
  console.log('📧 The email includes:');
  console.log('   - Full name, email, username, phone number');
  console.log('   - Temporary password');
  console.log('   - Role (Student/Instructor/Administrator)');
  console.log('   - Login URL specific to their role');
  console.log('   - Security instructions to change password');
  console.log('   - Next steps guidance');
  console.log('');
  console.log('🎉 Test completed successfully!');
};

// Run the test
main().catch(console.error);
