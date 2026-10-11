'use client'

import { Card } from '@/components/ui/card'
import { ArrowDown, CheckCircle } from 'lucide-react'

export function WorkflowSection() {
  const steps = [
    { label: 'Role Selection', color: 'bg-primary' },
    { label: 'Initial Diagnostic', color: 'bg-primary' },
    { label: 'Competency Profile', color: 'bg-primary' },
    { label: 'Skill Gap', color: 'bg-orange-500' },
    { label: 'Personalized Learning', color: 'bg-blue-500' },
    { label: 'Assessment', color: 'bg-purple-500' },
    { label: 'Reassessment', color: 'bg-purple-500' },
    { label: 'Updated Competency', color: 'bg-green-500' },
  ]

  return (
    <section id="learning" className="py-20 md:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            From Training Completion to Demonstrated Competency
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Evidence-based competency development through continuous assessment and gap closure
          </p>
        </div>

        <Card className="p-8 md:p-12 border border-gray-200 bg-gray-50 max-w-4xl mx-auto">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full ${step.color} text-white flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                  {index + 1}
                </div>
                <span className="text-base font-medium text-gray-900">{step.label}</span>
                {index < steps.length - 1 && (
                  <ArrowDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  )
}
