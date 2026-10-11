# Grievance Management System - n8n Integration Guide

## Overview

This guide explains how to set up n8n workflows for background automation, SLA monitoring, and escalation in the Skillify AI Grievance Management System.

**Alternative:** For immediate deployment without n8n, the system includes a local Node.js-based SLA monitoring service (`grievanceSLAMonitoring.js`) that performs the same function.

---

## n8n Setup Instructions

### 1. Installation & Configuration

1. **Install n8n** (if not already installed):
   ```bash
   npm install -g n8n
   ```

2. **Start n8n**:
   ```bash
   n8n
   ```
   Access at: `http://localhost:5678`

3. **Configure n8n environment**:
   - Set up MongoDB connection for n8n database
   - Configure webhook URLs pointing to your SkillifyAI backend
   - Add API credentials securely

---

## Workflow 1: 24-Hour Grievance Reminder

### Purpose
Monitor grievances pending for 24+ hours and notify assigned faculty.

### Workflow Configuration

**Trigger:** Cron Job (Runs every 1 hour)

```
Cron: 0 * * * * (every hour at minute 0)
```

**Steps:**

1. **MongoDB Query Step**
   - Collection: `grievances`
   - Query:
     ```javascript
     {
       "status": "PENDING",
       "timeline.createdAt": {
         $lt: new Date(Date.now() - 24 * 60 * 60 * 1000)
       },
       "timeline.notification24hSentAt": null
     }
     ```

2. **Filter & Process**
   - For each grievance found, extract:
     - Faculty email
     - Student name
     - Grievance text
     - Created timestamp

3. **Send Email Notification**
   - Use Gmail/SMTP node
   - Template:
     ```
     Subject: "Grievance SLA Alert - 24 Hours Pending"
     
     Dear [Faculty Name],
     
     The following grievance has been pending for 24+ hours:
     
     Student: [Student Name]
     Submitted: [Date & Time]
     Issue: [Grievance Text]
     
     Please review and take appropriate action.
     
     Best regards,
     Skillify AI Team
     ```

4. **Update MongoDB**
   - Update grievance with:
     ```javascript
     { 
       $set: { 
         "timeline.notification24hSentAt": new Date()
       }
     }
     ```

5. **Send Socket Notification** (Optional)
   - HTTP POST to backend webhook
   - Notify faculty in real-time via Socket.io

### Error Handling
- If email fails, log to MongoDB error collection
- Retry up to 3 times with exponential backoff

---

## Workflow 2: 48-Hour Grievance Escalation

### Purpose
Escalate unresolved grievances to faculty again and notify parents after 48 hours.

### Workflow Configuration

**Trigger:** Cron Job (Runs every 2 hours)

```
Cron: 0 */2 * * * (every 2 hours)
```

**Steps:**

1. **MongoDB Query Step**
   - Collection: `grievances`
   - Query:
     ```javascript
     {
       "status": "PENDING",
       "timeline.createdAt": {
         $lt: new Date(Date.now() - 48 * 60 * 60 * 1000)
       },
       "escalation.escalatedToParent": false
     }
     ```

2. **Populate Document**
   - Fetch full student, faculty, and parent information

3. **Send URGENT Email to Faculty**
   - Template:
     ```
     Subject: "🚨 URGENT: Grievance Escalation Warning - 48 Hours"
     
     Dear [Faculty Name],
     
     CRITICAL: A grievance has remained unresolved for 48+ hours:
     
     Student: [Student Name]
     Issue: [Grievance Text]
     Submitted: [Date]
     
     This case is being escalated to parent/guardian.
     Please resolve immediately or provide status update.
     
     URGENT ACTION REQUIRED.
     ```

4. **Send Email to Parent**
   - Template:
     ```
     Subject: "Grievance Escalation - Your Child's Concern Requires Attention"
     
     Dear [Parent Name],
     
     Your child's grievance has not been resolved within 48 hours:
     
     Student: [Child Name]
     Issue: [Grievance Text]
     Assigned Faculty: [Faculty Name]
     
     This issue has been escalated for immediate intervention.
     You will be contacted shortly with updates.
     ```

5. **Update Grievance Status**
   ```javascript
   {
     $set: {
       "escalation.escalatedToParent": true,
       "escalation.escalatedAt": new Date(),
       "escalation.parentNotifiedAt": new Date(),
       "timeline.notification48hSentAt": new Date()
     }
   }
   ```

6. **Send SMS/WhatsApp Notification** (Optional)
   - Use Twilio or similar service
   - Send urgent notification to parent

7. **Create Admin Log**
   - Log all escalations for audit purposes

### Error Handling
- Retry failed notifications
- Log all escalation attempts
- Send admin alert if notifications fail

---

## Workflow 3: Daily Grievance Status Report

### Purpose
Send administrators daily report of all grievances with status breakdown.

### Workflow Configuration

**Trigger:** Cron Job (Runs daily at 8 AM)

```
Cron: 0 8 * * * (every day at 8:00 AM)
```

**Steps:**

1. **MongoDB Aggregation**
   - Count grievances by status
   - Calculate average resolution time
   - Identify overdue grievances

