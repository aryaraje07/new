'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export default function OralExamStatsPage() {
  const { examId } = useParams()
  const router = useRouter()

  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const API_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(
          `${API_URL}/trainer/analytics/oral-exams/${examId}/stats`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        )

        const data = await res.json()
        setStudents(data)
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    if (examId) fetchStats()
  }, [examId])

  const sorted = [...students].sort((a, b) => b.score - a.score)

  const average =
    students.length > 0
      ? students.reduce((acc, s) => acc + s.score, 0) / students.length
      : 0

  if (loading) return <p className="p-8">Loading stats...</p>

  return (
    <div className="p-8 space-y-10">
      <h1 className="text-3xl font-bold">Exam Statistics</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 text-center">
          <h2 className="text-sm text-muted-foreground">Total Students</h2>
          <p className="text-3xl font-bold">{students.length}</p>
        </Card>

        <Card className="p-6 text-center">
          <h2 className="text-sm text-muted-foreground">Average Score</h2>
          <p className="text-3xl font-bold text-green-600">
            {average.toFixed(2)}%
          </p>
        </Card>

        <Card className="p-6 text-center">
          <h2 className="text-sm text-muted-foreground">Top Score</h2>
          <p className="text-3xl font-bold text-primary">
            {sorted[0]?.score || 0}%
          </p>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Score Comparison</h2>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sorted}>
            <XAxis dataKey="studentName" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="score" fill="#6366F1" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Leaderboard */}
      <Card className="p-6 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Leaderboard</h2>

        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-3">Rank</th>
              <th className="text-left py-3">Student</th>
              <th className="text-left py-3">Score</th>
              <th className="text-left py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((student, index) => (
              <tr key={student.attemptId} className="border-t">
                <td className="py-2">{index + 1}</td>
                <td className="py-2">{student.studentName}</td>
                <td className="py-2 font-semibold">
                  {student.score}%
                </td>
                <td className="py-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      router.push(
                        `/trainer/review/oral/attempt/${student.attemptId}`
                      )
                    }
                  >
                    View Answers
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
