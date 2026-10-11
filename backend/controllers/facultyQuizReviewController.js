import QuizAttempt from "../models/QuizAttempt.js";
import ExamAttempt from "../models/ExamAttempt.js";
import Exam from "../models/Exam.js";
import User from "../models/User.js";

/* ---------------- GET EXAM ATTEMPTS ---------------- */

export const getExamAttempts = async (req, res) => {
  try {
    const { examId } = req.params;
    
    // For scheduled quizzes, use ExamAttempt model
    const attempts = await ExamAttempt.find({
      exam: examId,
      status: { $in: ["SUBMITTED", "AUTO_SUBMITTED"] },
    })
    .populate('student', 'fullName email')
    .sort({ score: -1, submittedAt: 1 });

    // Calculate leaderboard
    const leaderboard = attempts.map((attempt, index) => ({
      rank: index + 1,
      _id: attempt._id,
      student: {
        _id: attempt.student._id,
        name: attempt.student.fullName,
        email: attempt.student.email
      },
      score: attempt.score,
      status: attempt.status,
      submissionType: attempt.status === 'AUTO_SUBMITTED' ? 'AUTO' : 'MANUAL',
      warnings: {
        tab: attempt.proctoring?.escWarnings || 0,
        face: attempt.proctoring?.faceWarnings || 0
      },
      submittedAt: attempt.submittedAt,
    }));

    res.json({
      attempts,
      leaderboard,
      totalAttempts: attempts.length,
    });
  } catch (err) {
    console.error("Failed to fetch exam attempts:", err);
    res.status(500).json({ message: "Failed to fetch attempts" });
  }
};

/* ---------------- GET ATTEMPT DETAILS ---------------- */

export const getAttemptDetails = async (req, res) => {
  try {
    const { attemptId } = req.params;
    
    // For scheduled quizzes, use ExamAttempt model
    const attempt = await ExamAttempt.findById(attemptId)
      .populate('student', 'fullName email')
      .populate('exam');

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    // Process questions with answers
    const questionsWithAnswers = attempt.exam.questions.map((question, index) => {
      const answer = attempt.answers.find(
        (a) => a.questionId === question.questionId
      );
      
      return {
        questionIndex: index,
        questionId: question.questionId,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        studentAnswer: answer?.selectedOption || null,
        isCorrect: answer?.selectedOption === question.correctAnswer,
      };
    });

    res.json({
      attempt: {
        _id: attempt._id,
        student: attempt.student,
        exam: attempt.exam,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        status: attempt.status,
        submittedAt: attempt.submittedAt,
        startedAt: attempt.startedAt,
        proctoring: attempt.proctoring,
      },
      questionsWithAnswers,
    });
  } catch (err) {
    console.error("Failed to fetch attempt details:", err);
    res.status(500).json({ message: "Failed to fetch attempt details" });
  }
};

/* ---------------- GET ALL FACULTY QUIZ ATTEMPTS ---------------- */

export const getAllFacultyAttempts = async (req, res) => {
  try {
    const facultyId = req.user._id;
    
    // Get all exams created by this faculty
    const exams = await Exam.find({ faculty: facultyId }).select('_id title subject');
    const examIds = exams.map(exam => exam._id);

    // Get all attempts for these exams
    const attempts = await QuizAttempt.find({
      quizId: { $in: examIds },
      quizType: "SCHEDULED",
      isFinalized: true,
    })
    .populate('student', 'name email')
    .populate('quizId', 'title subject')
    .sort({ submittedAt: -1 });

    res.json(attempts);
  } catch (err) {
    console.error("Failed to fetch faculty attempts:", err);
    res.status(500).json({ message: "Failed to fetch attempts" });
  }
};
