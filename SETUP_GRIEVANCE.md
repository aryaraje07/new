# Grievance Management System - Complete Setup Guide

## 🎯 Feature Overview

The Grievance Management System allows students to submit academic grievances that are:
1. Analyzed by **agentic AI** for validity
2. Processed through **structured follow-up questions**
3. Converted to **professional messages** automatically
4. Sent to **assigned faculty** for resolution
5. Monitored with **SLA tracking** (24h, 48h escalation)
6. Communicated in **real-time** using **Socket.io**
7. Escalated to **parents** if unresolved after 48 hours

---

## 📋 Prerequisites

- Node.js 16+ and npm
- MongoDB 5.0+
- Redis (optional but recommended for Socket.io)
- Cloudinary account (for file uploads)
- Gemini AI API key
- Email service credentials (Gmail, SendGrid, or AWS SES)
- Optional: n8n for advanced workflow automation

---

## 🚀 Installation & Setup

### 1. Backend Setup

#### Step 1.1: Install Dependencies

```bash
cd backend
npm install
```

**Key dependencies added for grievance feature:**
```bash
npm install node-cron nodemailer socket.io
```

#### Step 1.2: Environment Variables

Add to `.env` file:

```env
# EXISTING VARIABLES (keep these)
MONGODB_URI=mongodb://...
GEMINI_API_KEY=your_gemini_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_secret
CLIENT_URL=http://localhost:3000

# NEW VARIABLES FOR GRIEVANCE FEATURE
SOCKET_URL=http://localhost:3000
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
NODE_ENV=development
PORT=3000
```

**Email Setup (Gmail Example):**
1. Enable 2FA on Gmail
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use App Password in `EMAIL_PASSWORD`

#### Step 1.3: Verify Installation

```bash
# Check if Node modules are installed
ls node_modules

# Test MongoDB connection
npm run test:db
```

---

### 2. Frontend Setup

#### Step 2.1: Install Dependencies

```bash
cd frontend
npm install
# or
pnpm install
```

#### Step 2.2: Environment Variables

Add to `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

#### Step 2.3: Add Routes to Sidebar

**Student Sidebar** (`frontend/components/student/sidebar.tsx`):
```typescript
{
  label: "Grievances",
  href: "/student/grievances",
  icon: <AlertIcon />
}
```

**Faculty Sidebar** (`frontend/components/faculty/sidebar.tsx`):
```typescript
{
  label: "Grievance Review",
  href: "/faculty/grievances",
  icon: <ChecklistIcon />
}
```

**Parent Sidebar** (`frontend/components/parent/sidebar.tsx`):
```typescript
{
  label: "Escalated Issues",
  href: "/parent/grievances",
  icon: <AlertTriangleIcon />
}
```

#### Step 2.4: Create Page Routes

**Student Grievance Page** (`frontend/app/student/grievances/page.tsx`):
```typescript
import GrievanceSubmission from "@/components/student/GrievanceSubmission";
import GrievanceList from "@/components/student/GrievanceList";

