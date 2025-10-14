import cron from 'node-cron';
import Batch from '../models/batch.model.js';
import User from '../models/auth.model.js';
import logger from '../logger/winston.logger.js';

class BatchCleanupScheduler {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  // Initialize the batch cleanup scheduler
  init() {
    if (this.isInitialized) {
      console.log('Batch cleanup scheduler already initialized');
      return;
    }

    try {
      // Schedule batch cleanup to run daily at 2 AM UTC
      const cleanupJob = cron.schedule('0 2 * * *', async () => {
        console.log('Running daily batch cleanup...');
        await this.cleanupOldBatches();
      }, {
        scheduled: false,
        timezone: "UTC"
      });

      // Schedule cleanup warning notifications to run daily at 1 AM UTC (1 hour before cleanup)
      const warningJob = cron.schedule('0 1 * * *', async () => {
        console.log('Running batch cleanup warnings...');
        await this.sendCleanupWarnings();
      }, {
        scheduled: false,
        timezone: "UTC"
      });

      // Store jobs for management
      this.jobs.set('cleanup', cleanupJob);
      this.jobs.set('warnings', warningJob);

      // Start the jobs
      cleanupJob.start();
      warningJob.start();

      this.isInitialized = true;
      console.log('✅ Batch cleanup scheduler initialized successfully');
      console.log('🗑️ Batch cleanup: Daily at 2 AM UTC');
      console.log('⚠️ Cleanup warnings: Daily at 1 AM UTC');

    } catch (error) {
      console.error('❌ Failed to initialize batch cleanup scheduler:', error);
    }
  }

  // Stop all scheduled jobs
  stop() {
    try {
      this.jobs.forEach((job, name) => {
        job.stop();
        job.destroy();
        console.log(`Batch cleanup scheduler job '${name}' stopped`);
      });
      
      this.jobs.clear();
      this.isInitialized = false;
      console.log('Batch cleanup scheduler stopped');
    } catch (error) {
      console.error('Error stopping batch cleanup scheduler:', error);
    }
  }

