'use client'

import { useEffect, useState } from 'react'
import API from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { BookOpen, ExternalLink, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function CoursesPage() {
  const { t } = useLanguage()
  const [courses, setCourses] = useState<any[]>([])
  const [error, setError] = useState('')
  const [courseErrors, setCourseErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<string | null>(null)
  const router = useRouter()

  const getResourceUrl = (course: any) => {
    const rawUrl = typeof course.link === 'string' ? course.link.trim() : ''
    try {
      const url = new URL(rawUrl)
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString()
    } catch {
      // Use the official catalogue search when a discovered URL is missing or malformed.
    }
    return `https://mospi.gov.in/search?search_api_fulltext=${encodeURIComponent(course.title || 'official statistics')}`
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setCourses((await API.get('/courses/recommended')).data.courses || [])
    } catch (e: any) {
      setError(e.response?.data?.message || 'Unable to load learning recommendations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const complete = async (course: any) => {
    if (working === course._id) return
    setWorking(course._id)
    setError('')
    setCourseErrors((current) => ({ ...current, [course._id]: '' }))
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 300000)
    try {
      const result = await API.post(`/courses/${course._id}/complete`, undefined, { signal: controller.signal })
      setCourses((current) => current.map((item) => item._id === course._id ? { ...item, assessment: result.data.assessmentId || item.assessment, completionStatus: result.data.completed ? 'assessment_created' : item.completionStatus } : item))
      if (result.data.assessmentId) router.push(`/learner/quiz/take/${result.data.assessmentId}`)
    } catch (e: any) {
      const message = e.name === 'CanceledError' || e.code === 'ERR_CANCELED' ? 'Assessment generation timed out. The course was not marked complete. Try again.' : e.response?.data?.message || 'Unable to create the skill assessment. Try again.'
      setCourseErrors((current) => ({ ...current, [course._id]: message }))
    } finally {
      window.clearTimeout(timeout)
      setWorking(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* PAGE HEADER */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">{t('courses.title')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t('courses.subtitle')}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={load}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {courses.length === 0 ? (
        <Card className="border border-border p-8 bg-card shadow-xs">
          <div className="text-center py-6">
            <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
            <p className="text-xs text-muted-foreground">{t('courses.noGaps')}</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <Card className="border border-border p-4 bg-card shadow-xs" key={course._id}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xs font-semibold text-foreground">{course.title}</h2>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{course.platform || 'Learning resource'}</p>
                      <p className="text-[11px] text-muted-foreground mt-1.5">{course.recommendationReason}</p>
                      <div className="flex items-center gap-4 mt-2 text-[11px]">
                        <span className="text-muted-foreground">{t('courses.currentLevel')}: <strong className="text-foreground">{course.currentLevel || 0}</strong></span>
                        <span className="text-muted-foreground">{t('courses.requiredLevel')}: <strong className="text-foreground">{course.requiredLevel || '-'}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col gap-2 shrink-0 self-start sm:self-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs h-8"
                    disabled={Boolean(course.assessment) || working === course._id}
                    onClick={() => complete(course)}
                  >
                    {working === course._id ? t('common.processing') : t('courses.complete')}
                  </Button>
                  {course.assessment && (
                    <Button 
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => router.push(`/learner/quiz/take/${course.assessment}`)}
                    >
                      {t('courses.takeAssessment')}
                    </Button>
                  )}
                </div>
              </div>

              {working === course._id && (
                <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                  <p className="font-medium">{t('courses.processing')}</p>
                  <p className="text-[11px] mt-0.5 text-blue-700">{t('courses.mayTakeTime')}</p>
                </div>
              )}

              {courseErrors[course._id] && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center justify-between">
                  <span>{courseErrors[course._id]}</span>
                  <Button variant="outline" size="sm" className="h-7 text-xs ml-2" onClick={() => complete(course)}>
                    {t('courses.tryAgain')}
                  </Button>
                </div>
              )}

              <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-border">
                <a 
                  className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1.5"
                  href={getResourceUrl(course)}
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t('courses.openResource')}</span>
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
