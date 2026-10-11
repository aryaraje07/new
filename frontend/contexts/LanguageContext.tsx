'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { locales, defaultLocale, storageKey, LocaleCode } from '@/i18n/config'
import { en } from '@/i18n/translations/en'

interface LanguageContextType {
  locale: LocaleCode
  setLocale: (code: LocaleCode) => void
  locales: typeof locales
  t: (path: string, params?: Record<string, string | number>) => string
  translateDynamic: (text: string) => Promise<string>
  translateBatch: (texts: string[]) => Promise<string[]>
  isLoaded: boolean
}

const clientTranslationCache = new Map<string, string>()
const catalogCache = new Map<LocaleCode, Record<string, string>>()
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

const LanguageContext = createContext<LanguageContextType>({
  locale: defaultLocale,
  setLocale: () => {},
  locales,
  t: (path: string) => path,
  translateDynamic: async (text: string) => text,
  translateBatch: async (texts: string[]) => texts,
  isLoaded: false,
})

function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj || !path) return undefined
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part]
    } else {
      return undefined
    }
  }
  return typeof current === 'string' ? current : undefined
}

function flattenStrings(value: any, prefix = ''): Array<{ path: string; text: string }> {
  if (!value || typeof value !== 'object') return []

  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof child === 'string') return [{ path, text: child }]
    return flattenStrings(child, path)
  })
}

