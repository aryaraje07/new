'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function MarkSheetsPage(){
  const [semesters, setSemesters] = useState<any[]>([])
  const [selectedSemester, setSelectedSemester] = useState('')
  const [marks, setMarks] = useState<any[]>([])
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  useEffect(()=>{
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/learner/semesters`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r=>r.json()).then(d=>setSemesters(d)).catch(()=>setSemesters([]))
  }, [])

  const fetchMarksheet = async () => {
    if(!selectedSemester) return alert('Select semester')
    try{
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/learner/marksheets/${selectedSemester}`, { headers: { Authorization: `Bearer ${token}` }})
      if(!res.ok) throw new Error('fail')
      const d = await res.json()
      // ALWAYS prefer server-provided aggregated summary - this prevents duplicates
      if (d.examsSummary && Array.isArray(d.examsSummary)) {
        const rows = d.examsSummary.map((e:any) => ({ 
          subject: e.subject, 
          title: e.title,
          marks: e.score, 
          total: e.total,
          percentage: e.percentage
        }))
        setMarks(rows)
        // store totals on state for display
        setOverall({ totalObtained: d.totalObtained || 0, totalPossible: d.totalPossible || 0, overallPercentage: d.overallPercentage || 0 })
      } else {
        // Fallback: empty if no aggregated summary
        setMarks([])
        setOverall(null)
      }
    }catch(err){ alert('Failed to fetch marksheet') }
  }

  const downloadPDF = async () => {
    const doc: any = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 40
    let currentY = 30

    // Fetch current user data to get accurate studentId
    let studentId = 'N/A'
    let studentName = 'Student'
    
    try {
      const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (userRes.ok) {
        const userData = await userRes.json()
        studentName = userData?.fullName || 'Student'
        // Use studentId if available, otherwise show N/A
        studentId = userData?.studentId ? String(userData.studentId) : 'N/A'
      }
    } catch (err) {
      console.error('Error fetching user data:', err)
    }

    const selectedSemesterName = semesters.find(s => s._id === selectedSemester)?.name || 'Semester'

    // Header Section
    doc.setFontSize(20)
    doc.setTextColor(20, 20, 80)
    doc.text('MARKSHEET', pageWidth / 2, currentY, { align: 'center' })
    currentY += 25

    // Institution/Divider
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 15

    // Student Details Section
    doc.setFontSize(11)
    doc.setTextColor(40, 40, 40)
    
    const detailsRowHeight = 18
    doc.text(`Student Name:`, margin, currentY)
    doc.setFont(undefined, 'bold')
    doc.text(`${studentName}`, margin + 140, currentY)
    currentY += detailsRowHeight

    doc.setFont(undefined, 'normal')
    doc.text(`Student ID:`, margin, currentY)
    doc.setFont(undefined, 'bold')
    doc.text(`${studentId}`, margin + 140, currentY)
    currentY += detailsRowHeight

    doc.setFont(undefined, 'normal')
    doc.text(`Semester:`, margin, currentY)
    doc.setFont(undefined, 'bold')
    doc.text(`${selectedSemesterName}`, margin + 140, currentY)
    currentY += 20

    // Divider
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 15

    // Exam Details Table
    const head = [['Subject', 'Exam', 'Marks Obtained', 'Total Marks', 'Percentage']]
    const body = marks.map((r: any) => {
      // Use percentage from server, don't recalculate
      const displayPercentage = r.percentage !== undefined ? r.percentage : (r.total > 0 ? ((r.marks / r.total) * 100).toFixed(2) : '0')
      return [r.subject, r.title, String(r.marks), String(r.total), String(displayPercentage) + '%']
    })

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
      } as any,
      bodyStyles: {
        fontSize: 10,
        textColor: [40, 40, 40],
      } as any,
      alternateRowStyles: {
        fillColor: [245, 245, 250]
      },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'left' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' }
      },
      rowPageBreak: 'avoid'
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
    const totalObtained = overall?.totalObtained || marks.reduce((s: number, m: any) => s + Number(m.marks), 0)
    doc.text(`${totalObtained}`, pageWidth - margin - 80, summaryStart)

    doc.setFont(undefined, 'normal')
    doc.setTextColor(40, 40, 40)
    doc.setFontSize(11)
    doc.text(`Total Marks Possible:`, margin, summaryStart + 20)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(30, 30, 100)
    doc.setFontSize(12)
    const totalPossible = overall?.totalPossible || marks.reduce((s: number, m: any) => s + Number(m.total), 0)
    doc.text(`${totalPossible}`, pageWidth - margin - 80, summaryStart + 20)

    // Overall Percentage - Highlighted
    const overallPercentage = overall ? overall.overallPercentage : percentage
    doc.setDrawColor(100, 180, 100)
    doc.setFillColor(245, 255, 250)
    doc.rect(margin, summaryStart + 40, pageWidth - 2 * margin, 30, 'F')
    doc.setDrawColor(34, 139, 34)
    doc.rect(margin, summaryStart + 40, pageWidth - 2 * margin, 30)

    doc.setFont(undefined, 'bold')
    doc.setTextColor(34, 139, 34)
    doc.setFontSize(14)
    doc.text(`Overall Percentage: ${overallPercentage}%`, pageWidth / 2, summaryStart + 58, { align: 'center' })

    doc.save(`Marksheet_${studentId}_${selectedSemesterName}.pdf`)
  }

  const [overall, setOverall] = useState<any|null>(null)
  // Use overall percentage from server if available, otherwise calculate from marks
  const percentage = overall?.overallPercentage || (marks.length ? Number(((marks.reduce((s:number,a:any)=>s+Number(a.marks),0)/marks.reduce((s:number,a:any)=>s+Number(a.total),0))*100).toFixed(2)) : 0)

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">MarkSheets</h1>

      <Card className="p-4 flex gap-2 items-center">
        <select className="border p-2" value={selectedSemester} onChange={e=>setSelectedSemester(e.target.value)}>
          <option value="">Select semester</option>
          {semesters.map(s=> <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <Button onClick={fetchMarksheet}>Fetch Marksheet</Button>
      </Card>

      {marks.length>0 && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Exam Results</h3>
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-blue-50 border-b-2 border-blue-200">
                <th className="p-3 text-left font-semibold text-blue-900">#</th>
                <th className="p-3 text-left font-semibold text-blue-900">Subject</th>
                <th className="p-3 text-left font-semibold text-blue-900">Exam</th>
                <th className="p-3 text-center font-semibold text-blue-900">Marks</th>
                <th className="p-3 text-center font-semibold text-blue-900">Total</th>
                <th className="p-3 text-center font-semibold text-blue-900">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((m:any, i:number)=> (
                <tr key={i} className={`border-b ${i % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}>
                  <td className="p-3 text-center">{i+1}</td>
                  <td className="p-3">{m.subject}</td>
                  <td className="p-3">{m.title}</td>
                  <td className="p-3 text-center font-semibold text-green-600">{m.marks}</td>
                  <td className="p-3 text-center">{m.total}</td>
                  <td className="p-3 text-center font-semibold text-blue-600">{m.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Marks Obtained:</span>
              <span className="font-semibold text-green-700">{overall?.totalObtained || marks.reduce((s:number, m:any)=>s+Number(m.marks),0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Marks Possible:</span>
              <span className="font-semibold text-blue-700">{overall?.totalPossible || marks.reduce((s:number, m:any)=>s+Number(m.total),0)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-green-200">
              <span className="font-semibold">Overall Percentage:</span>
              <span className="font-bold text-lg text-green-600">{overall?.overallPercentage || percentage}%</span>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={downloadPDF} className="bg-primary hover:bg-primary/90">
              Download PDF
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
