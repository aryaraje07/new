'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, Crown, Sparkles, ArrowRight } from 'lucide-react'
import { useSubscription, SubscriptionPlanType } from '@/contexts/SubscriptionContext'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface FeatureTooltipProps {
  feature: string
  role: 'learner' | 'trainer' | 'admin' | 'student' | 'faculty' | 'parent'
  children: React.ReactNode
  isLocked: boolean
}

export function FeatureTooltip({ feature, role, children, isLocked }: FeatureTooltipProps) {
  const { getRequiredPlanForFeature, getPlanInfo, currentPlan } = useSubscription()
  const requiredPlan = getRequiredPlanForFeature(feature, role)

  // Profile and Notifications are never locked
  if (!isLocked || feature === 'Profile' || feature === 'Notifications') {
    return <>{children}</>
  }

  const handleBuyNow = () => {
    if (requiredPlan) {
      window.location.href = '/subscription'
    }
  }

  const getPlanIcon = (plan: SubscriptionPlanType) => {
    switch (plan) {
      case 'basic':
        return <Crown className="w-4 h-4 text-blue-500" />
      case 'pro':
        return <Sparkles className="w-4 h-4 text-purple-500" />
      case 'pro-plus':
        return <Crown className="w-4 h-4 text-orange-500" />
      default:
        return <Lock className="w-4 h-4 text-gray-500" />
    }
  }

  const getPlanColor = (plan: SubscriptionPlanType) => {
    switch (plan) {
      case 'basic':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'pro':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'pro-plus':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-not-allowed">
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="w-80 p-0" sideOffset={5}>
          <Card className="border-2 shadow-lg">
            <div className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">Feature Locked</span>
              </div>

              {/* Required Plan Info */}
              {requiredPlan && (
                <div className={`p-3 rounded-lg border ${getPlanColor(requiredPlan)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getPlanIcon(requiredPlan)}
                      <span className="font-bold">{requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} Plan</span>
                    </div>
                    <span className="font-bold">{getPlanInfo(requiredPlan).price}</span>
                  </div>
                  <p className="text-sm opacity-90">
                    Upgrade to unlock this feature and more
                  </p>
                </div>
              )}

              {/* Current Plan */}
              <div className="text-sm text-muted-foreground">
                Your current plan: <span className="font-medium text-foreground">{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</span>
              </div>

              {/* Buy Button */}
              <Button 
                onClick={handleBuyNow}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                size="sm"
              >
                Upgrade Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
