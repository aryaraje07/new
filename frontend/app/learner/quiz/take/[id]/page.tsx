'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Clock } from 'lucide-react'
import * as faceapi from 'face-api.js'
import { loadFaceModels } from '@/lib/faceApi'

/* ================= CAMERA ================= */

function CameraPreview({
  active,
  onFrame,
}: {
  active: boolean
  onFrame: (payload: { embedding: number[] }) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!active) return
    let stopped = false

    const start = async () => {
      try {
        await loadFaceModels()

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false,
        })

        if (stopped) return
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream

        intervalRef.current = setInterval(async () => {
          if (!videoRef.current || stopped) return

          const detection = await faceapi
            .detectSingleFace(videoRef.current)
            .withFaceLandmarks()
            .withFaceDescriptor()

          onFrame({
            embedding: detection ? Array.from(detection.descriptor) : [],
          })
        }, 4000)
      } catch {
        alert('Camera permission required')
      }
    }

    start()

    return () => {
      stopped = true
      intervalRef.current && clearInterval(intervalRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [active])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="w-44 h-32 border rounded overflow-hidden bg-black">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        <div className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-2 rounded">
          Camera On
        </div>
      </div>
    </div>
  )
}

/* ================= QUIZ PAGE ================= */

export default function ScheduledQuizTakePage() {
  const router = useRouter()
  const { id: examId } = useParams()

  const [questions, setQuestions] = useState<any[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitStep, setSubmitStep] = useState(0)
  const [submitError, setSubmitError] = useState('')
  const [warningMsg, setWarningMsg] = useState<string | null>(null)

  const answersRef = useRef<any[]>([])
  const isSubmittingRef = useRef(false)
  const restoringFullscreenRef = useRef(false)
  const hasEnteredFullscreenRef = useRef(false)
  const noFaceCountRef = useRef(0)
const lastFaceEventRef = useRef(0)

  const totalWarningsRef = useRef(0)

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''

  /* ================= SUBMIT ================= */

  const submit = async (
    reason: 'NORMAL' | 'TIME_UP' | 'PROCTOR_VIOLATION' = 'NORMAL'
  ) => {
    if (!attemptId || isSubmittingRef.current) return
    isSubmittingRef.current = true
    setSubmitting(true)
    setSubmitError('')
    setSubmitStep(1)

    try {
      console.log('Submitting scheduled quiz with reason:', reason)
      console.log('Attempt ID:', attemptId)
      
      // For scheduled quizzes, use the exam submission endpoint
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/learner/exams/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers: answersRef.current,
          proctoring: {
            autoSubmitted: reason === 'PROCTOR_VIOLATION',
            faceWarnings: totalWarningsRef.current,
            escWarnings: 0, // We don't track this separately
            reasons: reason === 'PROCTOR_VIOLATION' ? ['Too many warnings'] : []
          }
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error('Submit failed:', errorData)
        throw new Error(errorData.message || 'Submission failed')
      }

      const data = await res.json()
      console.log('Submit successful:', data)
      setSubmitStep(5)

      // Exit fullscreen before navigation
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen()
        } catch {
          // ignore
        }
      }

      // Navigate to results page
      router.replace(
        `/learner/quiz/scheduled/results/${attemptId}`
      )
    } catch (error) {
      console.error('Submit error:', error)
      isSubmittingRef.current = false
      setSubmitting(false)
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit assessment. Try again.')
      setSubmitStep(0)
    }
  }

  /* ================= WARNING ================= */

  const incrementWarning = (msg: string) => {
    try {
      totalWarningsRef.current = Math.min(totalWarningsRef.current + 1, 3)
      setWarningMsg(msg)
      setTimeout(() => setWarningMsg(null), 3000)

      // Show warning count to user
      const warningsLeft = 3 - totalWarningsRef.current
      if (warningsLeft > 0) {
        setWarningMsg(`${msg} - ${warningsLeft} more warnings allowed before auto-submit`)
      }

      if (totalWarningsRef.current >= 3) {
        // Give user 5 seconds to see final warning before auto-submit
        setWarningMsg('⚠️ FINAL WARNING: Quiz will auto-submit in 5 seconds...')
        setTimeout(() => {
          submit('PROCTOR_VIOLATION')
        }, 5000)
      }
    } catch (error) {
      console.error('Error incrementing warning:', error)
    }
  }

  /* ================= START EXAM ================= */

  useEffect(() => {
    const start = async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/learner/exams/scheduled/${examId}/start`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      )

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        alert(errorData.message || 'Exam not available')
        router.replace('/learner/quiz/scheduled')
        return
      }

      const data = await res.json()
      setQuestions(data.questions)
      setSelectedAnswers(new Array(data.questions.length).fill(null))
      setTimeLeft(data.duration * 60)
      setAttemptId(data.attemptId)

      answersRef.current = data.questions.map((q: any) => ({
        questionId: q.questionId,
        selectedOption: null, // ExamAttempt expects selectedOption, not selectedIndex
      }))

      setLoading(false)
    }

    start()
  }, [])

  /* ================= TIMER ================= */

  useEffect(() => {
    if (!attemptId) return
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          submit('TIME_UP')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [attemptId])

  /* ================= ESC ================= */

  useEffect(() => {
  if (!attemptId) return

  const onFullscreenChange = async () => {
    if (
      !document.fullscreenElement &&
      !isSubmittingRef.current &&
      !restoringFullscreenRef.current
    ) {
      restoringFullscreenRef.current = true

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/quiz/attempt/warning`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            attemptId,
            type: 'TAB',
            answers: answersRef.current,
          }),
        }
      )

      const data = await res.json()
      incrementWarning('Fullscreen exit detected (ESC)')

      if (data?.autoSubmitted) {
        submit('PROCTOR_VIOLATION')
        return
      }

      setTimeout(() => {
        document.documentElement
          .requestFullscreen()
          .catch(() => {})
          .finally(() => {
            restoringFullscreenRef.current = false
          })
      }, 500)
    }
  }

  document.addEventListener('fullscreenchange', onFullscreenChange)
  return () =>
    document.removeEventListener('fullscreenchange', onFullscreenChange)
}, [attemptId])
  /* ---------- ALT+TAB PREVENTION ---------- */

  useEffect(() => {
    if (!attemptId) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Alt+Tab
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        
        // Show warning but don't allow tab switch
        incrementWarning('Alt+Tab blocked - Tab switching not allowed')
        
        // Force re-enter fullscreen
        setTimeout(async () => {
          try {
            if (!document.fullscreenElement) {
              await document.documentElement.requestFullscreen();
            }
          } catch (error) {
            console.log('Re-entry failed:', error);
          }
        }, 100)
        
        return false
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [attemptId])

 useEffect(() => {
  if (!attemptId) return

  const onVisibility = async () => {
    if (document.hidden && !isSubmittingRef.current) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/quiz/attempt/warning`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            attemptId,
            type: 'TAB',
            answers: answersRef.current,
          }),
        }
      )

      const data = await res.json()
      incrementWarning('Tab switching detected')

      if (data?.autoSubmitted) {
        submit('PROCTOR_VIOLATION')
      }
    }
  }

  document.addEventListener('visibilitychange', onVisibility)
  return () =>
    document.removeEventListener('visibilitychange', onVisibility)
}, [attemptId])

/* ================= FACE CHECK ================= */

const onFaceFrame = useCallback(
  async ({ embedding }: { embedding: number[] }) => {
    if (!attemptId || isSubmittingRef.current) return

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/proctor/face-check`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            attemptId,
            embedding,
            answers: answersRef.current,
          }),
        }
      )

      if (!res.ok) {
        console.error('Face check failed')
        return
      }

      const data = await res.json()

      if (data?.faceMismatch || embedding.length === 0) {
        incrementWarning('Face not detected / mismatch')
      }

      if (data?.autoSubmitted) {
        submit('PROCTOR_VIOLATION')
      }
    } catch (error) {
      console.error('Face check error:', error)
    }
  },
  [attemptId, submit]
)

