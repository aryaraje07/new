'use client'

import { useSearchParams } from 'next/navigation'
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

export default function QuizResultsPage() {
  const params = useSearchParams()
  const attemptId = params.get('attemptId')

  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const getToken = () =>
    typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''

  useEffect(() => {
    if (!attemptId) {
      setError('This assessment report link is missing an attempt ID.')
      setLoading(false)
      return
    }

    const fetchResult = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
        const res = await fetch(`${baseUrl}/quiz/result/${attemptId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
        
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(payload.message || 'Failed to fetch result')
        }
        
        const data = await res.json()
        setResult(data)
      } catch (err) {
        console.error('Failed to fetch result:', err)
        setError(err instanceof Error ? err.message : 'Unable to load this assessment report.')
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
      <Button variant="outline" onClick={() => window.location.assign('/learner/quiz')}>Back to assessments</Button>
    </div>
  )

  const totalQuestions = Number(result.totalQuestions) || 0
  const score = Number(result.score) || 0
  const correct = Math.round((score / 100) * totalQuestions)
  const wrong = Math.max(totalQuestions - correct, 0)

  const chartData = [
    { name: 'Correct', value: correct },
    { name: 'Wrong', value: wrong },
  ]

  /* ---------------- PDF DOWNLOAD ---------------- */

  const downloadPDF = () => {
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text('Quiz Result Report', 14, 15)

  doc.setFontSize(12)
  doc.text(`Score: ${score}%`, 14, 25)
  doc.text(`Correct: ${correct} / ${totalQuestions}`, 14, 32)

  const tableData = Array.isArray(result.questions)
  ? result.questions.map((q: any, i: number) => [
      i + 1,
      q.question || '',
      q.options[q.correctIndex] || 'N/A',
      q.selectedIndex !== null ? q.options[q.selectedIndex] : 'Not Answered',
      q.isCorrect ? 'Correct' : 'Wrong',
    ])
  : [];

  autoTable(doc, {
    startY: 40,
    head: [['#', 'Question', 'Correct Answer', 'Your Answer', 'Result']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [22, 163, 74] },
  })

  doc.save('quiz-result.pdf')
}

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* SUMMARY */}
      <Card className="p-6 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quiz Result</h1>
            {result?.subject && (
              <p className="text-sm text-blue-600 font-medium mt-1">
                Subject: {result.subject}
              </p>
            )}
          </div>
          <Badge className="bg-emerald-600">AI Evaluated</Badge>
        </div>

        <p className="text-5xl font-bold text-green-600">{score}%</p>
        <p>
          {correct} / {totalQuestions} correct
        </p>
        <p className="text-sm">
          Tab warnings: {Number(result?.warnings?.tab || 0)} | Face warnings:{' '}
          {Number(result?.warnings?.face || 0)}
        </p>

        <Button className="mt-4 w-fit gap-2" onClick={downloadPDF}>
          <Download size={16} /> Download PDF
        </Button>
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
              q.isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
            }`}
          >
            <p className="font-semibold">
              Q{i + 1}. {q.question}
            </p>

            <div className="mt-3 space-y-2">
              {(Array.isArray(q.options) ? q.options : []).map((opt: string, idx: number) => {
                const isSelected = q.selectedIndex === idx
                const isCorrect = q.correctIndex === idx
                const optionClass = isCorrect
                  ? 'border-green-600 bg-green-100'
                  : isSelected && !q.isCorrect
                  ? 'border-red-600 bg-red-100'
                  : 'border-gray-200'
                return (
                  <div key={idx} className={`border rounded p-2 ${optionClass}`}>
                    {opt}
                  </div>
                )
              })}
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