import Exam from "../models/Exam.js";
import ExamAttempt from "../models/ExamAttempt.js";

export const getFacultyScheduledQuizzes = async (req, res) => {
  try {
    const exams = await Exam.find({
      faculty: req.user._id,
      status: "SCHEDULED",
    }).select("title subject difficulty duration totalQuestions scheduledAt status");

    res.json(exams);
  } catch (error) {
    console.error("❌ Get faculty scheduled quizzes error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getQuizStats = async (req, res) => {
  try {
    const { examId } = req.params;

    // Get all completed attempts for this exam
    const attempts = await ExamAttempt.find({
      exam: examId,
      status: { $in: ["SUBMITTED", "AUTO_SUBMITTED"] },
    }).populate("student", "fullName email")
      .populate("exam", "questions")
      .select("student score correctCount totalQuestions submittedAt status proctoring answers exam");

    // Calculate analytics - handle both old and new records
    const totalStudents = attempts.length;
    const scores = attempts.map(a => {
      // For old records that might not have correctCount or where it's 0
      let correctCount = a.correctCount;
      let percentage = a.score || 0;
      
      if (!correctCount || correctCount === 0) {
        // Recalculate from percentage
        correctCount = Math.round((percentage / 100) * (a.totalQuestions || 1));
      }
      
      return percentage;
    });
    
    const averageScore = scores.length > 0 
      ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100
      : 0;
    const topScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    // Format for leaderboard
    const leaderboard = attempts
      .map((attempt) => {
        // Calculate correct count if missing
        let correctCount = attempt.correctCount;
        if (!correctCount || correctCount === 0) {
          correctCount = Math.round(((attempt.score || 0) / 100) * (attempt.totalQuestions || 1));
        }
        
        return {
          attemptId: attempt._id,
          studentName: attempt.student.fullName,
          studentEmail: attempt.student.email,
          score: attempt.score || 0,
          correctCount: correctCount,
          totalQuestions: attempt.totalQuestions,
          status: attempt.status,
          submittedAt: attempt.submittedAt,
          proctoring: attempt.proctoring,
        };
      })
      .sort((a, b) => b.score - a.score);

    // Additional analytics
    const passedStudents = attempts.filter(a => (a.score || 0) >= 40).length; // Assuming 40% is passing
    const failedStudents = totalStudents - passedStudents;
    const passRate = totalStudents > 0 ? Math.round((passedStudents / totalStudents) * 100) : 0;

    // Score distribution
    const scoreRanges = {
      "0-20": attempts.filter(a => (a.score || 0) <= 20).length,
      "21-40": attempts.filter(a => (a.score || 0) > 20 && (a.score || 0) <= 40).length,
      "41-60": attempts.filter(a => (a.score || 0) > 40 && (a.score || 0) <= 60).length,
      "61-80": attempts.filter(a => (a.score || 0) > 60 && (a.score || 0) <= 80).length,
      "81-100": attempts.filter(a => (a.score || 0) > 80).length,
    };

    res.json({
      totalStudents,
      averageScore,
      topScore,
      lowestScore,
      passRate,
      passedStudents,
      failedStudents,
      leaderboard,
      scoreRanges,
      totalAttempts: totalStudents,
    });
  } catch (error) {
    console.error("❌ Get quiz stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getQuizAttemptDetails = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await ExamAttempt.findById(attemptId)
      .populate("student", "fullName email")
      .populate("exam", "title subject questions duration totalQuestions");

    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    // Process answers with question details
    const questionsWithAnswers = attempt.exam.questions.map((question, index) => {
      const studentAnswer = attempt.answers.find(
        (ans) => ans.questionId === question.questionId
      );

      return {
        questionIndex: index,
        questionId: question.questionId,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        studentAnswer: studentAnswer?.selectedOption || null,
        isCorrect: studentAnswer?.selectedOption === question.correctAnswer,
      };
    });

    const response = {
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
    };

    res.json(response);
  } catch (error) {
    console.error("❌ Get quiz attempt details error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
