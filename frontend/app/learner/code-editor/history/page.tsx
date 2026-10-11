'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Eye } from 'lucide-react'
import API from '@/lib/api'

interface Result {
  id: string
  topic: string
  timeLimit: number
  totalQuestions: number
  score: number
  correctAnswers: number
  completedAt: string
}

export default function CodeEditorHistoryPage() {
  const router = useRouter()
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadResults()
  }, [])

  const loadResults = async () => {
    try {
      const response = await API.get('/learner/code-editor/results')
      setResults(response.data.results || [])
    } catch (error) {
      console.error('Error loading results:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
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
          <h1 className="text-3xl font-bold">Coding Test History</h1>
          <p className="text-muted-foreground">
            View all your previous coding test results and analyses
          </p>
        </div>
      </div>

      {/* Results Table */}
      <Card className="p-6">
        {results.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">No coding tests completed yet</h3>
            <p className="text-muted-foreground mb-6">
              Start your first coding practice session to see your results here.
            </p>
            <Button onClick={() => router.push('/learner/code-editor')}>
              Start Coding
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Time Limit</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Correct</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>
                    {new Date(result.completedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">{result.topic}</TableCell>
                  <TableCell>{result.timeLimit} min</TableCell>
                  <TableCell>{result.totalQuestions}</TableCell>
                  <TableCell>
                    <span className={`font-semibold ${getScoreColor(result.score)}`}>
                      {result.score}%
                    </span>
                  </TableCell>
                  <TableCell>
                    {result.correctAnswers}/{result.totalQuestions}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/learner/code-editor/analysis/${result.id}`)}
                      className="gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Analysis
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Statistics */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{results.length}</div>
            <p className="text-sm text-muted-foreground">Total Tests</p>
          </Card>

          <Card className="p-6 text-center">
            <div className="text-2xl font-bold text-green-600">
              {Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)}%
            </div>
            <p className="text-sm text-muted-foreground">Average Score</p>
          </Card>

          <Card className="p-6 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {results.filter(r => r.score >= 80).length}
            </div>
            <p className="text-sm text-muted-foreground">High Scores (80%+)</p>
          </Card>

          <Card className="p-6 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {results[0] ? results[0].topic : 'N/A'}
            </div>
            <p className="text-sm text-muted-foreground">Latest Topic</p>
          </Card>
        </div>
      )}
    </div>
  )
}