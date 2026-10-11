'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, Wand2 } from 'lucide-react'

function CreateExamContent() {
  const searchParams = useSearchParams()
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [notesFile, setNotesFile] = useState<File | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [quizGenerated, setQuizGenerated] = useState(false)
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null)
  const [totalQuestions, setTotalQuestions] = useState(10)
const [duration, setDuration] = useState(60)
const [examId, setExamId] = useState<string | null>(null)
const [editingQuestion, setEditingQuestion] = useState<any | null>(null)
const [editText, setEditText] = useState('')
const [editOptions, setEditOptions] = useState<string[]>([])
const [editCorrect, setEditCorrect] = useState<number>(0)
const [examApproved, setExamApproved] = useState(false)
const [showSchedule, setShowSchedule] = useState(false)
const [showAssign, setShowAssign] = useState(false)
const [assignType, setAssignType] = useState<'ALL' | 'SELECTED' | 'CLASS'>('ALL')
const [students, setStudents] = useState<any[]>([])
const [selectedStudents, setSelectedStudents] = useState<string[]>([])
const [classes, setClasses] = useState<any[]>([])
const [selectedClass, setSelectedClass] = useState<string>('')
const [showAssignSemester, setShowAssignSemester] = useState(false)
const [facultySemesters, setFacultySemesters] = useState<any[]>([])
const [selectedSemester, setSelectedSemester] = useState<string>('')

  useEffect(() => {
    const existingExamId = searchParams.get('examId')
    if (!existingExamId) return

    const loadDraft = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trainer/exams/${existingExamId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })
      if (!res.ok) return
      const exam = await res.json()
      setExamId(exam._id)
      setTopic(exam.title || '')
      setDescription(exam.description || '')
      setSubject(exam.subject || '')
      setDuration(exam.duration || 60)
      setTotalQuestions(exam.questions?.length || 0)
      setGeneratedQuiz({ topic: exam.title, subject: exam.subject, questions: exam.questions || [] })
      setQuizGenerated(true)
      setExamApproved(exam.status !== 'DRAFT')
    }

    loadDraft().catch((error) => console.error('Failed to load saved assessment:', error))
  }, [searchParams])

  // Sample generated questions
  // const sampleQuestions = [
  //   { id: 1, question: 'What is integration?', type: 'short' },
  //   { id: 2, question: 'Solve: ∫(2x + 3)dx', type: 'short' },
  //   { id: 3, question: 'Find the indefinite integral', type: 'multiple', options: ['A', 'B', 'C', 'D'] },
  // ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNotesFile(e.target.files[0])
    }
  }

  const handleGenerateQuiz = async () => {
  if (!topic || !subject || !notesFile) {
    alert("Please fill all required fields and upload notes");
    return;
  }

  setIsGenerating(true);

  try {
    const formData = new FormData();

    // ✅ ONLY ONE FILE, CORRECT VARIABLE
    formData.append("file", notesFile);

    formData.append("title", topic);
    formData.append("description", description);
    formData.append("subject", subject);
    formData.append("difficulty", "mixed");
    formData.append("totalQuestions", String(totalQuestions));
    formData.append("duration", String(duration));

    console.log("🚀 Sending request to:", `${process.env.NEXT_PUBLIC_API_URL}/trainer/exams/create`);
    console.log("📤 Form data contents:");
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }

    // Test simple request first
    try {
      const testRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trainer/exams/test`);
      console.log("🧪 Backend test response:", await testRes.json());
    } catch (testErr) {
      console.error("❌ Backend test failed:", testErr);
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/trainer/exams/create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData, // ❌ DO NOT set Content-Type
      }
    );

    console.log("📥 Response status:", res.status);
    console.log("📥 Response headers:", [...res.headers.entries()]);

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Error response text:", errorText);
      throw new Error(errorText || "Quiz generation failed");
    }

    const data = await res.json();
    console.log("✅ Success response:", data);

    setExamId(data.examId);

    setGeneratedQuiz({
      topic,
      subject,
      questions: data.questions,
    });

    setQuizGenerated(true);
  } catch (err: any) {
    console.error("❌ Quiz generation error:", err);
    console.error("❌ Error stack:", err.stack);
    alert(`Failed to generate quiz: ${err.message}`);
  } finally {
    setIsGenerating(false);
  }
};

  const handleSaveEdit = async () => {
  if (!editingQuestion || !examId) return

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/trainer/exams/${examId}/question/${editingQuestion.questionId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          question: editText,
          options: editOptions,
          correctAnswer: editCorrect,
        }),
      }
    )

    const data = await res.json()

    setGeneratedQuiz((prev: any) => ({
      ...prev,
      questions: data.questions,
    }))

    setEditingQuestion(null)
  } catch (err) {
    alert('Failed to update question')
  }
}

  const handleDeleteQuestion = async (questionId: string) => {
  if (!examId) return

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/trainer/exams/${examId}/question/${questionId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }
    )

    const data = await res.json()

    setGeneratedQuiz((prev: any) => ({
      ...prev,
      questions: data.questions,
    }))
  } catch (err) {
    alert('Failed to delete question')
  }
}

const openEditQuestion = (q: any) => {
  setEditingQuestion(q)
  setEditText(q.question)
  setEditOptions([...q.options])
  setEditCorrect(q.correctAnswer)
}

const handleApproveExam = async () => {
  if (!examId) return

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/trainer/exams/${examId}/approve`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )

    const data = await res.json()
    if (!res.ok) throw new Error(data.message)

    setExamApproved(true)
    alert("Exam approved successfully!")
  } catch (err) {
    alert("Failed to approve exam")
  }
}

