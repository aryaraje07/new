'use client'

import React from "react"

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageCircle, Send, AlertTriangle, X } from 'lucide-react'

interface Message {
  id: string
  sender: 'student' | 'mentor'
  text: string
  timestamp: Date
}


export default function AIMentorPage() {
  useEffect(() => {
  const resetSession = async () => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ai-mentor/reset`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Reset frontend state also
      setStressCount(0);
      setIsAtRisk(false);
      setShowNotification(false);

    } catch (error) {
      console.error("Failed to reset AI mentor session");
    }
  };

  resetSession();
}, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'mentor',
      text: "Hi there! I'm your AI Mentor. I'm here to listen and support you. Feel free to share anything that's on your mind - whether it's stress, confusion, pressure, or just need someone to talk to. How are you feeling today?",
      timestamp: new Date(),
    },
  ])

  const [inputValue, setInputValue] = useState('')
  const [isAtRisk, setIsAtRisk] = useState(false)
  const [showNotification, setShowNotification] = useState(false)
  const [stressCount, setStressCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // const detectStress = (text: string): boolean => {
  //   const lowerText = text.toLowerCase()
  //   const foundKeywords = STRESS_KEYWORDS.filter((keyword) => lowerText.includes(keyword))
  //   return foundKeywords.length > 0
  // }

  // const getMentorResponse = (studentMessage: string): string => {
  //   const hasStress = detectStress(studentMessage)

  //   if (hasStress) {
  //     const stressResponses = MENTOR_RESPONSES.stress
  //     return stressResponses[Math.floor(Math.random() * stressResponses.length)]
  //   }

  //   if (
  //     studentMessage.toLowerCase().includes('thank') ||
  //     studentMessage.toLowerCase().includes('help') ||
  //     studentMessage.toLowerCase().includes('appreciate')
  //   ) {
  //     return MENTOR_RESPONSES.support[Math.floor(Math.random() * MENTOR_RESPONSES.support.length)]
  //   }

  //   return MENTOR_RESPONSES.default[Math.floor(Math.random() * MENTOR_RESPONSES.default.length)]
  // }

  const handleSendMessage = async () => {
  if (!inputValue.trim()) return

  const studentMessage: Message = {
    id: Date.now().toString(),
    sender: 'student',
    text: inputValue,
    timestamp: new Date(),
  }

  // Show student message immediately
  setMessages((prev) => [...prev, studentMessage])

  const currentText = inputValue
  setInputValue('')

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/ai-mentor/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ message: currentText }),
      }
    )

    const data = await res.json()

    // Add mentor reply from backend
    const mentorResponse: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'mentor',
      text: data.reply,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, mentorResponse])

    // 🔔 If backend triggered alert
    if (data.parentAlerted) {
      setIsAtRisk(true)
      setShowNotification(true)
      setStressCount(data.stressCount)
    }

  } catch (error) {
    console.error("AI Mentor error:", error)
  }
}


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="space-y-6 p-8">
  {/* Header with professional entrance */}
  <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-700">
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 transition-all duration-500 hover:scale-110 hover:shadow-lg hover:bg-primary/20">
        <MessageCircle className="w-6 h-6 text-primary animate-pulse duration-1000" />
      </div>
      <h1 className="text-3xl font-bold text-foreground animate-bounce duration-1000">
        AI Mentor
      </h1>
    </div>
    <p className="text-muted-foreground text-lg transition-all duration-500 hover:text-foreground hover:translate-x-4">
      Your personal mentor for emotional support, guidance, and wellbeing
    </p>
  </div>

  {/* At-Risk Notification with urgent animation */}
  {showNotification && isAtRisk && (
    <div 
      className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-4 animate-pulse border-2 shadow-xl"
    >
      <div className="flex-shrink-0 mt-0.5 animate-bounce">
        <AlertTriangle className="w-6 h-6 text-amber-600" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-amber-900 text-lg animate-pulse">
          Alert: Emotional Wellbeing Check
        </h3>
        <p className="text-sm text-amber-800 mt-1">
          We've noticed you may be experiencing emotional stress. We've automatically notified your faculty and parent about this. Please take care of yourself and don't hesitate to reach out for support.
        </p>
        <p className="text-xs text-amber-700 mt-2 font-medium">
          Notifications sent to: Faculty & Parents
        </p>
      </div>
      <button
        onClick={() => setShowNotification(false)}
        className="flex-shrink-0 text-amber-600 hover:text-amber-700 transition-all duration-300 hover:scale-150 hover:rotate-90"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )}

  <div className="grid gap-6 lg:grid-cols-4">
    {/* Chat Panel with professional animations */}
    <Card className="border-2 border-border lg:col-span-3 flex flex-col h-[600px] transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'student' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-500`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div
              className={`max-w-sm px-4 py-3 rounded-xl transition-all duration-300 hover:scale-105 ${
                message.sender === 'student'
                  ? 'bg-primary text-primary-foreground rounded-br-none hover:shadow-lg hover:-translate-x-2'
                  : 'bg-secondary text-foreground rounded-bl-none hover:shadow-lg hover:translate-x-2'
              }`}
            >
              <p className="text-sm leading-relaxed">{message.text}</p>
              <span className={`text-xs mt-1 block ${
                message.sender === 'student' ? 'text-primary-foreground/70' : 'text-muted-foreground'
              }`}>
                {message.timestamp.getHours().toString().padStart(2, '0')}:{message.timestamp.getMinutes().toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t-2 border-border p-4 space-y-3 bg-gradient-to-t from-background to-transparent">
        <div className="flex gap-3">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Share what's on your mind..."
            className="flex-1 h-12 border-2 border-border bg-background transition-all duration-300 focus:scale-105 focus:ring-4 focus:ring-primary/30"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="bg-primary hover:bg-primary/90 gap-2 transition-all duration-300 hover:scale-110 hover:shadow-xl active:scale-95 px-6"
          >
            <Send className="w-5 h-5 animate-pulse" />
            Send
          </Button>
        </div>
        <p className="text-xs text-muted-foreground animate-pulse">
          Press Enter to send • Your wellbeing is important to us
        </p>
      </div>
    </Card>

    {/* Info Panel */}
    <div className="space-y-4">
      {/* Status Card */}
      <Card className="p-6 border-2 border-border transition-all duration-500 hover:shadow-xl hover:-translate-y-2">
        <h3 className="font-semibold text-foreground mb-3 text-lg">Your Status</h3>
        <div className={`px-4 py-3 rounded-xl text-sm font-medium animate-pulse ${
          isAtRisk 
            ? 'bg-amber-50 text-amber-900 border-2 border-amber-200' 
            : 'bg-green-50 text-green-900 border-2 border-green-200'
        }`}>
          {isAtRisk ? `⚠️ At-Risk (${stressCount})` : '✓ Doing Well'}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {isAtRisk
            ? "We've detected signs of emotional stress. Support has been notified."
            : 'Everything seems to be going well. Keep taking care of yourself!'}
        </p>
      </Card>

      {/* How to Use */}
      <Card className="p-6 border-2 border-border transition-all duration-500 hover:shadow-xl hover:-translate-y-2">
        <h3 className="font-semibold text-foreground mb-3 text-lg">How I Can Help</h3>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-3 items-center transition-all duration-300 hover:translate-x-2 hover:text-foreground">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span>Share your feelings and concerns</span>
          </li>
          <li className="flex gap-3 items-center transition-all duration-300 hover:translate-x-2 hover:text-foreground" style={{ transitionDelay: '50ms' }}>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '100ms' }}></div>
            <span>Get supportive guidance</span>
          </li>
          <li className="flex gap-3 items-center transition-all duration-300 hover:translate-x-2 hover:text-foreground" style={{ transitionDelay: '100ms' }}>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
            <span>Discuss stress and pressure</span>
          </li>
          <li className="flex gap-3 items-center transition-all duration-300 hover:translate-x-2 hover:text-foreground" style={{ transitionDelay: '150ms' }}>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
            <span>Find coping strategies</span>
          </li>
        </ul>
      </Card>

      {/* Important Note */}
      <Card className="p-6 border-2 border-amber-200 bg-amber-50 transition-all duration-500 hover:shadow-xl hover:-translate-y-2">
        <h4 className="font-semibold text-amber-900 mb-2 text-lg">Important</h4>
        <p className="text-sm text-amber-800">
          I'm an AI mentor for emotional support and guidance, not a therapist. If you're experiencing serious mental health concerns, please reach out to a professional counselor.
        </p>
      </Card>
    </div>
  </div>
</div>
  )
}
