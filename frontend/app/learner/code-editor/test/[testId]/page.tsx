'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Play,
  Square,
  Clock,
  CheckCircle,
  XCircle,
  Sun,
  Moon,
  RotateCcw,
  Flag
} from 'lucide-react'
import Editor from '@monaco-editor/react'
import API from '@/lib/api'

interface Question {
  id: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  constraints: string[]
  inputFormat: string
  outputFormat: string
  sampleInput: string
  sampleOutput: string
  timeLimit: number
  memoryLimit: number
}

interface TestResult {
  testCase: number
  passed: boolean
  executionTime: number
  memoryUsed: number
  input: string
  output: string
  expectedOutput: string
}

export default function CodeEditorTestPage() {
  const params = useParams()
  const router = useRouter()
  const testId = params.testId as string

  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('cpp')
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [isDarkTheme, setIsDarkTheme] = useState(false)
  const [testStarted, setTestStarted] = useState(false)
  const [submissions, setSubmissions] = useState<Record<string, boolean>>({})

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const editorRef = useRef<any>(null)

  const languages = [
    { value: 'cpp', label: 'C++', monaco: 'cpp' },
    { value: 'c', label: 'C', monaco: 'c' },
    { value: 'python', label: 'Python', monaco: 'python' },
    { value: 'java', label: 'Java', monaco: 'java' }
  ]

  useEffect(() => {
    if (testId) {
      loadTest()
    }
  }, [testId])

  useEffect(() => {
    if (testStarted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleEndTest()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [testStarted, timeLeft])

  const loadTest = async () => {
    try {
      const response = await API.get(`/learner/code-editor/test/${testId}`)

      setQuestions(response.data.test.questions)
      setTimeLeft(response.data.test.timeLimit * 60) // Convert to seconds
      setTestStarted(true)

      // Load default code template
      loadCodeTemplate('cpp')
    } catch (error) {
      console.error('Error loading test:', error)
      router.push('/learner/code-editor')
    }
  }

  const loadCodeTemplate = async (lang: string) => {
    try {
      const response = await API.get(`/learner/code-editor/template/${lang}`)
      setCode(response.data.template)
    } catch (error) {
      console.error('Error loading template:', error)
      setCode(`// Write your ${lang} code here`)
    }
  }

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
    loadCodeTemplate(newLanguage)
  }

  const handleRunCode = async () => {
    if (!code.trim()) return

    setIsRunning(true)
    try {
      const response = await API.post('/learner/code-editor/submit', {
        testId,
        questionId: questions[currentQuestionIndex].id,
        code,
        language
      })

      setTestResults(response.data.results)
    } catch (error) {
      console.error('Error running code:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const handleSubmitCode = async () => {
    if (!code.trim()) return

    setIsSubmitting(true)
    try {
      const response = await API.post('/learner/code-editor/submit', {
        testId,
        questionId: questions[currentQuestionIndex].id,
        code,
        language
      })

      setTestResults(response.data.results)
      setSubmissions(prev => ({
        ...prev,
        [questions[currentQuestionIndex].id]: response.data.allTestsPassed
      }))
    } catch (error) {
      console.error('Error submitting code:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEndTest = async () => {
    try {
      const response = await API.post('/learner/code-editor/end', {
        testId
      })

      router.push(`/learner/code-editor/analysis/${response.data.resultId}`)
    } catch (error) {
      console.error('Error ending test:', error)
      router.push('/learner/code-editor')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading coding test...</p>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Coding Test</h1>
          <Badge variant="outline" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDarkTheme(!isDarkTheme)}
          >
            {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <Button
            variant="destructive"
            onClick={handleEndTest}
            className="flex items-center gap-2"
          >
            <Flag className="w-4 h-4" />
            End Test
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Problem Panel */}
        <div className="w-1/2 border-r border-border flex flex-col">
          {/* Question Navigation */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-4">
              {questions.map((q, index) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded-full text-sm font-medium ${
                    index === currentQuestionIndex
                      ? 'bg-primary text-primary-foreground'
                      : submissions[q.id]
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{currentQuestion.title}</h2>
              <Badge className={getDifficultyColor(currentQuestion.difficulty)}>
                {currentQuestion.difficulty}
              </Badge>
            </div>
          </div>

          {/* Question Content */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Problem Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {currentQuestion.description}
                </p>
              </div>

              {currentQuestion.constraints.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Constraints</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    {currentQuestion.constraints.map((constraint, index) => (
                      <li key={index}>{constraint}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Input Format</h3>
                  <p className="text-muted-foreground text-sm">
                    {currentQuestion.inputFormat}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Output Format</h3>
                  <p className="text-muted-foreground text-sm">
                    {currentQuestion.outputFormat}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Sample Input</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                    {currentQuestion.sampleInput}
                  </pre>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Sample Output</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                    {currentQuestion.sampleOutput}
                  </pre>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Time Limit: {currentQuestion.timeLimit}s</p>
                <p>Memory Limit: {currentQuestion.memoryLimit}MB</p>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Code Editor Panel */}
        <div className="flex-1 flex flex-col">
          {/* Editor Controls */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-3 py-1 border border-border rounded text-sm bg-background"
              >
                {languages.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunCode}
                disabled={isRunning || !code.trim()}
              >
                {isRunning ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Run
              </Button>

              <Button
                onClick={handleSubmitCode}
                disabled={isSubmitting || !code.trim()}
                size="sm"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                ) : (
                  <Square className="w-4 h-4 mr-2" />
                )}
                Submit
              </Button>
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1">
            <Editor
              height="100%"
              language={languages.find(l => l.value === language)?.monaco || 'cpp'}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme={isDarkTheme ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                insertSpaces: true,
                wordWrap: 'on'
              }}
              onMount={(editor) => {
                editorRef.current = editor
              }}
            />
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="border-t border-border p-4 max-h-52 overflow-y-auto">
              <h3 className="font-semibold mb-3">Test Results</h3>
              <div className="mb-2 text-sm text-muted-foreground">
                {testResults.filter((r) => r.passed).length} / {testResults.length} passed
              </div>
              <div className="space-y-2">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded border ${
                      result.passed
                        ? 'border-green-300 bg-green-50'
                        : 'border-red-300 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Test Case {result.testCase}</span>
                      <div className="flex items-center gap-2">
                        {result.passed ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`text-sm ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                          {result.passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Time: {result.executionTime}ms</div>
                      <div>Memory: {(result.memoryUsed / 1024 / 1024).toFixed(2)}MB</div>
                      <div>Input: {result.input}</div>
                      <div>Expected: {result.expectedOutput}</div>
                      <div>Got: {result.output}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}