'use client'

import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Clock } from 'lucide-react'
import * as faceapi from 'face-api.js'
import { loadFaceModels } from '@/lib/faceApi'

/* ================= CAMERA PREVIEW ================= */

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

    const startCamera = async () => {
      try {
        await loadFaceModels()

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false,
        })

        if (stopped) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream

        intervalRef.current = setInterval(async () => {
          if (!videoRef.current || stopped) return

          try {
            const detection = await faceapi
              .detectSingleFace(videoRef.current)
              .withFaceLandmarks()
              .withFaceDescriptor()

            // 🔥 NO FACE = EMPTY ARRAY (IMPORTANT)
            onFrame({
              embedding: detection ? Array.from(detection.descriptor) : [],
            })
          } catch (error) {
            console.error('Face detection error:', error)
          }
        }, 10000) // Increased from 6000 to 10000 to reduce load
      } catch {
        alert('Camera permission required')
      }
    }

    startCamera()

    return () => {
      stopped = true
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop())
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [active])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="w-44 h-32 rounded-lg overflow-hidden border bg-black shadow">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded">
          Camera On
        </div>
      </div>
    </div>
  )
}

/* ================= QUIZ PAGE ================= */

function QuizTakeContent() {
  const router = useRouter()
  const params = useSearchParams()

  const subject = params.get('subject') || 'General'
  const time = Number(params.get('time') || 30)
  const questionsCount = Number(params.get('questions') || 10)

  const [questions, setQuestions] = useState<any[]>([])
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [timeLeft, setTimeLeft] = useState(time * 60)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [warnings, setWarnings] = useState({ tab: 0, face: 0 })
  const [warningMsg, setWarningMsg] = useState<string | null>(null)

  const answersRef = useRef<any[]>([])
  const isSubmittingRef = useRef(false)
  const restoringFullscreenRef = useRef(false)
  const totalWarningsRef = useRef(0)

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''

  /* ---------- SUBMIT ---------- */
  const submit = useCallback(async (reason = 'NORMAL') => {
    if (!attemptId || isSubmittingRef.current) return
    isSubmittingRef.current = true

    // ✅ SAFE fullscreen exit
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch {
        // ignore
      }
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/quiz/submit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quizAttemptId: attemptId,
          answers: answersRef.current,
          submitReason: reason,
        }),
      })

      if (!response.ok) {
        console.error('Submit failed:', response.status)
        // Still redirect even if submit fails
      }
    } catch (error) {
      console.error('Submit error:', error)
      // Still redirect even if submit fails
    }

    router.replace(`/learner/quiz/results?attemptId=${attemptId}`)
  }, [attemptId, token, router])

  const incrementWarning = useCallback((msg: string) => {
    totalWarningsRef.current = Math.min(totalWarningsRef.current + 1, 3)

    setWarningMsg(msg)
    setTimeout(() => setWarningMsg(null), 2000)

    if (totalWarningsRef.current >= 3) {
      submit('PROCTOR_VIOLATION')
    }
  }, [submit])

  /* ---------- START QUIZ ---------- */

  useEffect(() => {
    const start = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject,
          questions: questionsCount,
          difficulty: 'mixed',
        }),
      })

      const data = await res.json()
      const qs = data.questions || []

      setQuestions(qs)
      setSelectedAnswers(new Array(qs.length).fill(null))

      answersRef.current = qs.map((q: any, i: number) => ({
        questionId: q.id || `q_${i + 1}`,
        selectedIndex: null,
      }))

      const attemptRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/quiz/attempt/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            quizType: 'CUSTOM',
            subject: subject,
            questions: qs.map((q: any, i: number) => ({
              questionId: q.id || `q_${i + 1}`,
              question: q.question,
              options: q.options,
              correctAnswer: q.correct,
            })),
          }),
        }
      )

      const attempt = await attemptRes.json()
      setAttemptId(attempt.attemptId)
      setLoading(false)
    }

    start()
  }, [])

  /* ---------- FULLSCREEN ON START ---------- */

  useEffect(() => {
    if (!attemptId) return
    
    // Auto-enter fullscreen when exam starts
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
        }
      } catch (error) {
        console.log('Fullscreen failed:', error);
      }
    };
    
    enterFullscreen();
  }, [attemptId])

  /* ---------- ESC / FULLSCREEN EXIT ---------- */
