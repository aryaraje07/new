'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Trophy,
  Target,
  BookOpen,
  ExternalLink,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Star,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import API from '@/lib/api'

interface AnalysisData {
  _id: string
  student: string
  test: string
  topic: string
  timeLimit: number
  totalQuestions: number
  correctAnswers: number
  score: number
  timeTaken: number
  completedAt: string
  analysis: {
    codeQuality: { score: number; feedback: string }
    timeComplexity: { score: number; feedback: string }
    spaceComplexity: { score: number; feedback: string }
    correctness: { score: number; feedback: string }
    overallFeedback: string
    weakAreas: string[]
    strongAreas: string[]
    recommendations: Array<{
      type?: string
      title: string
      description: string
      url: string
      platform: string
    }>
  }
  questionAnalyses?: Array<{
    questionId: string
    questionTitle: string
    questionDescription?: string
    submittedCode: string
    language: string
    correctedCode: string
    optimizedCode: string
    topicsUsed: string[]
    feedback: string
    codeQuality?: { score: number; feedback: string }
    timeComplexity?: { score: number; feedback: string }
    spaceComplexity?: { score: number; feedback: string }
    correctness?: { score: number; feedback: string }
    score: number
  }>
}

export default function CodeEditorAnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const resultId = params.resultId as string

  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (resultId) {
      loadAnalysis()
    }
  }, [resultId])

  const loadAnalysis = async () => {
    try {
      const response = await API.get(`/learner/code-editor/analysis/${resultId}`)
      setAnalysis(response.data.analysis)
    } catch (error) {
      console.error('Error loading analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading analysis...</p>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="p-8 text-center">
        <p>Analysis not found</p>
        <Button onClick={() => router.push('/learner/code-editor')} className="mt-4">
          Back to Code Editor
        </Button>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/learner/code-editor')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Coding Test Analysis</h1>
            <p className="text-muted-foreground">
              {analysis.topic} • Completed on {new Date(analysis.completedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className={`text-4xl font-bold ${getScoreColor(analysis.score)}`}>
            {analysis.score}%
          </div>
          <p className="text-sm text-muted-foreground">
            {analysis.correctAnswers}/{analysis.totalQuestions} correct
          </p>
        </div>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 text-center">
          <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
          <div className="text-2xl font-bold">{analysis.score}%</div>
          <p className="text-sm text-muted-foreground">Overall Score</p>
        </Card>

        <Card className="p-6 text-center">
          <Target className="w-8 h-8 mx-auto mb-2 text-blue-500" />
          <div className="text-2xl font-bold">{analysis.correctAnswers}</div>
          <p className="text-sm text-muted-foreground">Questions Solved</p>
        </Card>

        <Card className="p-6 text-center">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <div className="text-2xl font-bold">{analysis.timeTaken}</div>
          <p className="text-sm text-muted-foreground">Minutes Taken</p>
        </Card>

        <Card className="p-6 text-center">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-500" />
          <div className="text-2xl font-bold">{analysis.totalQuestions}</div>
          <p className="text-sm text-muted-foreground">Total Questions</p>
        </Card>
      </div>

      {/* Detailed Analysis */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Performance Metrics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Code Quality</span>
                    <span className="text-sm">{analysis.analysis.codeQuality.score}/10</span>
                  </div>
                  <Progress value={analysis.analysis.codeQuality.score * 10} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {analysis.analysis.codeQuality.feedback}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Time Complexity</span>
                    <span className="text-sm">{analysis.analysis.timeComplexity.score}/10</span>
                  </div>
                  <Progress value={analysis.analysis.timeComplexity.score * 10} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {analysis.analysis.timeComplexity.feedback}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Space Complexity</span>
                    <span className="text-sm">{analysis.analysis.spaceComplexity.score}/10</span>
                  </div>
                  <Progress value={analysis.analysis.spaceComplexity.score * 10} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {analysis.analysis.spaceComplexity.feedback}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Correctness</span>
                    <span className="text-sm">{analysis.analysis.correctness.score}/10</span>
                  </div>
                  <Progress value={analysis.analysis.correctness.score * 10} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {analysis.analysis.correctness.feedback}
                  </p>
                </div>
              </div>
            </Card>

            {/* Areas of Improvement */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Areas of Focus</h3>
              <div className="space-y-4">
                {analysis.analysis.strongAreas.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Strong Areas
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.analysis.strongAreas.map((area, index) => (
                        <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.analysis.weakAreas.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Areas for Improvement
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.analysis.weakAreas.map((area, index) => (
                        <Badge key={index} variant="secondary" className="bg-red-100 text-red-800">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Overall Feedback */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Overall Feedback</h3>
            <p className="text-muted-foreground leading-relaxed">
              {analysis.analysis.overallFeedback}
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          <div className="space-y-4">
            {analysis.questionAnalyses?.map((question, index) => (
              <Card key={question.questionId} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{question.questionTitle}</h3>
                    <p className="text-sm text-muted-foreground">Language: {question.language}</p>
                  </div>
                  <Badge className={question.score >= 80 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {question.score}%
                  </Badge>
                </div>

                <Tabs defaultValue="submitted" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="submitted">Your Code</TabsTrigger>
                    <TabsTrigger value="corrected">Corrected Code</TabsTrigger>
                    <TabsTrigger value="optimized">Optimized Code</TabsTrigger>
                  </TabsList>

                  <TabsContent value="submitted" className="mt-4">
                    <ScrollArea className="h-64 w-full border rounded p-4">
                      <pre className="text-sm whitespace-pre-wrap">{question.submittedCode}</pre>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="corrected" className="mt-4">
                    <ScrollArea className="h-64 w-full border rounded p-4">
                      <pre className="text-sm whitespace-pre-wrap">{question.correctedCode}</pre>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="optimized" className="mt-4">
                    <ScrollArea className="h-64 w-full border rounded p-4">
                      <pre className="text-sm whitespace-pre-wrap">{question.optimizedCode}</pre>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>

                <div className="mt-4">
                  <h4 className="font-medium mb-2">Topics Used</h4>
                  <div className="flex flex-wrap gap-2">
                    {question.topicsUsed.map((topic, idx) => (
                      <Badge key={idx} variant="outline">{topic}</Badge>
                    ))}
                  </div>
                </div>

                <Separator className="my-4" />

                <div>
                  <h4 className="font-medium mb-2">Feedback</h4>
                  <p className="text-muted-foreground">{question.feedback}</p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Detailed Feedback</h3>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Code Quality</h4>
                <p className="text-muted-foreground">{analysis.analysis.codeQuality.feedback}</p>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Time Complexity</h4>
                <p className="text-muted-foreground">{analysis.analysis.timeComplexity.feedback}</p>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Space Complexity</h4>
                <p className="text-muted-foreground">{analysis.analysis.spaceComplexity.feedback}</p>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Correctness</h4>
                <p className="text-muted-foreground">{analysis.analysis.correctness.feedback}</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Learning Recommendations</h3>
            {analysis.analysis.recommendations.length === 0 ? (
              <p className="text-muted-foreground">No specific recommendations available.</p>
            ) : (
              <div className="space-y-4">
                {analysis.analysis.recommendations.map((rec, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{rec.title}</h4>
                      <Badge variant="outline">{rec.platform}</Badge>
                    </div>
                    <p className="text-muted-foreground mb-3">{rec.description}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(rec.url, '_blank')}
                      className="gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Visit Resource
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button onClick={() => router.push('/learner/code-editor')} variant="outline">
          Practice More
        </Button>
        <Button onClick={() => router.push('/learner/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}