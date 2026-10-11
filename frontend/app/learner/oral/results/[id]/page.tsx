"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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

export default function OralResultsPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH ================= */

  useEffect(() => {
    const fetchData = async () => {
      try {
        let endpoint = "";

        if (type === "faculty") {
          endpoint = `${process.env.NEXT_PUBLIC_API_URL}/learner/faculty-oral/result/${id}`;
        } else {
          endpoint = `${process.env.NEXT_PUBLIC_API_URL}/oral/${id}`;
        }

        const res = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch results");

        const data = await res.json();
        setSession(data);
      } catch (error) {
        console.error("Results fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id, type]);

  if (loading) return <p className="p-8">Loading...</p>;
  if (!session) return <p className="p-8">No result found.</p>;

  /* ================= NORMALIZE QUESTIONS ================= */

  let questions: any[] = [];

  if (type === "faculty") {
    questions = session.answers.map((ans: any) => {
      const original = session.exam.questions[ans.questionIndex];

      return {
        question: original?.question || "",
        expectedAnswer: original?.expectedAnswer || "",
        userAnswer: ans.studentAnswer,
        score: ans.score || 0,
        feedback: ans.aiFeedback || "",
      };
    });
  } else {
    questions = session.questions || [];
  }

  /* ================= CALCULATIONS ================= */

  const chartData = questions.map((q: any, index: number) => ({
    name: `Q${index + 1}`,
    score: q.score || 0,
  }));

  const totalScore = questions.reduce(
    (acc: number, q: any) => acc + (q.score || 0),
    0,
  );

  const average = questions.length > 0 ? totalScore / questions.length : 0;

  const overallScore =
    questions.length > 0 ? (totalScore / (questions.length * 10)) * 100 : 0;

  const overallFeedback =
    type === "faculty" ? session.aiSummary : session.overallFeedback;

  /* ================= PDF ================= */

  const handleDownload = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Oral Exam Report", 20, 20);

    doc.setFontSize(12);
    doc.text(`Overall Score: ${overallScore.toFixed(2)}%`, 20, 30);
    doc.text(`Average Score: ${average.toFixed(2)}/10`, 20, 40);

    let y = 50;

    questions.forEach((q: any, i: number) => {
      doc.text(`Q${i + 1}: ${q.question}`, 20, y);
      y += 8;
      doc.text(`Your Answer: ${q.userAnswer || "Not answered"}`, 25, y);
      y += 8;
      doc.text(`Score: ${q.score}/10`, 25, y);
      y += 12;
    });

    doc.save("oral_exam_report.pdf");
  };

  /* ================= UI ================= */

  return (
    <div className="p-8 space-y-10 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold">Oral Exam Results</h1>

      {/* Score Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 border rounded-lg text-center">
          <h2 className="text-sm text-muted-foreground">Overall Score</h2>
          <p className="text-4xl font-bold text-primary">
            {overallScore.toFixed(2)}%
          </p>
        </div>

        <div className="p-6 border rounded-lg text-center">
          <h2 className="text-sm text-muted-foreground">Average Score</h2>
          <p className="text-4xl font-bold text-green-600">
            {average.toFixed(2)}/10
          </p>
        </div>

        <div className="p-6 border rounded-lg text-center">
          <h2 className="text-sm text-muted-foreground">Total Questions</h2>
          <p className="text-4xl font-bold">{questions.length}</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="border p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">
          Question-wise Score (Bar Chart)
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

      {/* Line Chart */}
      <div className="border p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Performance Trend</h2>
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

      {/* Overall Feedback */}
      <div className="border p-6 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Overall Feedback</h2>
        <p>{overallFeedback}</p>
      </div>

      {/* Detailed Questions */}
      {questions.map((q: any, i: number) => (
        <div key={i} className="border p-6 rounded-lg space-y-2">
          <h3 className="font-semibold">Question {i + 1}</h3>
          <p className="font-medium">{q.question}</p>

          <p>
            <strong>Your Answer:</strong> {q.userAnswer || "Not answered"}
          </p>

          <p>
            <strong>Expected:</strong> {q.expectedAnswer}
          </p>

          <p className="text-green-600 font-semibold">Score: {q.score}/10</p>

          <p className="text-sm text-muted-foreground">{q.feedback}</p>
        </div>
      ))}

      {/* Download Button */}
      <div className="text-center pt-6">
        <button
          onClick={handleDownload}
          className="px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90"
        >
          Download Report (PDF)
        </button>
      </div>
    </div>
  );
}
