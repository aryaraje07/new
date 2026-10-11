'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Search,
  Bell,
  Globe,
  Menu,
  ChevronDown,
  User,
  LogOut,
  Target,
  Shield,
  Check,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/contexts/LanguageContext'
import { LocaleCode } from '@/i18n/config'

interface StudentTopbarProps {
  onToggleMobileMenu?: () => void
}

export function StudentTopbar({ onToggleMobileMenu }: StudentTopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { locale, setLocale, locales, t } = useLanguage()
  const [userName, setUserName] = useState<string>('Official')
  const [userRole, setUserRole] = useState<string>('Statistical Officer')
  const [userInitials, setUserInitials] = useState<string>('SO')

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const parsed = JSON.parse(storedUser)
        const name = parsed.fullName || parsed.name || 'Official'
        setUserName(name)
        setUserRole(parsed.designation || parsed.role || 'Statistical Officer')
        
        // Compute initials
        const parts = name.trim().split(' ')
        if (parts.length >= 2) {
          setUserInitials((parts[0][0] + parts[parts.length - 1][0]).toUpperCase())
        } else if (parts[0]) {
          setUserInitials(parts[0].slice(0, 2).toUpperCase())
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }, [])

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

  // Determine current section title based on pathname
  const getSectionTitle = () => {
    if (pathname.includes('/learner/dashboard')) return t('nav.dashboard')
    if (pathname.includes('/learner/skill-gaps')) return t('nav.skillGaps')
    if (pathname.includes('/learner/courses')) return t('nav.learning')
    if (pathname.includes('/learner/materials')) return t('nav.materials')
    if (pathname.includes('/learner/quiz')) return t('nav.assessments')
    if (pathname.includes('/learner/ai-assistant')) return t('nav.competencyAssistant')
    if (pathname.includes('/learner/ai-tutor')) return t('aiTutor.title')
    if (pathname.includes('/learner/notifications')) return t('nav.notifications')
    if (pathname.includes('/learner/profile')) return t('nav.profile')
    return t('nav.dashboard')
  }

  const currentLocaleObj = locales.find((l) => l.code === locale) || locales[0]

  return (
    <header className="h-16 border-b border-border bg-card px-4 lg:px-6 flex items-center justify-between shadow-xs sticky top-0 z-30">
      {/* Left: Mobile Hamburger & Page Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider hidden sm:inline-block">
              Official Statistical System
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline-block">/</span>
            <span className="text-sm font-semibold text-foreground tracking-tight">
              {getSectionTitle()}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground hidden md:inline-block">
            Capacity Building & Competency Intelligence Platform
          </span>
        </div>
      </div>

      {/* Middle: Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('header.searchPlaceholder')}
            className="pl-9 h-9 border-border bg-secondary/50 text-sm focus-visible:bg-card transition-colors w-full"
            aria-label={t('header.searchPlaceholder')}
          />
        </div>
      </div>

      {/* Right Actions: Language Selector, Notifications, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language Selector Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-secondary text-xs font-medium text-foreground transition-colors focus:outline-hidden focus:ring-2 focus:ring-primary"
              aria-label={`${t('header.language')}: ${currentLocaleObj.nativeName}`}
            >
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>{currentLocaleObj.nativeName}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-card border-border shadow-md">
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
              {t('header.language')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {locales.map((loc) => {
              const isSelected = loc.code === locale
              return (
                <DropdownMenuItem
                  key={loc.code}
                  onClick={() => setLocale(loc.code as LocaleCode)}
                  className={`flex items-center justify-between text-xs px-2.5 py-2 cursor-pointer font-medium ${
                    isSelected ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                  }`}
                >
                  <span>{loc.nativeName}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Link
          href="/learner/notifications"
          className="relative p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors focus:outline-hidden focus:ring-2 focus:ring-primary"
          aria-label={t('nav.notifications')}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </Link>

        {/* Official Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 p-1.5 rounded-md hover:bg-secondary transition-colors focus:outline-hidden focus:ring-2 focus:ring-primary text-left"
              aria-label="Official Profile Menu"
            >
              <Avatar className="w-8 h-8 border border-border">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:flex flex-col text-left leading-tight">
                <span className="text-xs font-semibold text-foreground max-w-[120px] truncate">
                  {userName}
                </span>
                <span className="text-[10px] text-muted-foreground max-w-[120px] truncate">
                  {userRole}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-muted-foreground hidden lg:inline-block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card border-border shadow-md">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-semibold text-foreground truncate">{userName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{userRole}</p>
              <Badge variant="outline" className="mt-1.5 text-[10px] uppercase tracking-wider border-primary/30 text-primary bg-primary/5">
                Official
              </Badge>
            </div>
            <DropdownMenuItem asChild>
              <Link href="/learner/profile" className="flex items-center gap-2 text-xs py-2 cursor-pointer">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{t('nav.profile')}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/learner/skill-gaps" className="flex items-center gap-2 text-xs py-2 cursor-pointer">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span>{t('nav.competencyProfile')}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs py-2 text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('nav.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
