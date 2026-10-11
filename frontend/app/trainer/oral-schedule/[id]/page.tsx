"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";

export default function ViewFacultyOralPage() {
  const { id } = useParams();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [exam, setExam] = useState<any>(null);

  useEffect(() => {
    const fetchExam = async () => {
      const res = await fetch(`${API}/trainer/oral/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await res.json();
      setExam(data);
    };

    if (id) fetchExam();
  }, [id]);

  if (!exam) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">{exam.topic}</h1>

      <p>
        {new Date(exam.date).toLocaleDateString()} • {exam.time} • {exam.duration} mins
      </p>

      {exam.questions.map((q: any, i: number) => (
        <Card key={i} className="p-6 space-y-2">
          <p><strong>Q{i + 1}:</strong> {q.question}</p>
          <p><strong>Answer:</strong> {q.expectedAnswer}</p>
        </Card>
      ))}
    </div>
  );
}
