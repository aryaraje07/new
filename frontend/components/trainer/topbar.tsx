'use client'

import Link from 'next/link'
import { Search, Bell, Globe, ChevronDown, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/contexts/LanguageContext'
import type { LocaleCode } from '@/i18n/config'

export function FacultyTopbar() {
  const { locale, setLocale, locales, t } = useLanguage()

  const currentLocaleObj =
    locales.find((l) => l.code === locale) || locales[0]

  return (
    <header className="h-16 border-b border-border bg-card px-8 flex items-center justify-between">

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

          <Input
            type="text"
            placeholder="Search students, exams..."
            className="pl-10 h-9 border-border bg-secondary"
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4 ml-6">

        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-secondary text-xs font-medium text-foreground transition-colors focus:outline-hidden focus:ring-2 focus:ring-primary"
              aria-label={`${t('header.language')}: ${currentLocaleObj.nativeName}`}
            >
              <Globe className="w-3.5 h-3.5 text-primary" />

              <span>
                {currentLocaleObj.nativeName}
              </span>

              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-40 bg-card border-border shadow-md"
          >
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
              {t('header.language')}
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {locales.map((loc) => {
              const isSelected = loc.code === locale

              return (
                <DropdownMenuItem
                  key={loc.code}
                  onClick={() =>
                    setLocale(loc.code as LocaleCode)
                  }
                  className={`flex items-center justify-between text-xs px-2.5 py-2 cursor-pointer font-medium ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground'
                  }`}
                >
                  <span>{loc.nativeName}</span>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notification */}
        <Link
          href="#"
          className="relative text-muted-foreground hover:text-foreground transition-colors"
        >
          <Bell className="w-5 h-5" />

          <span className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full text-xs text-primary-foreground flex items-center justify-center">
            2
          </span>
        </Link>

        {/* Profile */}
        <Link href="/trainer/profile">
          <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 ring-primary transition-all">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              PS
            </AvatarFallback>
          </Avatar>
        </Link>

      </div>
    </header>
  )
}