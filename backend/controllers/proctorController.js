import QuizAttempt from "../models/QuizAttempt.js"
import ExamAttempt from "../models/ExamAttempt.js"
import User from "../models/User.js"
import { isFaceMatch } from "../services/faceMatchService.js"
import { updateCompetencyFromAssessment } from "../services/competencyEngine.js"

export const faceCheck = async (req, res) => {
  try {
    const { attemptId, embedding, answers } = req.body
    const quizAttempt = await QuizAttempt.findById(attemptId)
    const examAttempt = quizAttempt ? null : await ExamAttempt.findById(attemptId).populate("exam")
    const attempt = quizAttempt || examAttempt

    if (!attempt || attempt.isFinalized) {
      return res.json({ autoSubmitted: Boolean(attempt?.status === "AUTO_SUBMITTED" || attempt?.isFinalized) })
    }

    const now = Date.now()

    if (examAttempt && !attempt.proctoring) attempt.proctoring = {}

    let facePresent = true

    // 🫥 NO FACE CASE
    if (!embedding || embedding.length === 0) {
      facePresent = false
    } else {
      const user = await User.findById(attempt.student)
      if (
        user?.faceData?.embedding?.length &&
        !isFaceMatch(user.faceData.embedding, embedding)
      ) {
        facePresent = false
      }
    }

    // 🙂 FACE IS PRESENT
    if (facePresent) {
      if (quizAttempt) {
        attempt.noFaceSince = null
        attempt.lastFaceWarningAt = null
      }
      await attempt.save()

      return res.json({
        faceMismatch: false,
        warnings: attempt.warnings,
        autoSubmitted: false,
      })
    }

    // 🫥 FACE NOT PRESENT
    if (quizAttempt && !attempt.noFaceSince) {
      attempt.noFaceSince = new Date(now)
    }

    const noFaceDuration = quizAttempt ? now - new Date(attempt.noFaceSince).getTime() : 3000;

    // ⚠️ first warning at 2 sec
    if (noFaceDuration >= 2000) {
      const lastWarn = quizAttempt && attempt.lastFaceWarningAt
        ? new Date(attempt.lastFaceWarningAt).getTime()
        : 0

      // ⏳ cooldown: 8 sec between warnings
      if (!quizAttempt || !attempt.lastFaceWarningAt || now - lastWarn >= 8000) {
        if (quizAttempt) {
          attempt.warnings.face += 1
          attempt.lastFaceWarningAt = new Date(now)
        } else {
          attempt.proctoring.faceWarnings = (attempt.proctoring.faceWarnings || 0) + 1
        }
      }
    }

    const totalWarnings =
      Number(quizAttempt ? attempt.warnings.tab || 0 : 0) +
      Number(quizAttempt ? attempt.warnings.face || 0 : attempt.proctoring.faceWarnings || 0)

    if (totalWarnings >= 3) {
      if (Array.isArray(answers)) {
        attempt.answers = answers
      }

      attempt.status = "AUTO_SUBMITTED"
      attempt.submittedAt = new Date()
      if (quizAttempt) attempt.isFinalized = true
      attempt.submitReason = "PROCTOR_VIOLATION"
      attempt.submissionType = "AUTO"
    }

    await attempt.save()

    if (attempt.isFinalized) {
      try {
        const user = await User.findById(attempt.student)
        await updateCompetencyFromAssessment({
          user,
          questions: examAttempt?.exam?.questions || attempt.questions,
          answers: attempt.answers,
          source: examAttempt?.exam?.assessmentType === "DIAGNOSTIC" ? "initial-diagnostic" : "proctored-quiz",
        })
      } catch (competencyError) {
        console.error("Competency evidence update failed:", competencyError.message)
      }
    }

    return res.json({
      faceMismatch: true,
      warnings: attempt.warnings,
      autoSubmitted: attempt.isFinalized,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Proctoring failed" })
  }
}