'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brain, Clock, ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface RecallConcept {
  _id: string
  competency: {
    _id: string
    name: string
    code: string
  }
  topic: string
  masteryState: 'needs_recall' | 'developing' | 'mastered'
  recentPerformance: number
  attemptCount: number
}

interface RecallQuestion {
  questionId: string
  question: string
  options: string[]
  correctAnswer: number
  competency: string
  competencyDomain?: string
  difficulty?: number
  topic?: string
}

export default function QuickRecallPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [concepts, setConcepts] = useState<RecallConcept[]>([])
  const [selectedConcept, setSelectedConcept] = useState<RecallConcept | null>(null)
  const [question, setQuestion] = useState<RecallQuestion | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [loadingQuestion, setLoadingQuestion] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''

  useEffect(() => {
    fetchRecallConcepts()
  }, [token])

  const fetchRecallConcepts = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const res = await fetch(`${baseUrl}/learner/learning-memory/recall`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error('Failed to fetch recall concepts')
      }

      const data = await res.json()
      setConcepts(data.concepts || [])
    } catch (err) {
      console.error('Failed to fetch recall concepts:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecallQuestion = async (competencyId: string, topic: string) => {
    setLoadingQuestion(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const res = await fetch(
        `${baseUrl}/learner/learning-memory/recall/${competencyId}?topic=${encodeURIComponent(topic)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!res.ok) {
        throw new Error('Failed to fetch recall question')
      }

      const data = await res.json()
      setQuestion(data.question)
      setSelectedAnswer(null)
      setSubmitted(false)
    } catch (err) {
      console.error('Failed to fetch recall question:', err)
    } finally {
      setLoadingQuestion(false)
    }
  }

  const handleConceptSelect = (concept: RecallConcept) => {
    setSelectedConcept(concept)
    fetchRecallQuestion(concept.competency._id, concept.topic)
  }

  const handleAnswerSelect = (index: number) => {
    if (submitted) return
    setSelectedAnswer(index)
  }

  const handleSubmit = () => {
    if (selectedAnswer === null || !question) return
    
    const correct = selectedAnswer === question.correctAnswer
    setIsCorrect(correct)
    setSubmitted(true)

    // In a real implementation, you would submit this to update Learning Memory
    // For now, we'll just show the result
  }

  const handleBack = () => {
    if (submitted) {
      // Reset for next question
      setSelectedAnswer(null)
      setSubmitted(false)
      setQuestion(null)
    } else if (question) {
      // Go back to concept selection
      setQuestion(null)
      setSelectedConcept(null)
    } else {
      router.push('/learner/dashboard')
    }
  }

  const getMasteryColor = (state: string) => {
    switch (state) {
      case 'needs_recall':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'developing':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'mastered':
        return 'bg-green-50 text-green-700 border-green-200'
      default:
        return 'bg-secondary text-muted-foreground border-border'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!concepts || concepts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/learner/dashboard')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">{t('quickRecall.title')}</h1>
        </div>
        <Card className="border border-border p-8 text-center">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-60" />
          <p className="text-sm text-muted-foreground">{t('quickRecall.noConceptsAvailable')}</p>
          <Button className="mt-4" onClick={() => router.push('/learner/dashboard')}>
            {t('common.back')}
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">{t('quickRecall.title')}</h1>
      </div>

      {!selectedConcept ? (
        <div>
          <p className="text-sm text-muted-foreground mb-4">{t('quickRecall.subtitle')}</p>
          <div className="space-y-3">
            {concepts.map((concept) => (
              <Card
                key={concept._id}
                className="border border-border p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={() => handleConceptSelect(concept)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-semibold text-foreground">{concept.competency.name}</p>
                      {concept.topic && (
                        <span className="text-xs text-muted-foreground">· {concept.topic}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{t('learningMemory.recentPerformance')}: {concept.recentPerformance}%</span>
                      <span>{t('learningMemory.attemptCount')}: {concept.attemptCount}</span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium border ${getMasteryColor(concept.masteryState)}`}
                  >
                    {t(`learningMemory.${concept.masteryState}`)}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {selectedConcept.competency.name}
            </Badge>
            {selectedConcept.topic && (
              <Badge variant="secondary" className="text-xs">
                {selectedConcept.topic}
              </Badge>
            )}
          </div>

          {loadingQuestion ? (
            <Card className="border border-border p-8 text-center">
              <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            </Card>
          ) : !question ? (
            <Card className="border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                No suitable question available for this concept right now.
              </p>
              <Button onClick={() => setSelectedConcept(null)}>{t('common.back')}</Button>
            </Card>
          ) : (
            <Card className="border border-border">
              <div className="p-6 border-b border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">{t('quickRecall.question')}</h2>
                </div>
                <p className="text-base text-foreground leading-relaxed">{question.question}</p>
              </div>
              <div className="p-6 space-y-3">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={submitted}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedAnswer === index
                        ? submitted
                          ? isCorrect
                            ? 'border-green-500 bg-green-50'
                            : 'border-red-500 bg-red-50'
                          : 'border-primary bg-primary/5'
                        : 'border-border hover:border-border/80 hover:bg-secondary/50'
                    } ${submitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedAnswer === index
                            ? submitted
                              ? isCorrect
                                ? 'border-green-500 bg-green-500 text-white'
                                : 'border-red-500 bg-red-500 text-white'
                              : 'border-primary bg-primary text-white'
                            : 'border-border'
                        }`}
                      >
                        {selectedAnswer === index && (
                          <span className="text-xs font-bold">{String.fromCharCode(65 + index)}</span>
                        )}
                      </div>
                      <span className="text-sm text-foreground">{option}</span>
                      {submitted && index === question.correctAnswer && (
                        <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />
                      )}
                      {submitted && selectedAnswer === index && !isCorrect && (
                        <XCircle className="w-5 h-5 text-red-600 ml-auto" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-6 border-t border-border">
                {!submitted ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={selectedAnswer === null}
                    className="w-full"
                  >
                    {t('quickRecall.submitAnswer')}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div
                      className={`p-4 rounded-lg ${
                        isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (

                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className="text-sm font-semibold">
                          {isCorrect ? t('quickRecall.correct') : t('quickRecall.incorrect')}
                        </span>
                      </div>
                      {!isCorrect && (
                        <p className="text-xs text-muted-foreground">
                          Correct answer: {question.options[question.correctAnswer]}
                        </p>
                      )}
                    </div>
                    <Button onClick={handleBack} className="w-full">
                      {t('common.continue')}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