export default function GrievancesPage() {
  const [view, setView] = useState("list");
  return (
    <>
      {view === "submit" ? (
        <GrievanceSubmission />
      ) : (
        <GrievanceList />
      )}
    </>
  );
}
```

---

## 🔧 Running the Application

### Terminal 1: Start Backend
```bash
cd backend
npm start
# or with nodemon for development
npm run dev
```

Expected output:
```
🚀 Server running on port 3000
🔌 Socket.io enabled for real-time communication
✅ Grievance SLA Monitoring initialized
```

### Terminal 2: Start Frontend
```bash
cd frontend
npm run dev
# or
pnpm dev
```

Expected output:
```
▲ Next.js 14.0.0
- Local: http://localhost:3000
```

---

## 🧪 Testing the Feature

### Test 1: Submit a Grievance (Student)

1. Login as student
2. Navigate to "Grievances" tab
3. Select faculty and describe grievance: "I am not satisfied with today's test marks"
4. Click "Submit Grievance"
5. Expected: AI validates and shows 3 follow-up questions

### Test 2: Answer Follow-up Questions (Student)

1. Answer all 3 questions provided
2. Click "Process & Submit"
3. Expected: Success message and grievance sent to faculty

### Test 3: Check Assigned Grievances (Faculty)

1. Login as faculty
2. Navigate to "Grievance Review" tab
3. Expected: See list of grievances with student info
4. Click on grievance to view synthesized message

### Test 4: Send Message (Faculty → Student)

1. In grievance detail, type message in chat box
2. Click "Send Message"
3. Expected: Student gets real-time notification (Socket.io)

### Test 5: Mark as Solved (Faculty)

1. Click "Mark Grievance as Solved" button
2. Expected: Student gets verification popup

### Test 6: Verify Resolution (Student)

1. Student receives popup asking if resolved
2. Click "Resolved" or "Still Pending"
3. Expected: Grievance status updates

### Test 7: Check SLA Notifications

Wait 24 hours (or modify timestamp for testing) to see:
- Faculty gets 24h reminder email
- If still pending after 48h, parent gets escalation email

---

## 📁 Project Structure

```
SkillifyAI/
├── backend/
│   ├── models/
│   │   ├── Grievance.js (NEW)
│   │   └── GrievanceChat.js (NEW)
│   ├── controllers/
│   │   └── grievanceController.js (NEW)
│   ├── routes/
│   │   └── grievanceRoutes.js (NEW)
│   ├── utils/
│   │   ├── grievanceAIService.js (NEW)
│   │   ├── grievanceSLAMonitoring.js (NEW)
│   │   └── cloudinaryUpload.js (NEW)
│   ├── server.js (MODIFIED - added Socket.io)
│   ├── N8N_WORKFLOW_GUIDE.md (NEW)
│   └── GRIEVANCE_API_DOCS.md (NEW)
│
└── frontend/
    ├── components/
    │   ├── student/
    │   │   ├── GrievanceSubmission.tsx (NEW)
    │   │   └── GrievanceList.tsx (NEW)
    │   ├── faculty/
    │   │   └── GrievanceReview.tsx (NEW)
    │   └── parent/
    │       └── GrievanceEscalation.tsx (NEW)
    └── app/
        ├── student/
        │   └── grievances/
        │       └── page.tsx (NEW)
        ├── faculty/
        │   └── grievances/
        │       └── page.tsx (NEW)
        └── parent/
            └── grievances/
                └── page.tsx (NEW)
```

---

## 🔌 Socket.io Event Flow

```
User connects → Joins role-specific room
                ↓
Faculty messages student → Socket emits "faculty_message"
                           ↓
                    Student gets popup
                           ↓
                    Socket hears "faculty_message"

Student verifies resolution → Socket emits "resolution_verification"
                              ↓
                       Faculty gets update
