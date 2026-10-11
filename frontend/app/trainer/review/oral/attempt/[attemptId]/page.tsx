'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'

export default function AttemptDetailPage() {
  const { attemptId } = useParams()
  const [attempt, setAttempt] = useState<any>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    const fetchAttempt = async () => {
      const res = await fetch(
        `${API_URL}/trainer/analytics/attempt/${attemptId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      )

      const data = await res.json()
      setAttempt(data)
    }

    if (attemptId) fetchAttempt()
  }, [attemptId])

  if (!attempt) return <p className="p-8">Loading...</p>

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">
        {attempt.student.fullName} - Answers
      </h1>

      {attempt.answers.map((ans: any, index: number) => {
        const question =
          attempt.exam.questions[ans.questionIndex]

        return (
          <Card key={index} className="p-6 space-y-3">
            <h3 className="font-semibold">
              Question {index + 1}
            </h3>

            <p className="font-medium">{question.question}</p>

            <p>
              <strong>Student Answer:</strong>{' '}
              {ans.studentAnswer || 'Not answered'}
            </p>

            <p>
              <strong>Score:</strong> {ans.score}/10
            </p>

            <p className="text-sm text-muted-foreground">
              {ans.aiFeedback}
            </p>
          </Card>
        )
      })}
    </div>
  )
}
