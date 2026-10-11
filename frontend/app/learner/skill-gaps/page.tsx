'use client'

import { useEffect, useState } from 'react'
import API from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Target, ArrowRight } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

const requiredScoreForLevel = (level: number) => {
  const mapping: Record<number, number> = { 1: 0, 2: 40, 3: 55, 4: 70, 5: 85 }
  return mapping[Number(level)] ?? 0
}

export default function SkillGapsPage() {
  const { t } = useLanguage()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const response = await API.get('/learner/competencies/overview')
      setData(response.data)
    } catch (e: any) {
      setError(e.response?.data?.message || t('skillGaps.noData'))
    }
  }

  useEffect(() => { load() }, [])

  if (!data && !error) return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center space-y-4 max-w-md p-6 bg-card border border-border rounded-lg shadow-xs">
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button onClick={load} size="sm">{t('common.retry')}</Button>
      </div>
    </div>
  )

  const rows = data?.competencies || []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* PAGE HEADER */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">{t('skillGaps.title')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t('skillGaps.subtitle')}
        </p>
      </div>

      {/* SUMMARY STATISTICS */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border border-border p-4 bg-card shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-md bg-red-50 text-red-700 font-bold text-base">
                {rows.filter((item: any) => item.gap?.status === 'open').length}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{t('skillGaps.openGaps')}</p>
              </div>
            </div>
          </Card>

          <Card className="border border-border p-4 bg-card shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-md bg-amber-50 text-amber-700 font-bold text-base">
                {rows.filter((item: any) => item.gap?.gap > 50).length}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{t('skillGaps.criticalGaps')}</p>
              </div>
            </div>
          </Card>

          <Card className="border border-border p-4 bg-card shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-md bg-blue-50 text-blue-700 font-bold text-base">
                {rows.filter((item: any) => item.current?.score != null).length}
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{t('skillGaps.assessed')}</p>
              </div>
            </div>
          </Card>

          <Card className="border border-border p-4 bg-card shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-md bg-purple-50 text-purple-700 font-bold text-base">
                {rows.length > 0 ? Math.round(rows.reduce((sum: number, item: any) => sum + (item.gap?.gap || 0), 0) / rows.length) : 0}%
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{t('skillGaps.averageGap')}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* COMPETENCY DETAILS */}
      <Card className="border border-border shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t('skillGaps.competencyAnalysis')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('skillGaps.targetRole')}: <span className="text-primary font-medium">{data?.targetRole || t('skillGaps.notConfigured')}</span>
            </p>
          </div>
        </div>
        <div className="p-4">
          {rows.length > 0 ? (
            <div className="space-y-3">
              {rows.map((item: any) => {
                const currentScore = item.current?.score
                const currentLevel = item.current?.currentLevel
                const requiredLevel = Number(item.requiredLevel || 0)
                const requiredScore = requiredScoreForLevel(requiredLevel)
                const gapValue = Number(item.gap?.gap ?? 0)
                const isOpen = item.gap?.status === 'open'

                return (
                  <div key={item.competency?._id || item.competency?.name || item.competency?.code} className="border border-border rounded-md p-3.5 bg-card">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xs font-semibold text-foreground">{item.competency?.name || 'Unknown competency'}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                            isOpen
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {isOpen ? t('skillGaps.gap') : t('skillGaps.ready')}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs">
                          <div>
                            <p className="text-muted-foreground text-[11px]">{t('dashboard.currentLevel')}</p>
                            <p className="font-semibold text-foreground mt-0.5 text-xs">
                              {currentScore == null ? t('skillGaps.notAssessed') : `Level ${currentLevel ?? 'N/A'}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-[11px]">{t('dashboard.requiredLevel')}</p>
                            <p className="font-semibold text-foreground mt-0.5 text-xs">
                              Level {requiredLevel} ({requiredScore}%)
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-[11px]">{t('skillGaps.gap')}</p>
                            <p className={`font-semibold mt-0.5 text-xs ${isOpen ? 'text-red-700' : 'text-green-700'}`}>
                              {gapValue > 0 ? `${gapValue}%` : t('skillGaps.none')}
                            </p>
                          </div>
                        </div>

                        {currentScore != null && (
                          <div className="mt-3">
                            <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="h-1.5 rounded-full bg-primary transition-all duration-300"
                                style={{ width: `${Math.min(currentScore, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
                              <span>0%</span>
                              <span>{currentScore}%</span>
                              <span>{requiredScore}%</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 self-start sm:self-center">
                        {isOpen ? (
                          <Button size="sm" asChild className="text-xs h-8">
                            <Link href="/learner/courses">
                              {t('skillGaps.addressGap')}
                            </Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" asChild className="text-xs h-8">
                            <Link href="/learner/courses">
                              {t('skillGaps.viewDetails')}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
              <p className="text-xs text-muted-foreground">{t('skillGaps.noData')}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{t('skillGaps.willAppear')}</p>
            </div>
          )}
        </div>
      </Card>

      {/* RECOMMENDED LEARNING */}
      <Card className="border border-border shadow-xs">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">{t('skillGaps.recommendedLearning')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('skillGaps.coursesPrioritized')}</p>
        </div>
        <div className="p-4">
          <Button asChild variant="outline" size="sm" className="text-xs h-8">
            <Link href="/learner/courses" className="flex items-center gap-1.5">
              <span>{t('skillGaps.viewRecommended')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
