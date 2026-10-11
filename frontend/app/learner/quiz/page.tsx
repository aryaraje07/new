'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Plus, FileText, ArrowRight } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function QuizPage() {
  const { t } = useLanguage()
  const [scheduledQuizzes, setScheduledQuizzes] = useState<any[]>([])
  const [pastAttempts, setPastAttempts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'CUSTOM' | 'SCHEDULED'>('ALL')
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  useEffect(() => {
    const fetchData = async () => {
      try {
        const scheduledRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/learner/exams/scheduled`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (scheduledRes.ok) {
          const scheduledData = await scheduledRes.json()
          setScheduledQuizzes(Array.isArray(scheduledData) ? scheduledData : [])
        }
      } catch (err) {
        console.error('Error fetching scheduled exams:', err)
      }

      try {
        const pastRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/quiz/result/list`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (pastRes.ok) {
          const pastData = await pastRes.json()
          setPastAttempts(Array.isArray(pastData) ? pastData : [])
        }
      } catch (err) {
        console.error('Error fetching past attempts:', err)
      }

      setLoading(false)
    }

    if (token) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [token])

  const filteredAttempts = pastAttempts.filter(item => {
    if (filter === 'ALL') return true;
    if (filter === 'CUSTOM') return item.quizType === 'CUSTOM';
    if (filter === 'SCHEDULED') return item.quizType === 'SCHEDULED';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {t('assessments.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t('assessments.subtitle')}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-border p-4 bg-card shadow-xs hover:border-primary/40 transition-colors">
          <Link href="/learner/quiz/scheduled">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-primary/10 text-primary">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-foreground">
                    {t('assessments.scheduledAssessments')}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t('assessments.description')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-[11px] text-muted-foreground">
                  {t('assessments.available', { count: scheduledQuizzes.length, s: scheduledQuizzes.length !== 1 ? 's' : '' })}
                </span>
                <Button variant="outline" size="sm" className="text-xs h-8">
                  {t('assessments.viewAssessments')}
                </Button>
              </div>
            </div>
          </Link>
        </Card>

        <Card className="border border-border p-4 bg-card shadow-xs hover:border-primary/40 transition-colors">
          <Link href="/learner/quiz/create">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md bg-primary/10 text-primary">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-foreground">
                    {t('assessments.createPracticeQuiz')}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t('assessments.descriptionPractice')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-[11px] text-muted-foreground">
                  {t('assessments.practiceOnTopics')}
                </span>
                <Button variant="outline" size="sm" className="text-xs h-8">
                  {t('assessments.createQuiz')}
                </Button>
              </div>
            </div>
          </Link>
        </Card>
      </div>

      {/* Previous Attempts */}
      <Card className="border border-border shadow-xs">
        <div className="p-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">{t('assessments.assessmentHistory')}</h2>
            <div className="flex items-center gap-1.5">
              <Button
                variant={filter === 'ALL' ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7 px-3"
                onClick={() => setFilter('ALL')}
              >
                {t('assessments.all')}
              </Button>
              <Button
                variant={filter === 'CUSTOM' ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7 px-3"
                onClick={() => setFilter('CUSTOM')}
              >
                {t('assessments.practice')}
              </Button>
              <Button
                variant={filter === 'SCHEDULED' ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7 px-3"
                onClick={() => setFilter('SCHEDULED')}
              >
                {t('assessments.scheduled')}
              </Button>
            </div>
          </div>
        </div>
        <div className="p-4">
          {filteredAttempts.length > 0 ? (
            <div className="space-y-2.5">
              {filteredAttempts.map((item: any) => {
                const percentage = item.score || 0;
                const displayScore = item.correctCount || 0;
                const displayTotal = item.totalQuestions || 0;
                
                return (
                  <div key={item.attemptId} className="border border-border rounded-md p-3.5 bg-card">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-start gap-2.5">
                          <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <h3 className="text-xs font-semibold text-foreground">
                              {item.quizTitle || (item.quizType === 'CUSTOM' ? t('assessments.practice') : t('assessments.scheduled'))}
                            </h3>
                            {item.subject && (
                              <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                                {item.subject}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5 ml-6">
                          <p>{t('assessments.submittedAt')}: {new Date(item.submittedAt).toLocaleString()}</p>
                          <p>{item.totalQuestions} {t('assessments.questions')}</p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                        <div className="text-left sm:text-right">
                          <div className="text-base font-bold text-foreground">{percentage}%</div>
                          <div className="text-[11px] text-muted-foreground">
                            {displayScore}/{displayTotal} {t('assessments.marks')}
                          </div>
                        </div>
                        <Link href={item.resultType === 'exam'
                          ? `/learner/quiz/scheduled/results/${item.attemptId}`
                          : `/learner/quiz/results?attemptId=${item.attemptId}`}>
                          <Button variant="outline" size="sm" className="text-xs h-7">
                            {t('assessments.viewReport')}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
              <p className="text-xs text-muted-foreground">
                {t('assessments.noHistory', { type: filter !== 'ALL' ? (filter === 'CUSTOM' ? 'practice' : 'scheduled') : '' })}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t('assessments.yourAttemptsWillAppear')}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}