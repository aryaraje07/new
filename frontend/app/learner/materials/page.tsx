"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, Download, Calendar, Sparkles } from "lucide-react";
import API from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

export default function MaterialsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [materialsData, setMaterialsData] = useState<any[]>([]);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const res = await API.get("/learner/materials");
        setMaterialsData(res.data || []);
      } catch (err) {
        console.error("Failed to load materials:", err);
      }
    };
    fetchMaterials();
  }, []);

  const [activeMaterial, setActiveMaterial] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generationStep, setGenerationStep] = useState("");

  const generateQuiz = async (material: any) => {
    setGeneratingQuiz(true);
    setGenerationStep("1/3 Preparing content");
    try {
      setGenerationStep("2/3 Qwen generating");
      const response = await API.post(
        `/learner/materials/${material._id}/generate-quiz`,
        { questionCount: 10 },
      );
      setGenerationStep("3/3 Validating questions");
      router.push(`/learner/quiz/take/${response.data.examId}`);
    } catch (error: any) {
      alert(error.response?.data?.message || "Quiz generation failed");
    } finally {
      setGeneratingQuiz(false);
      setGenerationStep("");
    }
  };

  const filteredMaterials = materialsData.filter((material) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      material.title?.toLowerCase().includes(search) ||
      material.description?.toLowerCase().includes(search) ||
      material.faculty?.fullName?.toLowerCase().includes(search);

    const matchesSubject =
      selectedSubject.trim() === "" ||
      material.description
        ?.toLowerCase()
        .includes(selectedSubject.toLowerCase());

    return matchesSearch && matchesSubject;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          {t("materials.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("materials.subtitle")}
        </p>
      </div>

      {/* Search and Filter */}
      <Card className="border border-border p-4 bg-card shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {t("materials.searchMaterials")}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("materials.searchMaterials")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 border-border text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {t("materials.subject")}
            </label>
            <div className="relative">
              <Input
                placeholder={t("materials.typeSubjectName")}
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="h-9 border-border text-xs"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Materials List */}
      {filteredMaterials.length > 0 ? (
        <Card className="border border-border shadow-xs">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              {t("materials.documents")} ({filteredMaterials.length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {filteredMaterials.map((material) => (
              <div
                key={material._id}
                className="p-4 hover:bg-secondary/40 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-foreground">
                          {material.title}
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {material.faculty?.fullName} · {material.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground ml-9">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(material.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="truncate max-w-[150px]">
                        {material.fileName}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-9 sm:ml-0">
                    <Button
                      onClick={async () => {
                        try {
                          const response = await API.get(
                            `/learner/materials/download/${material._id}`,
                            { responseType: "blob" },
                          );

                          const blob = new Blob([response.data]);
                          const url = window.URL.createObjectURL(blob);

                          const link = document.createElement("a");
                          link.href = url;
                          link.setAttribute("download", material.fileName);
                          document.body.appendChild(link);
                          link.click();

                          link.remove();
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          alert("Download failed");
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      {t("materials.download")}
                    </Button>

                    <Button
                      onClick={() => {
                        setActiveMaterial(material);
                        setSummary("");
                        const previewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(
                          material.filePath,
                        )}&embedded=true`;
                        setSelectedFile(previewUrl);
                      }}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                    >
                      {t("materials.view")}
                    </Button>

                    <Button
                      onClick={async () => {
                        try {
                          setActiveMaterial(material);
                          setSelectedFile(null);
                          setSummary("");
                          setLoading(true);
                          const res = await API.post(
                            `/ai/summarize/${material._id}`,
                          );
                          setSummary(res.data.summary);
                        } catch (err: any) {
                          console.error(
                            "Summarize error:",
                            err.response?.data || err.message,
                          );
                          alert(
                            err.response?.data?.message ||
                              "Summarization failed",
                          );
                        }
                        setLoading(false);
                      }}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                    >
                      {t("materials.summarize")}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="border border-border p-8 bg-card shadow-xs">
          <div className="text-center py-6">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
            <p className="text-xs text-muted-foreground">
              {t("materials.noMaterials")}
            </p>
          </div>
        </Card>
      )}

      {/* Viewer / Summary Section */}
      {(selectedFile || summary || loading) && (
        <Card className="border border-border shadow-xs">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {activeMaterial?.title}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  by {activeMaterial?.faculty?.fullName} •{" "}
                  {activeMaterial
                    ? new Date(activeMaterial.createdAt).toLocaleDateString()
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => activeMaterial && generateQuiz(activeMaterial)}
                  disabled={generatingQuiz}
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                >
                  <Sparkles className="w-3 h-3 mr-1 text-primary" />
                  {generatingQuiz ? generationStep : "Generate Quiz"}
                </Button>
                <Button
                  onClick={() => {
                    setSelectedFile(null);
                    setSummary("");
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  {t("common.close")}
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4">
            {loading && (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin mb-2"></div>
                <p className="text-xs text-muted-foreground">
                  {t("materials.generatingSummary")}
                </p>
              </div>
            )}

            {/* PDF Preview */}
            {selectedFile && (
              <div className="border border-border rounded-md overflow-hidden">
                <iframe
                  src={selectedFile}
                  width="100%"
                  height="500px"
                  className="border-0"
                  title="Document Preview"
                />
              </div>
            )}

            {/* AI Summary */}
            {summary && (
              <div className="bg-secondary/60 rounded-md p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-primary" />
                  </div>
                  <h3 className="text-xs font-semibold text-foreground">
                    AI Summary
                  </h3>
                </div>
                <div className="text-xs text-foreground leading-relaxed whitespace-pre-line">
                  {summary}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Results Count */}
      <div className="text-xs text-muted-foreground">
        {t("materials.showCount", {
          count: filteredMaterials.length,
          total: materialsData.length,
        })}
      </div>
    </div>
  );
}
