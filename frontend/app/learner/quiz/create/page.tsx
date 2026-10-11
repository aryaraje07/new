'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronLeft, Wand2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function CreateQuizPage() {
  const router = useRouter()

  const [subject, setSubject] = useState('')
  const [timeLimit, setTimeLimit] = useState('30')
  const [numberOfQuestions, setNumberOfQuestions] = useState('20')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleStartQuiz = () => {
    if (!subject || !timeLimit || !numberOfQuestions) return

    setIsGenerating(true)

    setTimeout(() => {
      router.push(
        `/learner/quiz/take/custom` +
          `?subject=${encodeURIComponent(subject)}` +
          `&time=${timeLimit}` +
          `&questions=${numberOfQuestions}`
      )
      setIsGenerating(false)
    }, 800)
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/learner/quiz">
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Create Custom Quiz
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate a personalized quiz based on your preferences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card className="p-8 border border-border space-y-6">
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault()
                handleStartQuiz()
              }}
            >
              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">
                  Subject <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="subject"
                  placeholder="e.g., Mathematics, Physics, Biology..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the topic you want to practice
                </p>
              </div>

              {/* Time */}
              <div className="space-y-2">
                <Label>
                  Time Limit (minutes) <span className="text-red-500">*</span>
                </Label>
                <Select value={timeLimit} onValueChange={setTimeLimit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                    <SelectItem value="120">120 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Questions */}
              <div className="space-y-2">
                <Label>
                  Number of Questions <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={numberOfQuestions}
                  onValueChange={setNumberOfQuestions}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 questions</SelectItem>
                    <SelectItem value="15">15 questions</SelectItem>
                    <SelectItem value="20">20 questions</SelectItem>
                    <SelectItem value="25">25 questions</SelectItem>
                    <SelectItem value="30">30 questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={
                  !subject || !timeLimit || !numberOfQuestions || isGenerating
                }
                className="w-full h-11 gap-2 font-semibold"
              >
                <Wand2 className="w-4 h-4" />
                {isGenerating ? 'Generating Quiz...' : 'Generate & Start Quiz'}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Info */}
        <div className="space-y-6">
          <Card className="p-6 border space-y-4">
            <h3 className="font-semibold">Quick Tips</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>• Be specific with your subject</li>
              <li>• Choose a realistic time limit</li>
              <li>• Mixed difficulty improves learning</li>
            </ul>
          </Card>

          <Card className="p-6 border space-y-4">
            <h3 className="font-semibold">Popular Subjects</h3>
            <div className="flex flex-wrap gap-2">
              {[
                'Mathematics',
                'Physics',
                'Chemistry',
                'Biology',
                'English',
                'History',
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6 border border-blue-200 bg-blue-50 space-y-3">
            <h3 className="font-semibold text-blue-900">Features</h3>
            <ul className="space-y-2 text-xs text-blue-800">
              <li>✓ AI-generated questions</li>
              <li>✓ Timer-based practice</li>
              <li>✓ Proctoring ready</li>
              <li>✓ Performance insights</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}