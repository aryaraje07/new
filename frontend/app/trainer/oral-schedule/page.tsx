"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

export default function FacultyOralPage() {
  const API = process.env.NEXT_PUBLIC_API_URL;
  const router = useRouter();

  const [form, setForm] = useState({
    topic: "",
    date: "",
    time: "",
    duration: "10",
  });

  const [exam, setExam] = useState<any>(null);
  const [scheduledExams, setScheduledExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignType, setAssignType] = useState<'ALL' | 'SELECTED' | 'CLASS'>('ALL');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');

  /* ================= FETCH SCHEDULED ================= */

  const fetchScheduled = async () => {
    const res = await fetch(`${API}/trainer/oral`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const data = await res.json();
    setScheduledExams(data);
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API}/trainer/students`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error("Failed to fetch students:", err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch(`${API}/trainer/classes`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      setClasses(data);
    } catch (err) {
      console.error("Failed to fetch classes:", err);
    }
  };

  useEffect(() => {
    fetchScheduled();
  }, []);

  /* ================= GENERATE ================= */

  const handleGenerate = async () => {
    setLoading(true);

    const res = await fetch(`${API}/trainer/oral/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        ...form,
        duration: Number(form.duration),
      }),
    });

    const data = await res.json();
    setExam(data);
    setLoading(false);
  };

  /* ================= UPDATE QUESTION ================= */

  const updateQuestion = (index: number, field: string, value: string) => {
    if (!exam.questions || !Array.isArray(exam.questions)) return;
    
    const updated = [...exam.questions];
    updated[index][field] = value;
    setExam({ ...exam, questions: updated });
  };

  const deleteQuestion = (index: number) => {
    if (!exam.questions || !Array.isArray(exam.questions)) return;
    
    const updated = exam.questions.filter((_: any, i: number) => i !== index);
    setExam({ ...exam, questions: updated });
  };

  const addQuestion = () => {
    if (!exam.questions || !Array.isArray(exam.questions)) return;
    
    if (!exam.totalQuestions || exam.questions.length >= exam.totalQuestions) return;

    setExam({
      ...exam,
      questions: [...exam.questions, { question: "", expectedAnswer: "" }],
    });
  };

  /* ================= SAVE ================= */

  const saveExam = async () => {
    await fetch(`${API}/trainer/oral/${exam._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        questions: exam.questions,
      }),
    });

    alert("Saved successfully!");
  };

  /* ================= ASSIGN ================= */

  const assignExam = async () => {
    try {
      const requestBody: any = {
        scope: assignType,
      };

      if (assignType === "SELECTED") {
        requestBody.selectedStudents = selectedStudents;
      } else if (assignType === "CLASS") {
        requestBody.assignedClass = selectedClass;
      }

      console.log("Sending oral assignment request:", requestBody);

      const res = await fetch(`${API}/trainer/oral/${exam._id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", res.status);
      console.log("Response ok:", res.ok);

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Error response:", errorData);
        throw new Error(errorData.message || "Assignment failed");
      }

      const data = await res.json();
      console.log("Success response:", data);

      alert("Oral exam assigned successfully!");
      setExam(null);
      fetchScheduled();
      setShowAssignModal(false);
    } catch (err: any) {
      console.error("Oral assignment error:", err);
      alert(`Assignment failed: ${err.message}`);
    }
  };

  /* ================= DELETE SCHEDULED ================= */

  const deleteExam = async (id: string) => {
    await fetch(`${API}/trainer/oral/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    fetchScheduled();
  };

  return (
    <div className="p-8 space-y-10">
      {/* CREATE SECTION */}
      {!exam && (
        <Card className="p-6 space-y-4">
          <Input
            placeholder="Topic"
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
          />

          <Input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />

          <Input
            type="time"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />

          <select
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
            className="border p-2 rounded"
          >
            <option value="10">10 min</option>
            <option value="20">20 min</option>
            <option value="30">30 min</option>
            <option value="60">60 min</option>
          </select>

          <Button onClick={handleGenerate}>
            {loading ? "Generating..." : "Generate Oral"}
          </Button>
        </Card>
      )}

      {/* EDIT SECTION */}
      {exam && exam.questions && Array.isArray(exam.questions) && (
        <div className="space-y-6">
          {exam.questions.map((q: any, i: number) => (
            <Card key={i} className="p-6 space-y-4">
              <div>
                <Label>Question</Label>
                <Input
                  disabled={editingIndex !== i}
                  value={q.question}
                  onChange={(e) =>
                    updateQuestion(i, "question", e.target.value)
                  }
                />
              </div>

              <div>
                <Label>Expected Answer</Label>
                <Input
                  disabled={editingIndex !== i}
                  value={q.expectedAnswer}
                  onChange={(e) =>
                    updateQuestion(i, "expectedAnswer", e.target.value)
                  }
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                >
                  {editingIndex === i ? "Done" : "Edit"}
                </Button>

                <Button variant="destructive" onClick={() => deleteQuestion(i)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}

          <Button
            onClick={addQuestion}
            disabled={!exam.totalQuestions || exam.questions.length >= exam.totalQuestions}
          >
            Add Question
          </Button>

          <div className="flex gap-4">
            <Button onClick={saveExam}>Save Changes</Button>
            <Button
              onClick={() => {
                setShowAssignModal(true);
                fetchStudents();
                fetchClasses();
              }}
              className="flex-1 bg-purple-600"
            >
              Assign Students
            </Button>
          </div>
        </div>
      )}

      {exam && (!exam.questions || !Array.isArray(exam.questions)) && (
        <Card className="p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">No Questions Available</h3>
          <p className="text-gray-600 mb-4">This oral exam doesn't have any questions yet.</p>
          <Button onClick={() => setExam(null)}>
            Generate New Oral Exam
          </Button>
        </Card>
      )}

      {/* SCHEDULED TESTS */}
      <div className="space-y-6 border-t pt-8">
        <h2 className="text-xl font-semibold">Scheduled Tests</h2>

        {scheduledExams.length === 0 ? (
          <Card className="p-6 text-center">No tests scheduled</Card>
        ) : (
          scheduledExams.map((exam) => (
            <Card
              key={exam._id}
              className="p-6 flex justify-between items-center"
            >
              <div>
                <h3 className="font-semibold">{exam.topic}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(exam.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  • {exam.time} • {exam.duration} mins
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() =>
                    router.push(`/trainer/oral-schedule/${exam._id}`)
                  }
                >
                  View
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => deleteExam(exam._id)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-bold">Assign Oral Exam</h2>

            <div className="space-y-4">
              <label className="block text-sm font-medium mb-2">Assignment Type</label>
              <select
                value={assignType}
                onChange={(e) => setAssignType(e.target.value as any)}
                className="w-full p-2 border rounded"
              >
                <option value="ALL">All Students</option>
                <option value="SELECTED">Selected Students</option>
                <option value="CLASS">Assign to Class</option>
              </select>

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
                      {s.fullName} ({s.email})
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
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedStudents([]);
                  setSelectedClass('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={assignExam}>
                Confirm Assign
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}