/* ================= ANSWERS ================= */

const selectAnswer = (idx: number) => {
  if (!hasEnteredFullscreenRef.current) {
    document.documentElement.requestFullscreen?.().catch((error) => {
      console.error('Error requesting fullscreen:', error)
    })
    hasEnteredFullscreenRef.current = true
  }

  if (currentQuestion < 0 || currentQuestion >= questions.length) {
    console.error('Invalid question index:', currentQuestion)
    return
  }

  const copy = [...selectedAnswers]
  copy[currentQuestion] = idx
  setSelectedAnswers(copy)

  if (answersRef.current[currentQuestion]) {
    answersRef.current[currentQuestion].selectedOption = idx // Use selectedOption for ExamAttempt
  }
}

/* ================= UI ================= */
const q = questions[currentQuestion]
const progress = ((currentQuestion + 1) / questions.length) * 100

if (loading || !q) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

return (
  <div className="space-y-6 relative">
    {warningMsg && (
      <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded z-50 text-sm">
        ⚠️ {warningMsg} ({totalWarningsRef.current}/3)
      </div>
    )}

    {submitStep > 0 && (
      <Card className="border border-border bg-secondary p-4">
        <p className="text-sm font-semibold text-foreground">{submitStep === 5 ? 'Assessment complete. Preparing your results...' : 'Submitting assessment...'}</p>
        <p className="text-xs text-muted-foreground">Server processing includes evaluation, competency update, and skill-gap recalculation.</p>
        <ol className="mt-2 grid gap-1 text-xs sm:grid-cols-5">
          {['Submit', 'Evaluate', 'Update competency', 'Recalculate gap', 'Complete'].map((label, index) => (
            <li key={label} className={index + 1 <= submitStep ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{index + 1}/5 {label}</li>
          ))}
        </ol>
      </Card>
    )}
    {submitError && <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{submitError}</Card>}

    {/* Header */}
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2 text-sm">
        <Clock className="w-4 h-4" />
        <span className="font-medium">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
      </div>
      <div className="text-sm text-muted-foreground">
        Question {currentQuestion + 1} of {questions.length}
      </div>
    </div>

    <Progress value={progress} className="h-2" />

    {/* Question Card */}
    <Card className="border border-border p-6 space-y-4">
      <h2 className="text-base font-semibold text-foreground">{q.question}</h2>
      <div className="space-y-2">
        {q.options.map((opt: string, idx: number) => (
          <button
            key={idx}
            onClick={() => selectAnswer(idx)}
            className={`w-full p-3 border rounded text-sm text-left transition-colors ${
              selectedAnswers[currentQuestion] === idx
                ? 'bg-primary/10 border-primary text-foreground'
                : 'bg-card border-border text-foreground hover:bg-secondary'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </Card>

    {/* Navigation */}
    <div className="flex justify-between">
      <Button 
        disabled={currentQuestion === 0} 
        onClick={() => setCurrentQuestion(c => c - 1)}
        variant="outline"
        size="sm"
      >
        Previous
      </Button>

      {currentQuestion === questions.length - 1 ? (
        <Button 
          disabled={submitting} 
          onClick={() => submit()}
          size="sm"
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </Button>
      ) : (
        <Button 
          onClick={() => setCurrentQuestion(c => c + 1)}
          size="sm"
        >
          Next
        </Button>
      )}
    </div>

    <CameraPreview active={!!attemptId} onFrame={onFaceFrame} />
  </div>
)
}