'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdminDashboard() {
  const [semesters, setSemesters] = useState<any[]>([])
  const [selectedSemester, setSelectedSemester] = useState<string>('')
  const [faculties, setFaculties] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [metrics, setMetrics] = useState({ examCount: 0, attemptCount: 0 })

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

  const fetchSemesterDetails = async (id: string) => {
    if (!id) {
      setFaculties([])
      return
    }
    setLoading(true)
    setError('')
    try {
      // use semester list (populated) for faculty details
      const sem = semesters.find((s) => s._id === id)
      setFaculties(sem?.faculty || [])

      // also fetch results to compute simple metrics
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/semesters/${id}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setMetrics({
          examCount: (data.examAttempts || []).length ? new Set((data.examAttempts || []).map((e:any)=>String(e.exam?._id))).size : 0,
          attemptCount: (data.examAttempts || []).length + (data.quizAttempts || []).length,
        })
      }
    } catch (err) {
      setError('Failed to fetch semester details')
      setFaculties([])
    } finally {
      setLoading(false)
    }
  }

  const handleSemesterChange = (id: string) => {
    setSelectedSemester(id)
    fetchSemesterDetails(id)
  }

  return (
    <Card className="p-6 md:p-8 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Dashboard</h2>
        </div>
        <p className="text-muted-foreground">View semester details and assigned faculties</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Select Semester</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedSemester}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className="flex-1 border border-border rounded-lg p-2 bg-background"
            >
              <option value="">Choose a semester...</option>
              {semesters.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Button
              onClick={() => selectedSemester && fetchSemesterDetails(selectedSemester)}
              disabled={loading || !selectedSemester}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Assigned Faculties
        </h3>

        {!selectedSemester ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Select a semester to view assigned faculties</p>
          </div>
        ) : faculties.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {faculties.map((faculty: any, idx: number) => (
              <div
                key={idx}
                className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200"
              >
                <p className="font-semibold text-foreground">{faculty.fullName || 'Faculty'}</p>
                <p className="text-sm text-muted-foreground">{faculty.email}</p>
                {faculty.facultyId && (
                  <p className="text-xs text-muted-foreground mt-2">ID: {faculty.facultyId}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No faculties assigned to this semester yet</p>
          </div>
        )}

        {/* simple metrics and small chart */}
        <div className="mt-6">
          <div className="flex gap-4">
            <div className="p-4 bg-white rounded border flex-1">
              <div className="text-sm text-muted-foreground">Faculties</div>
              <div className="text-2xl font-bold">{faculties.length}</div>
            </div>
            <div className="p-4 bg-white rounded border flex-1">
              <div className="text-sm text-muted-foreground">Exams</div>
              <div className="text-2xl font-bold">{metrics.examCount}</div>
            </div>
            <div className="p-4 bg-white rounded border flex-1">
              <div className="text-sm text-muted-foreground">Attempts</div>
              <div className="text-2xl font-bold">{metrics.attemptCount}</div>
            </div>
          </div>

          <div className="mt-4 h-36 bg-white border rounded p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: 'Exams', value: metrics.examCount }, { name: 'Attempts', value: metrics.attemptCount }]}> 
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#7c3aed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  )
}