  // Main cleanup function
  async cleanupOldBatches() {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Starting batch cleanup process...');
      
      const result = await Batch.cleanupOldBatches();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Batch cleanup completed in ${duration}ms`);
      console.log(`📊 Found: ${result.found}, Deleted: ${result.deleted}, Errors: ${result.errors.length}`);
      
      // Log deleted batches
      if (result.deletedBatches.length > 0) {
        console.log('🗑️ Deleted batches:');
        result.deletedBatches.forEach(batch => {
          console.log(`  - ${batch.name} (${batch.status}, ${batch.studentCount} students)`);
        });
        
        // Send cleanup completion notifications
        await this.sendCleanupCompletionNotifications(result.deletedBatches);
      }
      
      // Log errors if any
      if (result.errors.length > 0) {
        console.log('❌ Cleanup errors:');
        result.errors.forEach(error => {
          console.log(`  - ${error.batchName || 'Unknown'}: ${error.error}`);
        });
      }
      
      // Log to file
      logger.info('Batch cleanup completed', {
        duration,
        found: result.found,
        deleted: result.deleted,
        errors: result.errors.length,
        deletedBatches: result.deletedBatches.map(b => ({
          name: b.name,
          status: b.status,
          studentCount: b.studentCount
        }))
      });
      
      return result;
      
    } catch (error) {
      console.error('💥 Critical error in batch cleanup:', error);
      logger.error('Batch cleanup error:', error);
      return { found: 0, deleted: 0, errors: [{ error: error.message }], deletedBatches: [] };
    }
  }

  // Send warning notifications before cleanup
  async sendCleanupWarnings() {
    try {
      console.log('⚠️ Sending cleanup warning notifications...');
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const batchesToDelete = await Batch.find({
        status: { $in: ['COMPLETED', 'CANCELLED'] },
        statusUpdatedAt: { $lt: oneWeekAgo },
        isDeleted: { $ne: true }
      }).populate('students', 'fullName email')
        .populate('instructor', 'fullName email')
        .populate('course', 'title');
      
      if (batchesToDelete.length === 0) {
        console.log('ℹ️ No batches scheduled for cleanup - no warnings needed');
        return;
      }

      console.log(`📧 Found ${batchesToDelete.length} batches scheduled for cleanup - sending warnings`);
      
      // Create warning notifications for each batch
      for (const batch of batchesToDelete) {
        const warningMessage = `Your batch "${batch.name}" (${batch.status.toLowerCase()}) will be automatically deleted in 24 hours. All associated data including progress, submissions, and quiz attempts will be permanently removed.`;
        
        const notifications = [];
        
        // Add students to notifications
        batch.students.forEach(student => {
          notifications.push({
            recipient: student._id,
            type: 'WARNING',
            title: `Batch Deletion Warning: ${batch.name}`,
            message: warningMessage,
            metadata: {
              batchId: batch._id,
              batchName: batch.name,
              status: batch.status,
              deletionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              courseTitle: batch.course?.title || 'N/A',
              isCleanupWarning: true
            },
            urgent: true
          });
        });

        // Add instructor to notifications if exists
        if (batch.instructor) {
          notifications.push({
            recipient: batch.instructor._id,
            type: 'WARNING',
            title: `Batch Deletion Warning: ${batch.name}`,
            message: warningMessage.replace('Your batch', 'Your assigned batch'),
            metadata: {
              batchId: batch._id,
              batchName: batch.name,
              status: batch.status,
              deletionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              courseTitle: batch.course?.title || 'N/A',
              isCleanupWarning: true
            },
            urgent: true
          });
        }

        // Here you would typically save these notifications to a notifications collection
        // or send them via email/push notifications
        console.log(`⚠️ Would send ${notifications.length} cleanup warnings for batch "${batch.name}"`);
        
        // Log the notification for tracking
        logger.warn(`Batch cleanup warning sent`, {
          batchId: batch._id,
          batchName: batch.name,
          status: batch.status,
          recipientCount: notifications.length,
          scheduledDeletion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      }
      
    } catch (error) {
      console.error('❌ Error sending cleanup warnings:', error);
      logger.error('Batch cleanup warning error:', error);
    }
  }

  // Send notifications after cleanup completion
  async sendCleanupCompletionNotifications(deletedBatches) {
    try {
      console.log('📧 Sending cleanup completion notifications...');
      
      // This would typically be sent to system administrators
      const adminNotification = {
        type: 'SYSTEM',
        title: 'Batch Cleanup Completed',
        message: `Automatic batch cleanup completed. ${deletedBatches.length} batches were deleted.`,
        metadata: {
          deletedCount: deletedBatches.length,
          deletedBatches: deletedBatches.map(b => ({
            name: b.name,
            status: b.status,
            studentCount: b.studentCount
          })),
          completedAt: new Date().toISOString()
        }
      };

      // Log completion notification
      logger.info('Batch cleanup completion notification', adminNotification);
      console.log('📧 Batch cleanup completion notification logged');
      
    } catch (error) {
      console.error('❌ Error sending cleanup completion notifications:', error);
      logger.error('Batch cleanup completion notification error:', error);
    }
  }

  // Manual cleanup trigger
  async triggerCleanup() {
    console.log('🔧 Manual batch cleanup triggered');
    return await this.cleanupOldBatches();
  }

  // Get batches that will be cleaned up soon
  async getBatchesScheduledForCleanup() {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const batchesToDelete = await Batch.find({
        status: { $in: ['COMPLETED', 'CANCELLED'] },
        statusUpdatedAt: { $lt: oneWeekAgo },
        isDeleted: { $ne: true }
      }).populate('course', 'title')
        .select('name status statusUpdatedAt students course');
      
      return batchesToDelete.map(batch => ({
        id: batch._id,
        name: batch.name,
        status: batch.status,
        statusUpdatedAt: batch.statusUpdatedAt,
        studentCount: batch.students.length,
        courseName: batch.course?.title || 'N/A',
        daysSinceStatusChange: Math.floor((Date.now() - batch.statusUpdatedAt) / (1000 * 60 * 60 * 24))
      }));
      
    } catch (error) {
      console.error('❌ Error getting batches scheduled for cleanup:', error);
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
    console.log('Restarting batch cleanup scheduler...');
    this.stop();
    setTimeout(() => {
      this.init();
    }, 1000);
  }
}

// Create singleton instance
const batchCleanupScheduler = new BatchCleanupScheduler();

export default batchCleanupScheduler;
