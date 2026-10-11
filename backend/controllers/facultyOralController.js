import FacultyOralExam from "../models/FacultyOralExam.js";
import { getGeminiModel } from "../utils/gemini.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import nodemailer from "nodemailer";

const calculateQuestionCount = (duration) => {
  if (duration == 10) return 5;
  if (duration == 20) return 10;
  if (duration == 30) return 15;
  if (duration == 60) return 25;
  return 5;
};

/* ================= GENERATE ORAL ================= */

export const generateFacultyOral = async (req, res) => {
  try {
    const { topic, duration, date, time } = req.body;

    const totalQuestions = calculateQuestionCount(duration);

    const gemini = getGeminiModel();

    const prompt = `
Generate ${totalQuestions} oral exam questions for topic: ${topic}.

Each expectedAnswer must be SHORT and concise (maximum 3-4 lines only).
Do NOT give long explanations.
Keep answers simple, crisp, and oral-exam friendly.

Return STRICT JSON:
[
  {
    "question": "...",
    "expectedAnswer": "Short answer in 3-4 lines max"
  }
]
`;

    const result = await gemini.generateContent(prompt);
    const text = result.response.text();
    const cleanText = text.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(cleanText);

    const exam = await FacultyOralExam.create({
      faculty: req.user._id,
      topic,
      date,
      time,
      duration,
      totalQuestions,
      questions,
    });

    res.json(exam);
  } catch (error) {
    console.error("Generate Oral Error:", error);
    res.status(500).json({ message: "Generation failed" });
  }
};

/* ================= UPDATE QUESTIONS ================= */

export const updateFacultyOral = async (req, res) => {
  try {
    const { questions } = req.body;

    const exam = await FacultyOralExam.findById(req.params.id);

    if (!exam) return res.status(404).json({ message: "Exam not found" });

    if (questions.length > exam.totalQuestions) {
      return res.status(400).json({ message: "Question limit exceeded" });
    }

    exam.questions = questions;
    await exam.save();

    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};

/* ================= ASSIGN TO STUDENTS ================= */

export const assignFacultyOral = async (req, res) => {
  try {
    const { scope, selectedStudents = [], assignedClass } = req.body;
    const exam = await FacultyOralExam.findById(req.params.id).populate("faculty", "fullName email");

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const faculty = await User.findById(req.user._id);

    if (!faculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    exam.scope = scope || "ALL";

    let students = [];
    
    if (scope === "SELECTED") {
      students = await User.find({
        _id: { $in: selectedStudents },
      });
      exam.assignedStudents = selectedStudents;
      exam.assignedClass = null;
    } else if (scope === "CLASS") {
      const Class = await import("../models/Class.js").then(m => m.default);
      const classDoc = await Class.findById(assignedClass).populate("students");
      
      if (!classDoc) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      students = classDoc.students;
      exam.assignedStudents = students.map(s => s._id);
      exam.assignedClass = assignedClass;
    } else {
      students = await User.find({
        _id: { $in: faculty.students },
      });
      exam.assignedStudents = faculty.students;
      exam.assignedClass = null;
    }

    exam.status = "assigned";
    await exam.save();

    /* ================= CREATE NOTIFICATIONS ================= */

    const notifications = students.map((student) => ({
      userId: student._id,
      title: "New Oral Exam Assigned",
      message: `Your faculty has scheduled an oral exam on ${exam.topic} for ${new Date(
        exam.date,
      ).toLocaleDateString()} at ${exam.time}`,
      type: "info",
    }));

    for (const student of students) {
      const exists = await Notification.findOne({
        userId: student._id,
        title: "New Oral Exam Assigned",
        message: {
          $regex: exam.topic,
        },
      });

      if (!exists) {
        await Notification.create({
          userId: student._id,
          title: "New Oral Exam Assigned",
          message: `Your faculty has scheduled an oral exam on ${exam.topic} for ${new Date(
            exam.date,
          ).toLocaleDateString()} at ${exam.time}`,
          type: "info",
        });
      }
    }

    /* ================= SEND EMAILS ================= */

    // Only send emails if credentials are configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        for (const student of students) {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: student.email,
            subject: "New Oral Exam Scheduled",
            html: `
              <h3>New Oral Exam Assigned</h3>
              <h3>Faculty - ${exam.faculty?.fullName}</h3>
              <p>Topic: <b>${exam.topic}</b></p>
              <p>Date: ${new Date(exam.date).toLocaleDateString()}</p>
              <p>Time: ${exam.time}</p>
              <p>Duration: ${exam.duration} minutes</p>
              <br/>
              <p>Please login to your dashboard to attempt the exam.</p>
            `,
          });
        }
        console.log(`Emails sent to ${students.length} students`);
      } catch (emailError) {
        console.error("Failed to send emails:", emailError);
        // Don't fail the assignment if emails fail
      }
    } else {
      console.log("Email credentials not configured - skipping email notifications");
    }

    const emailSent = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
    
    res.json({ 
      message: emailSent ? "Assigned, notifications sent, emails sent" : "Assigned, notifications sent",
      scope: exam.scope,
      assignedStudentsCount: students.length,
      emailsSent: emailSent,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Assign failed" });
  }
};

/* ================= GET FACULTY EXAMS ================= */

export const getFacultyScheduledExams = async (req, res) => {
  const exams = await FacultyOralExam.find({
    faculty: req.user._id,
  }).sort({ createdAt: -1 });

  res.json(exams);
};

export const deleteFacultyExam = async (req, res) => {
  await FacultyOralExam.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
};

// get single exam details
export const getSingleFacultyExam = async (req, res) => {
  const exam = await FacultyOralExam.findById(req.params.id);

  if (!exam) {
    return res.status(404).json({ message: "Exam not found" });
  }

  res.json(exam);
};