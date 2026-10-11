'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Brain, TrendingUp, BookOpen, Zap, ArrowRight, Target, BarChart3, Globe } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export function HeroSection() {
  const { t } = useLanguage()

  return (
    <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">
                <Target className="w-4 h-4" />
                <span>{t('landing.capacity')}</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.1] tracking-tight">
                {t('landing.heroTitle')} — <br />
                <span className="text-primary">{t('landing.heroTitleAccent')}</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
                {t('landing.heroDescription')}
              </p>
            </div>

            {/* Feature Indicators */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <span className="text-gray-700 font-medium">{t('landing.roleAssessment')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-primary" />
                </div>
                <span className="text-gray-700 font-medium">{t('landing.explainableGaps')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <span className="text-gray-700 font-medium">{t('landing.personalizedRecommendations')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <span className="text-gray-700 font-medium">{t('landing.aiAssessments')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-primary" />
                </div>
                <span className="text-gray-700 font-medium">{t('landing.multilingual')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
                <span className="text-gray-700 font-medium">{t('landing.progressTracking')}</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/role-select">
                <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8 bg-primary text-white hover:bg-primary/90 transition-all">
                  {t('landing.getStarted')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base h-12 px-8 bg-white border-gray-300 hover:bg-gray-50 text-gray-700 transition-all">
                {t('landing.explore')}
              </Button>
            </div>
          </div>

          {/* Right Side - Workflow Visualization */}
          <div className="relative">
            <Card className="p-6 border border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('landing.workflowTitle')}</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">1</div>
                  <span className="text-sm text-gray-700">{t('landing.roleSelection')}</span>
                </div>
                <div className="w-0.5 h-4 bg-gray-300 ml-4"></div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">2</div>
                  <span className="text-sm text-gray-700">{t('landing.initialDiagnostic')}</span>
                </div>
                <div className="w-0.5 h-4 bg-gray-300 ml-4"></div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">3</div>
                  <span className="text-sm text-gray-700">{t('landing.competencyProfile')}</span>
                </div>
                <div className="w-0.5 h-4 bg-gray-300 ml-4"></div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">4</div>
                  <span className="text-sm text-gray-700">{t('landing.skillGapIdentification')}</span>
                </div>
                <div className="w-0.5 h-4 bg-gray-300 ml-4"></div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">5</div>
                  <span className="text-sm text-gray-700">{t('landing.personalizedLearning')}</span>
                </div>
                <div className="w-0.5 h-4 bg-gray-300 ml-4"></div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">6</div>
                  <span className="text-sm text-gray-700">{t('landing.assessment')}</span>
                </div>
                <div className="w-0.5 h-4 bg-gray-300 ml-4"></div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">7</div>
                  <span className="text-sm text-gray-700">{t('landing.reassessment')}</span>
                </div>
                <div className="w-0.5 h-4 bg-gray-300 ml-4"></div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">8</div>
                  <span className="text-sm text-gray-700 font-medium">{t('landing.updatedCompetency')}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
