'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function QuizScheduledResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const router = useRouter()

  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const getToken = () =>
    typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''

  /* ---------------- FETCH RESULT ---------------- */

  useEffect(() => {
    if (!attemptId) return

    const fetchResult = async () => {
      try {
        console.log('Fetching scheduled quiz result for attemptId:', attemptId)
        // For scheduled quizzes, use the exam results endpoint
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        const res = await fetch(
          `${baseUrl}/learner/exams/attempts/${attemptId}/result`,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          }
        )

        if (!res.ok) {
          const errorData = await res.json()
          console.error('Failed to fetch result:', errorData)
          throw new Error(errorData.message || 'Failed to fetch result')
        }

        const data = await res.json()
        console.log('Scheduled quiz result data received:', data)
        
        // Transform the data to match the expected format
        const transformedData = {
          ...data,
          totalQuestions: data.total,
          questions: data.analysis?.map((q: any, i: number) => ({
            question: q.question,
            options: q.options,
            correctIndex: q.correctAnswer,
            selectedIndex: q.studentAnswer,
            isCorrect: q.isCorrect
          })) || [],
          warnings: {
            tab: data.proctoring?.escWarnings || 0,
            face: data.proctoring?.faceWarnings || 0
          },
          status: data.status || 'SUBMITTED'
        }
        
        setResult(transformedData)
      } catch (err: any) {
        console.error('Failed to fetch result:', err)
        setError(err.message || 'Unable to load this assessment report.')
      } finally {
        setLoading(false)
      }
    }

    fetchResult()
  }, [attemptId])

  if (loading) return <div className="p-8">Loading result...</div>
  if (!result) return (
    <div className="p-8 max-w-xl mx-auto text-center space-y-3">
      <h1 className="text-lg font-semibold">Assessment report unavailable</h1>
      <p className="text-sm text-muted-foreground">{error || 'This assessment report could not be found.'}</p>
      <Button variant="outline" onClick={() => router.push('/learner/quiz')}>Back to assessments</Button>
    </div>
  )

  /* ---------------- CALCULATIONS ---------------- */

  const totalQuestions = Number(result.totalQuestions) || 0
  const score = Number(result.score) || 0
  const correct = Math.round((score / 100) * totalQuestions)
  const wrong = Math.max(totalQuestions - correct, 0)

  const chartData = [
    { name: 'Correct', value: correct },
    { name: 'Wrong', value: wrong },
  ]

  const isAutoSubmitted = result.status === 'AUTO_SUBMITTED'

  /* ---------------- PDF DOWNLOAD ---------------- */

  const downloadPDF = () => {
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text('Scheduled Quiz Result Report', 14, 15)

    doc.setFontSize(12)
    doc.text(`Score: ${score}%`, 14, 25)
    doc.text(`Correct: ${correct} / ${totalQuestions}`, 14, 32)
    doc.text(`Status: ${result.status}`, 14, 39)
    doc.text(
      `Warnings — Tab: ${result?.warnings?.tab || 0}, Face: ${
        result?.warnings?.face || 0
      }`,
      14,
      46
    )

    const tableData = Array.isArray(result.questions)
      ? result.questions.map((q: any, i: number) => [
          i + 1,
          q.question || '',
          q.options[q.correctIndex] || 'N/A',
          q.selectedIndex !== null ? q.options[q.selectedIndex] : 'Not Answered',
          q.isCorrect ? 'Correct' : 'Wrong',
        ])
      : []

    autoTable(doc, {
      startY: 55,
      head: [['#', 'Question', 'Correct Answer', 'Your Answer', 'Result']],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [22, 163, 74] },
    })

    doc.save('scheduled-quiz-result.pdf')
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* SUMMARY */}
      <Card className="p-6 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Scheduled Quiz Result</h1>
            {result?.quizTitle && (
              <div className="flex flex-col gap-0.5 mt-1">
                <p className="text-sm font-medium text-slate-700">{result.quizTitle}</p>
                {result?.subject && (
                  <p className="text-xs text-blue-600 font-medium">
                    Subject: {result.subject}
                  </p>
                )}
              </div>
            )}
          </div>
          <Badge
            className={
              isAutoSubmitted ? 'bg-red-600' : 'bg-emerald-600'
            }
          >
            {isAutoSubmitted ? 'Auto Submitted' : 'Submitted'}
          </Badge>
        </div>

        <p className="text-5xl font-bold text-green-600">{score}%</p>
        <p>
          {correct} / {totalQuestions} correct
        </p>

        <p className="text-sm">
          Tab warnings: {Number(result?.warnings?.tab || 0)} | Face warnings:{' '}
          {Number(result?.warnings?.face || 0)}
        </p>

        <div className="flex gap-3 mt-4">
          <Button className="gap-2" onClick={downloadPDF}>
            <Download size={16} /> Download PDF
          </Button>

          <Button variant="outline" onClick={() => router.push('/learner/quiz/scheduled')}>
            Back to Scheduled Exams
          </Button>
        </div>
      </Card>

      {/* ANALYTICS */}
      <Card className="p-6 space-y-3">
        <h2 className="text-xl font-semibold">Analytics</h2>
        <p>Accuracy: {score}%</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#16a34a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* QUESTIONS */}
      {Array.isArray(result.questions) &&
        result.questions.map((q: any, i: number) => (
          <Card
            key={i}
            className={`p-4 border-2 ${
              q.isCorrect
                ? 'border-green-300 bg-green-50'
                : 'border-red-300 bg-red-50'
            }`}
          >
            <p className="font-semibold">
              Q{i + 1}. {q.question}
            </p>

            <div className="mt-3 space-y-2">
              {(Array.isArray(q.options) ? q.options : []).map(
                (opt: string, idx: number) => {
                  const isSelected = q.selectedIndex === idx
                  const isCorrect = q.correctIndex === idx

                  const optionClass = isCorrect
                    ? 'border-green-600 bg-green-100'
                    : isSelected && !q.isCorrect
                    ? 'border-red-600 bg-red-100'
                    : 'border-gray-200'

                  return (
                    <div
                      key={idx}
                      className={`border rounded p-2 ${optionClass}`}
                    >
                      {opt}
                    </div>
                  )
                }
              )}
            </div>

            <p className="mt-3">
              Your answer:{' '}
              <span className="font-semibold">
                {q.selectedIndex !== null ? q.options[q.selectedIndex] : 'Not answered'}
              </span>
            </p>
            <p>
              Correct answer:{' '}
              <span className="font-semibold">
                {q.options[q.correctIndex] || 'N/A'}
              </span>
            </p>
          </Card>
        ))}
    </div>
  )
}