2. **Generate Report**
   - Total grievances: [count]
   - Pending: [count] | In Progress: [count] | Resolved: [count]
   - Overdue (24h+): [count]
   - Overdue (48h+): [count]

3. **Send Email to Admin**
   - Include grievance breakdown
   - Highlight critical cases

---

## Workflow 4: Grievance Feedback Collection

### Purpose
Send automated feedback request 7 days after resolution.

### Workflow Configuration

**Trigger:** Cron Job (Runs daily)

```
Cron: 0 9 * * * (every day at 9:00 AM)
```

**Steps:**

1. **Find Resolved Grievances**
   - Query: grievances resolved 7 days ago
   - Status: "RESOLVED"
   - No feedback yet

2. **Send Feedback Email Template**
   - Feedback link with JWT token
   - Rating scale (1-5)
   - Optional comment field

3. **Track Feedback Submission**
   - Update MongoDB with feedback

---

## n8n Webhook Setup

### Backend Webhook Receiver

Add this endpoint to your backend:

```javascript
// routes/n8nWebhook.js
import express from "express";
import Grievance from "../models/Grievance.js";

const router = express.Router();

router.post("/escalate-grievance", async (req, res) => {
  try {
    const { grievanceId, escalationType } = req.body;
    
    // Update grievance
    await Grievance.findByIdAndUpdate(
      grievanceId,
      {
        $set: {
          "escalation.escalatedToParent": true,
          "escalation.escalatedAt": new Date()
        }
      }
    );

    // Emit Socket notification
    if (global.io) {
      global.io.emit(`grievance_${grievanceId}`, {
        event: "escalated",
        type: escalationType
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### n8n HTTP POST Configuration

1. URL: `https://your-backend.com/api/n8n/escalate-grievance`
2. Authentication: Bearer Token (set in n8n credentials)
3. Body:
   ```json
   {
     "grievanceId": "{{ $node.MongoDB.data[0]._id }}",
     "escalationType": "48h_escalation"
   }
   ```

---

## Multi-Channel Notification Setup

### Email Configuration
- Provider: Gmail, SendGrid, or AWS SES
- Template variables for personalization

### SMS/WhatsApp (Optional)
- Provider: Twilio
- Add phone numbers from User model

### In-App Notifications
- Send via Socket.io from n8n webhook
- Real-time pop-up alerts

---

## Monitoring & Logging

### n8n Monitoring
1. Check execution logs in n8n UI
2. Set up alerts for failed workflows
3. Archive logs for compliance

### Database Monitoring
- Query performance optimization
- Index management
- Backup scheduling

### Error Tracking
- Log all failures
- Alert administrators
- Implement retry logic

---

## Migration from Local Service to n8n

### Steps:
1. Keep `grievanceSLAMonitoring.js` running during transition
2. Deploy n8n workflows
3. Monitor both systems for 24 hours
4. Disable local service once n8n is verified
5. Keep local service as backup

---

## n8n Workflow JSON Templates

### Template 1: 24-Hour Reminder Workflow

```json
{
  "name": "Grievance 24h Reminder",
  "nodes": [
    {
      "parameters": {
        "rule": "0 * * * *"
      },
      "name": "Trigger - Cron",
      "type": "n8n-nodes-base.cron",
      "position": [250, 300]
    },
    {
      "parameters": {
        "operation": "find",
        "mongodbCollection": "grievances",
        "filter": {
          "status": "PENDING",
          "timeline.createdAt": { "$lt": "new Date(Date.now() - 24 * 60 * 60 * 1000)" },
          "timeline.notification24hSentAt": null
        }
      },
      "name": "MongoDB - Query",
      "type": "n8n-nodes-base.mongoDb",
      "position": [450, 300]
    }
  ],
  "connections": {}
}
```

---

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check SMTP credentials
   - Verify email addresses in database
   - Check n8n logs

2. **Workflows not triggering**
   - Verify cron expression
   - Check n8n worker status
   - Review execution history

3. **Socket notifications not working**
   - Verify webhook URL
   - Check backend logs for incoming requests
   - Verify Socket.io connection

### Debug Mode
- Enable debug logging in n8n settings
- Review detailed execution logs
- Test with sample data first

---

## Security Best Practices

1. **API Keys & Credentials**
   - Store in environment variables
   - Rotate periodically
   - Use minimal permissions

2. **Webhook Security**
   - Implement JWT verification
   - Rate limiting
   - IP whitelisting

3. **Data Privacy**
   - Encrypt sensitive data
   - Follow GDPR/CCPA compliance
   - Audit logging

---

## Support & Documentation

- n8n Official Docs: https://docs.n8n.io
- Community Forum: https://community.n8n.io
- Workflow Templates: https://n8n.io/workflows

---

## Local Alternative (Without n8n)

If you prefer not to use n8n, the system includes a built-in SLA monitoring service:

**File:** `backend/utils/grievanceSLAMonitoring.js`

**Initialization:** Called in `server.js` on startup

**Features:**
- ✅ 24-hour grievance monitoring
- ✅ 48-hour escalation to parents
- ✅ Email notifications
- ✅ Socket.io real-time updates
- ✅ Scheduled cron jobs

**To use:** Ensure `node-cron` and `nodemailer` packages are installed and configured.

---

**Last Updated:** February 2026
**Version:** 1.0
