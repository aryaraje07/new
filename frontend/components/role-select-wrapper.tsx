'use client'

import { Suspense } from 'react'
import RoleSelectContent from './role-select-content'

export default function RoleSelectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto"></div>
      </div>
    }>
      <RoleSelectContent />
    </Suspense>
  )
}
