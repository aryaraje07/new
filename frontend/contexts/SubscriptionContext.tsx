'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type SubscriptionPlanType = 'free' | 'basic' | 'pro' | 'pro-plus'
export type ApplicationRole = 'learner' | 'trainer' | 'admin' | 'student' | 'faculty' | 'parent'

interface SubscriptionFeatures {
  learner: string[]
  trainer: string[]
  admin: string[]
}

interface SubscriptionPlan {
  id: SubscriptionPlanType
  name: string
  price: string
  features: SubscriptionFeatures
}

const subscriptionPlans: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: '₹0',
    features: {
      learner: ['Dashboard', 'AI Quiz', 'Courses', 'AI Mentor'],
      trainer: [],
      admin: []
    }
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: '₹300',
    features: {
      learner: ['Dashboard', 'AI Quiz', 'Courses', 'AI Mentor', 'Oral Practice', 'Code Editor', 'AI Notes', 'AI Tutor'],
      trainer: [],
      admin: []
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: '₹600',
    features: {
      learner: ['Dashboard', 'AI Quiz', 'Courses', 'AI Mentor', 'Oral Practice', 'Code Editor', 'AI Notes', 'AI Tutor', 'Materials', 'Grievances', 'Interview'],
      trainer: ['Full Trainer Access'],
      admin: []
    }
  },
  'pro-plus': {
    id: 'pro-plus',
    name: 'Pro Plus',
    price: '₹1000',
    features: {
      learner: ['Dashboard', 'AI Quiz', 'Courses', 'AI Mentor', 'Oral Practice', 'Code Editor', 'AI Notes', 'AI Tutor', 'Materials', 'Grievances', 'Interview', 'Exams', 'MarkSheets'],
      trainer: ['Full Trainer Access'],
      admin: ['Full Admin Access']
    }
  }
}

interface SubscriptionContextType {
  currentPlan: SubscriptionPlanType
  setPlan: (plan: SubscriptionPlanType) => void
  hasFeature: (feature: string, role: ApplicationRole) => boolean
  getPlanInfo: (plan: SubscriptionPlanType) => SubscriptionPlan
  canAccessRole: (role: ApplicationRole) => boolean
  getRequiredPlanForFeature: (feature: string, role: ApplicationRole) => SubscriptionPlanType | null
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlanType>('free')

  useEffect(() => {
    const savedPlan = localStorage.getItem('userSubscription') as SubscriptionPlanType
    if (savedPlan && ['free', 'basic', 'pro', 'pro-plus'].includes(savedPlan)) {
      setCurrentPlan(savedPlan)
    }
  }, [])

  const setPlan = (plan: SubscriptionPlanType) => {
    setCurrentPlan(plan)
    localStorage.setItem('userSubscription', plan)
  }

  const normalizeRole = (role: ApplicationRole): keyof SubscriptionFeatures => {
    if (role === 'student') return 'learner'
    if (role === 'faculty') return 'trainer'
    return role === 'parent' ? 'learner' : role
  }

  const hasFeature = (_feature: string, _role: ApplicationRole): boolean => {
    return true
  }

  const canAccessRole = (_role: ApplicationRole): boolean => {
    return true
  }

  const getRequiredPlanForFeature = (feature: string, role: ApplicationRole): SubscriptionPlanType | null => {
    const plans: SubscriptionPlanType[] = ['free', 'basic', 'pro', 'pro-plus']
    
    for (const planId of plans) {
      if (subscriptionPlans[planId].features[normalizeRole(role)].some((planFeature: string) =>
        planFeature.toLowerCase() === feature.toLowerCase() || 
        feature.toLowerCase().includes(planFeature.toLowerCase()) ||
        planFeature.toLowerCase().includes(feature.toLowerCase())
      )) {
        return planId
      }
    }
    return null
  }

  const getPlanInfo = (plan: SubscriptionPlanType): SubscriptionPlan => {
    return subscriptionPlans[plan]
  }

  return (
    <SubscriptionContext.Provider value={{
      currentPlan,
      setPlan,
      hasFeature,
      getPlanInfo,
      canAccessRole,
      getRequiredPlanForFeature
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}

export { subscriptionPlans }
