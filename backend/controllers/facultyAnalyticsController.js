import FacultyOralExam from "../models/FacultyOralExam.js";
import FacultyOralAttempt from "../models/FacultyOralAttempt.js";

export const getFacultyOralExams = async (req, res) => {
  try {
    const exams = await FacultyOralExam.find({
      faculty: req.user._id,
    });

    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getOralExamStats = async (req, res) => {
  try {
    const attempts = await FacultyOralAttempt.find({
      exam: req.params.examId,
      status: "completed",
    }).populate("student", "fullName email");

    const formatted = attempts.map((a) => ({
      attemptId: a._id,
      studentName: a.student.fullName,
      score: a.overallScore,
      timeTaken: a.timeTaken || 0, // add later if not present
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


export const getAttemptDetails = async (req, res) => {
  try {
    const attempt = await FacultyOralAttempt.findById(req.params.attemptId)
      .populate("student", "fullName")
      .populate("exam");

    res.json(attempt);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
