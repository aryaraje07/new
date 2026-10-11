'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import jsPDF from 'jspdf'
import API from '@/lib/api'

export default function SessionPage() {
  const searchParams = useSearchParams()
  const subject = searchParams.get('topic') || 'Topic'
  const minutes = Number(searchParams.get('minutes')) || 5

  const [displayText, setDisplayText] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [timeLeft, setTimeLeft] = useState(minutes * 60)

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const typingRef = useRef<NodeJS.Timeout | null>(null)
  const isPausedRef = useRef(false)
  const wordsRef = useRef<string[]>([])
  const wordIndexRef = useRef(0)
  const fullTextRef = useRef('')
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const stopSession = () => {
    window.speechSynthesis.cancel()
    if (timerRef.current) clearInterval(timerRef.current)
    if (typingRef.current) clearInterval(typingRef.current)
    setIsPlaying(false)

    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return

      setTimeLeft(prev => {
        if (prev <= 1) {
          stopSession()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const startTyping = () => {
    if (typingRef.current) clearInterval(typingRef.current)

    const delay = 600 / speed // unchanged

    typingRef.current = setInterval(() => {
      if (isPausedRef.current) return

      if (wordIndexRef.current >= wordsRef.current.length) {
        clearInterval(typingRef.current!)
        return
      }

      setDisplayText(prev =>
        prev + (prev ? ' ' : '') + wordsRef.current[wordIndexRef.current]
      )

      wordIndexRef.current++

      setTimeout(() => {
        const board = document.getElementById('whiteboard')
        if (board) board.scrollTop = board.scrollHeight
      }, 0)

    }, delay)
  }

  const speak = (text: string) => {
    stopSession()

    fullTextRef.current = text

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = speed
    utterance.pitch = 1

    wordsRef.current = text.split(' ')
    wordIndexRef.current = 0
    setDisplayText('')

    utterance.onstart = () => {
      setIsPlaying(true)
      isPausedRef.current = false
      startTimer()
      startTyping()

      if (videoRef.current) {
        videoRef.current.play()
      }
    }

    utterance.onend = () => {
      setIsPlaying(false)

      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
      }
    }

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  const handleStart = async () => {
    const { data } = await API.post('/ai-tutor/start', {
      topic: subject,
      minutes,
    })

    const structuredText = (data.steps || [])
      .map((step: any) => {
        const bullets = step.content?.map((line: string) => `• ${line}`).join('\n')
        return `\n${step.title.toUpperCase()}\n${bullets}`
      })
      .join('\n\n')

    speak(structuredText)
  }

  const handlePause = () => {
    window.speechSynthesis.pause()
    isPausedRef.current = true
    setIsPlaying(false)

    if (videoRef.current) {
      videoRef.current.pause()
    }
  }

  const handleResume = () => {
    window.speechSynthesis.resume()
    isPausedRef.current = false
    setIsPlaying(true)

    if (videoRef.current) {
      videoRef.current.play()
    }
  }

  const handleReplay = () => {
    if (!fullTextRef.current) return
    speak(fullTextRef.current)
  }

  const handleDownload = () => {
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text(fullTextRef.current, 10, 20)
    doc.save(`AI_Tutor_${subject}.pdf`)
  }

  useEffect(() => {
    if (utteranceRef.current) {
      utteranceRef.current.rate = speed
    }
  }, [speed])

  useEffect(() => {
    return () => stopSession()
  }, [])

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/learner/ai-tutor">
            <Button variant="outline" size="icon" className="bg-transparent">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{subject}</h1>
            <p className="text-sm text-muted-foreground">AI Tutor Session</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{formatTime(timeLeft)}</p>
          <p className="text-xs text-muted-foreground">Time remaining</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-8 border border-border lg:col-span-1 flex flex-col items-center justify-center bg-gradient-to-b from-secondary/50 to-background">

          <video
            ref={videoRef}
            src="/avatar.mp4"
            className="w-64 h-64 rounded-xl object-cover shadow-lg"
            muted
            loop
            playsInline
          />

          <Button onClick={handleStart} className="mt-6 w-full">
            Start Session
          </Button>
        </Card>

        <Card className="p-8 border border-border lg:col-span-2 space-y-6">
          <div
            id="whiteboard"
            className="bg-white border-2 border-dashed border-primary/40 rounded-lg p-8 h-[450px] overflow-y-auto whitespace-pre-wrap shadow-inner font-medium leading-relaxed scroll-smooth"
          >
            {displayText}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handlePause}>Pause</Button>
            <Button onClick={handleResume}>Resume</Button>
            <Button onClick={handleReplay} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Replay
            </Button>

            {[0.5, 1, 1.5, 2].map(rate => (
              <Button
                key={rate}
                variant={rate === speed ? 'default' : 'outline'}
                onClick={() => setSpeed(rate)}
              >
                {rate}x
              </Button>
            ))}

            <Button onClick={handleDownload} variant="outline">
              Download
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
