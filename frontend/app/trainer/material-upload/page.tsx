'use client'

import React from "react"

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X } from 'lucide-react'
import API from "@/lib/api"
import { useEffect } from "react"


export default function MaterialUploadPage() {
  const [topic, setTopic] = useState('')
  const [subject, setSubject] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [sendType, setSendType] = useState<'ALL' | 'SELECTED' | 'CLASS'>('ALL')
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')

  useEffect(() => {
  const fetchData = async () => {
    try {
      const [studentsRes, classesRes] = await Promise.all([
        API.get("/trainer/my-students"),
        API.get("/trainer/classes")
      ]);
      setStudents(studentsRes.data);
      setClasses(classesRes.data);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  };
  fetchData();
}, []);



  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles([...uploadedFiles, ...Array.from(e.target.files)])
    }
  }

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
  if (!topic || !subject || uploadedFiles.length === 0) return

  const formData = new FormData()

  uploadedFiles.forEach((file) => {
    formData.append("files", file)
  })

  formData.append("title", topic)
  formData.append("description", subject)
  formData.append("sendType", sendType)

  if (sendType === "SELECTED") {
    formData.append("selectedStudents", JSON.stringify(selectedStudents))
  } else if (sendType === "CLASS") {
    formData.append("assignedClass", selectedClass)
  }

  try {
    await API.post("/trainer/upload-material", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })

    alert("Material uploaded successfully")
  } catch (err) {
    console.log(err)
    alert("Upload failed")
  }
}


  return (
    <div className="p-8 space-y-8">
  <style jsx>{`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-8px); }
      to { opacity: 1; transform: translateX(0); }
    }
  `}</style>

  {/* Header */}
  <div className="animate-[fadeIn_0.4s_ease-out]">
    <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Upload Learning Materials</h1>
    <p className="text-gray-600 mt-2 text-sm">Share study notes and resources with students</p>
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div className="lg:col-span-2 space-y-6">
      {/* File Upload */}
      <Card className="p-6 border border-gray-200 space-y-5 shadow-sm hover:shadow transition-shadow duration-300 animate-[fadeIn_0.5s_ease-out] rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
          <h2 className="text-lg font-medium text-gray-900">Upload Files</h2>
        </div>
        <div 
          className="border border-gray-300 border-dashed rounded-lg p-8 text-center space-y-4 hover:border-indigo-400 hover:bg-indigo-50/10 transition-all duration-200 cursor-pointer"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
              <Upload className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <div className="space-y-1">
            <input
              type="file"
              onChange={handleFileChange}
              multiple
              className="hidden"
              id="file-upload"
            />
            <Label htmlFor="file-upload" className="cursor-pointer block">
              <p className="font-medium text-gray-900 text-base">Click to upload files</p>
              <p className="text-sm text-gray-500">or drag and drop</p>
            </Label>
          </div>
          <p className="text-xs text-gray-400">PDF, DOC, PPT, Images (max 10MB each)</p>
        </div>
      </Card>

      {/* Details */}
      <Card className="p-6 border border-gray-200 space-y-6 shadow-sm hover:shadow transition-shadow duration-300 animate-[fadeIn_0.6s_ease-out] rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-gray-800 rounded-full"></div>
          <h2 className="text-lg font-medium text-gray-900">Material Details</h2>
        </div>

        <form className="space-y-6">
          {/* Topic */}
          <div className="space-y-2 animate-[fadeIn_0.7s_ease-out]">
            <Label htmlFor="topic" className="text-sm font-medium text-gray-700">
              Topic <span className="text-red-500">*</span>
            </Label>
            <Input
              id="topic"
              type="text"
              placeholder="e.g., Chapter 5 - Integration Methods"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="h-10 border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors duration-200"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2 animate-[fadeIn_0.8s_ease-out]">
            <Label className="text-sm font-medium text-gray-700">
              Subject <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Enter subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-10 border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors duration-200"
            />
          </div>


          {/* Send To Section */}
          <Card className="p-5 border border-gray-200 space-y-4 bg-gray-50/50 rounded-lg animate-[fadeIn_0.9s_ease-out]">
            <Label className="text-sm font-medium text-gray-700">
              Send To
            </Label>

            <div className="flex gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="radio"
                    checked={sendType === "ALL"}
                    onChange={() => setSendType("ALL")}
                    className="w-4 h-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
                <span className="text-sm text-gray-700">All Students</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="radio"
                    checked={sendType === "SELECTED"}
                    onChange={() => setSendType("SELECTED")}
                    className="w-4 h-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
                <span className="text-sm text-gray-700">Select Students</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="radio"
                    checked={sendType === "CLASS"}
                    onChange={() => setSendType("CLASS")}
                    className="w-4 h-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
                <span className="text-sm text-gray-700">Assign to Class</span>
              </label>
            </div>

            {sendType === "SELECTED" && (
              <div className="grid grid-cols-2 gap-2 border border-gray-200 p-4 rounded-md bg-white animate-[slideIn_0.2s_ease-out]">
                {students.map((student, index) => (
                  <label 
                    key={student._id} 
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 transition-colors duration-150 cursor-pointer text-sm"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <input
                      type="checkbox"
                      value={student._id}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudents([...selectedStudents, student._id])
                        } else {
                          setSelectedStudents(
                            selectedStudents.filter((id) => id !== student._id)
                          )
                        }
                      }}
                      className="w-4 h-4 border-gray-300 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-xs font-medium">
                        {student.fullName.charAt(0)}
                      </div>
                      <span className="text-gray-700 truncate">{student.fullName}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {sendType === "CLASS" && (
              <div className="space-y-2 border border-gray-200 p-4 rounded-md bg-white animate-[slideIn_0.2s_ease-out]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
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
          </Card>

          {/* Upload Button */}
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!topic || !subject || uploadedFiles.length === 0}
            className={`w-full h-11 font-medium transition-all duration-200 ${
              !topic || !subject || uploadedFiles.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow'
            }`}
          >
            {!topic || !subject || uploadedFiles.length === 0
              ? 'Complete all fields to upload'
              : 'Upload Materials'}
          </Button>
        </form>
      </Card>
    </div>

    {/* Uploaded Files Preview */}
    <Card className="p-5 border border-gray-200 space-y-4 shadow-sm hover:shadow transition-shadow duration-300 animate-[fadeIn_0.7s_ease-out] rounded-lg h-fit">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-gray-700 rounded-full"></div>
          <h3 className="font-medium text-gray-900">Uploaded Files</h3>
        </div>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {uploadedFiles.map((file, index) => (
          <div 
            key={index} 
            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md hover:border-gray-300 transition-colors duration-150 animate-[slideIn_0.3s_ease-out]"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                {file.name.includes('.pdf') ? (
                  <div className="w-4 h-4 bg-red-100 rounded-sm flex items-center justify-center">
                    <span className="text-red-600 text-xs font-bold">PDF</span>
                  </div>
                ) : file.name.includes('.doc') ? (
                  <div className="w-4 h-4 bg-blue-100 rounded-sm flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-bold">DOC</span>
                  </div>
                ) : file.name.includes('.ppt') ? (
                  <div className="w-4 h-4 bg-orange-100 rounded-sm flex items-center justify-center">
                    <span className="text-orange-600 text-xs font-bold">PPT</span>
                  </div>
                ) : (
                  <div className="w-4 h-4 bg-green-100 rounded-sm flex items-center justify-center">
                    <span className="text-green-600 text-xs">IMG</span>
                  </div>
                )}
              </div>
              <div className="max-w-[160px]">
                <span className="text-sm text-gray-800 truncate block font-medium">{file.name}</span>
                <span className="text-xs text-gray-400">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              </div>
            </div>
            <button
              onClick={() => handleRemoveFile(index)}
              className="w-6 h-6 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors duration-150"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        {uploadedFiles.length === 0 && (
          <div className="text-center py-6 space-y-2 animate-[fadeIn_0.4s_ease-out]">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
              <Upload className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No files uploaded</p>
            <p className="text-xs text-gray-400">Files will appear here</p>
          </div>
        )}
      </div>
      
      {uploadedFiles.length > 0 && (
        <div className="pt-3 border-t border-gray-200 animate-[fadeIn_0.4s_ease-out]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Total size</span>
            <span className="font-medium text-gray-800">
              {(uploadedFiles.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(1)} MB
            </span>
          </div>
        </div>
      )}
    </Card>
  </div>
</div>
  )
}