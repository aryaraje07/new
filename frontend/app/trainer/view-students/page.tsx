"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import API from "@/lib/api";

export default function ViewStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await API.get("/trainer/students");
      setStudents(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (studentId: string) => {
    if (!confirm("Remove this student?")) return;
    try {
      await API.delete(`/trainer/students/${studentId}`);
      fetchStudents();
    } catch (error) {
      console.error(error);
    }
  };

  const handleViewStudent = (student: any) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  const handleMessage = (phone: string, name: string) => {
    const msg = `Hi ${name}, I wanted to connect regarding progress.`;
    const url = `https://wa.me/${phone.replace(
      /\D/g,
      ""
    )}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const filteredStudents = students.filter((student) => {
    const name = student.fullName || "";
    const email = student.email || "";
    const id = student.studentId || "";

    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-8 space-y-8">
  <style jsx>{`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `}</style>

  <div className="animate-[fadeIn_0.5s_ease-out]">
    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
      View Students
    </h1>
    <p className="text-muted-foreground mt-2 text-lg">
      Manage and monitor your student progress
    </p>
  </div>

  {/* Search */}
  <Card className="p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 animate-[fadeIn_0.6s_ease-out]">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-[pulse_2s_ease-in-out_infinite]" />
      <Input
        type="text"
        placeholder="Search by name, email, or student ID..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-10 h-12 border-2 border-gray-200 focus:border-blue-500 transition-all duration-200 rounded-lg focus:ring-2 focus:ring-blue-200"
      />
    </div>
  </Card>

  {/* Table */}
  <Card className="p-6 overflow-x-auto shadow-lg border-0 bg-gradient-to-br from-white to-gray-50 animate-[fadeIn_0.7s_ease-out]">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left py-4 font-semibold text-lg text-gray-700 pl-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-[pulse_1.5s_ease-in-out_infinite]"></div>
              Name
            </div>
          </th>
          <th className="text-left py-4 font-semibold text-lg text-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-[pulse_1.5s_ease-in-out_infinite_delay-200ms]"></div>
              Student ID
            </div>
          </th>
          <th className="text-left py-4 font-semibold text-lg text-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-[pulse_1.5s_ease-in-out_infinite_delay-400ms]"></div>
              Email
            </div>
          </th>
          <th className="text-left py-4 font-semibold text-lg text-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-[pulse_1.5s_ease-in-out_infinite_delay-600ms]"></div>
              Phone
            </div>
          </th>
          <th className="text-left py-4 font-semibold text-lg text-gray-700 pr-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-[pulse_1.5s_ease-in-out_infinite_delay-800ms]"></div>
              Actions
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        {filteredStudents.map((student, index) => (
          <tr 
            key={student._id} 
            className="border-b border-gray-100 hover:bg-blue-50 transition-all duration-200 group animate-[fadeIn_0.3s_ease-out]"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <td className="py-4 pl-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                  <span className="font-semibold text-blue-600">
                    {student.fullName.charAt(0)}
                  </span>
                </div>
                <span className="font-medium">{student.fullName}</span>
              </div>
            </td>
            <td className="py-4">
              <span className="font-mono bg-gray-100 px-3 py-1 rounded-lg text-sm border border-gray-200">
                {student.studentId}
              </span>
            </td>
            <td className="py-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{student.email}</span>
              </div>
            </td>
            <td className="py-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">{student.phone}</span>
              </div>
            </td>
            <td className="py-4 space-x-2 pr-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewStudent(student)}
                className="transition-all duration-200 hover:scale-105 hover:shadow-md border-blue-200 hover:border-blue-500 hover:bg-blue-50"
              >
                👁️ View
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleMessage(student.phone, student.fullName)
                }
                className="transition-all duration-200 hover:scale-105 hover:shadow-md border-green-200 hover:border-green-500 hover:bg-green-50 hover:text-green-700"
              >
                💬 Message
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(student._id)}
                className="transition-all duration-200 hover:scale-105 hover:shadow-md hover:bg-red-600"
              >
                🗑️ Delete
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </Card>

  {/* Modal */}
  {showModal && selectedStudent && (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-[fadeIn_0.3s_ease-out]"
      onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
    >
      <Card 
        className="w-full max-w-3xl p-8 space-y-6 animate-[slideIn_0.3s_ease-out] shadow-2xl border-0 bg-gradient-to-b from-white to-gray-50"
      >
        <div className="flex justify-between items-center border-b border-gray-200 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {selectedStudent.fullName.charAt(0)}
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {selectedStudent.fullName}
              </h2>
              <p className="text-sm text-muted-foreground font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                {selectedStudent.studentId}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowModal(false)}
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-200 hover:rotate-90 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Student Info */}
        <div className="grid grid-cols-2 gap-4 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-100">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground font-semibold">📧 Email</p>
            </div>
            <p className="font-semibold text-lg text-gray-800">{selectedStudent.email}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground font-semibold">📱 Phone</p>
            </div>
            <p className="font-semibold text-lg text-gray-800">{selectedStudent.phone}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="text-xl font-semibold text-gray-700">Competency Status</h3>
            <p className="text-sm text-muted-foreground">Role: {selectedStudent.competencyOverview?.targetRole || selectedStudent.targetRole || "Not configured"}</p>
          </div>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="text-left p-3">Competency</th>
                  <th className="text-left p-3">Required</th>
                  <th className="text-left p-3">Current Score</th>
                  <th className="text-left p-3">Gap</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Last Assessed</th>
                </tr>
              </thead>
              <tbody>
                {(selectedStudent.competencyOverview?.competencies || []).map((item: any) => (
                  <tr key={item.competency?._id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{item.competency?.name}</td>
                    <td className="p-3">Level {item.requiredLevel}</td>
                    <td className="p-3">{item.current?.score == null ? "Not Assessed" : `${item.current.score}%`}</td>
                    <td className="p-3">{item.gap?.gap > 0 ? `Level ${item.gap.gap}` : 0}</td>
                    <td className="p-3 capitalize">{item.current?.score == null ? "Not Assessed" : item.gap?.status}</td>
                    <td className="p-3">{item.current?.assessedAt ? new Date(item.current.assessedAt).toLocaleDateString() : "Not Assessed"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!selectedStudent.competencyOverview?.competencies?.length && <p className="p-4 text-sm text-muted-foreground">No competencies are mapped to this learner's role.</p>}
          </div>
        </div>

        {/* Parents Section */}
        {selectedStudent.parents &&
          selectedStudent.parents.length > 0 && (
            <div className="space-y-4 animate-[fadeIn_0.5s_ease-out]">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-gray-700">
                  👨‍👩‍👧‍👦 Parent Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedStudent.parents.map((parent: any) => (
                  <Card 
                    key={parent._id} 
                    className="p-6 space-y-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-gray-50 to-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {parent.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-lg text-gray-800">
                          {parent.fullName}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                            {parent.relationship || "Parent"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">📧</span>
                        <span className="text-gray-600">{parent.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">📱</span>
                        <span className="text-gray-600">{parent.phone}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleMessage(
                            parent.phone,
                            parent.fullName
                          )
                        }
                        className="flex-1 min-w-[120px] transition-all duration-200 hover:scale-105 border-green-200 hover:border-green-500 hover:bg-green-50 hover:text-green-700"
                      >
                        💬 WhatsApp
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(
                            `mailto:${parent.email}`
                          )
                        }
                        className="flex-1 min-w-[120px] transition-all duration-200 hover:scale-105 border-blue-200 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
                      >
                        📧 Email
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          window.open(`tel:${parent.phone}`)
                        }
                        className="flex-1 min-w-[120px] transition-all duration-200 hover:scale-105 border-purple-200 hover:border-purple-500 hover:bg-purple-50 hover:text-purple-700"
                      >
                        📞 Call
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

        <div className="flex justify-end pt-6 border-t border-gray-200">
          <Button 
            onClick={() => setShowModal(false)}
            className="px-8 transition-all duration-200 hover:scale-105 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
          >
            Close
          </Button>
        </div>
      </Card>
    </div>
  )}
</div>
  );
}
