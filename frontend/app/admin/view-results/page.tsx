'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Eye, AlertCircle, BookOpen } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function ViewResultsPage() {
  const [semesters, setSemesters] = useState<any[]>([])
  const [selectedSemester, setSelectedSemester] = useState('')
  const [searchId, setSearchId] = useState('')
  const [results, setResults] = useState<any>({ examAttempts: [], quizAttempts: [] })
  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

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

  const fetchResults = async () => {
    if (!selectedSemester) {
      setError('Select a semester')
      return
    }

    setLoading(true)
    setError('')
    setHasSearched(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/semesters/${selectedSemester}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setResults(data || { examAttempts: [], quizAttempts: [] })
    } catch (err) {
      setError('Failed to fetch results')
      setResults({ examAttempts: [], quizAttempts: [] })
    } finally {
      setLoading(false)
    }
  }

  const openAdminMarksheet = (studentId: string) => {
    if (!studentId) return alert('Student id not provided')
    // gather attempts for this student
    const examAttempts = (results.examAttempts || []).filter((ea: any) => String(ea.student?._id) === String(studentId))
    const rows = examAttempts.map((ea: any) => {
      const total = ea.totalQuestions || (ea.exam && ea.exam.totalQuestions) || 0
      const score = typeof ea.score === 'number' ? ea.score : 0
      const percentage = total > 0 ? Number(((score / total) * 100).toFixed(2)) : 0
      return {
        examId: ea.exam?._id,
        title: ea.exam?.title || 'Exam',
        subject: ea.exam?.subject || 'General',
        score,
        total,
        percentage,
      }
    })

    const totalObtained = rows.reduce((s: number, r: any) => s + r.score, 0)
    const totalPossible = rows.reduce((s: number, r: any) => s + r.total, 0)
    const overallPercentage = totalPossible > 0 ? Number(((totalObtained / totalPossible) * 100).toFixed(2)) : 0

    const studentName = (examAttempts[0] && examAttempts[0].student && examAttempts[0].student.fullName) || 'Student'
    // Get the actual studentId from the student object, not the MongoDB _id
    const actualStudentId = (examAttempts[0] && examAttempts[0].student && examAttempts[0].student.studentId) || 'N/A'
    const semesterName = (semesters.find((s) => s._id === selectedSemester) || {}).name || ''

    setModalData({ rows, totalObtained, totalPossible, overallPercentage, studentName, semesterName, studentId: actualStudentId })
    setModalOpen(true)
  }

  const downloadPdf = (data: any) => {
    const doc: any = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 40
    let currentY = 30

    // Header Section
    doc.setFontSize(20)
    doc.setTextColor(20, 20, 80)
    doc.text('MARKSHEET', pageWidth / 2, currentY, { align: 'center' })
    currentY += 25

    // Divider
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 15

    // Student Details
    doc.setFontSize(11)
    doc.setTextColor(40, 40, 40)
    const detailsRowHeight = 18
    doc.text(`Student Name:`, margin, currentY)
    doc.setFont(undefined, 'bold')
    doc.text(`${data.studentName}`, margin + 140, currentY)
    currentY += detailsRowHeight

    doc.setFont(undefined, 'normal')
    doc.text(`Student ID:`, margin, currentY)
    doc.setFont(undefined, 'bold')
    doc.text(`${data.studentId || 'N/A'}`, margin + 140, currentY)
    currentY += detailsRowHeight

    doc.setFont(undefined, 'normal')
    doc.text(`Semester:`, margin, currentY)
    doc.setFont(undefined, 'bold')
    doc.text(`${data.semesterName}`, margin + 140, currentY)
    currentY += 20

    // Divider
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 15

    const head = [['Subject', 'Exam', 'Score', 'Total', 'Percentage']]
    const body = data.rows.map((r: any) => [r.subject, r.title, String(r.score), String(r.total), String(r.percentage + '%')])

    autoTable(doc, { 
      startY: currentY, 
      head, 
      body,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: [30, 30, 100],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11,
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 10,
        textColor: [40, 40, 40],
      },
      alternateRowStyles: {
        fillColor: [245, 245, 250]
      }
    })

    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 25 : currentY + 150

    // Summary Section
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, finalY - 5, pageWidth - margin, finalY - 5)

    doc.setFontSize(11)
    doc.setTextColor(40, 40, 40)
    const summaryStart = finalY + 10
    doc.text(`Total Marks Obtained:`, margin, summaryStart)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(34, 139, 34)
    doc.setFontSize(12)
    doc.text(`${data.totalObtained}`, pageWidth - margin - 80, summaryStart)

    doc.setFont(undefined, 'normal')
    doc.setTextColor(40, 40, 40)
    doc.setFontSize(11)
    doc.text(`Total Marks Possible:`, margin, summaryStart + 20)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(30, 30, 100)
    doc.setFontSize(12)
    doc.text(`${data.totalPossible}`, pageWidth - margin - 80, summaryStart + 20)

    // Overall Percentage - Highlighted
    doc.setDrawColor(100, 180, 100)
    doc.setFillColor(245, 255, 250)
    doc.rect(margin, summaryStart + 40, pageWidth - 2 * margin, 30, 'F')
    doc.setDrawColor(34, 139, 34)
    doc.rect(margin, summaryStart + 40, pageWidth - 2 * margin, 30)

    doc.setFont(undefined, 'bold')
    doc.setTextColor(34, 139, 34)
    doc.setFontSize(14)
    doc.text(`Overall Percentage: ${data.overallPercentage}%`, pageWidth / 2, summaryStart + 58, { align: 'center' })

    doc.save(`Marksheet_${data.studentId || 'student'}_${data.semesterName || selectedSemester}.pdf`)
  }

  const filteredExamAttempts = (results.examAttempts || []).filter(
    (r: any) => !searchId || String(r.student?.studentId || r.student?._id).includes(searchId)
  )

  const filteredQuizAttempts = (results.quizAttempts || []).filter(
    (r: any) => !searchId || String(r.student?.studentId || r.student?._id).includes(searchId)
  )

  return (
    <div className="space-y-6">
      <Card className="p-6 md:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">View Results</h2>
          </div>
          <p className="text-muted-foreground">Search and view all student marksheets for a semester</p>
        </div>

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
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                id="semester-select"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="flex-1 border border-border rounded-lg p-2 bg-background"
                disabled={loading}
              >
                <option value="">Choose a semester...</option>
                {semesters.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                    {s.hasResultsDeclared ? ' (✓)' : ' (⏳)'}
                  </option>
                ))}
              </select>
              <Button
                onClick={fetchResults}
                disabled={loading || !selectedSemester}
                className="bg-primary hover:bg-primary/90 min-w-fit"
              >
                {loading ? 'Loading...' : 'Fetch Results'}
              </Button>
            </div>
          </div>

          {hasSearched && (
            <div>
              <Label htmlFor="search-id" className="mb-2 block">
                Search by Student ID (Optional)
              </Label>
              <Input
                id="search-id"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter student ID to filter results..."
                className="border-border"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Results Display */}
      {hasSearched && (
        <div className="space-y-6">
          {/* Exam Attempts */}
          <Card className="p-6 md:p-8 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Exam Attempts</h3>
              </div>
              <span className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                {filteredExamAttempts.length}
              </span>
            </div>

            {filteredExamAttempts.length > 0 ? (
              <div className="space-y-3">
                {filteredExamAttempts.map((attempt: any) => (
                  <div
                    key={attempt._id}
                    className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground text-lg">{attempt.exam?.title || 'Exam'}</p>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Student:</span>{' '}
                            <span className="font-medium">{attempt.student?.fullName || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">ID:</span>{' '}
                            <span className="font-medium">{attempt.student?.studentId || attempt.student?._id}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Score:</span>{' '}
                            <span className="font-bold text-green-600">
                              {attempt.score}/{attempt.totalQuestions}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Submitted:</span>{' '}
                            <span className="text-xs">
                              {new Date(attempt.submittedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => openAdminMarksheet(attempt.student?._id)} variant="outline" size="sm" className="min-w-fit">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No exam attempts found
                {searchId && ` for student ID: ${searchId}`}
              </div>
            )}
          </Card>

          {/* Quiz Attempts */}
          <Card className="p-6 md:p-8 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold">Quiz Attempts</h3>
              </div>
              <span className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                {filteredQuizAttempts.length}
              </span>
            </div>

            {filteredQuizAttempts.length > 0 ? (
              <div className="space-y-3">
                {filteredQuizAttempts.map((attempt: any) => (
                  <div
                    key={attempt._id}
                    className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground text-lg">
                          {attempt.quizTitle || 'Scheduled Quiz'}
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Student:</span>{' '}
                            <span className="font-medium">{attempt.student?.fullName || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">ID:</span>{' '}
                            <span className="font-medium">{attempt.student?.studentId || attempt.student?._id}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Score:</span>{' '}
                            <span className="font-bold text-purple-600">
                              {attempt.score}/{attempt.totalQuestions}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Submitted:</span>{' '}
                            <span className="text-xs">
                              {new Date(attempt.submittedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Link href={`/learner/quiz/results?attemptId=${attempt._id}`}>
                        <Button variant="outline" size="sm" className="min-w-fit">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No quiz attempts found
                {searchId && ` for student ID: ${searchId}`}
              </div>
            )}
          </Card>

          {/* Summary */}
          {filteredExamAttempts.length === 0 && filteredQuizAttempts.length === 0 && (
            <Card className="p-6 md:p-8 text-center">
              <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-3 opacity-50" />
              <p className="text-lg text-muted-foreground">No results found for this semester</p>
              {searchId && <p className="text-sm text-muted-foreground mt-2">Try a different student ID</p>}
            </Card>
          )}
        </div>
      )}

      {/* Marksheet Modal */}
      {modalOpen && modalData && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-auto">
          <Card className="w-full max-w-3xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Marksheet - {modalData.studentName}</h3>
                <p className="text-sm text-muted-foreground">Semester: {modalData.semesterName}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>Close</Button>
                <Button onClick={() => downloadPdf(modalData)} className="bg-primary">Download PDF</Button>
              </div>
            </div>

            <div className="mt-4">
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className="p-2">Subject</th>
                    <th className="p-2">Exam</th>
                    <th className="p-2">Score</th>
                    <th className="p-2">Total</th>
                    <th className="p-2">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {modalData.rows.map((r: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 text-sm">{r.subject}</td>
                      <td className="p-2 text-sm">{r.title}</td>
                      <td className="p-2 text-sm font-semibold">{r.score}</td>
                      <td className="p-2 text-sm">{r.total}</td>
                      <td className="p-2 text-sm">{r.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 text-right">
                <div className="text-sm text-muted-foreground">Total Obtained: {modalData.totalObtained}</div>
                <div className="text-sm text-muted-foreground">Total Possible: {modalData.totalPossible}</div>
                <div className="text-lg font-bold">Overall: {modalData.overallPercentage}%</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {!hasSearched && selectedSemester && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Click "Fetch Results" to view student attempts</p>
        </Card>
      )}
    </div>
  )
}
