"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Users, Trash2, Edit } from "lucide-react";
import API from "@/lib/api";

interface Class {
  _id: string;
  name: string;
  description?: string;
  students: any[];
  isActive: boolean;
}

export default function ClassManagementPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await API.get("/trainer/classes");
      setClasses(res.data);
    } catch (err) {
      console.error("Failed to fetch classes:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (editingClass) {
        await API.put(`/trainer/classes/${editingClass._id}`, formData);
        setMessage("Class updated successfully!");
      } else {
        await API.post("/trainer/classes", formData);
        setMessage("Class created successfully!");
      }
      
      setFormData({ name: "", description: "" });
      setEditingClass(null);
      setShowCreateForm(false);
      fetchClasses();
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (classItem: Class) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      description: classItem.description || "",
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (classId: string) => {
    if (!confirm("Are you sure you want to delete this class?")) return;

    try {
      await API.delete(`/trainer/classes/${classId}`);
      setMessage("Class deleted successfully!");
      fetchClasses();
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Delete failed");
    }
  };

  const resetFileInput = () => {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    // Don't clear the state here, let the calling function handle it
  };

  const handleExcelUpload = async () => {
    if (!excelFile || !selectedClassId) {
      alert("Please select a class and upload an Excel file");
      return;
    }

    setLoading(true);
    
    // Create a new FormData instance to avoid file reference issues
    const uploadFormData = new FormData();
    uploadFormData.append("excel", excelFile, excelFile.name);

    try {
      const res = await API.post(`/trainer/classes/${selectedClassId}/upload-excel`, uploadFormData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      setMessage(`Successfully added ${res.data.newStudentsAdded} students to class!`);
      // Clear both input and state after successful upload
      resetFileInput();
      setExcelFile(null);
      fetchClasses();
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Excel upload failed");
      // Don't reset file on error so user can retry
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Class Management</h1>
          <Button
            onClick={() => {
              setEditingClass(null);
              setFormData({ name: "", description: "" });
              setShowCreateForm(true);
            }}
            className="bg-primary hover:bg-primary/90"
          >
            Add New Class
          </Button>
        </div>

        {message && (
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}

        {/* Create/Edit Class Form */}
        {showCreateForm && (
          <Card className="p-8 border shadow-lg">
            <h2 className="text-xl font-semibold mb-6">
              {editingClass ? "Edit Class" : "Create New Class"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Class Name</Label>
                <Input
                  placeholder="e.g., TY-A DIV, TY-B DIV"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input
                  placeholder="Class description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-primary hover:bg-primary/90"
                >
                  {loading ? "Saving..." : editingClass ? "Update Class" : "Create Class"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingClass(null);
                    setFormData({ name: "", description: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Excel Upload Section */}
        <Card className="p-8 border shadow-lg">
          <h2 className="text-xl font-semibold mb-6">Bulk Upload Students via Excel</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Class</Label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select a class</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Excel File (with studentId column)</Label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setExcelFile(file);
                    // Show file name feedback
                    if (file) {
                      setMessage(`Selected: ${file.name}`);
                    } else {
                      setMessage('');
                    }
                  }}
                  className="w-full p-2 border rounded"
                  key="excel-upload-input"
                />
                {excelFile && (
                  <div className="text-sm text-green-600 font-medium mt-2">
                    Selected: {excelFile.name}
                  </div>
                )}
              </div>

              <Button
                onClick={handleExcelUpload}
                disabled={loading || !excelFile || !selectedClassId}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {loading ? "Uploading..." : "Upload Excel"}
              </Button>
            </div>

            <div className="bg-blue-50 p-4 rounded">
              <h3 className="font-semibold text-blue-900 mb-2">Excel Format Instructions:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Create an Excel file with a column named "studentId"</li>
                <li>• Add all student IDs in this column</li>
                <li>• Students will be automatically assigned to the selected class</li>
                <li>• Existing students will be linked to the faculty</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Classes List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((classItem) => (
            <Card key={classItem._id} className="p-6 border shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{classItem.name}</h3>
                  {classItem.description && (
                    <p className="text-sm text-gray-600 mt-1">{classItem.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(classItem)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(classItem._id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <Users className="w-4 h-4 mr-2" />
                {classItem.students.length} students
              </div>

              <div className="mt-4">
                <div className="text-xs text-gray-500 mb-2">Recent Students:</div>
                <div className="space-y-1">
                  {classItem.students.slice(0, 3).map((student: any) => (
                    <div key={student._id} className="text-xs text-gray-700">
                      • {student.fullName} ({student.studentId})
                    </div>
                  ))}
                  {classItem.students.length > 3 && (
                    <div className="text-xs text-gray-500">
                      ...and {classItem.students.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {classes.length === 0 && (
            <Card className="p-8 text-center border-2 border-dashed">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Classes Yet</h3>
              <p className="text-gray-500 mb-4">Create your first class to start organizing students</p>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-primary hover:bg-primary/90"
              >
                Create First Class
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}