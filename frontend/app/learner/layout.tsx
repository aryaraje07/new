'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { StudentSidebar } from '@/components/learner/sidebar'
import { StudentTopbar } from '@/components/learner/topbar'
import { FeatureLock } from '@/components/FeatureLock'
import { useSubscription } from '@/contexts/SubscriptionContext'

// Feature mapping for routes
const routeFeatureMap: Record<string, string> = {
  '/learner/dashboard': 'Dashboard',
  '/learner/skill-gaps': 'Profile',
  '/learner/quiz': 'AI Quiz',
  '/learner/code-editor': 'Code Editor',
  '/learner/exams': 'Exams',
  '/learner/marksheets': 'MarkSheets',
  '/learner/certifications': 'Courses',
  '/learner/courses': 'Courses',
  '/learner/materials': 'Materials',
  '/learner/ai-tutor': 'AI Tutor',
  '/learner/ai-assistant': 'AI Tutor',
  '/learner/ai-notes': 'AI Notes',
  '/learner/ai-mentor': 'AI Mentor',
  '/learner/grievances': 'Grievances',
  // Profile and Notifications are always accessible
  '/learner/profile': 'Profile',
  '/learner/notifications': 'Notifications',
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { hasFeature } = useSubscription()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)

    document.documentElement.classList.add('learner-viewport-lock')
    return () => document.documentElement.classList.remove('learner-viewport-lock')
  }, [])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Get the feature for the current route
  const currentFeature = routeFeatureMap[pathname]
  const canAccessFeature = !currentFeature || hasFeature(currentFeature, 'learner')

  if (!mounted) {
    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <StudentSidebar />
      </div>

      {/* Mobile Drawer Backdrop & Slide-out Sidebar */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="relative z-10 flex w-full max-w-xs flex-1">
            <StudentSidebar
              isMobile
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <StudentTopbar onToggleMobileMenu={() => setMobileMenuOpen(true)} />

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-hide p-4 sm:p-5 lg:p-6 bg-background">
          {!canAccessFeature && currentFeature ? (
            <FeatureLock
              feature={currentFeature}
              role="learner"
              fallback={
                <div className="max-w-2xl mx-auto py-12">
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                      {currentFeature} Access Restricted
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      This service requires enhanced role permissions or module activation.
                    </p>
                  </div>
                </div>
              }
            >
              {children}
            </FeatureLock>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