async function loadBhashiniCatalog(locale: LocaleCode): Promise<Record<string, string>> {
  if (locale === defaultLocale) return Object.fromEntries(flattenStrings(en).map(({ path, text }) => [path, text]))
  const cached = catalogCache.get(locale)
  if (cached) return cached

  const entries = flattenStrings(en)
  const chunks = Array.from({ length: Math.ceil(entries.length / 50) }, (_, index) =>
    entries.slice(index * 50, index * 50 + 50)
  )
  const translatedChunks = await Promise.all(chunks.map(async (chunk) => {
    let lastError: Error | undefined

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const res = await fetch(`${apiBaseUrl}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            texts: chunk.map(({ text }) => text),
            sourceLanguage: defaultLocale,
            targetLanguage: locale,
          }),
        })

        if (!res.ok) throw new Error(`Bhashini catalog request failed with status ${res.status}.`)
        const data = await res.json()
        if (!data.success || !Array.isArray(data.translatedTexts) || data.translatedTexts.length !== chunk.length) {
          throw new Error('Bhashini returned an incomplete language catalog.')
        }

        return chunk.map(({ path }, index) => {
          const value = data.translatedTexts[index]
          if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Bhashini returned no translation for catalog key ${path}.`)
          }
          return [path, value.trim()] as const
        })
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Bhashini catalog request failed.')
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
      }
    }

    throw lastError || new Error('Bhashini catalog request failed.')
  }))

  const translated: Record<string, string> = Object.fromEntries(translatedChunks.flat())

  catalogCache.set(locale, translated)
  return translated
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(defaultLocale)
  const [isLoaded, setIsLoaded] = useState(false)
  const [catalog, setCatalog] = useState<Record<string, string>>(() =>
    Object.fromEntries(flattenStrings(en).map(({ path, text }) => [path, text]))
  )

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey) as LocaleCode
      if (saved && locales.some((entry) => entry.code === saved)) {
        setLocaleState(saved)
        document.documentElement.lang = saved
      } else {
        document.documentElement.lang = defaultLocale
      }
    } catch {
      // Storage access may be blocked in private mode
    }
  }, [])

  useEffect(() => {
    let isCurrent = true
    setIsLoaded(false)
    setCatalog(locale === defaultLocale
      ? Object.fromEntries(flattenStrings(en).map(({ path, text }) => [path, text]))
      : {})
    loadBhashiniCatalog(locale)
      .then((loadedCatalog) => {
        if (isCurrent) {
          setCatalog(loadedCatalog)
          setIsLoaded(true)
        }
      })
      .catch((error) => {
        console.error('[Bhashini] Language catalog failed to load:', error)
        if (isCurrent) setIsLoaded(false)
      })

    return () => {
      isCurrent = false
    }
  }, [locale])

  const setLocale = useCallback((newLocale: LocaleCode) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem(storageKey, newLocale)
      document.documentElement.lang = newLocale
    } catch {
      // Ignore storage errors
    }
  }, [])

  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      let text = locale === defaultLocale ? getNestedValue(en, path) : catalog[path] || getNestedValue(en, path)
      if (!text) return path

      // 4. Interpolate variables like {count}
      if (params) {
        Object.entries(params).forEach(([key, val]) => {
          text = text!.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val))
        })
      }

      return text
    },
    [catalog, locale]
  )

  const translateDynamic = useCallback(
    async (text: string): Promise<string> => {
      if (!text || typeof text !== 'string' || !text.trim()) {
        return text || ''
      }

      if (locale === 'en') {
        return text
      }

      const trimmed = text.trim()
      const cacheKey = `${locale}:${trimmed}`

      if (clientTranslationCache.has(cacheKey)) {
        return clientTranslationCache.get(cacheKey)!
      }

      try {
        const res = await fetch(`${apiBaseUrl}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: trimmed,
            sourceLanguage: 'en',
            targetLanguage: locale,
          }),
        })

        if (!res.ok) throw new Error(`Bhashini translation failed with status ${res.status}.`)

        const data = await res.json()
        if (data.success && typeof data.translatedText === 'string' && data.translatedText.trim()) {
          const result = data.translatedText.trim()
          clientTranslationCache.set(cacheKey, result)
          return result
        }

        throw new Error('Bhashini returned no translated text.')
      } catch {
        throw new Error('Bhashini dynamic translation failed.')
      }
    },
    [locale]
  )

  const translateBatch = useCallback(
    async (texts: string[]): Promise<string[]> => {
      if (!Array.isArray(texts) || texts.length === 0) return []

      if (locale === 'en') {
        return [...texts]
      }

      const results = new Array(texts.length)
      const uncachedIndices: number[] = []
      const uncachedTexts: string[] = []

      for (let i = 0; i < texts.length; i++) {
        const raw = texts[i]
        if (!raw || typeof raw !== 'string' || !raw.trim()) {
          results[i] = raw || ''
          continue
        }

        const trimmed = raw.trim()
        const cacheKey = `${locale}:${trimmed}`
        if (clientTranslationCache.has(cacheKey)) {
          results[i] = clientTranslationCache.get(cacheKey)!
        } else {
          uncachedIndices.push(i)
          uncachedTexts.push(trimmed)
        }
      }

      if (uncachedIndices.length === 0) {
        return results
      }

      try {
        const res = await fetch(`${apiBaseUrl}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            texts: uncachedTexts,
            sourceLanguage: 'en',
            targetLanguage: locale,
          }),
        })

        if (!res.ok) throw new Error(`Bhashini batch translation failed with status ${res.status}.`)

        const data = await res.json()
        const translatedList = data.translatedTexts || []

        for (let j = 0; j < uncachedIndices.length; j++) {
          const originalIdx = uncachedIndices[j]
          const translated = translatedList[j]
          const original = texts[originalIdx]
          if (typeof translated === 'string' && translated.trim()) {
            const finalVal = translated.trim()
            clientTranslationCache.set(`${locale}:${original.trim()}`, finalVal)
            results[originalIdx] = finalVal
          } else throw new Error(`Bhashini returned no translation for batch item ${originalIdx}.`)
        }

        return results
      } catch {
        throw new Error('Bhashini batch translation failed.')
      }
    },
    [locale]
  )

  return (
    <LanguageContext.Provider value={{ locale, setLocale, locales, t, translateDynamic, translateBatch, isLoaded }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

/**
 * Hook for translating dynamic human-readable strings (e.g. competency descriptions,
 * recommendation explanations) with automatic caching and zero-rerender flash on English.
 */
export function useDynamicText(text: string | undefined | null): string {
  const { locale, translateDynamic } = useLanguage()
  const [translated, setTranslated] = useState(text || '')

  useEffect(() => {
    if (!text) {
      setTranslated('')
      return
    }

    if (locale === 'en') {
      setTranslated(text)
      return
    }

    const cacheKey = `${locale}:${text.trim()}`
    if (clientTranslationCache.has(cacheKey)) {
      setTranslated(clientTranslationCache.get(cacheKey)!)
      return
    }

    let isCurrent = true
    translateDynamic(text)
      .then((res) => {
        if (isCurrent) setTranslated(res)
      })
      .catch(() => {
        if (isCurrent) setTranslated('')
      })

    return () => {
      isCurrent = false
    }
  }, [text, locale, translateDynamic])

  return translated
}
