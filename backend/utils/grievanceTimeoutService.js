import cron from 'node-cron';
import Grievance from '../models/Grievance.js';
import User from '../models/User.js';
import { notifyFacultyOfGrievance } from './emailService.js';

/**
 * Grievance Timeout Notification Service
 * Sends email notifications to faculty when grievances are pending for too long
 */

// Check for grievances pending for 5+ minutes
const check5MinuteGrievances = async () => {
  try {
    console.log('Checking 5-minute pending grievances...');
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const pendingGrievances = await Grievance.find({
      status: 'IN_PROGRESS',
      'timeline.createdAt': { $lte: fiveMinutesAgo },
      'timeline.first5MinNotification': { $ne: true }
    }).populate('assignedFaculty student');

    for (const grievance of pendingGrievances) {
      console.log(`Sending 5-minute notification for grievance ${grievance.grievanceId}`);
      
      // Send email to faculty
      await notifyFacultyOfGrievance(
        grievance.assignedFaculty,
        grievance.student,
        grievance.initialGrievance,
        grievance.aiAnalysis?.synthesizedMessage || grievance.initialGrievance
      );

      // Mark notification as sent
      grievance.timeline.first5MinNotification = true;
      grievance.timeline.lastNotificationAt = new Date();
      await grievance.save();
    }

    if (pendingGrievances.length > 0) {
      console.log(`Sent ${pendingGrievances.length} 5-minute notifications`);
    }
  } catch (error) {
    console.error('5-minute grievance check error:', error);
  }
};

// Check for grievances pending for 10+ minutes
const check10MinuteGrievances = async () => {
  try {
    console.log('Checking 10-minute pending grievances...');
    
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const pendingGrievances = await Grievance.find({
      status: 'IN_PROGRESS',
      'timeline.createdAt': { $lte: tenMinutesAgo },
      'timeline.first10MinNotification': { $ne: true }
    }).populate('assignedFaculty student');

    for (const grievance of pendingGrievances) {
      console.log(`Sending 10-minute notification for grievance ${grievance.grievanceId}`);
      
      // Send urgent email to faculty
      await notifyFacultyOfGrievance(
        grievance.assignedFaculty,
        grievance.student,
        grievance.initialGrievance,
        grievance.aiAnalysis?.synthesizedMessage || grievance.initialGrievance
      );

      // Mark notification as sent
      grievance.timeline.first10MinNotification = true;
      grievance.timeline.lastNotificationAt = new Date();
      await grievance.save();
    }

    if (pendingGrievances.length > 0) {
      console.log(`Sent ${pendingGrievances.length} 10-minute notifications`);
    }
  } catch (error) {
    console.error('10-minute grievance check error:', error);
  }
};

// Schedule the checks to run every minute
export const startGrievanceTimeoutService = () => {
  console.log('Starting grievance timeout notification service...');
  
  // Run every minute to check for 5-minute pending grievances
  cron.schedule('* * * * *', check5MinuteGrievances);
  
  // Run every minute to check for 10-minute pending grievances  
  cron.schedule('* * * * *', check10MinuteGrievances);
  
  console.log('Grievance timeout service started - checking every minute');
};

export default {
  startGrievanceTimeoutService,
  check5MinuteGrievances,
  check10MinuteGrievances
};
