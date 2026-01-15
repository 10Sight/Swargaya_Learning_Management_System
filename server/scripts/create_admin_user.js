import User from '../models/auth.model.js';
import { pool } from '../db/connectDB.js';
import logger from '../logger/winston.logger.js';

const createAdmin = async () => {
    try {
        const adminData = {
            email: 'admin123@gmail.com',
            userName: 'admin123',
            password: 'admin123',
            fullName: 'Admin User',
            role: 'ADMIN',
            phoneNumber: '0000000000', // Dummy phone number as it is required
            unit: 'Admin Unit' // Dummy unit as it might be required based on schema NOT NULL
        };

        console.log('Checking if admin user exists...');

        // Check by email or username
        const existingByEmail = await User.findOne({ email: adminData.email });
        if (existingByEmail) {
            console.log('Admin user with this email already exists.');
            process.exit(0);
        }

        const existingByUsername = await User.findOne({ userName: adminData.userName });
        if (existingByUsername) {
            console.log('Admin user with this username already exists.');
            process.exit(0);
        }

        console.log('Creating admin user...');
        const newUser = await User.create(adminData);

        console.log('Admin user created successfully:', newUser.email);
    } catch (error) {
        console.error('Error creating admin user:');
        console.error('Message:', error.message);
        if (error.sqlMessage) console.error('SQL Message:', error.sqlMessage);
        if (error.code) console.error('Error Code:', error.code);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
        process.exit(0);
    }
};

createAdmin();