const handleScheduleExam = async () => {
  if (!examId || !scheduledDate || !scheduledTime) return

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/trainer/exams/${examId}/schedule`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          scheduledAt: `${scheduledDate}T${scheduledTime}:00`,
          duration,
        }),
      }
    )

    if (!res.ok) throw new Error("Schedule failed")

    alert("Exam scheduled successfully")
    setShowSchedule(false)
  } catch {
    alert("Failed to schedule exam")
  }
}

const fetchStudents = async () => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/trainer/students`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )

    const data = await res.json()
    setStudents(data)
  } catch (err) {
    alert("Failed to load students")
  }
}

const fetchClasses = async () => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/trainer/classes`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )

    const data = await res.json()
    setClasses(data)
  } catch (err) {
    alert("Failed to load classes")
  }
}

const handleAssignStudents = async () => {
  if (!examId) return

  try {
    const requestBody: any = {
      scope: assignType,
    }

    if (assignType === "SELECTED") {
      requestBody.studentIds = selectedStudents
    } else if (assignType === "CLASS") {
      requestBody.assignedClass = selectedClass
    }

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/trainer/exams/${examId}/assign`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(requestBody),
      }
    )

    alert("Exam assigned successfully")
    setSelectedStudents([])
    setSelectedClass('')
    setShowAssign(false)
  } catch {
    alert("Failed to assign exam")
  }
}

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Create Exam</h1>
        <p className="text-muted-foreground mt-2">Upload notes and generate an AI-powered quiz</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Notes */}
          <Card className="p-8 border border-border space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Upload Study Notes</h2>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-3 hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <div>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  id="file-upload"
                />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <p className="font-medium text-foreground">Click to upload notes</p>
                  <p className="text-sm text-muted-foreground">or drag and drop</p>
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">Supports PDF, DOC, DOCX, TXT</p>
              {notesFile && (
                <p className="text-sm text-green-600 font-semibold">✓ {notesFile.name}</p>
              )}
            </div>
          </Card>

          {/* Exam Details */}
          <Card className="p-8 border border-border space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Exam Details</h2>

            <form className="space-y-6">
              {/* Topic */}
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-sm font-medium text-foreground">
                  Topic <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="topic"
                  type="text"
                  placeholder="e.g., Calculus - Integration"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                  className="h-10 border-border bg-background"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-foreground">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Enter exam description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="border-border bg-background min-h-24"
                />
              </div>

              {/* Subject */}
<div className="space-y-2">
  <Label htmlFor="subject" className="text-sm font-medium text-foreground">
    Subject <span className="text-red-500">*</span>
  </Label>
  <Input
    id="subject"
    type="text"
    placeholder="e.g., Calculus, Data Structures, Organic Chemistry"
    value={subject}
    onChange={(e) => setSubject(e.target.value)}
    required
    className="h-10 border-border bg-background"
  />
</div>

              {/* Number of Questions */}
<div className="space-y-2">
  <Label className="text-sm font-medium text-foreground">
    Number of Questions <span className="text-red-500">*</span>
  </Label>
  <Input
    type="number"
    min={5}
    max={50}
    value={totalQuestions}
    onChange={(e) => setTotalQuestions(Number(e.target.value))}
    className="h-10 border-border bg-background"
  />
</div>

