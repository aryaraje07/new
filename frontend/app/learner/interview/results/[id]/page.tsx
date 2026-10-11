"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import jsPDF from "jspdf";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function InterviewResultsPage() {
  const { id } = useParams();
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH ================= */

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/interviews/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch interview result");

        const data = await res.json();
        setSession(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  if (loading) return <p className="p-8">Loading...</p>;
  if (!session) return <p className="p-8">No result found.</p>;

  /* ================= DATA ================= */

  const questions = session.questions || [];

  const chartData = questions.map((q: any, index: number) => ({
    name: `Q${index + 1}`,
    score: q.score || 0,
  }));

  const totalScore = questions.reduce(
    (acc: number, q: any) => acc + (q.score || 0),
    0
  );

  const average =
    questions.length > 0 ? totalScore / questions.length : 0;

  const overallPercentage =  questions.length > 0
    ? (average / 10) * 100
    : 0;

  const analytics = session.analytics || {};

  /* ================= PDF ================= */

  const handleDownload = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Interview Report", 20, 20);

    doc.setFontSize(12);
    doc.text(`Type: ${session.type}`, 20, 30);
    doc.text(`Subject: ${session.subject}`, 20, 38);
    doc.text(`Overall Score: ${overallPercentage.toFixed(2)}%`, 20, 46);

    let y = 60;

    questions.forEach((q: any, i: number) => {
      doc.text(`Q${i + 1}: ${q.question}`, 20, y);
      y += 8;
      doc.text(`Your Answer: ${q.userAnswer || "Not answered"}`, 25, y);
      y += 8;
      doc.text(`Score: ${q.score}/10`, 25, y);
      y += 12;
    });

    doc.save("interview_report.pdf");
  };

  /* ================= UI ================= */

  return (
    <div className="p-8 space-y-10 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold">Interview Results</h1>

      {/* SCORE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 text-center">
          <h2 className="text-sm text-muted-foreground">Overall Score</h2>
          <p className="text-4xl font-bold text-primary">
            {overallPercentage.toFixed(2)}%
          </p>
        </Card>

        <Card className="p-6 text-center">
          <h2 className="text-sm text-muted-foreground">Average</h2>
          <p className="text-4xl font-bold text-green-600">
            {average.toFixed(2)}/10
          </p>
        </Card>

        <Card className="p-6 text-center">
          <h2 className="text-sm text-muted-foreground">Questions</h2>
          <p className="text-4xl font-bold">{questions.length}</p>
        </Card>
      </div>

      {/* BAR CHART */}
      <div className="border p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">
          Question-wise Score
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="score" fill="#6366F1" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* LINE CHART */}
      <div className="border p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">
          Performance Trend
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="score" stroke="#10B981" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ANALYTICS SECTION */}
      <div className="grid md:grid-cols-2 gap-6">
        {Object.entries(analytics).map(([key, value]: any) => (
          <Card key={key} className="p-6 space-y-3">
            <h3 className="font-semibold capitalize">
              {key.replace(/([A-Z])/g, " $1")}
            </h3>

            <div className="w-full bg-border rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full"
                style={{ width: `${value}%` }}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Score: {value/10}/10
            </p>
          </Card>
        ))}
      </div>

      {/* OVERALL FEEDBACK */}
      <div className="border p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">
          Overall Feedback
        </h2>
        <p>{session.overallFeedback}</p>
      </div>

      {/* QUESTION DETAILS */}
      {questions.map((q: any, i: number) => (
        <div key={i} className="border p-6 rounded-lg space-y-2">
          <h3 className="font-semibold">Question {i + 1}</h3>
          <p className="font-medium">{q.question}</p>

          <p>
            <strong>Your Answer:</strong>{" "}
            {q.userAnswer || "Not answered"}
          </p>

          <p>
            <strong>Expected:</strong> {q.expectedAnswer}
          </p>

          <p className="text-green-600 font-semibold">
            Score: {q.score}/10
          </p>

          <p className="text-sm text-muted-foreground">
            {q.feedback}
          </p>
        </div>
      ))}

      {/* DOWNLOAD */}
      <div className="text-center pt-6">
        <Button
          onClick={handleDownload}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <Download className="w-4 h-4" />
          Download Report (PDF)
        </Button>
      </div>
    </div>
  );
}
