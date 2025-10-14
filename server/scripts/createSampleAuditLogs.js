import mongoose from 'mongoose';
import Audit from '../models/audit.model.js';
import User from '../models/user.model.js';

// Connect to database
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/learning_management_system';

async function createSampleAuditLogs() {
    try {
        await mongoose.connect(MONGODB_URI);

        // Get some existing users for the audit logs
        const users = await User.find({}).limit(3);
        
        const sampleLogs = [
            {
                user: users[0]?._id || null,
                action: 'LOGIN_SUCCESS',
                resourceType: 'User',
                resourceId: users[0]?._id,
                severity: 'low',
                status: 'success',
                ip: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                details: {
                    loginMethod: 'email_password',
                    timestamp: new Date(),
                    location: 'New York, NY'
                }
            },
            {
                user: null, // System log
                action: 'SYSTEM_BACKUP',
                resourceType: 'System',
                resourceId: null,
                severity: 'medium',
                status: 'success',
                ip: '127.0.0.1',
                userAgent: 'System',
                details: {
                    backupType: 'automated',
                    size: '125MB',
                    timestamp: new Date()
                }
            },
            {
                user: users[1]?._id || null,
                action: 'CREATE_USER',
                resourceType: 'User',
                resourceId: users[1]?._id,
                severity: 'low',
                status: 'success',
                ip: '192.168.1.101',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                details: {
                    createdUserRole: 'STUDENT',
                    createdBy: users[0]?._id,
                    timestamp: new Date()
                }
            },
            {
                user: users[2]?._id || null,
                action: 'LOGIN_FAILED',
                resourceType: 'User',
                resourceId: users[2]?._id,
                severity: 'high',
                status: 'failed',
                ip: '192.168.1.102',
                userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                details: {
                    reason: 'invalid_credentials',
                    attempts: 3,
                    timestamp: new Date()
                }
            },
            {
                user: users[0]?._id || null,
                action: 'UPDATE_USER',
                resourceType: 'User',
                resourceId: users[1]?._id,
                severity: 'low',
                status: 'success',
                ip: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                details: {
                    updatedFields: ['email', 'fullName'],
                    targetUser: users[1]?._id,
                    timestamp: new Date()
                }
            },
            {
                user: null, // System log
                action: 'SYSTEM_MAINTENANCE',
                resourceType: 'System',
                resourceId: null,
                severity: 'medium',
                status: 'success',
                ip: '127.0.0.1',
                userAgent: 'System',
                details: {
                    maintenanceType: 'database_cleanup',
                    duration: '15 minutes',
                    timestamp: new Date()
                }
            },
            {
                user: users[0]?._id || null,
                action: 'DELETE_USER',
                resourceType: 'User',
                resourceId: users[2]?._id,
                severity: 'high',
                status: 'success',
                ip: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                details: {
                    deletedUserRole: 'STUDENT',
                    reason: 'account_violation',
                    timestamp: new Date()
                }
            }
        ];

        // Clear existing audit logs
        await Audit.deleteMany({});

        // Insert sample logs
        const createdLogs = await Audit.insertMany(sampleLogs);
        
    } catch (error) {
        // Handle error silently or log appropriately
    } finally {
        await mongoose.disconnect();
    }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    createSampleAuditLogs();
}

export default createSampleAuditLogs;