{/* Duration */}
<div className="space-y-2">
  <Label className="text-sm font-medium text-foreground">
    Duration (minutes) <span className="text-red-500">*</span>
  </Label>
  <Input
    type="number"
    min={10}
    value={duration}
    onChange={(e) => setDuration(Number(e.target.value))}
    className="h-10 border-border bg-background"
  />
</div>

              

              {/* Generate Button */}
              <Button
                type="button"
                onClick={handleGenerateQuiz}
                disabled={!topic || !subject || isGenerating}
                className="w-full bg-primary hover:bg-primary/90 h-11 gap-2 font-semibold"
              >
                <Wand2 className="w-4 h-4" />
                {isGenerating ? 'Generating Quiz...' : 'Generate Quiz with AI'}
              </Button>
            </form>
          </Card>
        </div>

        {/* Info Section */}
        <div className="space-y-6">
          {/* How It Works */}
          <Card className="p-6 border border-border space-y-4">
            <h3 className="font-semibold text-foreground">How It Works</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="text-primary font-bold flex-shrink-0">1.</span>
                <span>Upload your study notes</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold flex-shrink-0">2.</span>
                <span>Enter exam details</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold flex-shrink-0">3.</span>
                <span>AI generates questions</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-bold flex-shrink-0">4.</span>
                <span>Review and assign to students</span>
              </li>
            </ol>
          </Card>

          {/* Features */}
          <Card className="p-6 border border-green-200 bg-green-50 space-y-3">
            <h3 className="font-semibold text-green-900">Features</h3>
            <ul className="space-y-2 text-xs text-green-800">
              <li>✓ AI-generated questions</li>
              <li>✓ Auto proctoring setup</li>
              <li>✓ Scheduled distribution</li>
              <li>✓ Real-time monitoring</li>
              <li>✓ Instant grading</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Quiz Preview Modal */}
      {quizGenerated && generatedQuiz && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-2xl p-8 border border-border my-8">
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Quiz Preview</h2>
                  <p className="text-sm text-muted-foreground mt-1">Review before assigning to students</p>
                </div>
                <button 
                  onClick={() => setQuizGenerated(false)}
                  className="text-2xl text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>

              {editingQuestion && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <Card className="w-full max-w-xl p-6 space-y-4">
      <h2 className="text-lg font-bold">Edit Question</h2>

      <Input
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
      />

      {editOptions.map((opt, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <input
            type="radio"  
            checked={editCorrect === idx}
            onChange={() => setEditCorrect(idx)}
          />
          <Input
            value={opt}
            onChange={(e) => {
              const copy = [...editOptions]
              copy[idx] = e.target.value
              setEditOptions(copy)
            }}
          />
        </div>
      ))}

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={() => setEditingQuestion(null)}>
          Cancel
        </Button>
        <Button onClick={handleSaveEdit}>
          Save Changes
        </Button>
      </div>
    </Card>
  </div>
)}

              {/* Quiz Details */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-secondary rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Topic</p>
                  <p className="font-semibold text-foreground">{generatedQuiz.topic}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Subject</p>
                  <p className="font-semibold text-foreground capitalize">{generatedQuiz.subject}</p>
                </div>
              </div>

              {/* Questions Preview */}
              <div className="space-y-3 max-h-96 overflow-y-auto border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-4">Generated Questions ({generatedQuiz.questions.length})</h3>
                {generatedQuiz?.questions?.map((q: any, idx: number) => (
  <div
    key={q.questionId}
    className="p-3 bg-secondary/50 rounded-lg border border-border space-y-2"
  >
    <p className="font-medium text-sm">
      Q{idx + 1}: {q.question}
    </p>

    <div className="ml-4 space-y-1">
      {q.options.map((opt: string, i: number) => (
        <p
          key={i}
          className={`text-xs ${
            q.correctAnswer === i
              ? 'text-green-600 font-semibold'
              : 'text-muted-foreground'
          }`}
        >
          {String.fromCharCode(65 + i)}) {opt}
        </p>
      ))}
    </div>

    <div className="flex gap-3 pt-2">
      <Button
  size="sm"
  variant="outline"
  disabled={examApproved}
  onClick={() => openEditQuestion(q)}
>
  Edit
</Button>

      <Button
  size="sm"
  variant="destructive"
  disabled={examApproved}
  onClick={() => handleDeleteQuestion(q.questionId)}
>
  Delete
</Button>
    </div>
  </div>
))}
              </div>

              <div className="flex gap-3">
  {!examApproved ? (
  <Button
    onClick={handleApproveExam}
    className="flex-1 bg-green-600"
  >
    Approve Exam
  </Button>
) : (
  <>
    <Button
      onClick={() => setShowSchedule(true)}
      className="flex-1 bg-blue-600"
    >
      Schedule Exam
    </Button>
              <Button
                onClick={() => {
                  setShowAssign(true)
                  fetchStudents()
                  fetchClasses()
                }}
                className="flex-1 bg-purple-600"
              >
                Assign Students
              </Button>

              <Button
                onClick={async () => {
                  // fetch semesters assigned to this faculty
                  try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/semesters/for-faculty`, {
                      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                    })
                    if (res.ok) {
                      const data = await res.json()
                      setFacultySemesters(Array.isArray(data) ? data : [])
                      // ensure classes are loaded for the modal
                      await fetchClasses()
                      setShowAssignSemester(true)
                    } else {
                      alert('Failed to load semesters')
                    }
                  } catch (err) {
                    alert('Failed to load semesters')
                  }
                }}
                className="flex-1 bg-amber-600"
              >
                Assign to Semester
              </Button>
    <Button
      onClick={() => {
        setShowAssign(true)
        fetchStudents()
        fetchClasses()
      }}
      className="flex-1 bg-purple-600"
    >
      Assign Students
    </Button>
  </>
)}

  <Button
    onClick={() => setQuizGenerated(false)}
    variant="outline"
    className="flex-1"
  >
    Close
  </Button>
</div>
              </div>
          </Card>
        </div>
      )}
      {showSchedule && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <Card className="w-full max-w-md p-6 space-y-4">
      <h2 className="text-lg font-bold">Schedule Exam</h2>

      <div className="space-y-2">
        <Label>Date</Label>
        <Input
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Time</Label>
        <Input
          type="time"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Duration (minutes)</Label>
        <Input
          type="number"
          min={10}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={() => setShowSchedule(false)}
        >
          Cancel
        </Button>
        <Button onClick={handleScheduleExam}>
          Confirm Schedule
        </Button>
      </div>
    </Card>
  </div>
)}

{showAssign && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <Card className="w-full max-w-lg p-6 space-y-4">
      <h2 className="text-lg font-bold">Assign Students</h2>

      <Select
  value={assignType}
  onValueChange={(v) => setAssignType(v as 'ALL' | 'SELECTED' | 'CLASS')}
>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Students</SelectItem>
          <SelectItem value="SELECTED">Selected Students</SelectItem>
          <SelectItem value="CLASS">Assign to Class</SelectItem>
        </SelectContent>
      </Select>

      {assignType === "SELECTED" && (
        <div className="max-h-60 overflow-y-auto space-y-2 border p-2 rounded">
          {students.map((s) => (
            <label key={s._id} className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedStudents.includes(s._id)}
                onChange={() =>
                  setSelectedStudents(prev =>
                    prev.includes(s._id)
                      ? prev.filter(id => id !== s._id)
                      : [...prev, s._id]
                  )
                }
              />
              {s.name} ({s.email})
            </label>
          ))}
        </div>
      )}

      {assignType === "CLASS" && (
        <div className="space-y-2 border p-2 rounded">
          <label className="block text-sm font-medium mb-2">Select Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select a class</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name} ({cls.students?.length || 0} students)
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={() => setShowAssign(false)}>
          Cancel
        </Button>
        <Button onClick={handleAssignStudents}>
          Confirm Assign
        </Button>
      </div>
    </Card>
  </div>
)}

{showAssignSemester && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <Card className="w-full max-w-lg p-6 space-y-4">
      <h2 className="text-lg font-bold">Assign to Semester</h2>

      <div className="space-y-2">
        <Label>Semester</Label>
        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="">Select semester</option>
          {facultySemesters.map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Class (required when assigning to a semester)</Label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="">Select a class</option>
          {classes.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={() => setShowAssignSemester(false)}>Cancel</Button>
        <Button onClick={async () => {
          if (!examId || !selectedSemester) return alert('Select semester')
          // require class when assigning to semester
          if (!selectedClass) return alert('Please select a class when assigning to a semester')
          try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trainer/exams/${examId}/assign-to-semester`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
              body: JSON.stringify({ semesterId: selectedSemester, assignedClass: selectedClass })
            })
            if (!res.ok) throw new Error('Assign failed')
            alert('Assigned to semester')
            setShowAssignSemester(false)
          } catch (err) {
            alert('Failed to assign to semester')
          }
        }}>Assign</Button>
      </div>
    </Card>
  </div>
)}
    </div>
  )
}

export default function CreateExamPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading assessment builder...</p>
      </div>
    }>
      <CreateExamContent />
    </Suspense>
  )
}