'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Sparkles, Shield, Users, Building2 } from 'lucide-react'

const roles = [
  {
    id: 'government_official',
    name: 'Government Official',
    description: 'Build competencies and skills for India\'s Official Statistical System',
    icon: Users,
    features: [
      'Competency Assessment & Diagnostics',
      'Personalized Learning Paths',
      'AI-Generated Assessments',
      'Skill Gap Analysis',
      'Training Recommendations'
    ],
    color: 'from-blue-500 to-blue-600',
    buttonText: 'Get Started',
    route: '/register?role=learner'
  },
  {
    id: 'administrator',
    name: 'Administrator',
    description: 'Manage workforce competency and training programs',
    icon: Shield,
    features: [
      'Workforce Analytics',
      'Upload Learning Materials',
      'Generate AI Assessments',
      'Track Official Progress',
      'Competency Gap Management'
    ],
    color: 'from-purple-500 to-purple-600',
    buttonText: 'Get Started',
    route: '/register?role=trainer',
    popular: true
  },
  {
    id: 'organization',
    name: 'Organization View',
    description: 'Department-wide competency intelligence and planning',
    icon: Building2,
    features: [
      'Department Analytics',
      'Role-Based Competency Mapping',
      'Training Program Management',
      'Workforce Planning',
      'Strategic Skill Development'
    ],
    color: 'from-orange-500 to-orange-600',
    buttonText: 'Get Started',
    route: '/register?role=admin'
  }
]

export default function SubscriptionPage() {
  const router = useRouter()

  const handleRoleSelect = (route: string) => {
    router.push(route)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex flex-col justify-center overflow-hidden">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <Link href="/" className="inline-flex items-center justify-center gap-2 font-bold text-2xl group">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary shadow-sm hover:scale-105 transition-transform duration-300">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-900 tracking-tight">Skillify<span className="text-primary">AI</span></span>
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
            Choose Your Role
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Select your role to access the AI-powered competency intelligence platform for India's Official Statistical System.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-stretch">
          {roles.map((role) => {
            const Icon = role.icon
            return (
              <Card key={role.id} className={`relative flex flex-col p-6 transition-all duration-300 rounded-3xl bg-white ${
                role.popular 
                  ? 'border-indigo-200 shadow-xl ring-2 ring-indigo-50 z-10 scale-105' 
                  : 'border-gray-200 shadow-sm hover:shadow-md'
              }`}>
                {role.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-md">
                      Most Common
                    </div>
                  </div>
                )}

                <div className="flex-grow space-y-4 mt-2">
                  {/* Role Header */}
                  <div className="text-center space-y-2">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center mx-auto shadow-sm`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{role.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 pt-3 border-t border-gray-100">
                    <ul className="space-y-3">
                      {role.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-600 font-medium">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="mt-4 pt-4 mt-auto border-t border-gray-50">
                  <Button 
                    className={`w-full h-10 rounded-xl text-sm font-semibold shadow-sm transition-all ${
                      role.popular 
                        ? 'bg-primary text-white hover:bg-primary/90 hover:shadow-md' 
                        : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    variant={role.popular ? 'default' : 'outline'}
                    onClick={() => handleRoleSelect(role.route)}
                  >
                    {role.buttonText}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Footer info */}
        <div className="text-center space-y-2">
          <p className="text-xs text-gray-500 font-medium max-w-2xl mx-auto">
            SkillifyAI provides competency intelligence, diagnostic assessment, and AI-powered learning pathways for India's Official Statistical System.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-xs text-gray-600 font-medium">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>AI-Powered Assessments</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Competency-Based Learning</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <span>Government-Focused</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
