'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, Crown, Sparkles } from 'lucide-react'
import { useSubscription, SubscriptionPlanType } from '@/contexts/SubscriptionContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface FeatureLockProps {
  feature: string
  role: 'learner' | 'trainer' | 'admin' | 'student' | 'faculty' | 'parent'
  children: React.ReactNode
  fallback?: React.ReactNode
}

const getRequiredPlanForFeature = (feature: string, role: 'learner' | 'trainer' | 'admin' | 'student' | 'faculty' | 'parent'): SubscriptionPlanType | null => {
  // Check plans in order of increasing cost
  const plans: SubscriptionPlanType[] = ['free', 'basic', 'pro', 'pro-plus']
  const normalizedRole = role === 'student' || role === 'parent'
    ? 'learner'
    : role === 'faculty'
      ? 'trainer'
      : role
  
  for (const planId of plans) {
    if (useSubscription().getPlanInfo(planId).features[normalizedRole].includes(feature)) {
      return planId
    }
  }
  return null
}

export function FeatureLock({ feature, role, children, fallback }: FeatureLockProps) {
  const { hasFeature, currentPlan, getPlanInfo } = useSubscription()
  const [showUpgradeDialog, setShowUpgradeDialog] = React.useState(false)

  const canAccess = hasFeature(feature, role)
  const requiredPlan = getRequiredPlanForFeature(feature, role)

  if (canAccess) {
    return <>{children}</>
  }

  const handleUpgradeClick = () => {
    setShowUpgradeDialog(true)
  }

  const defaultFallback = (
    <Card className="p-8 text-center border-2 border-dashed border-muted-foreground/20">
      <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">Feature Locked</h3>
      <p className="text-muted-foreground mb-4">
        This feature is available in the {requiredPlan ? requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1) : 'higher'} plan
      </p>
      <Button onClick={handleUpgradeClick} className="bg-primary hover:bg-primary/90">
        Upgrade Plan
      </Button>
    </Card>
  )

  return (
    <>
      {fallback || defaultFallback}
      
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Upgrade Your Plan
            </DialogTitle>
            <DialogDescription>
              Unlock this feature and many more by upgrading your subscription
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Current Plan:</span>
                <span className="text-sm font-bold">{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Required Plan:</span>
                <span className="text-sm font-bold text-primary">
                  {requiredPlan ? requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1) : 'Higher Plan'}
                </span>
              </div>
            </div>

            {requiredPlan && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  With the {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} plan, you'll get:
                </p>
                <ul className="text-sm space-y-1">
                  {getPlanInfo(requiredPlan).features[role === 'student' || role === 'parent' ? 'learner' : role === 'faculty' ? 'trainer' : role].slice(0, 3).map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-green-500" />
                      {feat}
                    </li>
                  ))}
                  {getPlanInfo(requiredPlan).features[role === 'student' || role === 'parent' ? 'learner' : role === 'faculty' ? 'trainer' : role].length > 3 && (
                    <li className="text-muted-foreground">+{getPlanInfo(requiredPlan).features[role === 'student' || role === 'parent' ? 'learner' : role === 'faculty' ? 'trainer' : role].length - 3} more features</li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => setShowUpgradeDialog(false)}
              >
                Maybe Later
              </Button>
              <Button 
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={() => {
                  window.location.href = '/subscription'
                }}
              >
                Upgrade Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
