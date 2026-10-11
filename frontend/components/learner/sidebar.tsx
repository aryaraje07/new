'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { FeatureTooltip } from '@/components/FeatureTooltip'
import {
  LayoutDashboard,
  Target,
  Brain,
  BookOpen,
  GraduationCap,
  Sparkles,
  Bell,
  User,
  HelpCircle,
  LogOut,
  Lock,
  FileText,
  Shield,
  X,
} from 'lucide-react'

interface StudentSidebarProps {
  onClose?: () => void
  isMobile?: boolean
}

export function StudentSidebar({ onClose, isMobile }: StudentSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { hasFeature } = useSubscription()
  const { t } = useLanguage()

  const handleLogout = () => {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('userRole')
    } catch {
      // Ignore
    }
    router.push('/')
  }

  const primaryMenuItems = [
    {
      label: t('nav.dashboard'),
      icon: LayoutDashboard,
      href: '/learner/dashboard',
      feature: 'Dashboard',
    },
    {
      label: t('nav.competencyProfile'),
      icon: Target,
      href: '/learner/skill-gaps',
      feature: 'Profile',
    },
    {
      label: t('nav.learning'),
      icon: BookOpen,
      href: '/learner/courses',
      feature: 'Courses',
    },
    {
      label: t('nav.assessments'),
      icon: GraduationCap,
      href: '/learner/quiz',
      feature: 'AI Quiz',
    },
    {
      label: t('nav.materials'),
      icon: FileText,
      href: '/learner/materials',
      feature: 'Materials',
    },
    {
      label: t('aiTutor.title'),
      icon: Sparkles,
      href: '/learner/ai-tutor',
      feature: 'AI Tutor',
    },
    {
      label: t('nav.competencyAssistant'),
      icon: Brain,
      href: '/learner/ai-assistant',
      feature: 'AI Tutor',
    },
    {
      label: t('nav.notifications'),
      icon: Bell,
      href: '/learner/notifications',
      feature: 'Notifications',
    },
    {
      label: t('nav.profile'),
      icon: User,
      href: '/learner/profile',
      feature: 'Profile',
    },
  ]

  return (
    <aside className={cn(
      "w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col h-full select-none",
      isMobile ? "w-full max-w-xs shadow-2xl" : "shrink-0"
    )}>
      {/* Brand Header */}
      <div className="p-4 border-b border-sidebar-border/60 flex items-center justify-between">
        <Link
          href="/learner/dashboard"
          onClick={() => onClose?.()}
          className="flex items-center gap-3 group"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-black text-sm shadow-xs">
            S
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-sidebar-foreground tracking-tight flex items-center gap-1.5">
              Skillify<span className="text-white font-normal opacity-90">AI</span>
            </span>
            <span className="text-[10px] text-sidebar-foreground/70 uppercase tracking-widest font-medium">
              Official Statistical System
            </span>
          </div>
        </Link>
        {isMobile && (
          <button
            onClick={onClose}
            className="p-1 rounded text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Official Status Indicator */}
      <div className="px-4 py-2 bg-black/10 border-b border-sidebar-border/40 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[11px] text-sidebar-foreground/85 font-medium tracking-wide">
          Government Official Portal
        </span>
      </div>

      {/* Primary Navigation Menu */}
      <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-3 px-3 space-y-1">
        <div className="px-3 pb-1.5 text-[10px] font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
          Core Services
        </div>

        {primaryMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          const canAccess = hasFeature(item.feature, 'learner')

          return (
            <FeatureTooltip
              key={item.href + item.label}
              feature={item.feature}
              role="learner"
              isLocked={!canAccess}
            >
              {canAccess ? (
                <Link
                  href={item.href}
                  onClick={() => onClose?.()}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors relative focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white',
                    isActive
                      ? 'bg-white text-primary font-bold shadow-xs'
                      : 'text-sidebar-foreground/90 hover:bg-white/10 hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary' : 'text-sidebar-foreground/80')} />
                  <span className={cn('truncate', isActive ? 'text-primary font-bold' : 'text-sidebar-foreground/90')}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r-full" />
                  )}
                </Link>
              ) : (
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium opacity-50 cursor-not-allowed text-sidebar-foreground/60"
                >
                  <Lock className="w-4 h-4" />
                  <span className="truncate">{item.label}</span>
                </div>
              )}
            </FeatureTooltip>
          )
        })}
      </nav>

      {/* Bottom Utility Actions */}
      <div className="border-t border-sidebar-border/60 p-3 space-y-1 bg-black/5">
        <Link
          href="/learner/ai-tutor"
          onClick={() => onClose?.()}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium text-sidebar-foreground/85 hover:bg-white/10 hover:text-sidebar-foreground transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-sidebar-foreground/70" />
          <span>{t('nav.helpSupport')}</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium text-sidebar-foreground/85 hover:bg-red-500/20 hover:text-red-200 transition-colors text-left"
        >
          <LogOut className="w-4 h-4 text-sidebar-foreground/70" />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  )
}
