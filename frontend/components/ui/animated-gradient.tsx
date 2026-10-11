'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface AnimatedGradientProps {
  children: React.ReactNode
  className?: string
}

export function AnimatedGradient({ children, className = '' }: AnimatedGradientProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50 opacity-50"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50 via-purple-50 to-white opacity-30"></div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}

interface FloatingParticlesProps {
  count?: number
  className?: string
}

export function FloatingParticles({ count = 20, className = '' }: FloatingParticlesProps) {
  // Generate deterministic positions based on index
  const generatePosition = (index: number, total: number) => {
    const angle = (index / total) * Math.PI * 2
    const radius = 30 + (index % 3) * 15
    const x = 50 + Math.cos(angle) * radius
    const y = 30 + Math.sin(angle) * radius
    
    return {
      left: `${x}%`,
      top: `${y}%`,
      animationDelay: `${index * 0.2}s`,
      animationDuration: `${3 + (index % 2) * 2}s`
    }
  }

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
      {Array.from({ length: count }).map((_, i) => {
        const position = generatePosition(i, count)
        return (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full"
            style={{
              left: position.left,
              top: position.top,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: parseFloat(position.animationDuration),
              repeat: Infinity,
              ease: "easeInOut",
              delay: parseFloat(position.animationDelay),
            }}
          />
        )
      })}
    </div>
  )
}

interface GlowCardProps {
  children: React.ReactNode
  glowColor?: string
  className?: string
}

export function GlowCard({ children, glowColor = '#7C3AED', className = '' }: GlowCardProps) {
  return (
    <motion.div
      className={`relative bg-white rounded-2xl shadow-md border border-gray-100 transition-all duration-300 ${className}`}
      whileHover={{
        y: -5,
        scale: 1.02,
        boxShadow: `0 20px 40px ${glowColor}20`,
      }}
      style={{
        boxShadow: `0 4px 20px ${glowColor}08`,
      }}
    >
      {children}
    </motion.div>
  )
}
