'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Users, Shield, Sparkles, Lock } from 'lucide-react'
import { useSubscription, SubscriptionPlanType } from '@/contexts/SubscriptionContext'
import { useEffect, useState } from 'react'

export default function RoleSelectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { canAccessRole, setPlan, currentPlan } = useSubscription()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Get plan from URL and set it
    const planFromUrl = searchParams.get('plan') as SubscriptionPlanType
    if (planFromUrl) {
      setPlan(planFromUrl)
    }
  }, [searchParams, setPlan])

  const roles = [
    {
      id: 'learner',
      title: 'Learner / Official',
      description: 'Build job-relevant competencies with personalized learning and assessment',
      icon: BookOpen,
      href: '/register?role=learner',
    },
    {
      id: 'trainer',
      title: 'Trainer / Training Officer',
      description: 'Create training assessments, share material, and monitor learner progress',
      icon: Users,
      href: '/register?role=trainer',
    },
    {
      id: 'admin',
      title: 'Administrator',
      description: 'Manage workforce competencies, training, and organization analytics',
      icon: Shield,
      href: '/register?role=admin',
    },
  ]

  // Filter roles based on subscription
  const availableRoles = roles.filter(role => canAccessRole(role.id as any))

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Link href="/" className="inline-flex items-center justify-center gap-2 font-bold text-2xl">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-foreground">SkillifyAI</span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Select Your Official Role</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Choose your role to access personalized competency management, training, and analytics.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {roles.map((role) => {
            const Icon = role.icon
            const isAvailable = true
            
            return (
              <div key={role.id}>
                <Link href={role.href}>
                  <Card className="h-full p-8 border border-border hover:border-primary/40 hover:shadow-lg transition-all duration-300 group cursor-pointer hover:scale-105">
                    <div className="space-y-6">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-7 h-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-2">{role.title}</h3>
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      </div>
                      <Button className="w-full bg-primary hover:bg-primary/90 group-hover:shadow-lg">
                        Get Started
                      </Button>
                    </div>
                  </Card>
                </Link>
              </div>
            )
          })}
        </div>

        {/* Already have account */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
