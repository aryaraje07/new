import express from "express";
import Grievance from "../models/Grievance.js";
import GrievanceChat from "../models/GrievanceChat.js";
import User from "../models/User.js";
import { sendGrievanceEmail } from "../utils/emailService.js";
import { uploadFile } from "../utils/cloudinaryUpload.js";
import {
  processGrievanceWithAI,
  synthesizeGrievanceMessage,
  analyzeFacultyContext,
} from "../utils/grievanceAIService.js";

/**
 * STUDENT ENDPOINTS
 */

/*
 * POST: /api/grievance/submit
 * Submit initial grievance with faculty selection
 * Agentic AI processes it in single call
 */
export const submitGrievance = async (req, res) => {
  try {
    const { grievanceText, assignedFacultyId } = req.body;
    const studentId = req.user._id;

    // Validate inputs
    if (!grievanceText || !assignedFacultyId) {
      return res.status(400).json({
        message: "Grievance text and assigned faculty are required",
      });
    }

    // Check if faculty exists
    const faculty = await User.findById(assignedFacultyId);
    if (!faculty || !["faculty", "trainer"].includes(faculty.role)) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Get student details for AI
    const student = await User.findById(studentId);

    // STEP 1: Initial AI Processing (validation & follow-up questions)
    const aiAnalysis = await processGrievanceWithAI(
      grievanceText,
      student.fullName,
      student.email
    );

    if (!aiAnalysis.success) {
      return res.status(500).json({
        message: "AI processing failed",
        error: aiAnalysis.error,
      });
    }

    // If grievance is invalid
    if (!aiAnalysis.analysis.isValid) {
      return res.status(400).json({
        message: "Invalid grievance",
        error: aiAnalysis.analysis.errorMessage || aiAnalysis.analysis.validationReason,
        canResubmit: true,
        isValid: false
      });
    }

    // STEP 2: Create grievance record
    const grievance = new Grievance({
      grievanceId: `GRV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID
      student: studentId,
      assignedFaculty: assignedFacultyId,
      parentUser: student.parentId || null,
      initialGrievance: grievanceText,
      aiAnalysis: {
        isValid: true,
        validationReason: aiAnalysis.analysis.validationReason,
        followUpQuestions: aiAnalysis.analysis.followUpQuestions,
        analyzedAt: new Date(),
      },
      status: "PENDING",
      timeline: {
        createdAt: new Date(),
        lastUpdateAt: new Date(),
      },
    });

    await grievance.save();

    // Return response with follow-up questions for student to answer
    res.status(201).json({
      message: "Grievance created successfully",
      grievanceId: grievance._id,
      followUpQuestions: aiAnalysis.analysis.followUpQuestions,
      nextStep: "Please answer the follow-up questions",
    });
  } catch (error) {
    console.error("Submit Grievance Error:", error);
    res.status(500).json({ message: "Failed to submit grievance", error });
  }
};

/*
 * POST: /api/grievance/:grievanceId/answers
 * Student submits answers to follow-up questions
 * AI synthesizes final message and sends to faculty
 */
export const submitFollowUpAnswers = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const { answers } = req.body; // Array of answers
    const studentId = req.user._id;

    // Validate answers (should be array with 3 answers)
    if (!Array.isArray(answers) || answers.length !== 3) {
      return res.status(400).json({
        message: "Please provide exactly 3 answers",
      });
    }

    // Get grievance
    const grievance = await Grievance.findById(grievanceId).populate(
      "student assignedFaculty"
    );

    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found" });
    }

    // Verify ownership
    if (grievance.student._id.toString() !== studentId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Store answers
    grievance.aiAnalysis.studentAnswers = answers.map((answer, index) => ({
      question: grievance.aiAnalysis.followUpQuestions[index],
      answer,
    }));

    // STEP 3: Synthesize final message using all context
    const synthesis = await synthesizeGrievanceMessage(
      grievance.initialGrievance,
      grievance.aiAnalysis.followUpQuestions,
      answers,
      grievance.student.fullName
    );

    if (!synthesis.success) {
      return res.status(500).json({
        message: "Message synthesis failed",
        error: synthesis.error,
      });
    }

    // Update grievance with synthesized message
    grievance.aiAnalysis.synthesizedMessage =
      synthesis.synthesis.synthesizedMessage;
    grievance.status = "IN_PROGRESS";
    grievance.timeline.lastUpdateAt = new Date();

    await grievance.save();

    // Emit socket event to notify faculty in real-time
    if (global.io) {
      global.io.emit(`faculty_${grievance.assignedFaculty._id}`, {
        event: "new_grievance",
        grievanceId: grievance._id,
        studentName: grievance.student.fullName,
        studentEmail: grievance.student.email,
        initialGrievance: grievance.initialGrievance,
        synthesis: synthesis.synthesis,
      });
    }

    res.json({
      message: "Answers submitted successfully",
      synthesizedMessage: synthesis.synthesis.synthesizedMessage,
      keyPoints: synthesis.synthesis.keyPoints,
      facultyNotified: true,
    });
  } catch (error) {
    console.error("Submit Answers Error:", error);
    res.status(500).json({ message: "Failed to submit answers", error });
  }
};

/*
 * GET: /api/grievance/student/list
 * Get all grievances for student
 */
export const getStudentGrievances = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { status } = req.query;

    console.log(`📋 Fetching grievances for student: ${studentId}`);

    let query = { student: studentId };

    if (status) {
      query.status = status;
    }

    const grievances = await Grievance.find(query)
      .populate("assignedFaculty", "fullName email phone department")
      .populate("student", "fullName email")
      .lean()
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${grievances.length} grievances for student ${studentId}`);

    res.json({
      message: "Grievances retrieved",
      count: grievances.length,
      grievances,
    });
  } catch (error) {
    console.error("❌ Get Student Grievances Error:", error);
    res.status(500).json({ 
      message: "Failed to retrieve grievances", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/*
 * GET: /api/grievance/:grievanceId/details
 * Get detailed grievance information
 */
export const getGrievanceDetails = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const userId = req.user._id;

    const grievance = await Grievance.findById(grievanceId)
      .populate("student", "fullName email phone")
      .populate("assignedFaculty", "fullName email phone department")
      .populate("resolution.solvedBy", "fullName email");

    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found" });
    }

    // Check authorization - student or faculty
    if (
      grievance.student._id.toString() !== userId.toString() &&
      grievance.assignedFaculty._id.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json({
      message: "Grievance details retrieved",
      grievance,
    });
  } catch (error) {
    console.error("Get Grievance Details Error:", error);
    res.status(500).json({ message: "Failed to retrieve grievance", error });
  }
};

/*
 * POST: /api/grievance/:grievanceId/chat
 * Student sends chat message or file
 */
export const sendStudentMessage = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const { message } = req.body;
    const studentId = req.user._id;
    let fileUrl = null;
    let fileName = null;
    let fileType = null;

    // Get grievance
    const grievance = await Grievance.findById(grievanceId);

    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found" });
    }

    // Verify ownership
    if (grievance.student.toString() !== studentId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Handle file upload if present
    if (req.file) {
      const uploadResult = await uploadFile(req.file);
      fileUrl = uploadResult.secure_url;
      fileName = req.file.originalname;
      fileType = req.file.mimetype;
    }

    // Create chat message
    const chatMessage = new GrievanceChat({
      grievance: grievanceId,
      sender: studentId,
      senderRole: "student",
      message: message || null,
      messageType: fileUrl ? "FILE" : "TEXT",
      attachments: fileUrl
        ? [
            {
              fileName,
              fileUrl,
              fileType,
              fileSize: req.file.size,
              uploadedAt: new Date(),
            },
          ]
        : [],
      requiresNotification: true,
    });

    // Mark messages as read
    await GrievanceChat.updateMany(
      {
        grievance: grievanceId,
        "readBy.user": { $ne: studentId },
      },
      {
        $push: {
          readBy: {
            user: studentId,
            readAt: new Date(),
          },
        },
      },
    );

    await chatMessage.save();

    await chatMessage.populate("sender", "fullName");

    // Emit socket event to faculty in real-time
    if (global.io) {
      global.io.emit(`faculty_${grievance.assignedFaculty.toString()}`, {
        event: "student_message",
        grievanceId,
        chatMessage: {
          _id: chatMessage._id,
          message: chatMessage.message,
          messageType: chatMessage.messageType,
          sender: chatMessage.sender.fullName || 'Unknown',
          senderRole: chatMessage.senderRole,
          createdAt: chatMessage.createdAt,
          attachments: chatMessage.attachments || [],
        },
        studentName: req.user.fullName,
        studentEmail: req.user.email,
      });
    }

    res.status(201).json({
      message: "Message sent successfully",
      chatMessage,
    });
  } catch (error) {
    console.error("Send Student Message Error:", error);
    res.status(500).json({ message: "Failed to send message", error });
  }
};

/*
 * POST: /api/grievance/:grievanceId/verification
 * Student verifies if grievance is solved
 */
export const verifyResolution = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const { resolved } = req.body;
    const studentId = req.user._id;

    const grievance = await Grievance.findById(grievanceId);
    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found" });
    }

    // Verify ownership
    if (grievance.student.toString() !== studentId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Update resolution status
    grievance.resolution.studentVerified = resolved;
    grievance.resolution.timestamp = new Date();
    grievance.status = resolved ? "RESOLVED" : "IN_PROGRESS";
    grievance.timeline.lastUpdateAt = new Date();

    await grievance.save();

    // Emit socket event to faculty about student's decision
    if (global.io) {
      global.io.emit(`faculty_${grievance.assignedFaculty.toString()}`, {
        event: "student_resolution_confirmation",
        grievanceId,
        message: resolved 
          ? `Student has confirmed the grievance is resolved.`
          : `Student has confirmed the grievance is NOT resolved and requires further attention.`,
        studentDecision: resolved,
        studentName: req.user.fullName,
        studentEmail: req.user.email,
      });
    }

    // Emit socket event to student for verification popup
    if (global.io) {
      global.io.emit(`student_${grievance.student.toString()}`, {
        event: "grievance_solved_verification",
        grievanceId,
        message: `Grievance #${grievanceId} marked as resolved. Please verify if it has been resolved to your satisfaction.`,
      });
    }

    res.json({
      message: resolved ? "Grievance marked as resolved!" : "Grievance still marked as pending",
    });
  } catch (error) {
    console.error("Verify Resolution Error:", error);
    res.status(500).json({ message: "Failed to verify resolution", error });
  }
};

