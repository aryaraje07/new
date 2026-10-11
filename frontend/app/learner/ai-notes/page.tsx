"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BookOpen, Brain, Lightbulb, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import FlowchartVisualization from "@/components/visualizations/FlowchartVisualization";
import DiagramVisualization from "@/components/visualizations/DiagramVisualization";
import MindMapVisualization from "@/components/visualizations/MindMapVisualization";

interface AINote {
  title: string;
  overview: string;
  sections: {
    heading: string;
    content: string;
    visuals: {
      type: "flowchart" | "diagram" | "mindmap" | "table";
      title: string;
      description: string;
      data: any;
    }[];
    examples: string[];
  }[];
  summary: string;
}

export default function AINotesPage() {
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<AINote | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);

  const generateNotes = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login to access AI Notes");
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/generate-notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic, description }),
      });

      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Received HTML instead of JSON:", text.substring(0, 200));
        toast.error("Server error. Please try again later.");
        return;
      }

      const data = await response.json();
      if (response.ok) {
        console.log('Raw data received:', data);
        console.log('Generated notes:', data.notes);
        console.log('Notes structure:', JSON.stringify(data.notes, null, 2));
        
        // Check if notes has the expected structure
        if (data.notes && typeof data.notes === 'object') {
          console.log('Notes title:', data.notes.title);
          console.log('Notes sections count:', data.notes.sections?.length);
          console.log('First section:', data.notes.sections?.[0]);
        }
        
        setNotes(data.notes);
        setNoteId(data.noteId || null);
        toast.success(data.saved ? "AI Notes generated and saved!" : "AI Notes generated successfully!");
      } else {
        toast.error(data.message || "Failed to generate notes");
      }
    } catch (error) {
      console.error("Error generating notes:", error);
      toast.error("Failed to generate notes. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!noteId) {
      toast.error("No note ID available for download");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/download/${noteId}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${notes?.title?.replace(/[^a-z0-9]/gi, '_') || 'ai-notes'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("PDF downloaded successfully!");
      } else {
        toast.error("Failed to download PDF");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download PDF");
    }
  };

  const renderVisual = (visual: any, index: number) => {
    // Debug logging
    console.log('Rendering visual:', visual.type, visual.data);
    
    // Normalize visual type to handle case variations
    const visualType = (visual.type || '').toLowerCase().trim();
    
    // Check if data looks like table data (array of objects with same keys)
    const isTableData = visual.data && 
      Array.isArray(visual.data) && 
      visual.data.length > 0 && 
      typeof visual.data[0] === 'object' &&
      !Array.isArray(visual.data[0]);
    
    // If data looks like a table, ALWAYS render it as a table regardless of type
    if (isTableData) {
      return (
        <Card key={index} className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {visual.title}
            </CardTitle>
            <CardDescription>{visual.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(visual.data[0]).map((key, headerIndex) => (
                      <th key={headerIndex} className="px-4 py-2 text-left text-sm font-medium text-gray-900">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visual.data.map((row: any, rowIndex: number) => (
                    <tr key={rowIndex} className="border-t hover:bg-gray-50">
                      {Object.values(row).map((value: any, colIndex: number) => (
                        <td key={colIndex} className="px-4 py-2 text-sm text-gray-700">
                          {typeof value === 'string' && value.length > 200 
                            ? `${value.substring(0, 200)}...` 
                            : value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    // For non-table data, try to render appropriate visualizations
    switch (visualType) {
      case "flowchart":
        return (
          <Card key={index} className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                {visual.title}
              </CardTitle>
              <CardDescription>{visual.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <FlowchartVisualization 
                data={visual.data} 
                title={visual.title} 
                description={visual.description} 
              />
            </CardContent>
          </Card>
        );
      case "diagram":
        return (
          <Card key={index} className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                {visual.title}
              </CardTitle>
              <CardDescription>{visual.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <DiagramVisualization 
                data={visual.data} 
                title={visual.title} 
                description={visual.description} 
              />
            </CardContent>
          </Card>
        );
      case "mindmap":
      case "mind-map":
        return (
          <Card key={index} className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {visual.title}
              </CardTitle>
              <CardDescription>{visual.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <MindMapVisualization 
                data={visual.data} 
                title={visual.title} 
                description={visual.description} 
              />
            </CardContent>
          </Card>
        );
      default:
        // For any other type, try to render as formatted content
        return (
          <Card key={index} className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {visual.title || "Visual Content"}
              </CardTitle>
              <CardDescription>{visual.description || "AI-generated visual content"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {visual.data && typeof visual.data === 'object' && !Array.isArray(visual.data) ? (
                  // Render object as key-value pairs
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(visual.data).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 p-3 rounded-lg">
                        <h4 className="font-semibold text-sm text-gray-900">{key}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {typeof value === 'string' ? value : JSON.stringify(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : visual.data && Array.isArray(visual.data) ? (
                  // Render array as a list
                  <div className="space-y-2">
                    {visual.data.map((item: any, itemIndex: number) => (
                      <div key={itemIndex} className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-700">
                          {typeof item === 'string' ? item : JSON.stringify(item)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : visual.data ? (
                  // Render primitive data
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">{String(visual.data)}</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 p-4">
                    <p>No visual data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Brain className="w-8 h-8 text-blue-600" />
          AI Notes Generator
        </h1>
        <p className="text-gray-600">
          Generate comprehensive, visually-rich notes with flowcharts, diagrams, and examples
        </p>
      </div>

      {!notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Create AI Notes</CardTitle>
            <CardDescription>
              Enter a topic and optionally provide additional context for more tailored notes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Topic *</label>
              <Input
                placeholder="e.g., Machine Learning, React Hooks, Database Design"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Additional Context (Optional)</label>
              <Textarea
                placeholder="Provide any specific areas you'd like to focus on, your current understanding level, or particular examples you'd like included..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full"
              />
            </div>
            <Button 
              onClick={generateNotes} 
              disabled={loading || !topic.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating AI Notes...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Generate AI Notes
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{notes.title}</h2>
              <p className="text-gray-600 mt-1">{notes.overview}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={downloadPDF} variant="outline" size="sm" disabled={!noteId}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button onClick={() => {
                setNotes(null);
                setNoteId(null);
              }} variant="outline" size="sm">
                Generate New
              </Button>
            </div>
          </div>

          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="content">Content & Visuals</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-6">
              {notes.sections && notes.sections.length > 0 ? (
                notes.sections.map((section, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle>{section.heading || 'Section'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                    {/* Render formatted content */}
                    <div className="prose max-w-none">
                      {section.content ? (
                        section.content.split('\n').map((paragraph, pIndex) => {
                          const trimmed = paragraph.trim();
                          if (!trimmed) return null;
                        
                        // Handle bullet points
                        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
                          return (
                            <li key={pIndex} className="ml-4 mb-2">
                              {trimmed.substring(2)}
                            </li>
                          );
                        }
                        
                        // Handle numbered lists
                        if (/^\d+\.\s/.test(trimmed)) {
                          return (
                            <li key={pIndex} className="ml-4 mb-2 list-decimal">
                              {trimmed.replace(/^\d+\.\s/, '')}
                            </li>
                          );
                        }
                        
                        // Handle headers
                        if (trimmed.startsWith('#')) {
                          const level = trimmed.match(/^#+/)?.[0].length || 1;
                          const Tag = `h${Math.min(level + 1, 6)}` as keyof React.JSX.IntrinsicElements;
                          return (
                            <Tag key={pIndex} className="font-bold mt-4 mb-2">
                              {trimmed.replace(/^#+\s/, '')}
                            </Tag>
                          );
                        }
                        
                        // Regular paragraph
                        return (
                          <p key={pIndex} className="mb-4 leading-relaxed">
                            {trimmed}
                          </p>
                        );
                      })
                      ) : (
                        <p className="text-gray-500 italic">No content available for this section.</p>
                      )}
                    </div>
                    
                    {/* Render visuals inline with content */}
                    {section.visuals && section.visuals.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-4 text-lg">Visual Aids</h4>
                        <div className="space-y-6">
                          {section.visuals.map((visual, visualIndex) => renderVisual(visual, visualIndex))}
                        </div>
                      </div>
                    )}
                    
                    {/* Render examples */}
                    {section.examples && section.examples.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Examples:</h4>
                        <div className="space-y-3">
                          {section.examples.map((example, exampleIndex) => (
                            <div key={exampleIndex} className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                              <p className="text-sm">{example}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-center text-gray-500">No sections available in the generated notes.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <CardTitle>Key Takeaways</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    {notes.summary ? (
                      notes.summary.split('\n').map((paragraph, pIndex) => {
                      const trimmed = paragraph.trim();
                      if (!trimmed) return null;
                      
                      // Handle bullet points in summary
                      if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
                        return (
                          <li key={pIndex} className="ml-4 mb-2">
                            {trimmed.substring(2)}
                          </li>
                        );
                      }
                      
                      return (
                        <p key={pIndex} className="mb-4 leading-relaxed">
                          {trimmed}
                        </p>
                      );
                    })
                    ) : (
                      <p className="text-gray-500 italic">No summary available.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}