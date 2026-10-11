'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bot, BookOpen, CheckCircle2, Loader2, Send, Sparkles, Target } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Action = { label: string; href: string }
type Message = { role: 'assistant' | 'user'; content: string; actions?: Action[] }

const starterQuestions = [
  'What are my current skill gaps?',
  'What should I learn next?',
  'Did I miss any assessments?',
  'Explain data visualization in simple language',
]

export default function PersonalizedAIAssistantPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'I can help you understand your competencies, skill gaps, courses, assessments, progress, and learning materials.',
    },
  ])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!localStorage.getItem('token')) router.replace('/login')
  }, [router])

  const askQuestion = async (event?: FormEvent) => {
    event?.preventDefault()
    const message = question.trim()
    if (!message || loading) return

    setQuestion('')
    setError('')
    setMessages((current) => [...current, { role: 'user', content: message }])
    setLoading(true)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const response = await fetch(`${baseUrl}/ai/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ message }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.message || 'The assistant could not answer right now.')
      setMessages((current) => [...current, { role: 'assistant', content: data.answer, actions: data.actions || [] }])
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The assistant could not answer right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-primary/10 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Personalized Competency AI Assistant</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Personal learning guidance based on your SkillifyAI profile</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] items-start">
        <Card className="border border-border bg-card shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Learning conversation</h2>
              <p className="text-[11px] text-muted-foreground">Your answers use your authenticated learner profile</p>
            </div>
          </div>

          <div className="min-h-[420px] max-h-[58vh] overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex gap-2.5 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' && <Bot className="w-4 h-4 text-primary mt-1 shrink-0" />}
                <div className={`max-w-[85%] rounded-md px-3 py-2.5 text-sm whitespace-pre-wrap ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 text-foreground'}`}>
                  {message.content}
                  {message.actions && message.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-border/60">
                      {message.actions.map((action) => (
                        <Link key={action.href} href={action.href}>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] bg-card">
                            {action.label}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Checking your learning context...
              </div>
            )}
          </div>

          <form onSubmit={askQuestion} className="p-4 border-t border-border flex gap-2">
            <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about your competencies, courses, assessments, or a learning concept..." className="h-10 text-sm" maxLength={2000} />
            <Button type="submit" disabled={!question.trim() || loading} size="sm" className="h-10 px-3" aria-label="Send question">
              <Send className="w-4 h-4" />
            </Button>
          </form>
          {error && <div className="mx-4 mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
        </Card>

        <Card className="border border-border bg-card shadow-xs p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Try asking</h2>
          </div>
          <div className="space-y-2">
            {starterQuestions.map((starter) => (
              <button key={starter} type="button" onClick={() => setQuestion(starter)} className="w-full text-left rounded-md border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary/60 transition-colors">
                {starter}
              </button>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border space-y-2 text-[11px] text-muted-foreground">
            <p className="flex items-start gap-2"><BookOpen className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> Uses your existing courses and learning materials.</p>
            <p className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> Personal details come from your authenticated account.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}