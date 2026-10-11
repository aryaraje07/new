'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Play, Code2, Clock, Target } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import API from '@/lib/api'

interface PreviousResult {
  id: string
  topic: string
  timeLimit: string
  completedAt: string
  score: number
  totalQuestions: number
}

export default function CodeEditorPage() {
  const router = useRouter()
  const [timeLimit, setTimeLimit] = useState('')
  const [topic, setTopic] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [previousResults, setPreviousResults] = useState<PreviousResult[]>([])

  const timeOptions = [
    {
      value: '45',
      label: '45 mins (1 easy, 2 medium)',
      questions: 3
    },
    {
      value: '60',
      label: '1 hr (3 questions - 1 easy, 1 medium, 1 hard)',
      questions: 3
    },
    {
      value: '90',
      label: '1:30 hr (4 questions - 1 easy, 2 medium, 1 hard)',
      questions: 4
    },
    {
      value: '120',
      label: '2 hr (6 questions - 1 easy, 2 medium, 2 hard)',
      questions: 6
    }
  ]

  const topicOptions = [
    'Arrays',
    'Strings',
    'Linked Lists',
    'Stacks',
    'Queues',
    'Trees',
    'Graphs',
    'Dynamic Programming',
    'Sorting',
    'Searching',
    'Recursion',
    'Bit Manipulation',
    'Math',
    'Greedy Algorithms'
  ]

  useEffect(() => {
    fetchPreviousResults()
  }, [])

  const fetchPreviousResults = async () => {
    try {
      const response = await API.get('/learner/code-editor/results')
      setPreviousResults(response.data.results || [])
    } catch (error) {
      console.error('Error fetching previous results:', error)
    }
  }

  const handleStartCoding = async () => {
    if (!timeLimit || !topic) return

    setIsStarting(true)
    try {
      const selectedTimeOption = timeOptions.find(opt => opt.value === timeLimit)

      const response = await API.post('/learner/code-editor/start', {
        timeLimit: parseInt(timeLimit),
        topic,
        questionCount: selectedTimeOption?.questions || 3
      })

      router.push(`/learner/code-editor/test/${response.data.testId}`)
    } catch (error) {
      console.error('Error starting coding test:', error)
      setIsStarting(false)
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Code2 className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">Code Editor</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Practice coding problems with our AI-powered code editor. Choose your time limit and topic to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Setup Section */}
        <div className="space-y-6">
          <Card className="p-8 border border-border space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Setup Your Coding Session</h2>
              <p className="text-muted-foreground">Configure your practice session</p>
            </div>

            <div className="space-y-6">
              {/* Time Limit */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Time Limit <span className="text-red-500">*</span>
                </Label>
                <Select value={timeLimit} onValueChange={setTimeLimit}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select time limit" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Topic */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Topic <span className="text-red-500">*</span>
                </Label>
                <Select value={topic} onValueChange={setTopic}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {topicOptions.map((topicOption) => (
                      <SelectItem key={topicOption} value={topicOption}>
                        {topicOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Button */}
              <Button
                onClick={handleStartCoding}
                disabled={!timeLimit || !topic || isStarting}
                className="w-full h-12 text-lg font-semibold gap-3"
                size="lg"
              >
                <Play className="w-5 h-5" />
                {isStarting ? 'Starting...' : 'Start Coding'}
              </Button>
            </div>
          </Card>

          {/* Features */}
          <Card className="p-6 border border-border space-y-4">
            <h3 className="font-semibold text-lg">Features</h3>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>AI-generated coding problems</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Real-time code execution</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Multiple programming languages</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Detailed analysis and feedback</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Personalized learning recommendations</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Previous Results */}
        <div className="space-y-6">
          <Card className="p-6 border border-border">
            <h3 className="font-semibold text-lg mb-4">Previous Results</h3>
            {previousResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Code2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No coding sessions completed yet</p>
                <p className="text-sm">Start your first coding practice session!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {previousResults.slice(0, 5).map((result) => (
                  <div
                    key={result.id}
                    className="p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/learner/code-editor/analysis/${result.id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{result.topic}</h4>
                      <span className="text-sm text-muted-foreground">
                        {new Date(result.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        {result.timeLimit} minutes
                      </span>
                      <span className="font-medium">
                        {result.score}/{result.totalQuestions} correct
                      </span>
                    </div>
                  </div>
                ))}
                {previousResults.length > 5 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/learner/code-editor/history')}
                  >
                    View All Results
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}