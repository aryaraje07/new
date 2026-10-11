'use client'

import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { StudentRegister } from '@/components/auth/student-register'
import { FacultyRegister } from '@/components/auth/faculty-register'
import { AdminRegister } from '@/components/auth/admin-register'

function RegisterContent() {
  const searchParams = useSearchParams()
  const role = searchParams.get('role') || 'learner'

  const renderForm = () => {
    switch (role) {
      case 'learner':
      case 'student':
        return <StudentRegister />
      case 'trainer':
      case 'faculty':
        return <FacultyRegister />
      case 'admin':
        return <AdminRegister />
      default:
        return <StudentRegister />
    }
  }

  return renderForm()
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterContent />
    </Suspense>
  )
}
