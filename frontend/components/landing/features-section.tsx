'use client'

import { Card } from '@/components/ui/card'
import { Target, Brain, BookOpen, Zap, Globe, BarChart3, ArrowRight } from 'lucide-react'

export function FeaturesSection() {
  const features = [
    {
      icon: Target,
      title: 'Competency Intelligence',
      description: 'Measure demonstrated competency against role requirements.',
      colorClass: 'text-primary',
      bgClass: 'bg-primary/10 border-primary/20',
    },
    {
      icon: Brain,
      title: 'Explainable Skill Gaps',
      description: 'Understand what needs improvement and why.',
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50 border-blue-100',
    },
    {
      icon: BookOpen,
      title: 'Personalized Learning',
      description: 'Prioritize learning based on role, competency gap and training status.',
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50 border-emerald-100',
    },
    {
      icon: Zap,
      title: 'AI Assessment',
      description: 'Generate competency-aware assessments from approved learning materials.',
      colorClass: 'text-amber-600',
      bgClass: 'bg-amber-50 border-amber-100',
    },
    {
      icon: Globe,
      title: 'Multilingual Access',
      description: 'Use the platform in English, Hindi and Marathi.',
      colorClass: 'text-rose-600',
      bgClass: 'bg-rose-50 border-rose-100',
    },
    {
      icon: BarChart3,
      title: 'Competency Progress',
      description: 'Track improvement across assessments and training interventions.',
      colorClass: 'text-sky-600',
      bgClass: 'bg-sky-50 border-sky-100',
    },
  ]

  return (
    <section id="features" className="py-20 md:py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            One Platform for Competency Development
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Designed to complement the iGOT Karmayogi learning ecosystem
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card
                key={index}
                className="p-6 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="space-y-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${feature.bgClass}`}>
                    <Icon className={`w-6 h-6 ${feature.colorClass}`} />
                  </div>
                  
                  {/* Content */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed text-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
