'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Upload,
  Users,
  User,
  LogOut,
  Sparkles,
  BookOpen,
  UserPlus,
} from 'lucide-react'

const menuItems = [
  { label: "Add Learner", href: "/trainer/add-student", icon: UserPlus },

  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/trainer/dashboard',
  },
  {
    label: 'Create Exam',
    icon: FileText,
    href: '/trainer/create-exam',
  },
  {
    label: 'Learning Materials',
    icon: BookOpen,
    href: '/trainer/materials',
  },
  {
    label: 'Upload Material',
    icon: Upload,
    href: '/trainer/material-upload',
  },
  {
    label: 'View Learners',
    icon: Users,
    href: '/trainer/view-students',
  },
  {
    label: 'Profile',
    icon: User,
    href: '/trainer/profile',
  },
]

export function FacultySidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/trainer/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-sidebar-foreground">SkillifyAI</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="border-t border-sidebar-border p-3">
        <Link href="/">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </Link>
      </div>
    </aside>
  )
}
