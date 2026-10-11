'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export function Footer() {
  const [currentYear, setCurrentYear] = useState(2026)

  useEffect(() => {
    setCurrentYear(new Date().getFullYear())
  }, [])

  return (
    <footer className="bg-gray-50 border-t border-gray-200 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-8 mb-12">
          {/* Brand */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl group inline-flex">
              <div className="flex items-center justify-center w-8 h-8 rounded bg-primary text-white shadow-sm">
                <span className="font-extrabold text-sm">S</span>
              </div>
              <span className="text-gray-900 font-bold tracking-tight">Skillify<span className="text-primary">AI</span></span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed pr-4">
              An AI-enabled competency and personalized learning platform for government officials in India's Official Statistical System.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Platform</h3>
            <ul className="space-y-3">
              <li><Link href="#competency" className="text-sm text-gray-500 hover:text-primary font-medium transition-colors">Competency Intelligence</Link></li>
              <li><Link href="#learning" className="text-sm text-gray-500 hover:text-primary font-medium transition-colors">Learning</Link></li>
              <li><Link href="#assessments" className="text-sm text-gray-500 hover:text-primary font-medium transition-colors">Assessments</Link></li>
              <li><Link href="/about" className="text-sm text-gray-500 hover:text-primary font-medium transition-colors">About</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
            <ul className="space-y-3">
              <li><Link href="/contact" className="text-sm text-gray-500 hover:text-primary font-medium transition-colors">Contact</Link></li>
              <li><Link href="#" className="text-sm text-gray-500 hover:text-primary font-medium transition-colors">Help</Link></li>
              <li><Link href="#" className="text-sm text-gray-500 hover:text-primary font-medium transition-colors">Documentation</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><Link href="#" className="text-sm text-gray-500 hover:text-primary font-medium transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="text-sm text-gray-500 hover:text-primary font-medium transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500 font-medium">
            © {currentYear} SkillifyAI. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">Privacy</Link>
            <Link href="#" className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
