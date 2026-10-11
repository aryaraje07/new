'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'

export default function CreateSemesterPage() {
  const [semesters, setSemesters] = useState<any[]>([])
  const [semesterName, setSemesterName] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  useEffect(() => {
    fetchSemesters()
  }, [])

  const fetchSemesters = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/semesters/list`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setSemesters(data || [])
    } catch (err) {
      setError('Failed to fetch semesters')
    }
  }

  const createSemester = async () => {
    if (!semesterName.trim()) {
      setError('Enter semester name')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/semesters/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: semesterName }),
      })
      if (!res.ok) throw new Error('Create failed')
      const s = await res.json()
      setSemesters((prev) => [s, ...prev])
      setSemesterName('')
      setSuccess('Semester created successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to create semester')
    } finally {
      setLoading(false)
    }
  }

  const assignFacultyExcel = async () => {
    if (!selectedSemester) {
      setError('Select a semester')
      return
    }
    if (!file) {
      setError('Select an Excel file')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/semesters/${selectedSemester}/assign-faculty-excel`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        }
      )
      if (!res.ok) throw new Error('Upload failed')
      setSuccess('Faculty assigned successfully!')
      setFile(null)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Failed to assign faculty')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Create Semester Section */}
      <Card className="p-6 md:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Plus className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Create New Semester</h2>
          </div>
          <p className="text-muted-foreground">Create a new semester for your institution</p>
        </div>

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
            ✓ {success}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
            ✗ {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="semester-name" className="mb-2 block">
              Semester Name *
            </Label>
            <Input
              id="semester-name"
              value={semesterName}
              onChange={(e) => setSemesterName(e.target.value)}
              placeholder="e.g., Spring 2026, Fall 2026, Summer 2026"
              className="border-border"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter a unique name for this semester
            </p>
          </div>

          <Button
            onClick={createSemester}
            disabled={loading || !semesterName.trim()}
            className="w-full bg-primary hover:bg-primary/90 text-lg py-6"
          >
            {loading ? 'Creating...' : 'Create Semester'}
          </Button>
        </div>
      </Card>

      {/* Assign Faculty Section */}
      <Card className="p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Assign Faculty to Semester</h2>
          <p className="text-muted-foreground">Upload an Excel file to assign faculties</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-semibold mb-2">Excel File Format:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Must contain a column named <code className="bg-blue-100 px-2 py-1 rounded">facultyID</code></li>
            <li>Each row should have one faculty ID</li>
            <li>Example: FAC-1234, FAC-5678, etc.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="semester-select" className="mb-2 block">
              Select Semester *
            </Label>
            <select
              id="semester-select"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full border border-border rounded-lg p-2 bg-background"
              disabled={loading}
            >
              <option value="">Choose a semester...</option>
              {semesters.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="file-input" className="mb-2 block">
              Excel File (Column: facultyID) *
            </Label>
            <input
              id="file-input"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".xlsx,.xls"
              className="w-full border border-border rounded-lg p-2 bg-background file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-primary-foreground cursor-pointer"
              disabled={loading}
            />
            {file && <p className="text-xs text-muted-foreground mt-1">Selected: {file.name}</p>}
          </div>

          <Button
            onClick={assignFacultyExcel}
            disabled={loading || !selectedSemester || !file}
            className="w-full bg-primary hover:bg-primary/90 text-lg py-6"
          >
            {loading ? 'Uploading...' : 'Assign Faculty'}
          </Button>
        </div>
      </Card>

      {/* Active Semesters */}
      <Card className="p-6 md:p-8 space-y-4">
        <h3 className="text-lg font-semibold">Active Semesters</h3>
        {semesters.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {semesters.map((sem) => (
              <div
                key={sem._id}
                className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200"
              >
                <p className="font-semibold text-foreground">{sem.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Faculties: {sem.faculty?.length || 0} • Results Declared:{' '}
                  {sem.hasResultsDeclared ? '✓' : '✗'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No semesters created yet</p>
        )}
      </Card>
    </div>
  )
}
