import { pool } from '../db/connectDB.js';
import User from '../models/auth.model.js';

async function addAdminUser() {
  const adminData = {
    fullName: 'Admin User',
    userName: 'admin123',
    email: 'admin123@gmail.com',
    password: 'admin123',
    phoneNumber: '0000000000',
    role: 'ADMIN',
    unit: 'UNIT 1', // default unit to satisfy NOT NULL db constraint
    isVerified: 1
  };

  console.log(`Checking if user with username '${adminData.userName}' or email '${adminData.email}' already exists...`);

  // Check username
  const existingByUsername = await User.findOne({ userName: adminData.userName });
  if (existingByUsername) {
    console.log(`User with username '${adminData.userName}' already exists. (ID: ${existingByUsername.id})`);
    return existingByUsername;
  }

  // Check email
  const existingByEmail = await User.findOne({ email: adminData.email });
  if (existingByEmail) {
    console.log(`User with email '${adminData.email}' already exists. (ID: ${existingByEmail.id})`);
    return existingByEmail;
  }

  console.log('Creating admin user...');
  const newUser = await User.create(adminData);
  console.log(`Admin user created successfully! ID: ${newUser.id}`);
  return newUser;
}

(async () => {
  try {
    await addAdminUser();
    process.exit(0);
  } catch (err) {
    console.error('Error adding admin user:', err);
    process.exit(1);
  }
})();
