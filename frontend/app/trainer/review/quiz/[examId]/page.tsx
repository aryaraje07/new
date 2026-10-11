'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users, TrendingUp, Award, AlertCircle } from 'lucide-react'

interface Exam {
  _id: string
  title: string
  subject: string
  difficulty: string
  duration: number
  totalQuestions: number
  scheduledAt: string
  status: string
}

interface QuizStats {
  totalStudents: number
  averageScore: number
  topScore: number
  lowestScore: number
  passRate: number
  passedStudents: number
  failedStudents: number
  leaderboard: Array<{
    attemptId: string
    studentName: string
    studentEmail: string
    score: number
    status: string
    submittedAt: string
    proctoring: any
  }>
  scoreRanges: {
    '0-20': number
    '21-40': number
    '41-60': number
    '61-80': number
    '81-100': number
  }
  totalAttempts: number
}

export default function QuizReviewPage() {
  const params = useParams()
  const router = useRouter()
  const { examId } = params

  const [exam, setExam] = useState<Exam | null>(null)
  const [stats, setStats] = useState<QuizStats | null>(null)
  const [loading, setLoading] = useState(true)

  const getToken = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token') || ''
      if (!token) {
        console.error('No token found in localStorage')
        window.location.href = '/login'
        return ''
      }
      return token
    }
    return ''
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        const token = getToken()
        
        // Fetch exam details first
        const examRes = await fetch(`${API_URL}/trainer/exams/${examId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        
        if (examRes.ok) {
          try {
            const examData = await examRes.json()
            setExam(examData)
          } catch (parseError) {
            console.error('Failed to parse exam response as JSON:', parseError)
            const responseText = await examRes.text()
            console.error('Response text:', responseText)
          }
        } else {
          console.error('Exam fetch failed:', examRes.status, examRes.statusText)
          const errorText = await examRes.text()
          console.error('Error response:', errorText)
        }

        // Fetch quiz attempts and stats
        const statsRes = await fetch(`${API_URL}/trainer/exam-attempts/${examId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        
        if (statsRes.ok) {
          try {
            const statsData = await statsRes.json()
            
            // Transform the data to match our expected format
            const transformedStats = {
              totalStudents: statsData.totalAttempts,
              averageScore: statsData.attempts.length > 0 
                ? Math.round((statsData.attempts.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / statsData.attempts.length) * 100) / 100
                : 0,
              topScore: statsData.attempts.length > 0 ? Math.max(...statsData.attempts.map((a: any) => a.score || 0)) : 0,
              lowestScore: statsData.attempts.length > 0 ? Math.min(...statsData.attempts.map((a: any) => a.score || 0)) : 0,
              passRate: statsData.attempts.length > 0
  ? Math.round(
      (statsData.attempts.filter((a: any) => (a.score || 0) >= 40).length /
        statsData.attempts.length) *
        100
    )
  : 0,
              passedStudents: statsData.attempts.filter((a: any) => (a.score || 0) >= 40).length,
              failedStudents: statsData.attempts.filter((a: any) => (a.score || 0) < 40).length,
              leaderboard: statsData.leaderboard.map((entry: any) => ({
                attemptId: entry._id,
                studentName: entry.student.name,
                studentEmail: entry.student.email,
                score: entry.score,
                status: entry.status,
                submittedAt: entry.submittedAt,
                // proctoring: entry.warnings
              })),
              scoreRanges: {
                '0-20': statsData.attempts.filter((a: any) => (a.score || 0) <= 20).length,
                '21-40': statsData.attempts.filter((a: any) => (a.score || 0) > 20 && (a.score || 0) <= 40).length,
                '41-60': statsData.attempts.filter((a: any) => (a.score || 0) > 40 && (a.score || 0) <= 60).length,
                '61-80': statsData.attempts.filter((a: any) => (a.score || 0) > 60 && (a.score || 0) <= 80).length,
                '81-100': statsData.attempts.filter((a: any) => (a.score || 0) > 80).length,
              },
              totalAttempts: statsData.totalAttempts
            }
            
            setStats(transformedStats)
          } catch (parseError) {
            console.error('Failed to parse stats response as JSON:', parseError)
            const responseText = await statsRes.text()
            console.error('Response text:', responseText)
          }
        } else {
          console.error('Stats fetch failed:', statsRes.status, statsRes.statusText)
          const errorText = await statsRes.text()
          console.error('Error response:', errorText)
        }
      } catch (error) {
        console.error('Error fetching exam data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (examId) {
      fetchExamData()
    }
  }, [examId])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-600">Exam not found</h2>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const scoreChartData = stats ? Object.entries(stats.scoreRanges).map(([range, count]) => ({
    range,
    count,
    percentage: stats.totalAttempts > 0 ? Math.round((count / stats.totalAttempts) * 100) : 0
  })) : []

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.back()} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reviews
          </Button>
        </div>
        <div>
          <h1 className="text-3xl font-bold">Quiz Analytics</h1>
          {exam && (
            <p className="text-muted-foreground">
              {exam.title} - {exam.subject}
            </p>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{stats.averageScore.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <Award className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{stats.topScore}</p>
                <p className="text-sm text-muted-foreground">Top Score</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{stats.passRate}%</p>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Score Distribution Chart */}
      {stats && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Score Distribution</h3>
          <div className="space-y-2">
            {scoreChartData.map((data) => (
              <div key={data.range} className="flex items-center justify-between">
                <span className="text-sm font-medium">{data.range}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-4 ml-4">
                  <div 
                    className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${data.percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm text-muted-foreground ml-4">
                  {data.count} students ({data.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pass/Fail Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-green-600">Passed Students</h3>
            <p className="text-3xl font-bold text-green-600">{stats.passedStudents}</p>
            <p className="text-sm text-muted-foreground">
              Out of {stats.totalStudents} total students
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Failed Students</h3>
            <p className="text-3xl font-bold text-red-600">{stats.failedStudents}</p>
            <p className="text-sm text-muted-foreground">
              Out of {stats.totalStudents} total students
            </p>
          </Card>
        </div>
      )}

      {/* Student Leaderboard */}
      {stats && stats.leaderboard.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Student Leaderboard</h3>
            <Button variant="outline" size="sm">
              Export Data
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border  px-4 py-2 text-left">Rank</th>
                  <th className="border  px-4 py-2 text-left">Student Name</th>
                  <th className="border  px-4 py-2 text-left">Email</th>
                  <th className="border  px-4 py-2 text-left">Score</th>
                  <th className="border  px-4 py-2 text-left">Status</th>
                  <th className="border  px-4 py-2 text-left">Submitted</th>
                  {/* <th className="border px-4 py-2 text-left">Warnings</th> */}
                </tr>
              </thead>
              <tbody>
                {stats.leaderboard.map((student, index) => (
                  <tr key={student.attemptId} className="hover:bg-gray-50">
                    <td className="border  px-4 py-2">{index + 1}</td>
                    <td className="border  px-4 py-2 font-medium">{student.studentName}</td>
                    <td className="border  px-4 py-2">{student.studentEmail}</td>
                    <td className="border  px-4 py-2">
                      <span className={`font-bold ${
                        student.score >= 40 ? 'text-green-600' : 
                        student.score >= 30 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {student.score}
                      </span>
                    </td>
                    <td className="border  px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        student.status === 'SUBMITTED' ? 'bg-green-100 text-green-800' :
                        student.status === 'AUTO_SUBMITTED' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {student.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="border  px-4 py-2">
                      {new Date(student.submittedAt).toLocaleDateString()}
                    </td>
                    {/* <td className="border border px-4 py-2">
                      <div className="flex space-x-1">
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                          Tab: {student.proctoring?.tab || 0}
                        </span>
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          Face: {student.proctoring?.face || 0}
                        </span>
                      </div>
                    </td> */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}