/*
 * GET: /api/grievance/:grievanceId/chat
 * Get all chat messages for a grievance
 */
export const getGrievanceChat = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const userId = req.user._id;

    const grievance = await Grievance.findById(grievanceId);
    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found" });
    }

    // Verify authorization
    if (
      grievance.student.toString() !== userId.toString() &&
      grievance.assignedFaculty.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const chatMessages = await GrievanceChat.find({ grievance: grievanceId })
      .populate("sender", "fullName")
      .sort({ createdAt: 1 });

    // Convert sender object to string name for frontend
    const formattedMessages = chatMessages.map(msg => ({
      ...msg.toObject(),
      sender: msg.sender.fullName || 'Unknown'
    }));

    // Mark messages as read
    await GrievanceChat.updateMany(
      {
        grievance: grievanceId,
        "readBy.user": { $ne: userId },
      },
      {
        $push: {
          readBy: {
            user: userId,
            readAt: new Date(),
          },
        },
      },
    );

    res.json({
      message: "Chat messages retrieved",
      chatMessages: formattedMessages,
    });
  } catch (error) {
    console.error("Get Chat Messages Error:", error);
    res.status(500).json({ message: "Failed to retrieve chat messages", error });
  }
};

/**
 * FACULTY ENDPOINTS
 */

