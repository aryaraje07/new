'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { BarChart3, Plus, Download, Eye, LogOut, Menu, Home } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [token, setToken] = useState('')

  useEffect(() => {
    const tok = typeof window !== 'undefined' ? localStorage.getItem('token') : ''
    if (!tok) {
      router.push('/login')
      return
    }
    setToken(tok)
  }, [router])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/admin' },
    { icon: Plus, label: 'Create Semester', href: '/admin/create-semester' },
    { icon: Download, label: 'Declare Results', href: '/admin/declare-results' },
    { icon: Eye, label: 'View Results', href: '/admin/view-results' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-40">
        <div className="px-4 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Administrator Dashboard</h1>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-secondary rounded"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex gap-6 max-w-7xl mx-auto p-4 md:p-8">
        {/* Sidebar */}
        <aside className={`fixed md:relative z-30 left-0 top-16 md:top-0 w-64 md:w-64 ${mobileMenuOpen ? 'block' : 'hidden'} md:block bg-white md:bg-transparent`}>
          <Card className="p-4 space-y-2 md:sticky md:top-20">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-secondary transition-colors block"
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            <button 
              onClick={() => { logout(); setMobileMenuOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </Card>
        </aside>

        {/* Main Content */}
        <main className="flex-1 w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
