'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, ChevronLeft, Play, X } from 'lucide-react'

type ScheduledExam = {
  _id: string
  title: string
  subject: string
  description?: string
  difficulty: string
  scheduledAt: string
  duration: number
  totalQuestions: number
  faculty?: {
  fullName: string
  email: string
}
}

export default function ScheduledQuizzesPage() {
  const [exams, setExams] = useState<ScheduledExam[]>([])
  const [loading, setLoading] = useState(true)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedQuiz, setSelectedQuiz] =
    useState<ScheduledExam | null>(null)

  /* ---------------- FETCH SCHEDULED EXAMS ---------------- */
 useEffect(() => {
  const fetchExams = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/learner/exams/scheduled`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )

      const data = await res.json()

      // ✅ FINAL FIX
      setExams(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load scheduled exams', err)
      setExams([])
    } finally {
      setLoading(false)
    }
  }

  fetchExams()
}, [])

  /* ---------------- TIME CHECK ---------------- */
 const canStartExam = (scheduledAt: string, duration: number) => {
  const GRACE_MINUTES = 2
  const now = Date.now()
  const start = new Date(scheduledAt).getTime()
  const graceStart = start - GRACE_MINUTES * 60 * 1000
  const end = start + duration * 60 * 1000

  return now >= graceStart && now <= end
}

  const handleViewDetails = (quiz: ScheduledExam) => {
    setSelectedQuiz(quiz)
    setShowDetailsModal(true)
  }

  if (loading) {
    return (
      <div className="p-8 text-muted-foreground">
        Loading scheduled exams...
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/learner/quiz">
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>

        <div>
          <h1 className="text-3xl font-bold">Scheduled Exams</h1>
          <p className="text-muted-foreground mt-1">
            Exams scheduled by your faculty
          </p>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {exams.length > 0 ? (
          exams.map((quiz) => {
            const canStart = canStartExam(
              quiz.scheduledAt,
              quiz.duration
            )

            return (
              <Card
                key={quiz._id}
                className="p-8 border hover:border-primary/40 transition"
              >
                <div className="space-y-6">
                  {/* Header */}
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">
                          {quiz.title}
                        </h3>
                        <div className="flex flex-wrap gap-2 items-center">
                          {quiz.subject && (
                            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full border border-blue-300">
                              📚 {quiz.subject}
                            </span>
                          )}
                          <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold border border-purple-300">
                            {quiz.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-3">
  by {quiz.faculty?.fullName || 'Faculty'}
</p>
                  </div>

                  <div className="border-t" />

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Date & Time
                      </p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="text-sm">
                          {new Date(
                            quiz.scheduledAt
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm ml-6">
                        {new Date(
                          quiz.scheduledAt
                        ).toLocaleTimeString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Duration
                      </p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="text-sm">
                          {quiz.duration} minutes
                        </span>
                      </div>
                      <p className="text-sm ml-6">
                        {quiz.totalQuestions} questions
                      </p>
                    </div>
                  </div>

                  <div className="border-t" />

                  {/* Actions */}
                  <div className="space-y-3">
                    <Button
  className="w-full gap-2"
  disabled={!canStart}
  onClick={() => {
    if (canStart) {
      window.location.href = `/learner/quiz/take/${quiz._id}`
    }
  }}
>
  <Play className="w-4 h-4" />
  {canStart ? 'Start Exam' : 'Not Available'}
</Button>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleViewDetails(quiz)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })
        ) : (
          <Card className="p-10 text-center text-muted-foreground">
            No scheduled exams available
          </Card>
        )}
      </div>

      {/* Instructions */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">
          Important Instructions
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Camera access is mandatory</li>
          <li>• Full screen will be enforced</li>
          <li>• Do not switch tabs or press ESC</li>
          <li>• Face must be visible at all times</li>
        </ul>
      </Card>

      {/* Details Modal */}
      {showDetailsModal && selectedQuiz && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl p-8">
            <div className="flex justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">
                  {selectedQuiz.title}
                </h2>
                <p className="text-muted-foreground">
                  {selectedQuiz.subject}
                </p>
              </div>

              <button
                onClick={() => setShowDetailsModal(false)}
              >
                <X />
              </button>
            </div>

            <p className="text-sm mb-4">
              {selectedQuiz.description ||
                'No description provided by faculty.'}
            </p>

            <Button
              className="w-full"
              onClick={() => setShowDetailsModal(false)}
            >
              Close
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}