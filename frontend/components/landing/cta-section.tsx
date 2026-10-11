'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRight, Target, Users, Building2, CheckCircle } from 'lucide-react'

export function CTASection() {
  const stakeholders = [
    {
      icon: Users,
      title: 'Government Officials',
      description: 'Identify competency gaps and receive personalized learning recommendations.',
    },
    {
      icon: Building2,
      title: 'Departments',
      description: 'Track workforce competency and training effectiveness across teams.',
    },
    {
      icon: Target,
      title: 'Trainers / Faculty',
      description: 'Upload learning materials and generate competency-aware assessments.',
    },
    {
      icon: CheckCircle,
      title: 'Administrators',
      description: 'Monitor aggregate competency analytics and role readiness.',
    },
  ]

  return (
    <section className="py-20 md:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            Built for the Official Statistical System
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Role-based competency development, statistical-domain skills, assessment from learning material, competency-gap identification, personalized learning, capacity building, multilingual access
          </p>
        </div>

        {/* Stakeholders */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {stakeholders.map((stakeholder, index) => {
            const Icon = stakeholder.icon
            return (
              <Card key={index} className="p-6 border border-gray-200 bg-gray-50">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {stakeholder.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                      {stakeholder.description}
                    </p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* CTA */}
        <Card className="p-12 md:p-16 border border-gray-200 bg-primary/5 max-w-4xl mx-auto">
          <div className="text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              Build Stronger Competencies Across the Official Statistical System
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Assess your current capability, address priority gaps and measure progress through evidence-based learning.
            </p>
            <Link href="/role-select">
              <Button size="lg" className="h-12 px-8 bg-primary text-white hover:bg-primary/90 transition-all text-base font-medium">
                Start Competency Assessment
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </section>
  )
}
