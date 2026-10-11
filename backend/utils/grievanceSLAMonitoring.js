/**
 * GRIEVANCE SLA MONITORING SERVICE
 * 
 * This service monitors grievance resolution timelines and triggers
 * notifications at 24h and 48h marks if not resolved.
 * 
 * In production, this can be replaced with n8n workflows,
 * but this provides local scheduling capability.
 */

import cron from "node-cron";
import Grievance from "../models/Grievance.js";
import User from "../models/User.js";
import nodemailer from "nodemailer";

// Configure email service (update with your email provider)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Send notification via multiple channels
 * Email is default, can be extended for SMS, WhatsApp, etc.
 */
const sendNotification = async (
  recipientEmail,
  recipientPhone,
  subject,
  message,
  type = "email"
) => {
  try {
    if (type === "email") {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Grievance SLA Notification</h2>
            <p>${message}</p>
            <hr style="margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">
              This is an automated message from Skillify AI Grievance Management System
            </p>
          </div>
        `,
      });
      console.log(`Email sent to ${recipientEmail}`);
    }
    // SMS and WhatsApp integration would go here
    // Using providers like Twilio, Nexmo, etc.

    return { success: true, channel: type };
  } catch (error) {
    console.error(`Failed to send ${type} notification:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Check 24-hour grievances
 * Runs every 1 hour
 */
export const check24HourGrievances = async () => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);

    // Find pending grievances created more than 24 hours ago that haven't been notified yet
    const grievances24h = await Grievance.find({
      status: "PENDING",
      "timeline.createdAt": {
        $lt: new Date(now - 24 * 60 * 60 * 1000),
      },
      "timeline.notification24hSentAt": null,
    })
      .populate("assignedFaculty", "fullName email phone")
      .populate("student", "fullName");

    console.log(
      `Found ${grievances24h.length} grievances pending for 24+ hours`
    );

    for (const grievance of grievances24h) {
      const message24h = `
        <strong>Grievance Reminder - SLA 24 Hours</strong><br/>
        The grievance from ${grievance.student.fullName} is still pending for 24+ hours.
        <br/>Grievance: ${grievance.initialGrievance}
        <br/>Please review and take action.
      `;

      // Notify faculty
      await sendNotification(
        grievance.assignedFaculty.email,
        grievance.assignedFaculty.phone,
        "Grievance SLA Alert - 24 Hours Pending",
        message24h,
        "email"
      );

      // Update timestamp
      grievance.timeline.notification24hSentAt = new Date();
      await grievance.save();

      // Emit socket notification if available
      if (global.io) {
        global.io.emit(`faculty_${grievance.assignedFaculty._id}`, {
          event: "sla_24h_warning",
          grievanceId: grievance._id,
          message:
            "Grievance is pending for 24+ hours. Please take action.",
        });
      }
    }
  } catch (error) {
    console.error("24h Grievance Check Error:", error);
  }
};

/**
 * Check 48-hour grievances
 * Runs every 2 hours
 */
export const check48HourGrievances = async () => {
  try {
    const now = new Date();

    // Find pending grievances created more than 48 hours ago that haven't been escalated
    const grievances48h = await Grievance.find({
      status: "PENDING",
      "timeline.createdAt": {
        $lt: new Date(now - 48 * 60 * 60 * 1000),
      },
      "escalation.escalatedToParent": false,
    })
      .populate("assignedFaculty", "fullName email phone")
      .populate("student", "fullName email")
      .populate("parentUser", "fullName email phone");

    console.log(
      `Found ${grievances48h.length} grievances pending for 48+ hours`
    );

    for (const grievance of grievances48h) {
      const message48hFaculty = `
        <strong>URGENT: Grievance Escalation Warning - SLA 48 Hours</strong><br/>
        The grievance from ${grievance.student.fullName} has been pending for 48+ hours.
        <br/>Grievance: ${grievance.initialGrievance}
        <br/>This case will be escalated to parent/guardian if not resolved immediately.
      `;

      // Notify faculty again (urgent)
      await sendNotification(
        grievance.assignedFaculty.email,
        grievance.assignedFaculty.phone,
        "🚨 URGENT: Grievance Escalation Warning - 48 Hours",
        message48hFaculty,
        "email"
      );

      // Escalate to parent if exists
      if (grievance.parentUser) {
        const message48hParent = `
          <strong>Grievance Escalation - SLA Breach (48 Hours)</strong><br/>
          Your child's grievance has not been resolved within the 48-hour service level agreement.
          <br/>Grievance: ${grievance.initialGrievance}
          <br/>Faculty: ${grievance.assignedFaculty.fullName}
          <br/>Please contact administration for further assistance.
        `;

        // Notify parent
        await sendNotification(
          grievance.parentUser.email,
          grievance.parentUser.phone,
          "Grievance Escalation - Immediate Action Required",
          message48hParent,
          "email"
        );

        // Update escalation status
        grievance.escalation.escalatedToParent = true;
        grievance.escalation.escalatedAt = new Date();
        grievance.escalation.parentNotifiedAt = new Date();

        // Emit socket to parent
        if (global.io) {
          global.io.emit(`parent_${grievance.parentUser._id}`, {
            event: "grievance_escalated",
            grievanceId: grievance._id,
            studentGrievance: grievance.initialGrievance,
            message: "Your child's grievance has been escalated to you.",
          });
        }
      }

      // Emit socket notification to faculty
      if (global.io) {
        global.io.emit(`faculty_${grievance.assignedFaculty._id}`, {
          event: "sla_48h_escalation",
          grievanceId: grievance._id,
          message: "URGENT: Grievance pending for 48+ hours. Escalating to parent.",
          escalatedToParent: !!grievance.parentUser,
        });
      }

      grievance.timeline.notification48hSentAt = new Date();
      await grievance.save();
    }
  } catch (error) {
    console.error("48h Grievance Check Error:", error);
  }
};

/**
 * Initialize cron jobs for SLA monitoring
 */
export const initializeSLAMonitoring = () => {
  console.log("Initializing Grievance SLA Monitoring...");

  // Check 24-hour grievances every 1 hour
  cron.schedule("0 * * * *", async () => {
    console.log("Running 24-hour grievance check...");
    await check24HourGrievances();
  });

  // Check 48-hour grievances every 2 hours
  cron.schedule("0 */2 * * *", async () => {
    console.log("Running 48-hour grievance check...");
    await check48HourGrievances();
  });

  console.log("✅ Grievance SLA Monitoring initialized");
};

export default {
  check24HourGrievances,
  check48HourGrievances,
  initializeSLAMonitoring,
};
