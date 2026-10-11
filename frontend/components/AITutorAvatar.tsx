'use client'

import { useEffect, useState } from 'react'

interface Props {
  isSpeaking: boolean
}

export default function AITutorAvatar({ isSpeaking }: Props) {
  const [blink, setBlink] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 150)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-indigo-100 to-purple-200 rounded-xl overflow-hidden">

      {/* Teacher Image */}
      <img
        src="/teacher.png"
        alt="AI Tutor"
        className={`w-64 transition-transform duration-300 ${
          isSpeaking ? 'scale-105' : ''
        }`}
      />

      {/* Mouth Animation */}
      {isSpeaking && (
        <div className="absolute bottom-20 w-10 h-3 bg-black rounded-full animate-pulse" />
      )}

      {/* Blink Effect */}
      {blink && (
        <div className="absolute top-24 w-20 h-4 bg-purple-200" />
      )}

    </div>
  )
}
