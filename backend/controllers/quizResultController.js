import QuizAttempt from "../models/QuizAttempt.js";
import Exam from "../models/Exam.js";
import ExamAttemptModel from "../models/ExamAttempt.js";

export const getQuizResult = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await QuizAttempt.findById(attemptId)
  .populate("student", "fullName")
  .lean();

if (!attempt || !attempt.isFinalized) {
  return res.status(404).json({ message: "Result not found" });
}
    if (!Array.isArray(attempt.correctAnswers) || !attempt.correctAnswers.length)
      return res.status(400).json({ message: "Invalid attempt data" });

    const answerMap = new Map(
      (attempt.answers || []).map((a) => [String(a.questionId), a])
    );

    const questions = attempt.correctAnswers.map((c) => {
      const selected = answerMap.get(String(c.questionId));
      const selectedIndex =
        selected?.selectedIndex === null ||
        selected?.selectedIndex === undefined
          ? null
          : Number(selected.selectedIndex);

      const correctIndex = Number(c.correctAnswer);
      const options = Array.isArray(c.options) ? c.options : [];

      return {
        questionId: c.questionId,
        question: c.question,
        options,
        selectedIndex,
        selectedOption:
          selectedIndex !== null ? options[selectedIndex] : null,
        correctIndex,
        correctOption: options[correctIndex] || "",
        isCorrect: selectedIndex === correctIndex,
      };
    });

    const correct = questions.filter((q) => q.isCorrect).length;
    const total = questions.length;
    const score = total ? Math.round((correct / total) * 100) : 0;

    res.json({
      attemptId,
      student: { fullName: attempt.student?.fullName || "" },
      subject: attempt.subject || null,
      score,
      correctCount: correct,
      totalQuestions: total,
      status: attempt.status,
      warnings: attempt.warnings,
      submittedAt: attempt.submittedAt,
      questions,
      analytics: { accuracy: score },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const listStudentQuizAttempts = async (req, res) => {
  try {
    console.log('=== listStudentQuizAttempts called ===');
    const studentId = req.user._id;
    console.log('Fetching attempts for student:', studentId);

    // Fetch custom quizzes from QuizAttempt
    const quizAttempts = await QuizAttempt.find({
      student: studentId,
      isFinalized: true,
    })
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean();

    // Fetch scheduled exams from ExamAttempt
    const examAttempts = await ExamAttemptModel.find({
      student: studentId,
      status: { $in: ["SUBMITTED", "AUTO_SUBMITTED"] }
    })
      .populate("exam", "title subject")
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean();

    console.log('Found quiz attempts:', quizAttempts.length, 'exam attempts:', examAttempts.length);

    // collect scheduled quiz ids to resolve titles for QuizAttempt SCHEDULED type
    const scheduledIds = Array.from(
      new Set(
        quizAttempts
          .filter((a) => a.quizType === "SCHEDULED" && a.quizId)
          .map((a) => a.quizId.toString())
      )
    );

    let examMap = {};
    if (scheduledIds.length) {
      const exams = await Exam.find({ _id: { $in: scheduledIds } }).select(
        "_id title subject"
      );
      examMap = exams.reduce((acc, ex) => {
        acc[ex._id.toString()] = { title: ex.title, subject: ex.subject };
        return acc;
      }, {});
    }

    // Map QuizAttempt records
    const quizList = quizAttempts.map((a) => {
      // Helper: calculate correctCount if missing from database
      let correctCount = a.correctCount;
      if (!correctCount || correctCount === 0) {
        // Recalculate from answers if not stored
        const answers = Array.isArray(a.answers) ? a.answers : [];
        const correctAnswers = Array.isArray(a.correctAnswers) ? a.correctAnswers : [];
        
        let count = 0;
        answers.forEach((ans) => {
          const correct = correctAnswers.find(
            (c) => String(c.questionId) === String(ans.questionId)
          );
          if (
            correct &&
            ans.selectedIndex !== null &&
            ans.selectedIndex !== undefined &&
            Number(correct.correctAnswer) === Number(ans.selectedIndex)
          ) {
            count++;
          }
        });
        correctCount = count;
      }

      return {
        attemptId: a._id,
        resultType: "quiz",
        quizType: a.quizType,
        quizId: a.quizId || null,
        quizTitle:
          a.quizType === "SCHEDULED" && a.quizId
            ? examMap[a.quizId.toString()]?.title || null
            : a.quizType === "CUSTOM"
            ? "Custom AI Quiz"
            : null,
        subject: a.quizType === "SCHEDULED" && a.quizId
          ? examMap[a.quizId.toString()]?.subject || a.subject || null
          : a.subject || null,
        score: a.score || 0,
        correctCount: correctCount,
        totalQuestions: a.totalQuestions || 0,
        submittedAt: a.submittedAt || a.updatedAt || a.createdAt,
        status: a.status || "",
      };
    });

    // Map ExamAttempt records
    const examList = examAttempts.map((ea) => {
      const correctCount = ea.correctCount || 0;
      const totalQuestions = ea.totalQuestions || 0;
      const percentage = totalQuestions > 0 
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;

      return {
        attemptId: ea._id,
        resultType: "exam",
        quizType: "SCHEDULED",
        quizId: ea.exam?._id?.toString() || null,
        quizTitle: ea.exam?.title || "Scheduled Exam",
        subject: ea.exam?.subject || null,
        score: percentage,
        correctCount: correctCount,
        totalQuestions: totalQuestions,
        submittedAt: ea.submittedAt || ea.updatedAt || ea.createdAt,
        status: ea.status || "",
      };
    });

    // Combine and sort
    const combined = [...quizList, ...examList].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );

    console.log('Returning combined list:', combined.length, 'items');
    return res.json(combined);
  } catch (err) {
    console.error("Failed to list quiz attempts:", err);
    return res.status(500).json({ message: "Failed to list attempts" });
  }
};
