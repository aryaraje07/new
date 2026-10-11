"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import API from "@/lib/api";

export default function AddStudentPage() {
  const [studentId, setStudentId] = useState("");
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleExtract = async () => {
    try {
      setLoading(true);
      setMessage("");
      const res = await API.get(`/trainer/student/${studentId}`);
      setStudentData(res.data);
    } catch (err: any) {
      setMessage("Student not found");
      setStudentData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    try {
      setLoading(true);
      await API.post(`/trainer/add-student`, { studentId });
      setMessage("Student successfully added to faculty");
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Error adding student");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="max-w-3xl mx-auto space-y-8">

        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Add Student</h1>
          <Button
            onClick={() => router.push("/trainer/class-management")}
            className="bg-green-600 hover:bg-green-700"
          >
            <Users className="w-4 h-4 mr-2" />
            Manage Classes
          </Button>
        </div>

        <Card className="p-8 space-y-6 border shadow-lg">

          <div className="space-y-2">
            <Label>Student ID</Label>
            <Input
              placeholder="STU-551976"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="h-10"
            />
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleExtract}
              disabled={loading || !studentId}
              className="bg-primary hover:bg-primary/90"
            >
              Extract Data
            </Button>

            <Button
              onClick={handleAddStudent}
              disabled={loading || !studentId}
              variant="outline"
            >
              Add Student
            </Button>
          </div>

          {message && (
            <p className="text-sm text-primary">{message}</p>
          )}

          {studentData && (
            <div className="border rounded-lg p-4 bg-secondary/40">
              <p><strong>Name:</strong> {studentData.fullName}</p>
              <p><strong>Email:</strong> {studentData.email}</p>
              <p><strong>Phone:</strong> {studentData.phone}</p>
              <p><strong>Education:</strong> {studentData.educationLevel}</p>
            </div>
          )}

        </Card>

        {/* Quick Actions Card */}
        <Card className="p-6 border shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => router.push("/trainer/class-management")}
              className="h-20 flex flex-col items-center justify-center space-y-2 bg-green-600 hover:bg-green-700"
            >
              <Users className="w-6 h-6" />
              <span>Manage Classes</span>
            </Button>
            
            <Button
              onClick={() => router.push("/trainer/add-student")}
              className="h-20 flex flex-col items-center justify-center space-y-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-6 h-6" />
              <span>Add Single Student</span>
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            Use class management to bulk upload students via Excel files for faster assignment.
          </p>
        </Card>
      </div>
    </div>
  );
}