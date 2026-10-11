'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'
import { Award, Target } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface VisualizationData {
  beforeAfter: Array<{
    competencyName: string
    initialScore: number
    currentScore: number
    improvement: number
  }>
  gapDistribution: {
    open: number
    closed: number
    inProgress: number
    total: number
  }
  priorityGaps: Array<{
    competencyName: string
    gap: number
    requiredLevel: number
    currentLevel: number
  }>
  trainingImpact: Array<{
    trainingTitle: string
    competencyName: string
    scoreBefore: number
    scoreAfter: number
    impact: number
  }>
}

interface DashboardVisualizationsProps {
  data?: VisualizationData
  loading?: boolean
}

const COLORS = {
  current: '#22c55e',
  initial: '#f59e0b',
  gap: '#ef4444',
  impact: '#3b82f6',
  open: '#ef4444',
  inProgress: '#f59e0b',
  closed: '#22c55e',
}

const chartMargin = { top: 8, right: 12, left: -8, bottom: 4 }

export function DashboardVisualizations({ data, loading = false }: DashboardVisualizationsProps) {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)] gap-4">
        {[1, 2].map((item) => (
          <Card key={item} className="border border-border p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-secondary rounded w-1/3 mb-4" />
              <div className="h-56 bg-secondary rounded" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) {
    return (
      <Card className="border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">{t('visualizations.noData')}</p>
      </Card>
    )
  }

  const gapByCompetency = new Map(
    data.priorityGaps.map((item) => [item.competencyName, item.gap])
  )
  const impactByCompetency = new Map<string, number>()
  data.trainingImpact.forEach((item) => {
    const currentImpact = impactByCompetency.get(item.competencyName) || 0
    impactByCompetency.set(item.competencyName, Math.max(currentImpact, item.impact || 0))
  })

  const competencyData = data.beforeAfter.slice(0, 8).map((item) => ({
    name: item.competencyName.length > 16 ? `${item.competencyName.slice(0, 16)}...` : item.competencyName,
    initial: Math.max(0, item.initialScore || 0),
    current: Math.max(0, item.currentScore || 0),
    gap: Math.max(0, gapByCompetency.get(item.competencyName) || 0),
    impact: Math.max(0, impactByCompetency.get(item.competencyName) || 0),
  }))

  const gapData = [
    { name: t('visualizations.open'), value: data.gapDistribution.open, color: COLORS.open },
    { name: t('visualizations.inProgress'), value: data.gapDistribution.inProgress, color: COLORS.inProgress },
    { name: t('visualizations.closed'), value: data.gapDistribution.closed, color: COLORS.closed },
  ].filter((item) => item.value > 0)

  return (
    <div className="min-w-0 grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)] gap-4">
      <Card className="min-w-0 overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm">
        <div className="flex min-h-16 items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Competency performance</h3>
              <p className="text-[11px] text-muted-foreground">Initial score, current score, gap, and training impact</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">{competencyData.length} competencies</Badge>
        </div>
        <div className="p-4 pt-3">
          {competencyData.length > 0 ? (
            <ChartContainer config={{
              initial: { label: 'Initial', color: COLORS.initial },
              current: { label: 'Current', color: COLORS.current },
              gap: { label: 'Gap', color: COLORS.gap },
              impact: { label: 'Impact', color: COLORS.impact },
            }} className="h-[280px] w-full">
              <BarChart data={competencyData} margin={chartMargin} barGap={3}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} className="text-[10px]" />
                <YAxis axisLine={false} tickLine={false} className="text-[10px]" domain={[0, 100]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend verticalAlign="top" height={30} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="initial" fill={COLORS.initial} radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="current" fill={COLORS.current} radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="gap" fill={COLORS.gap} radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="impact" fill={COLORS.impact} radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">
              {t('visualizations.insufficientComparison')}
            </div>
          )}
        </div>
      </Card>

      <Card className="min-w-0 overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm">
        <div className="flex min-h-16 items-center justify-between border-b border-border/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Skill gap status</h3>
              <p className="text-[11px] text-muted-foreground">Open, in-progress, and closed gaps</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">{data.gapDistribution.total} gaps</Badge>
        </div>
        <div className="p-4 pt-3">
          {gapData.length > 0 ? (
            <ChartContainer config={{}} className="h-[280px] w-full">
              <PieChart>
                <Pie data={gapData} cx="50%" cy="45%" innerRadius={58} outerRadius={92} paddingAngle={4} dataKey="value" stroke="hsl(var(--card))" strokeWidth={3}>
                  {gapData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground">
              {t('visualizations.noSkillGaps')}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
