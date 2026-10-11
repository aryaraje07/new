'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function DeclareResultsPage() {
  const [semesters, setSemesters] = useState<any[]>([])
  const [selectedSemester, setSelectedSemester] = useState('')
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

  const declareResults = async () => {
    if (!selectedSemester) {
      setError('Select a semester')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/semesters/${selectedSemester}/declare`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!res.ok) throw new Error('Failed')
      setSuccess('Results declared successfully! Students can now download their marksheets.')
      setSelectedSemester('')
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError('Failed to declare results')
    } finally {
      setLoading(false)
    }
  }

  const selectedSemesterData = semesters.find((s) => s._id === selectedSemester)

  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Declare Results</h2>
          </div>
          <p className="text-muted-foreground">
            Mark semester results as declared so students can access their marksheets
          </p>
        </div>

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded text-green-800 text-sm flex gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>{success}</div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm flex gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="semester-select" className="mb-2 block font-semibold">
              Select Semester *
            </Label>
            <select
              id="semester-select"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full border border-border rounded-lg p-3 bg-background text-base"
              disabled={loading}
            >
              <option value="">Choose a semester...</option>
              {semesters.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                  {s.hasResultsDeclared ? ' (✓ Already Declared)' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedSemesterData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="font-semibold text-blue-900 mb-2">Semester Details</p>
              <ul className="space-y-1 text-blue-800">
                <li>• Status: {selectedSemesterData.hasResultsDeclared ? '✓ Results Declared' : '⏳ Not Declared'}</li>
                <li>• Faculties Assigned: {selectedSemesterData.faculty?.length || 0}</li>
              </ul>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="font-semibold text-yellow-900 mb-2">⚠️ Important Note</p>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Results can only be declared once all exams are completed</li>
              <li>• After declaration, students can view and download marksheets</li>
              <li>• This action is permanent</li>
            </ul>
          </div>

          <Button
            onClick={declareResults}
            disabled={loading || !selectedSemester || selectedSemesterData?.hasResultsDeclared}
            className="w-full bg-primary hover:bg-primary/90 text-lg py-6"
          >
            {loading ? 'Processing...' : 'Declare Results'}
          </Button>
        </div>
      </Card>

      {/* Recent Declarations */}
      <Card className="p-6 md:p-8 space-y-4">
        <h3 className="text-lg font-semibold">Semester Status</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {semesters
            .filter((s) => s.hasResultsDeclared)
            .map((sem) => (
              <div
                key={sem._id}
                className="p-4 bg-green-50 rounded-lg border border-green-200"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{sem.name}</p>
                    <p className="text-xs text-muted-foreground">Results Declared ✓</p>
                  </div>
                </div>
              </div>
            ))}

          {semesters
            .filter((s) => !s.hasResultsDeclared)
            .map((sem) => (
              <div
                key={sem._id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{sem.name}</p>
                    <p className="text-xs text-muted-foreground">Pending Declaration</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  )
}
