import cron from 'node-cron';
import Batch from '../models/batch.model.js';
import User from '../models/auth.model.js';
import logger from '../logger/winston.logger.js';

class BatchStatusScheduler {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  // Initialize the batch status scheduler
  init() {
    if (this.isInitialized) {
      console.log('Batch status scheduler already initialized');
      return;
    }

    try {
      // Schedule batch status updates to run daily at midnight
      const statusUpdateJob = cron.schedule('0 0 * * *', async () => {
        console.log('Running daily batch status update...');
        await this.updateBatchStatuses();
      }, {
        scheduled: false,
        timezone: "UTC"
      });

      // Store job for management
      this.jobs.set('statusUpdate', statusUpdateJob);

      // Start the job
      statusUpdateJob.start();

      this.isInitialized = true;
      console.log('✅ Batch status scheduler initialized successfully');
      console.log('📅 Batch status updates: Daily at midnight UTC');

    } catch (error) {
      console.error('❌ Failed to initialize batch status scheduler:', error);
    }
  }

  // Stop all scheduled jobs
  stop() {
    try {
      this.jobs.forEach((job, name) => {
        job.stop();
        job.destroy();
        console.log(`Batch status scheduler job '${name}' stopped`);
      });
      
      this.jobs.clear();
      this.isInitialized = false;
      console.log('Batch status scheduler stopped');
    } catch (error) {
      console.error('Error stopping batch status scheduler:', error);
    }
  }

  // Manual batch status update trigger
  async updateBatchStatuses() {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Starting batch status update process...');
      
      const result = await Batch.updateAllStatuses();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Batch status update completed in ${duration}ms`);
      console.log(`📊 Processed: ${result.totalProcessed}, Updated: ${result.updatedCount}`);
      
      // Log status changes
      if (result.results.length > 0) {
        console.log('📋 Status changes:');
        result.results.forEach(change => {
          console.log(`  - ${change.name}: ${change.oldStatus} → ${change.newStatus}`);
        });
        
        // Send notifications for status changes
        await this.sendStatusChangeNotifications(result.results);
      }
      
      return result;
      
    } catch (error) {
      console.error('💥 Critical error in batch status update:', error);
      logger.error('Batch status update error:', error);
      return { totalProcessed: 0, updatedCount: 0, results: [], error: error.message };
    }
  }

  // Send notifications for batch status changes
  async sendStatusChangeNotifications(statusChanges) {
    try {
      for (const change of statusChanges) {
        // Get batch with populated students and instructor
        const batch = await Batch.findById(change.batchId)
          .populate('students', 'fullName email')
          .populate('instructor', 'fullName email')
          .populate('course', 'title');

        if (!batch) continue;

        // Prepare notification message based on new status
        let notificationMessage = '';
        let notificationType = 'INFO';

        switch (change.newStatus) {
          case 'ONGOING':
            notificationMessage = `Your batch "${batch.name}" has started today! You can now access the course materials.`;
            notificationType = 'SUCCESS';
            break;
          case 'COMPLETED':
            notificationMessage = `Your batch "${batch.name}" has been completed. Thank you for your participation!`;
            notificationType = 'INFO';
            break;
          case 'CANCELLED':
            notificationMessage = `Important: Your batch "${batch.name}" has been cancelled. Please contact support for more information.`;
            notificationType = 'ERROR';
            break;
          default:
            continue; // Skip other status changes
        }

        // Create notifications array for all users in the batch
        const notifications = [];
        
        // Add students to notifications
        batch.students.forEach(student => {
          notifications.push({
            recipient: student._id,
            type: notificationType,
            title: `Batch Status Update: ${batch.name}`,
            message: notificationMessage,
            metadata: {
              batchId: batch._id,
              batchName: batch.name,
              oldStatus: change.oldStatus,
              newStatus: change.newStatus,
              courseTitle: batch.course?.title || 'N/A'
            }
          });
        });

        // Add instructor to notifications if exists
        if (batch.instructor) {
          notifications.push({
            recipient: batch.instructor._id,
            type: notificationType,
            title: `Batch Status Update: ${batch.name}`,
            message: notificationMessage.replace('Your batch', 'Your assigned batch'),
            metadata: {
              batchId: batch._id,
              batchName: batch.name,
              oldStatus: change.oldStatus,
              newStatus: change.newStatus,
              courseTitle: batch.course?.title || 'N/A'
            }
          });
        }

        // Here you would typically save these notifications to a notifications collection
        // or send them via email/push notifications
        console.log(`📧 Would send ${notifications.length} notifications for batch "${batch.name}"`);
        
        // Log the notification for tracking
        logger.info(`Batch status change notification sent`, {
          batchId: batch._id,
          batchName: batch.name,
          statusChange: `${change.oldStatus} → ${change.newStatus}`,
          recipientCount: notifications.length
        });
      }
    } catch (error) {
      console.error('Error sending batch status notifications:', error);
      logger.error('Batch status notification error:', error);
    }
  }

  // Get specific batch status notifications for a user
  async getBatchNotificationsForUser(userId, batchId = null) {
    try {
      const user = await User.findById(userId).populate('batch');
      if (!user) {
        return [];
      }

      // Get user's batch or use provided batchId
      const targetBatchId = batchId || user.batch?._id;
      if (!targetBatchId) {
        return [];
      }

      const batch = await Batch.findById(targetBatchId).populate('course', 'title');
      if (!batch) {
        return [];
      }

      const notifications = [];

      // Check if batch is cancelled and user should be notified
      if (batch.status === 'CANCELLED') {
        notifications.push({
          type: 'ERROR',
          title: `Batch Cancelled: ${batch.name}`,
          message: `Your batch "${batch.name}" has been cancelled. Please contact support for further assistance.`,
          metadata: {
            batchId: batch._id,
            batchName: batch.name,
            status: batch.status,
            courseTitle: batch.course?.title || 'N/A'
          },
          urgent: true
        });
      }

      // Check if batch just started (ongoing status)
      if (batch.status === 'ONGOING' && batch.startDate) {
        const today = new Date();
        const startDate = new Date(batch.startDate);
        const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        
        // Show notification if batch started within the last 3 days
        if (daysDiff <= 3) {
          notifications.push({
            type: 'SUCCESS',
            title: `Batch Started: ${batch.name}`,
            message: `Your batch "${batch.name}" has started! You can now access the course materials and begin learning.`,
            metadata: {
              batchId: batch._id,
              batchName: batch.name,
              status: batch.status,
              courseTitle: batch.course?.title || 'N/A',
              startDate: batch.startDate
            },
            urgent: false
          });
        }
      }

      return notifications;

    } catch (error) {
      console.error('Error getting batch notifications for user:', error);
      return [];
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      activeJobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size
    };
  }

  // Restart scheduler
  restart() {
    console.log('Restarting batch status scheduler...');
    this.stop();
    setTimeout(() => {
      this.init();
    }, 1000);
  }
}

// Create singleton instance
const batchStatusScheduler = new BatchStatusScheduler();

export default batchStatusScheduler;