```

---

## 📊 Database Schema Overview

### Grievance Document
```javascript
{
  _id: ObjectId,
  student: ObjectId (ref: User),
  assignedFaculty: ObjectId (ref: User),
  parentUser: ObjectId (ref: User),
  initialGrievance: String,
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
  aiAnalysis: {
    isValid: Boolean,
    synthesizedMessage: String,
    followUpQuestions: [String],
    studentAnswers: [{question: String, answer: String}]
  },
  resolution: {
    solvedBy: ObjectId,
    studentVerified: Boolean,
    resolvedAt: Date
  },
  timeline: {
    createdAt: Date,
    notification24hSentAt: Date,
    notification48hSentAt: Date
  },
  escalation: {
    escalatedToParent: Boolean,
    escalatedAt: Date,
    parentNotifiedAt: Date
  }
}
```

### GrievanceChat Document
```javascript
{
  _id: ObjectId,
  grievance: ObjectId (ref: Grievance),
  sender: ObjectId (ref: User),
  senderRole: "student" | "faculty",
  message: String,
  messageType: "TEXT" | "FILE" | "SYSTEM",
  attachments: [{fileName, fileUrl, fileType}],
  readBy: [{user: ObjectId, readAt: Date}],
  notificationSent: Boolean
}
```

---

## 🤖 AI Integration Details

### Agentic AI Process

The AI works in ONE complete call with multiple reasoning steps:

**Input:**
```
Initial grievance: "I am not satisfied with today's test marks"
Student name: "John Doe"
```

**Step 1: Validation**
- Is this about academics? → YES
- Is it legitimate? → YES
- Is it clear? → PARTIALLY - needs clarification

**Step 2: Generate Questions**
```
Q1: What was the test topic and subject?
Q2: How many marks were expected vs received?
Q3: Where do you think there is a mistake?
```

**Step 3: Process Answers**
```
A1: Physics - Chapter 5: Mechanics
A2: Expected 85, got 65 (lost 20 marks)
A3: Question 7 calculation seems wrong
```

**Step 4: Synthesize Message**
```
"Dear Faculty,

I have concerns regarding my recent Physics test (Chapter 5: Mechanics).
Expected marks: 85 | Received: 65

Specific concern: The calculation in Question 7 appears to be marked
incorrectly. Could you please review and provide clarification?

Thank you for your attention.
Best regards, John Doe"
```

---

## ⏰ SLA Timeline

```
T+0h    → Grievance submitted
          ↓
T+24h   → Faculty gets reminder if still PENDING
          ↓
T+48h   → Grievance escalated to parent
          Faculty gets urgent notification
          Parent gets notification
          ↓
T+7d    → Feedback request sent to student (if resolved)
```

---

## 🔐 Security Considerations

1. **Authentication**: All endpoints require JWT token
2. **Authorization**: Students can only see their own grievances
3. **File uploads**: Validated through Multer + Cloudinary
4. **Data privacy**: Encrypted sensitive information
5. **Rate limiting**: Prevent grievance spam
6. **Audit logs**: All actions logged in database

---

## 🐛 Troubleshooting

### Issue: Socket.io not connecting

**Solution:**
```bash
# Check if Socket.io is initialized
# In server.js, verify: global.io = io

# Check CORS settings
# Ensure CLIENT_URL in .env matches frontend URL
```

### Issue: Emails not sending

**Solution:**
```bash
# Verify Gmail app password
# Check EMAIL_USER and EMAIL_PASSWORD in .env
# Check spam/promotions folder

# Test with:
curl -X POST http://localhost:3000/api/grievance/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"grievanceText":"test","assignedFacultyId":"id"}'
```

### Issue: AI not validating grievance

**Solution:**
```bash
# Check GEMINI_API_KEY in .env
# Verify API key is active
# Check rate limits on Gemini API
# Review console logs for error details
```

---

## 📚 Additional Resources

- [API Documentation](./GRIEVANCE_API_DOCS.md)
- [n8n Workflow Guide](./N8N_WORKFLOW_GUIDE.md)
- [Socket.io Official Docs](https://socket.io/docs/)
- [Gemini API Docs](https://ai.google.dev/docs)

---

## 🚢 Deployment Checklist

- [ ] Environment variables configured
- [ ] MongoDB connection verified
- [ ] Cloudinary configured
- [ ] Email service configured
- [ ] Socket.io working
- [ ] Frontend built and tested
- [ ] Backend running on production port
- [ ] HTTPS/SSL enabled
- [ ] Rate limiting configured
- [ ] Error logging set up
- [ ] Backup strategy in place
- [ ] n8n workflows deployed (optional)

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review logs in `backend/logs/`
3. Check Socket.io connection status
4. Verify all environment variables
5. Contact development team with:
   - Error message
   - Backend logs
   - Socket.io connection status
   - Reproducible steps

---

**Setup Status:** ✅ Complete
**Last Updated:** February 2026
**Version:** 1.0.0
