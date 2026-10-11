"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ReviewPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"oral" | "quiz">("oral");
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // useEffect(() => {
  //   if (activeTab !== "oral") return;

  //   const fetchExams = async () => {
  //     try {
          //       const res = await fetch(`${API_URL}/trainer/analytics/oral-exams`, {
  //         headers: {
  //           Authorization: `Bearer ${localStorage.getItem("token")}`,
  //         },
  //       });

  //       const data = await res.json();
  //       setExams(data);
  //     } catch (error) {
  //       console.error("Error fetching exams:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchExams();
  // }, [activeTab]);

  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);

      try {
        const token = localStorage.getItem("token");

        // Decide endpoint based on tab
        const endpoint =
          activeTab === "oral"
            ? `${API_URL}/trainer/analytics/oral-exams`
            : `${API_URL}/trainer/analytics/scheduled-quizzes`;

        const res = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.error("Failed to fetch exams:", res.status);
          return;
        }

        const data = await res.json();

        // Only needed for quiz endpoint (because it returns mixed types)
        let filteredData = data;

        if (activeTab !== "oral") {
          filteredData = data.filter(
            (exam: any) => exam.type !== "ORAL" && exam.examType !== "ORAL",
          );
        }

        setExams(filteredData);
      } catch (error) {
        console.error("Error fetching exams:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, [activeTab]);

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Exam Review Dashboard</h1>

      {/* Tabs */}
      <div className="flex gap-4">
        <Button
          variant={activeTab === "oral" ? "default" : "outline"}
          onClick={() => setActiveTab("oral")}
        >
          Oral Exams
        </Button>

        <Button
          variant={activeTab === "quiz" ? "default" : "outline"}
          onClick={() => setActiveTab("quiz")}
        >
          Quiz Exams
        </Button>
      </div>

      {/* Oral Exams */}
      {activeTab === "oral" && (
        <div className="space-y-4">
          {loading ? (
            <p>Loading exams...</p>
          ) : exams.length === 0 ? (
            <p>No oral exams created yet.</p>
          ) : (
            exams.map((exam) => (
              <Card
                key={exam._id}
                className="p-6 flex justify-between items-center"
              >
                <div>
                  <h3 className="font-semibold text-lg">{exam.topic}</h3>
                  <p className="text-sm text-muted-foreground">
                    Duration: {exam.duration} mins
                  </p>
                </div>

                <Button
                  onClick={() =>
                    router.push(`/trainer/review/oral/${exam._id}`)
                  }
                >
                  View Statistics
                </Button>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Quiz Placeholder */}
      {activeTab === "quiz" && (
        <div className="space-y-4">
          {loading ? (
            <p>Loading quiz exams...</p>
          ) : exams.length === 0 ? (
            <p>No quiz exams created yet.</p>
          ) : (
            exams.map((exam) => (
              <Card
                key={exam._id}
                className="p-6 flex justify-between items-center"
              >
                <div>
                  <h3 className="font-semibold text-lg">
                    {exam.title || exam.topic}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Duration: {exam.duration} mins | Questions:{" "}
                    {exam.totalQuestions}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Subject: {exam.subject} | Difficulty: {exam.difficulty}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    View detailed quiz analytics and leaderboard
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      router.push(`/trainer/review/quiz/${exam._id}`)
                    }
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <span className="flex items-center gap-2">
                      View Analytics
                    </span>
                  </Button>
                  <Button
                    onClick={() =>
                      router.push(
                        `/trainer/review/quiz/${exam._id}/students`,
                      )
                    }
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                  >
                    <span className="flex items-center gap-2">
                      Student Analysis
                    </span>
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
