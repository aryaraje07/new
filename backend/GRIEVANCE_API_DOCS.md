# Grievance Management System - API Documentation

## Base URL
```
http://localhost:3000/api/grievance
```

---

## STUDENT ENDPOINTS

### 1. Submit Grievance
**POST** `/submit`

Submit an initial grievance with faculty selection. AI validates and generates follow-up questions.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "grievanceText": "I am not satisfied with today's test marks",
  "assignedFacultyId": "faculty_id_here"
}
```

**Response (Success):**
```json
{
  "message": "Grievance created successfully",
  "grievanceId": "grievance_id",
  "followUpQuestions": [
    "What was the test topic and subject?",
    "How many marks were expected vs received?",
    "Where do you think there is a mistake?"
  ],
  "nextStep": "Please answer the follow-up questions"
}
```

**Response (Invalid Grievance):**
```json
{
  "message": "Grievance validation failed",
  "reason": "Grievance text is too vague or not related to academics",
  "canResubmit": true
}
```

---

### 2. Submit Follow-up Answers
**POST** `/:grievanceId/answers`

Submit answers to follow-up questions. AI synthesizes final message and sends to faculty.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "answers": [
    "The test was on Physics Chapter 5: Mechanics",
    "Expected 85 marks, got 65 marks",
    "I believe the calculation in question 7 was marked wrong"
  ]
}
```

**Response:**
```json
{
  "message": "Answers submitted successfully",
  "synthesizedMessage": "Professional message sent to faculty",
  "keyPoints": ["point1", "point2", "point3"],
  "facultyNotified": true
}
```

---

### 3. Get Student's Grievances
**GET** `/student/list`

Get all grievances submitted by the student.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
```
?status=PENDING  // Optional: PENDING, IN_PROGRESS, RESOLVED, CLOSED
```

**Response:**
```json
{
  "message": "Grievances retrieved",
  "count": 3,
  "grievances": [
    {
      "_id": "grievance_id",
      "student": "student_id",
      "assignedFaculty": { "fullName": "Dr. Kumar", "email": "..." },
      "status": "PENDING",
      "initialGrievance": "...",
      "timeline": { "createdAt": "2026-02-20T..." }
    }
  ]
}
```

---

### 4. Get Grievance Details
**GET** `/:grievanceId/details`

Get detailed information about a specific grievance.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Grievance details retrieved",
  "grievance": {
    "_id": "grievance_id",
    "student": { "fullName": "John", "email": "..." },
    "assignedFaculty": { "fullName": "Dr. Kumar", "email": "..." },
    "status": "IN_PROGRESS",
    "initialGrievance": "...",
    "aiAnalysis": {
      "isValid": true,
      "synthesizedMessage": "..."
    },
    "resolution": { ... },
    "timeline": { ... }
  }
}
```

---

### 5. Send Chat Message (Student)
**POST** `/:grievanceId/chat`

Send a message or file to faculty.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Form Data:**
```
message: "Your message text here"
file: <binary_file> (optional)
```

**Response:**
```json
{
  "message": "Message sent successfully",
  "chatMessage": {
    "_id": "chat_id",
    "sender": { "fullName": "John", "email": "..." },
    "senderRole": "student",
    "message": "Your message",
    "attachments": [],
    "createdAt": "2026-02-20T..."
  }
}
```

---

### 6. Verify Resolution
**POST** `/:grievanceId/verification`

Student verifies whether the grievance is resolved.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "resolved": true  // or false if still pending
}
```

**Response:**
```json
{
  "message": "Grievance marked as resolved",
  "status": "RESOLVED"
}
```

---

### 7. Get Chat Messages
**GET** `/:grievanceId/chat`

Get all chat messages for a grievance (sorted by creation time).

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Chat messages retrieved",
  "count": 5,
  "chatMessages": [
    {
      "_id": "chat_id",
      "sender": { "fullName": "Dr. Kumar", "email": "..." },
      "senderRole": "faculty",
      "message": "I have reviewed your case...",
      "attachments": [],
      "createdAt": "2026-02-20T..."
    }
  ]
}
```

---

## FACULTY ENDPOINTS

### 1. Get Assigned Grievances
**GET** `/faculty/list`

Get all grievances assigned to the faculty member.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
```
?status=PENDING  // Optional filter
```

**Response:**
```json
{
  "message": "Grievances retrieved",
  "count": 12,
  "grievances": [ ... ]
}
```

---

### 2. Mark Grievance as Solved
**POST** `/:grievanceId/mark-solved`

Faculty marks a grievance as solved. Student gets verification popup.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Grievance marked for verification",
  "grievanceId": "grievance_id"
}
```

