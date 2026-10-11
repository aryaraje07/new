'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileText, Sparkles, AlertCircle, CheckCircle } from 'lucide-react'
import API from "@/lib/api"

export default function TrainerMaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null)
  const [questionCount, setQuestionCount] = useState(10)
  const [generating, setGenerating] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([])
  const [error, setError] = useState('')
  const [generationStep, setGenerationStep] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      const res = await API.get("/trainer/materials")
      setMaterials(res.data)
    } catch (err) {
      console.error("Failed to fetch materials:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateQuiz = async () => {
    if (!selectedMaterial) return

    setGenerating(true)
    setError('')
    setGeneratedQuestions([])
    setGenerationStep('1/3 Preparing material')

    try {
      setGenerationStep('2/3 Qwen generating')
      const res = await API.post("/trainer/generate-quiz-from-material", {
        materialId: selectedMaterial._id,
        questionCount,
        difficulty: 'mixed',
      })

      if (res.data.success) {
        setGenerationStep('3/3 Validating questions')
        setGeneratedQuestions(res.data.questions)
      } else {
        setError(res.data.message || 'Quiz generation failed')
      }
    } catch (err: any) {
      console.error("Quiz generation error:", err)
      setError(err.response?.data?.message || err.message || 'Quiz generation failed')
    } finally {
      setGenerating(false)
      setGenerationStep('')
    }
  }

  const handleSaveQuiz = async () => {
    if (!selectedMaterial || generatedQuestions.length === 0) return

    try {
      const res = await API.post(`/trainer/materials/${selectedMaterial._id}/assessment`, {
        materialId: selectedMaterial._id,
        questions: generatedQuestions,
        title: selectedMaterial.title,
        subject: selectedMaterial.description || selectedMaterial.title,
        difficulty: 'mixed',
      })
      router.push(`/trainer/create-exam?examId=${res.data.examId}`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save assessment')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="h-24 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Learning Materials</h1>
          <p className="text-gray-600 mt-2">Manage uploaded materials and generate assessments</p>
        </div>
        <Button
          onClick={() => window.location.href = '/trainer/material-upload'}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload New Material
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Materials List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Uploaded Materials ({materials.length})</h2>
            
            {materials.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No materials uploaded yet</p>
                <Button
                  onClick={() => window.location.href = '/trainer/material-upload'}
                  variant="outline"
                  className="mt-4"
                >
                  Upload First Material
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {materials.map((material) => (
                  <div
                    key={material._id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedMaterial?._id === material._id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedMaterial(material)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{material.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">{material.fileName}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {new Date(material.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Quiz Generation Panel */}
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Generate Quiz</h2>
            
            {!selectedMaterial ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a material to generate quiz</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900">{selectedMaterial.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedMaterial.description}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Number of Questions</Label>
                    <Input
                      type="number"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value) || 10)}
                      min={1}
                      max={50}
                    />
                  </div>


                  <Button
                    onClick={handleGenerateQuiz}
                    disabled={generating}
                    className="w-full"
                  >
                    {generating ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                        {generationStep}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Quiz
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Generated Questions */}
          {generatedQuestions.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Generated Questions</h2>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{generatedQuestions.length} questions</span>
                </div>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {generatedQuestions.map((q, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                    <p className="font-medium text-gray-900 mb-2">Q{index + 1}: {q.question}</p>
                    <div className="space-y-1 text-gray-600">
                      {q.options?.map((opt: string, i: number) => (
                        <div key={i} className={`flex items-center gap-2 ${i === q.correct ? 'text-green-600 font-medium' : ''}`}>
                          <span>{i === q.correct ? '✓' : '○'}</span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSaveQuiz}
                className="w-full mt-4"
              >
                Save Assessment and Assign
              </Button>
            </Card>
          )}

          {error && (
            <Card className="p-4 border border-red-200 bg-red-50">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Generation Failed</p>
                  <p className="text-xs text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