/*
 * GET: /api/grievance/faculty/list
 * Get all grievances assigned to faculty
 */
export const getFacultyGrievances = async (req, res) => {
  try {
    const facultyId = req.user._id;
    const { status } = req.query;

    console.log(`📋 Fetching grievances for faculty: ${facultyId}`);

    let query = { assignedFaculty: facultyId };
    if (status) {
      query.status = status;
    }

    const grievances = await Grievance.find(query)
      .populate("student", "fullName email phone")
      .populate("assignedFaculty", "fullName email phone department")
      .lean()
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${grievances.length} grievances for faculty ${facultyId}`);

    res.json({
      message: "Faculty grievances retrieved",
      count: grievances.length,
      grievances,
    });
  } catch (error) {
    console.error("❌ Get Faculty Grievances Error:", error);
    res.status(500).json({ 
      message: "Failed to retrieve grievances", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/*
 * POST: /api/grievance/:grievanceId/faculty-message
 * Faculty sends chat message or file
 */
export const sendFacultyMessage = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const { message } = req.body;
    const facultyId = req.user._id;

    const grievance = await Grievance.findById(grievanceId);
    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found" });
    }

    // Verify authorization
    if (
      grievance.student.toString() !== facultyId.toString() &&
      grievance.assignedFaculty.toString() !== facultyId.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Create chat message
    let attachments = [];
    let messageType = "TEXT";

    // Handle file upload
    if (req.file) {
      try {
        const uploadResult = await uploadFile(req.file, "grievance-chat");
        attachments = [
          {
            fileName: req.file.originalname,
            fileUrl: uploadResult.secure_url,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedAt: new Date(),
          },
        ];
        messageType = "FILE";
      } catch (uploadError) {
        console.error("File upload error:", uploadError);
        return res.status(500).json({ message: "Failed to upload file" });
      }
    }

    const chatMessage = new GrievanceChat({
      grievance: grievanceId,
      sender: facultyId,
      senderRole: "faculty",
      message: message,
      messageType: messageType,
      attachments: attachments,
      requiresNotification: true,
    });

    await chatMessage.save();

    await chatMessage.populate("sender", "fullName");

    // Update grievance with faculty activity
    grievance.timeline.facultyReviewedAt = new Date();
    await grievance.save();

    // Emit socket event to student in real-time
    if (global.io) {
      global.io.emit(`student_${grievance.student.toString()}`, {
        event: "faculty_message",
        grievanceId,
        chatMessage: {
          _id: chatMessage._id,
          message: chatMessage.message,
          messageType: chatMessage.messageType,
          sender: chatMessage.sender.fullName || 'Unknown',
          senderRole: chatMessage.senderRole,
          createdAt: chatMessage.createdAt,
          attachments: chatMessage.attachments || [],
        },
        studentName: req.user.fullName,
        studentEmail: req.user.email,
      });
    }

    res.status(201).json({
      message: "Message sent successfully",
      chatMessage,
    });
  } catch (error) {
    console.error("Send Faculty Message Error:", error);
    res.status(500).json({ message: "Failed to send message", error });
  }
};

/*
 * POST: /api/grievance/:grievanceId/mark-solved
 * Faculty marks grievance as solved
 */
export const markGrievanceSolved = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const facultyId = req.user._id;

    const grievance = await Grievance.findById(grievanceId);
    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found" });
    }

    // Verify authorization
    if (
      grievance.student.toString() !== facultyId.toString() &&
      grievance.assignedFaculty.toString() !== facultyId.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Update resolution status to require student verification
    grievance.resolution.studentVerificationRequired = true;
    grievance.status = "RESOLVED";
    grievance.resolution.timestamp = new Date();
    grievance.timeline.lastUpdateAt = new Date();

    await grievance.save();

    // Emit socket event to student for verification popup
    if (global.io) {
      global.io.emit(`student_${grievance.student.toString()}`, {
        event: "grievance_solved_verification",
        grievanceId,
        message: `Faculty has marked your grievance as resolved. Please verify if it has been resolved to your satisfaction.`,
        requiresAction: true,
        actionType: "confirm_resolution"
      });
    }

    res.json({
      message: "Grievance marked for verification. Student will be notified.",
    });
  } catch (error) {
    console.error("Mark Grievance Solved Error:", error);
    res.status(500).json({ message: "Failed to mark grievance as solved", error });
  }
};

/*
 * POST: /api/grievance/:grievanceId/upload-resolution
 * Faculty uploads resolution file
 */
export const uploadResolutionFile = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const facultyId = req.user._id;

    const grievance = await Grievance.findById(grievanceId);
    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found" });
    }

    // Verify authorization
    if (
      grievance.student.toString() !== facultyId.toString() &&
      grievance.assignedFaculty.toString() !== facultyId.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Handle file upload
    let fileUrl = null;
    let fileName = null;
    let fileType = null;

    if (req.file) {
      const uploadResult = await uploadFile(req.file);
      fileUrl = uploadResult.secure_url;
      fileName = req.file.originalname;
      fileType = req.file.mimetype;
    }

    // Create resolution attachment record
    const resolutionAttachment = {
      fileName,
      fileUrl,
      fileType,
      fileSize: req.file.size,
      uploadedAt: new Date(),
      uploadedBy: facultyId,
    };

    // Update grievance with resolution attachment
    grievance.resolution.attachments = grievance.resolution.attachments || [];
    grievance.resolution.attachments.push(resolutionAttachment);
    grievance.timeline.lastUpdateAt = new Date();

    await grievance.save();

    // Emit socket event to student for file upload notification
    if (global.io) {
      global.io.emit(`student_${grievance.student.toString()}`, {
        event: "resolution_file_uploaded",
        grievanceId,
        fileName: req.file.originalname,
      });
    }

    res.json({
      message: "Resolution file uploaded successfully",
      fileName: req.file.originalname,
      fileUrl,
    });
  } catch (error) {
    console.error("Upload Resolution File Error:", error);
    res.status(500).json({ message: "Failed to upload file", error });
  }
};

/**
 * PARENT ENDPOINTS
 */

/*
 * GET: /api/grievance/parent/escalated
 * Get grievances escalated to parent
 */
export const getParentEscalatedGrievances = async (req, res) => {
  try {
    const parentId = req.user._id;

    const grievances = await Grievance.find({
      parentUser: parentId,
      "escalation.escalatedToParent": true,
    })
      .populate("student", "fullName email phone studentId")
      .populate("assignedFaculty", "fullName email phone department")
      .sort({ "escalation.escalatedAt": -1 });

    res.json({
      message: "Escalated grievances retrieved",
      count: grievances.length,
      grievances,
    });
  } catch (error) {
    console.error("Get Parent Escalated Grievances Error:", error);
    res
      .status(500)
      .json({ message: "Failed to retrieve grievances", error });
  }
};

export default {
  // Student
  submitGrievance,
  submitFollowUpAnswers,
  getStudentGrievances,
  getGrievanceDetails,
  sendStudentMessage,
  verifyResolution,
  getGrievanceChat,

  // Faculty
  getFacultyGrievances,
  markGrievanceSolved,
  sendFacultyMessage,
  uploadResolutionFile,

  // Parent
  getParentEscalatedGrievances,
};
