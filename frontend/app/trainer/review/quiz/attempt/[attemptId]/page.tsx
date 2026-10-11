'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, User, Clock, AlertTriangle, CheckCircle, XCircle, Eye, Calendar, Shield } from 'lucide-react'

type QuestionWithAnswer = {
  questionIndex: number
  questionId: string
  question: string
  options: string[]
  correctAnswer: number
  studentAnswer: number | null
  isCorrect: boolean
}

type Attempt = {
  _id: string
  student: {
    fullName: string
    email: string
  }
  exam: {
    _id: string
    title: string
    subject: string
    duration: number
    totalQuestions: number
  }
  score: number
  totalQuestions: number
  status: string
  submittedAt: string
  startedAt: string
  proctoring: {
    faceWarnings: number
    escWarnings: number
    autoSubmitted: boolean
    reasons: string[]
  }
}

export default function QuizAttemptReviewPage() {
  const params = useParams()
  const router = useRouter()
  const { attemptId } = params

  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [questionsWithAnswers, setQuestionsWithAnswers] = useState<QuestionWithAnswer[]>([])
  const [loading, setLoading] = useState(true)

  const getToken = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token') || ''
      if (!token) {
        console.error('No token found in localStorage')
        // Redirect to login if no token
        window.location.href = '/login'
        return ''
      }
      return token
    }
    return ''
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    const fetchAttemptDetails = async () => {
      try {
        const token = getToken()
        
        const res = await fetch(`${API_URL}/trainer/attempt-details/${attemptId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        
        if (res.ok) {
          try {
            const data = await res.json()
            setAttempt(data.attempt)
            setQuestionsWithAnswers(data.questionsWithAnswers)
          } catch (parseError) {
            console.error('Failed to parse attempt details response as JSON:', parseError)
            const responseText = await res.text()
            console.error('Response text:', responseText)
          }
        } else {
          console.error('Failed to fetch attempt details:', res.status, res.statusText)
          const errorText = await res.text()
          console.error('Error response:', errorText)
        }
      } catch (error) {
        console.error('Error fetching attempt details:', error)
      } finally {
        setLoading(false)
      }
    }

    if (attemptId) {
      fetchAttemptDetails()
    }
  }, [attemptId])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!attempt) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-600">Attempt not found</h2>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const correctCount = questionsWithAnswers.filter(q => q.isCorrect).length
  const wrongCount = questionsWithAnswers.filter(q => !q.isCorrect && q.studentAnswer !== null).length
  const notAnsweredCount = questionsWithAnswers.filter(q => q.studentAnswer === null).length
  
  const timeTaken = attempt.startedAt && attempt.submittedAt 
    ? Math.round((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 60000)
    : 0
  
  // Calculate additional analytics
  const accuracy = questionsWithAnswers.filter(q => q.studentAnswer !== null).length > 0 
    ? Math.round((correctCount / questionsWithAnswers.filter(q => q.studentAnswer !== null).length) * 100)
    : 0
  
  const timePerQuestion = timeTaken > 0 ? Math.round(timeTaken / attempt.totalQuestions) : 0
  const performanceLevel = attempt.score >= 80 ? 'Excellent' : attempt.score >= 60 ? 'Good' : attempt.score >= 40 ? 'Average' : 'Needs Improvement'
  const performanceColor = attempt.score >= 80 ? 'text-green-600' : attempt.score >= 60 ? 'text-blue-600' : attempt.score >= 40 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header with Quiz Info */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Button variant="ghost" onClick={() => router.back()} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Quiz Review
            </Button>
            <h1 className="text-3xl font-bold text-gray-800">{attempt.exam.title}</h1>
            <div className="flex items-center gap-4 mt-2">
              <Badge className="bg-blue-100 text-blue-800">
                {attempt.exam.subject}
              </Badge>
              <Badge variant="outline">
                {attempt.exam.totalQuestions} Questions
              </Badge>
              <Badge variant="outline">
                {attempt.exam.duration} mins
              </Badge>
            </div>
          </div>
          <Badge className={
            attempt.status === 'SUBMITTED' ? 'bg-green-600' :
            attempt.status === 'AUTO_SUBMITTED' ? 'bg-red-600' : 'bg-gray-600'
          }>
            {attempt.status === 'SUBMITTED' ? 'Submitted' :
             attempt.status === 'AUTO_SUBMITTED' ? 'Auto Submitted' : attempt.status}
          </Badge>
        </div>
      </Card>

      {/* Student Performance Summary */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <User className="w-5 h-5 mr-2" />
          Student Performance Analysis
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-600 mb-1">Overall Score</p>
            <p className={`text-2xl font-bold ${performanceColor}`}>
              {attempt.score}%
            </p>
            <Badge className={`mt-2 ${
              attempt.score >= 80 ? 'bg-green-100 text-green-800' :
              attempt.score >= 60 ? 'bg-blue-100 text-blue-800' :
              attempt.score >= 40 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {performanceLevel}
            </Badge>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-600 mb-1">Accuracy Rate</p>
            <p className="text-2xl font-bold text-blue-600">{accuracy}%</p>
            <p className="text-xs text-gray-500 mt-1">of answered questions</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-600 mb-1">Time Efficiency</p>
            <p className="text-2xl font-bold text-green-600">{timePerQuestion} sec</p>
            <p className="text-xs text-gray-500 mt-1">per question</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
            <p className="text-2xl font-bold text-purple-600">
              {Math.round(((attempt.totalQuestions - notAnsweredCount) / attempt.totalQuestions) * 100)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">questions answered</p>
          </div>
        </div>
      </Card>

      {/* Answer Distribution Chart */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Answer Distribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{correctCount}</p>
            <p className="text-sm text-gray-600">Correct Answers</p>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${(correctCount / attempt.totalQuestions) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-2">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">{wrongCount}</p>
            <p className="text-sm text-gray-600">Wrong Answers</p>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full"
                style={{ width: `${(wrongCount / attempt.totalQuestions) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle className="w-12 h-12 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-600">{notAnsweredCount}</p>
            <p className="text-sm text-gray-600">Not Answered</p>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gray-600 h-2 rounded-full"
                style={{ width: `${(notAnsweredCount / attempt.totalQuestions) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </Card>

      {/* Student Information */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <User className="w-5 h-5 mr-2" />
          Student Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Student Name</p>
            <p className="font-semibold text-lg">{attempt.student.fullName}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Email Address</p>
            <p className="font-medium text-sm">{attempt.student.email}</p>
          </div>
        </div>
      </Card>

      {/* Proctoring Summary */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Proctoring Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center">
              <Eye className="w-5 h-5 text-yellow-600 mr-2" />
              <span>Face Warnings</span>
            </div>
            <span className="font-semibold">{attempt.proctoring.faceWarnings}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
              <span>ESC Warnings</span>
            </div>
            <span className="font-semibold">{attempt.proctoring.escWarnings}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-600 mr-2" />
              <span>Auto Submitted</span>
            </div>
            <span className="font-semibold">{attempt.proctoring.autoSubmitted ? 'Yes' : 'No'}</span>
          </div>
        </div>
        {attempt.proctoring.reasons.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Reasons for Auto-Submission:</p>
            <div className="space-y-1">
              {attempt.proctoring.reasons.map((reason, index) => (
                <Badge key={index} variant="outline" className="mr-2">
                  {reason}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Questions and Answers - Enhanced with Analytics */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Question-wise Analysis</h2>
          <div className="flex gap-2">
            <Badge className="bg-green-100 text-green-800">
              {correctCount} Correct ({Math.round((correctCount / attempt.totalQuestions) * 100)}%)
            </Badge>
            <Badge className="bg-red-100 text-red-800">
              {wrongCount} Wrong ({Math.round((wrongCount / attempt.totalQuestions) * 100)}%)
            </Badge>
            <Badge className="bg-gray-100 text-gray-800">
              {notAnsweredCount} Skipped ({Math.round((notAnsweredCount / attempt.totalQuestions) * 100)}%)
            </Badge>
          </div>
        </div>
        <div className="space-y-6">
          {questionsWithAnswers.map((question, index) => (
            <Card
              key={question.questionId}
              className={`p-6 border-2 transition-all hover:shadow-lg ${
                question.isCorrect
                  ? 'border-green-300 bg-green-50'
                  : question.studentAnswer === null
                  ? 'border-gray-300 bg-gray-50'
                  : 'border-red-300 bg-red-50'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">
                      Question {question.questionIndex + 1}
                    </h3>
                    <Badge className={`${
                      question.isCorrect ? 'bg-green-600 text-white' :
                      question.studentAnswer === null ? 'bg-gray-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                      {question.isCorrect ? '✓ Correct' :
                       question.studentAnswer === null ? '○ Skipped' : '✗ Wrong'}
                    </Badge>
                  </div>
                  <p className="text-gray-700">{question.question}</p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm text-gray-500">Points</p>
                  <p className={`text-lg font-bold ${
                    question.isCorrect ? 'text-green-600' :
                    question.studentAnswer === null ? 'text-gray-600' : 'text-red-600'
                  }`}>
                    {question.isCorrect ? '+1' : question.studentAnswer === null ? '0' : '0'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {question.options.map((option, optionIndex) => {
                  const isCorrect = optionIndex === question.correctAnswer
                  const isSelected = optionIndex === question.studentAnswer
                  const optionClass = isCorrect
                    ? 'border-green-600 bg-green-100'
                    : isSelected && !question.isCorrect
                    ? 'border-red-600 bg-red-100'
                    : 'border-gray-200 bg-white'

                  return (
                    <div
                      key={optionIndex}
                      className={`border rounded-lg p-3 transition-all ${optionClass}`}
                    >
                      <div className="flex items-center">
                        <span className="font-medium mr-3 text-lg">
                          {String.fromCharCode(65 + optionIndex)}.
                        </span>
                        <span className="flex-1">{option}</span>
                        <div className="flex items-center gap-2">
                          {isCorrect && (
                            <Badge className="bg-green-600 text-white">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Correct
                            </Badge>
                          )}
                          {isSelected && !isCorrect && (
                            <Badge className="bg-red-600 text-white">
                              <XCircle className="w-3 h-3 mr-1" />
                              Selected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t pt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-white p-3 rounded border">
                    <p className="font-semibold text-gray-600 mb-1">Student Selected:</p>
                    <p className="font-medium">
                      {question.studentAnswer !== null 
                        ? `${String.fromCharCode(65 + question.studentAnswer)}. ${question.options[question.studentAnswer]}`
                        : <span className="text-gray-500 italic">Not answered</span>
                      }
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded border border-green-200">
                    <p className="font-semibold text-green-700 mb-1">Correct Answer:</p>
                    <p className="font-medium text-green-800">
                      {String.fromCharCode(65 + question.correctAnswer)}. {question.options[question.correctAnswer]}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Timeline */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Timeline
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Started At</span>
            <span className="font-medium">
              {new Date(attempt.startedAt).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Submitted At</span>
            <span className="font-medium">
              {new Date(attempt.submittedAt).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Duration</span>
            <span className="font-medium">{timeTaken} minutes</span>
          </div>
        </div>
      </Card>
    </div>
  )
}