useEffect(() => {
  if (!attemptId) return

  const onFullscreenChange = async () => {
    if (
      !document.fullscreenElement &&
      !isSubmittingRef.current &&
      !restoringFullscreenRef.current
    ) {
      restoringFullscreenRef.current = true

      // 🔴 ESC warning
      incrementWarning('ESC pressed - Fullscreen exited')
      
      try {
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
              type: 'ESC',
              answers: answersRef.current,
            }),
          }
        )

        if (!res.ok) {
          console.error('Warning API error:', res.status)
          return
        }

        const data = await res.json()
        if (data?.autoSubmitted) {
          submit('PROCTOR_VIOLATION')
          return
        }
      } catch (error) {
        console.error('Warning error:', error)
      }

      // 🔒 Force re-enter fullscreen after 500ms
      setTimeout(async () => {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
          restoringFullscreenRef.current = false
        } catch (error) {
          console.log('Re-entry failed:', error);
        }
      }, 500)
    }
  }

  document.addEventListener('fullscreenchange', onFullscreenChange)
  return () =>
    document.removeEventListener('fullscreenchange', onFullscreenChange)
}, [attemptId, incrementWarning, submit, token])
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
        
        // Don't immediately force fullscreen - let the visibility change handler deal with it
        return false
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [attemptId, incrementWarning])

  useEffect(() => {
    if (!attemptId) return

    const onVisibility = async () => {
      if (document.hidden && !isSubmittingRef.current) {
        // 🔴 Tab switching warning
        incrementWarning('Tab switching detected')
        
        try {
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

          if (!res.ok) {
            console.error('Warning API error:', res.status)
            return
          }

          const data = await res.json()
          if (data?.autoSubmitted) {
            submit('PROCTOR_VIOLATION')
            return
          }
        } catch (error) {
          console.error('Warning error:', error)
        }

        // 🔒 Force re-enter fullscreen after 500ms
        setTimeout(async () => {
          try {
            if (!document.fullscreenElement) {
              await document.documentElement.requestFullscreen();
            }
          } catch (error) {
            console.log('Re-entry failed:', error);
          }
        }, 500)
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () =>
      document.removeEventListener('visibilitychange', onVisibility)
  }, [attemptId, incrementWarning, submit, token])

  /* ---------- ANSWERS ---------- */

const hasEnteredFullscreenRef = useRef(false)

const updateAnswer = (idx: number) => {
  // ✅ Fullscreen on first interaction
  if (!hasEnteredFullscreenRef.current) {
    document.documentElement.requestFullscreen?.().catch(() => {})
    hasEnteredFullscreenRef.current = true
  }

  const copy = [...selectedAnswers]
  copy[currentQuestion] = idx
  setSelectedAnswers(copy)

  answersRef.current[currentQuestion].selectedIndex = idx
}

  /* ---------- FACE CHECK ---------- */
const handleFaceFrame = useCallback(
  async ({ embedding }: { embedding: number[] }) => {
    if (!attemptId) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/quiz/attempt/face-check`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            attemptId,
            embedding,
            answers: answersRef.current,
          }),
        }
      );

      if (!res.ok) {
        console.error("Face check API error:", res.status);
        return;
      }

      const data = await res.json();

      if (data?.faceMismatch || embedding.length === 0) {
        incrementWarning("Face not detected / mismatch");
      }

      if (data?.autoSubmitted) submit("PROCTOR_VIOLATION");
    } catch (error) {
      console.error("Face check error:", error);
    }
  },
  [attemptId, token, incrementWarning, submit]
);

  /* ---------- TIMER ---------- */

useEffect(() => {
  if (!attemptId) return

  const timer = setInterval(() => {
    setTimeLeft((prev) => {
      if (prev <= 1) {
        if (!isSubmittingRef.current) {
          submit('TIME_UP')
        }
        return 0
      }
      return prev - 1
    })
  }, 1000)

  return () => clearInterval(timer)
}, [attemptId])

  /* ---------- UI ---------- */

  if (loading) return <div className="p-8">Generating quiz...</div>

  const q = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  

  return (
    <div className="p-8 space-y-6 relative">
      {warningMsg && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded z-50">
          ⚠️ {warningMsg} ({totalWarningsRef.current}/3)
        </div>
      )}

      <div className="flex justify-between">
        <div className="flex gap-2 items-center">
          <Clock />
          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
        </div>
        Question {currentQuestion + 1}/{questions.length}
      </div>

      <Progress value={progress} />

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">{q.question}</h2>
        {q.options.map((opt: string, idx: number) => (
          <button
            key={idx}
            onClick={() => updateAnswer(idx)}
            className={`w-full p-3 border rounded ${
              selectedAnswers[currentQuestion] === idx
                ? 'bg-primary/10 border-primary'
                : ''
            }`}
          >
            {opt}
          </button>
        ))}
      </Card>

      <div className="flex justify-between">
        <Button disabled={currentQuestion === 0} onClick={() => setCurrentQuestion((c) => c - 1)}>
          Previous
        </Button>

        {currentQuestion === questions.length - 1 ? (
          <Button onClick={() => submit()}>Submit</Button>
        ) : (
          <Button onClick={() => setCurrentQuestion((c) => c + 1)}>Next</Button>
        )}
      </div>

      <CameraPreview active={!!attemptId} onFrame={handleFaceFrame} />
    </div>
  )
}

export default function QuizTakePage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading assessment...</p>
      </div>
    }>
      <QuizTakeContent />
    </Suspense>
  )
}