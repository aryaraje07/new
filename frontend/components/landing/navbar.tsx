'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X, Globe, Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
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

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { locale, setLocale, locales, t } = useLanguage()

  const currentLocaleObj = locales.find((l) => l.code === locale) || locales[0]

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl group">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-primary text-white shadow-xs">
              <span className="font-extrabold text-sm">S</span>
            </div>
            <span className="text-gray-900 font-bold tracking-tight">
              Skillify<span className="text-primary">AI</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors duration-200">
              {t('nav.home')}
            </Link>
            <Link href="#competency" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors duration-200">
              {t('nav.competencyIntelligence')}
            </Link>
            <Link href="#learning" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors duration-200">
              {t('nav.learning')}
            </Link>
            <Link href="#assessments" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors duration-200">
              {t('nav.assessments')}
            </Link>
            <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors duration-200">
              {t('nav.about')}
            </Link>
          </div>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 text-xs">
                  <Globe className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  <span>{currentLocaleObj.nativeName}</span>
                  <ChevronDown className="w-3 h-3 ml-1 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 bg-white border-gray-200 shadow-md">
                <DropdownMenuLabel className="text-xs font-semibold text-gray-500">
                  {t('header.language')}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {locales.map((loc) => {
                  const isSelected = loc.code === locale
                  return (
                    <DropdownMenuItem
                      key={loc.code}
                      onClick={() => setLocale(loc.code as LocaleCode)}
                      className={`flex items-center justify-between text-xs px-2.5 py-1.5 cursor-pointer ${
                        isSelected ? 'font-bold text-primary bg-primary/5' : 'text-gray-700'
                      }`}
                    >
                      <span>{loc.nativeName}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50">
                Sign In
              </Button>
            </Link>
            <Link href="/role-select">
              <Button size="sm" className="text-sm font-medium h-9 px-5 bg-primary text-white hover:bg-primary/95 shadow-xs transition-all">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 bg-white">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 px-2">
                <Link 
                  href="/" 
                  className="text-base font-medium text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('nav.home')}
                </Link>
                <Link 
                  href="#competency" 
                  className="text-base font-medium text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('nav.competencyIntelligence')}
                </Link>
                <Link 
                  href="#learning" 
                  className="text-base font-medium text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('nav.learning')}
                </Link>
                <Link 
                  href="#assessments" 
                  className="text-base font-medium text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('nav.assessments')}
                </Link>
                <Link 
                  href="/about" 
                  className="text-base font-medium text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('nav.about')}
                </Link>
              </div>
              <div className="flex flex-col gap-3 pt-4 border-t border-gray-200 px-2">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500">{t('header.language')}</span>
                  <div className="flex gap-2">
                    {locales.map((loc) => (
                      <button
                        key={loc.code}
                        onClick={() => setLocale(loc.code as LocaleCode)}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                          loc.code === locale
                            ? 'bg-primary text-white border-primary font-semibold'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {loc.nativeName}
                      </button>
                    ))}
                  </div>
                </div>
                <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-center h-10 text-gray-600 font-medium border-gray-200">
                    Sign In
                  </Button>
                </Link>
                <Link href="/role-select" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full justify-center h-10 bg-primary text-white font-medium">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