---

### 3. Send Chat Message (Faculty)
**POST** `/:grievanceId/faculty-message`

Send message or file to student.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Form Data:**
```
message: "Your response to student"
file: <binary_file> (optional)
```

**Response:**
```json
{
  "message": "Message sent successfully",
  "chatMessage": { ... }
}
```

---

### 4. Upload Resolution File
**POST** `/:grievanceId/upload-resolution`

Upload supporting files/documents for resolution.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Form Data:**
```
file: <binary_file>
```

**Response:**
```json
{
  "message": "File uploaded successfully",
  "attachment": {
    "fileName": "report.pdf",
    "fileUrl": "https://cloudinary.com/...",
    "uploadedAt": "2026-02-20T..."
  }
}
```

---

## PARENT ENDPOINTS

### 1. Get Escalated Grievances
**GET** `/parent/escalated`

Get all grievances escalated to the parent (48h+ pending).

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Escalated grievances retrieved",
  "count": 2,
  "grievances": [
    {
      "_id": "grievance_id",
      "student": { "fullName": "John", "email": "..." },
      "assignedFaculty": { "fullName": "Dr. Kumar", "email": "..." },
      "status": "PENDING",
      "initialGrievance": "...",
      "escalation": {
        "escalatedToParent": true,
        "escalatedAt": "2026-02-20T..."
      }
    }
  ]
}
```

---

## ERROR RESPONSES

All error responses follow this format:

**400 Bad Request:**
```json
{
  "message": "Error message",
  "error": "Additional error details"
}
```

**401 Unauthorized:**
```json
{
  "message": "Not authorized"
}
```

**403 Forbidden:**
```json
{
  "message": "Not authorized - insufficient permissions"
}
```

**404 Not Found:**
```json
{
  "message": "Resource not found"
}
```

**500 Server Error:**
```json
{
  "message": "Server error occurred",
  "error": "Error details"
}
```

---

## SOCKET.IO EVENTS

### Client-side Events to Emit

```javascript
// Join room on connect
socket.emit("join_room", {
  userId: "user_id",
  role: "student"  // or "faculty" or "parent"
});

// Notify of grievance update
socket.emit("grievance_update", {
  recipientId: "user_id",
  role: "faculty",
  event: "new_grievance",
  payload: { ... }
});
```

### Server-side Events to Listen

```javascript
// New grievance submitted
socket.on("grievance_notification", (data) => {
  console.log(data.event, data.payload);
});

// Student message received
socket.on("student_message", (data) => {
  console.log("Message from:", data.studentName);
});

// Faculty message received
socket.on("faculty_message", (data) => {
  console.log("Response from faculty:", data.chatMessage);
});

// Resolution verification request
socket.on("grievance_solved_verification", (data) => {
  console.log("Faculty marked as solved, verify if resolved");
});

// SLA warnings
socket.on("sla_24h_warning", (data) => {
  console.log("Grievance pending for 24+ hours");
});

socket.on("sla_48h_escalation", (data) => {
  console.log("Grievance escalated to parent");
});
```

---

## AGENTIC AI FLOW

The AI processes grievances in 3 stages:

1. **Validation & Questions**
   - Input: Initial grievance text
   - Output: Is valid? + 3 follow-up questions
   - Single API call triggers this

2. **Student Answers**
   - Input: 3 answers from student
   - Output: Synthesized professional message

3. **Faculty Notification**
   - AI-formatted message sent to faculty
   - Faculty receives professional, structured grievance

---

## RATE LIMITING

Current rate limits (can be configured):
- Per student: 1 grievance per hour max
- Per faculty: No limit on receiving
- Per parent: No limit on viewing

---

## AUTHENTICATION

All endpoints require JWT token in Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## PAGINATION (Future Enhancement)

```
GET /student/list?page=1&limit=10
```

Response includes:
```json
{
  "message": "...",
  "count": 150,
  "total": 150,
  "page": 1,
  "pages": 15,
  "grievances": [ ... ]
}
```

---

## FILE UPLOAD LIMITS

- Max file size: 10MB per file
- Supported formats: PDF, DOC, DOCX, JPG, PNG, XLS, XLSX
- Files stored on Cloudinary

---

## STATUS CODES REFERENCE

| Code | Status | Meaning |
|------|--------|---------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Permission denied |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Internal error |

---

**Last Updated:** February 2026
**Version:** 1.0
