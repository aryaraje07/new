'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GraduationCap, ArrowRight, Brain, BookOpen, ClipboardCheck, FileText, Sparkles } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AITutorPage() {
  const router = useRouter()
  const { t } = useLanguage()

  const [topic, setTopic] = useState('')
  const [minutes, setMinutes] = useState(5)
  const [isStarting, setIsStarting] = useState(false)

  const exampleTopics = [
    'Survey Sampling Methodology',
    'National Accounts Estimation',
    'Statistical Data Analysis with Python',
    'Price Index Computation'
  ]

  const suggestedPrompts = [
    t('aiTutor.explainGap'),
    t('aiTutor.understandCompetency'),
    t('aiTutor.explainMaterial'),
    t('aiTutor.prepareAssessment')
  ]

  const handleStartSession = () => {
    if (!topic) return

    setIsStarting(true)

    setTimeout(() => {
      router.push(
        `/learner/ai-tutor/session?topic=${encodeURIComponent(
          topic
        )}&minutes=${minutes}`
      )
    }, 600)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">{t('aiTutor.title')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t('aiTutor.subtitle')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Setup Panel */}
        <Card className="border border-border p-4 bg-card shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-md bg-primary/10 text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              {t('aiTutor.startSession')}
            </h2>
          </div>

          <div className="space-y-4">
            {/* Topic Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {t('aiTutor.topic')} <span className="text-red-600">*</span>
              </Label>

              <Input
                placeholder={t('aiTutor.topicPlaceholder')}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-9 text-xs border-border"
              />

              <p className="text-[11px] text-muted-foreground">
                {t('aiTutor.example')}
              </p>
            </div>

            {/* Duration Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">{t('aiTutor.sessionDuration')}</Label>

              <Input
                type="number"
                min={1}
                max={60}
                value={minutes}
                onChange={(e) =>
                  setMinutes(Number(e.target.value) || 1)
                }
                className="h-9 text-xs border-border"
              />

              <p className="text-[11px] text-muted-foreground">
                {t('aiTutor.recommended')}
              </p>
            </div>

            {/* Start Button */}
            <Button
              onClick={handleStartSession}
              disabled={!topic || isStarting}
              variant="default"
              size="sm"
              className="w-full text-xs h-9 font-semibold"
            >
              {isStarting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('aiTutor.starting')}
                </>
              ) : (
                <>
                  {t('aiTutor.start')}
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Suggested Prompts */}
        <Card className="border border-border p-4 bg-card shadow-xs">
          <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">
            {t('aiTutor.suggestedTopics')}
          </h3>

          <div className="space-y-2">
            {suggestedPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => setTopic(prompt)}
                className="w-full text-left p-2.5 border border-border rounded-md hover:bg-secondary/60 text-xs text-foreground transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Example Topics */}
          <div className="mt-4 pt-3.5 border-t border-border">
            <p className="text-xs font-semibold text-foreground mb-2">
              {t('aiTutor.exampleTopics')}:
            </p>

            <div className="flex flex-wrap gap-1.5">
              {exampleTopics.map((item) => (
                <button
                  key={item}
                  onClick={() => setTopic(item)}
                  className="px-2.5 py-1 rounded-md border border-border hover:bg-secondary text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Information Block */}
      <Card className="border border-border p-4 bg-card shadow-xs">
        <h3 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">
          {t('aiTutor.whatCanHelp')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2.5 p-2 rounded-md bg-secondary/30 border border-border/40">
            <Brain className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p>{t('aiTutor.explainGaps')}</p>
          </div>
          <div className="flex items-start gap-2.5 p-2 rounded-md bg-secondary/30 border border-border/40">
            <BookOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p>{t('aiTutor.understandSpecific')}</p>
          </div>
          <div className="flex items-start gap-2.5 p-2 rounded-md bg-secondary/30 border border-border/40">
            <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p>{t('aiTutor.explainLearning')}</p>
          </div>
          <div className="flex items-start gap-2.5 p-2 rounded-md bg-secondary/30 border border-border/40">
            <ClipboardCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p>{t('aiTutor.prepareForAssessment')}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
