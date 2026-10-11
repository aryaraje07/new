'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function ExamsPage(){
  const [semesters, setSemesters] = useState<any[]>([])
  const [selectedSemester, setSelectedSemester] = useState('')
  const [exams, setExams] = useState<any[]>([])
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''

  useEffect(()=>{
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/learner/semesters`, { headers: { Authorization: `Bearer ${token}` }})
      .then(r=>r.json()).then(d=>setSemesters(d)).catch(()=>setSemesters([]))
  }, [])

  const fetchExams = async () => {
    if(!selectedSemester) return alert('Select semester')
    try{
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/learner/exams/scheduled?semester=${selectedSemester}`, { headers: { Authorization: `Bearer ${token}` }})
      const d = await res.json()
      setExams(d)
    }catch(err){ alert('Failed to fetch exams') }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Exams</h1>

      <Card className="p-4 flex gap-2 items-center">
        <select className="border p-2" value={selectedSemester} onChange={e=>setSelectedSemester(e.target.value)}>
          <option value="">Select semester</option>
          {semesters.map(s=> <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <Button onClick={fetchExams}>Fetch Tests</Button>
      </Card>

      <div className="space-y-4">
        {exams.map((q:any)=> (
          <Card key={q._id} className="p-4 flex justify-between items-center">
            <div>
              <div className="font-semibold">{q.title}</div>
              <div className="text-sm text-muted-foreground">{q.subject} • {new Date(q.scheduledAt).toLocaleString()}</div>
            </div>
            <div>
              <Link href={`/learner/quiz/take/${q._id}`}>
                <Button>Take Test</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
