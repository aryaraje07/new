'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, TrendingUp, Award, AlertCircle, Eye } from 'lucide-react'

interface StudentAttempt {
  _id: string
  student: {
    fullName: string
    email: string
  }
  score: number
  status: string
  submittedAt: string
  startedAt: string
  proctoring: {
    faceWarnings: number
    escWarnings: number
    autoSubmitted: boolean
  }
}

interface Exam {
  _id: string
  title: string
  subject: string
  duration: number
  totalQuestions: number
}

export default function StudentAnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const { examId } = params

  const [exam, setExam] = useState<Exam | null>(null)
  const [attempts, setAttempts] = useState<StudentAttempt[]>([])
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
    const fetchStudentAttempts = async () => {
      try {
        const token = getToken()
        
        // Fetch exam details
        const examRes = await fetch(`${API_URL}/trainer/exams/${examId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        
        if (examRes.ok) {
          const examData = await examRes.json()
          setExam(examData)
        }

        // Fetch all attempts for this exam
        const attemptsRes = await fetch(`${API_URL}/trainer/exam-attempts/${examId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        
        if (attemptsRes.ok) {
          const attemptsData = await attemptsRes.json()
          setAttempts(attemptsData.leaderboard || [])
        } else {
          console.error('Failed to fetch attempts:', attemptsRes.status, attemptsRes.statusText)
        }
      } catch (error) {
        console.error('Error fetching student attempts:', error)
      } finally {
        setLoading(false)
      }
    }

    if (examId) {
      fetchStudentAttempts()
    }
  }, [examId])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
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

  const averageScore = attempts.length > 0 
    ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length)
    : 0

  const passedStudents = attempts.filter(a => a.score >= 40).length
  const failedStudents = attempts.filter(a => a.score < 40).length

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.back()} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Review Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Student Analysis</h1>
          <p className="text-gray-600">{exam.title} - {exam.subject}</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold">{attempts.length}</p>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold">{averageScore.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Average Score</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <Award className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold">{passedStudents}</p>
              <p className="text-sm text-muted-foreground">Passed Students</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-2xl font-bold">{failedStudents}</p>
              <p className="text-sm text-muted-foreground">Failed Students</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Students List */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Student Performance List</h2>
          <div className="text-sm text-gray-500">
            Click on any student to view detailed analysis
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border  px-4 py-3 text-left">Rank</th>
                <th className="border  px-4 py-3 text-left">Student Name</th>
                <th className="border  px-4 py-3 text-left">Email</th>
                <th className="border  px-4 py-3 text-left">Score</th>
                <th className="border  px-4 py-3 text-left">Status</th>
                <th className="border  px-4 py-3 text-left">Submitted</th>
                <th className="border  px-4 py-3 text-left">Warnings</th>
                {/* <th className="border border px-4 py-3 text-left">Actions</th> */}
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt, index) => (
                <tr key={attempt._id} className="hover:bg-gray-50">
                  <td className="border  px-4 py-3 font-medium">{index + 1}</td>
                  <td className="border  px-4 py-3 font-medium">{attempt.student.fullName}</td>
                  <td className="border  px-4 py-3">{attempt.student.email}</td>
                  <td className="border  px-4 py-3">
                    <span className={`font-bold ${
                      attempt.score >= 80 ? 'text-green-600' : 
                      attempt.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {attempt.score}%
                    </span>
                  </td>
                  <td className="border  px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      attempt.status === 'SUBMITTED' ? 'bg-green-100 text-green-800' :
                      attempt.status === 'AUTO_SUBMITTED' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {attempt.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="border  px-4 py-3">
                    {new Date(attempt.submittedAt).toLocaleDateString()}
                  </td>
                  {/* <td className="border border px-4 py-3">
                    <div className="flex space-x-1">
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                        Face: {attempt.proctoring?.faceWarnings || 0}
                      </span>
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                        ESC: {attempt.proctoring?.escWarnings || 0}
                      </span>
                    </div>
                  </td> */}
                  <td className="border  px-4 py-3">
                    <Button
                      size="sm"
                      onClick={() => router.push(`/trainer/review/quiz/attempt/${attempt._id}`)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}