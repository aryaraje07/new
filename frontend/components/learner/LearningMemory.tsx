'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brain, Clock, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface LearningMemoryItem {
  _id: string
  competency: {
    _id: string
    name: string
    code: string
  }
  topic: string
  attemptCount: number
  correctCount: number
  incorrectCount: number
  recentPerformance: number
  masteryState: 'needs_recall' | 'developing' | 'mastered'
  lastAttemptedAt: string
}

interface LearningMemoryProps {
  memories?: LearningMemoryItem[]
  loading?: boolean
}

export function LearningMemory({ memories = [], loading = false }: LearningMemoryProps) {
  const { t } = useLanguage()
  const [selectedMemory, setSelectedMemory] = useState<LearningMemoryItem | null>(null)
  const [showTimeline, setShowTimeline] = useState(false)

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

  const getMasteryIcon = (state: string) => {
    switch (state) {
      case 'needs_recall':
        return <AlertCircle className="w-3.5 h-3.5" />
      case 'developing':
        return <TrendingUp className="w-3.5 h-3.5" />
      case 'mastered':
        return <CheckCircle2 className="w-3.5 h-3.5" />
      default:
        return <Brain className="w-3.5 h-3.5" />
    }
  }

  if (loading) {
    return (
      <Card className="border border-border shadow-xs">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{t('learningMemory.title')}</h2>
          </div>
        </div>
        <div className="p-4 flex items-center justify-center min-h-[120px]">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </Card>
    )
  }

  if (!memories || memories.length === 0) {
    return (
      <Card className="border border-border shadow-xs">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{t('learningMemory.title')}</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{t('learningMemory.subtitle')}</p>
        </div>
        <div className="p-4">
          <div className="text-center py-8">
            <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
            <p className="text-xs text-muted-foreground">{t('learningMemory.willAppear')}</p>
          </div>
        </div>
      </Card>
    )
  }

  const recallItems = memories.filter(m => m.masteryState === 'needs_recall' || m.masteryState === 'developing')

  return (
    <Card className="border border-border shadow-xs">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{t('learningMemory.title')}</h2>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-primary/30 text-primary bg-primary/5">
            {recallItems.length} {t('learningMemory.needsRecall')}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{t('learningMemory.subtitle')}</p>
      </div>
      <div className="p-4">
        {recallItems.length > 0 ? (
          <div className="space-y-2.5">
            {recallItems.slice(0, 5).map((memory) => (
              <div
                key={memory._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-border rounded-md gap-3 bg-card hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => setSelectedMemory(memory)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-semibold text-foreground">{memory.competency.name}</p>
                    {memory.topic && (
                      <span className="text-[10px] text-muted-foreground">· {memory.topic}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(memory.lastAttemptedAt).toLocaleDateString()}
                    </span>
                    <span>{t('learningMemory.attemptCount')}: {memory.attemptCount}</span>
                    <span>{t('learningMemory.recentPerformance')}: {memory.recentPerformance}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium border ${getMasteryColor(memory.masteryState)}`}
                  >
                    <span className="flex items-center gap-1">
                      {getMasteryIcon(memory.masteryState)}
                      {t(`learningMemory.${memory.masteryState}`)}
                    </span>
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.location.href = '/learner/quick-recall'
                    }}
                  >
                    {t('learningMemory.quickRecall')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
            <p className="text-xs text-muted-foreground">{t('learningMemory.noRecallItems')}</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md border border-border shadow-lg">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{selectedMemory.competency.name}</h3>
                  {selectedMemory.topic && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{selectedMemory.topic}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => setSelectedMemory(null)}
                >
                  ×
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-secondary/50 rounded-md">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('learningMemory.attemptCount')}</p>
                  <p className="text-lg font-bold text-foreground mt-1">{selectedMemory.attemptCount}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-md">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('learningMemory.recentPerformance')}</p>
                  <p className="text-lg font-bold text-foreground mt-1">{selectedMemory.recentPerformance}%</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-secondary/50 rounded-md">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('learningMemory.correctCount')}</p>
                  <p className="text-lg font-bold text-green-600 mt-1">{selectedMemory.correctCount}</p>
                </div>
                <div className="p-3 bg-secondary/50 rounded-md">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('learningMemory.incorrectCount')}</p>
                  <p className="text-lg font-bold text-red-600 mt-1">{selectedMemory.incorrectCount}</p>
                </div>
              </div>
              <div className="p-3 bg-secondary/50 rounded-md">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('learningMemory.masteryStatus')}</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium border ${getMasteryColor(selectedMemory.masteryState)}`}
                  >
                    <span className="flex items-center gap-1">
                      {getMasteryIcon(selectedMemory.masteryState)}
                      {t(`learningMemory.${selectedMemory.masteryState}`)}
                    </span>
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t('learningMemory.lastAttempted')}: {new Date(selectedMemory.lastAttemptedAt).toLocaleString()}
                </p>
              </div>
              <Button
                className="w-full text-xs h-9"
                onClick={() => {
                  setSelectedMemory(null)
                  // Handle practice again
                }}
              >
                {t('learningMemory.practiceAgain')}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  )
}
