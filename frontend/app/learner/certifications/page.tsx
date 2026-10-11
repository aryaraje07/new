"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, Bookmark, Trash } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function CertificationsPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [savedCourses, setSavedCourses] = useState<any[]>([]);
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [savedFilter, setSavedFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // ================= TOKEN LOAD =================
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) setToken(storedToken);
  }, []);

  // ================= SEARCH WEB =================
  const searchWebCourses = async () => {
    if (!searchKeyword || !token) return;

    setLoading(true);

    const res = await fetch(
      `${API_URL}/courses/search?keyword=${searchKeyword}&type=web`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await res.json();
    setResults(data);
    setLoading(false);
  };

  // ================= SEARCH YOUTUBE =================
  const searchYouTubeVideos = async () => {
    if (!searchKeyword || !token) return;

    setLoading(true);

    const res = await fetch(
      `${API_URL}/courses/search?keyword=${searchKeyword}&type=youtube`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await res.json();
    setResults(data);
    setLoading(false);
  };

  // ================= SAVE =================
  const handleSaveCourse = async (course: any) => {
    if (!token) return;

    const res = await fetch(`${API_URL}/courses/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(course),
    });

    const data = await res.json();

    if (!savedCourses.find((c) => c._id === data._id)) {
      setSavedCourses((prev) => [...prev, data]);
    }
  };

  // ================= DELETE =================
  const handleDeleteCourse = async (id: string) => {
    if (!token) return;

    await fetch(`${API_URL}/courses/delete/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    setSavedCourses((prev) =>
      prev.filter((c) => c._id !== id)
    );
  };

  // ================= LOAD SAVED =================
  useEffect(() => {
    if (!token) return;

    const fetchSaved = async () => {
      const res = await fetch(`${API_URL}/courses/saved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSavedCourses(data);
    };

    fetchSaved();
  }, [token]);

  // ================= FILTERS =================

  const filteredResults =
    difficultyFilter === "All"
      ? results
      : results.filter(
          (r) => r.difficulty === difficultyFilter
        );

  const filteredSaved =
    savedFilter === "All"
      ? savedCourses
      : savedCourses.filter((c) =>
          savedFilter === "Videos"
            ? c.type === "youtube"
            : c.type === "web"
        );

  return (
    <div className="p-8 space-y-16">

      {/* ================= SEARCH SECTION ================= */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold">
          Search Learning Resources
        </h2>

        <div className="flex flex-wrap gap-4 items-center">
          <Input
            className="flex-1 min-w-[250px] border border-gray-400 focus:border-blue-500"
            placeholder="Machine Learning..."
            value={searchKeyword}
            onChange={(e) =>
              setSearchKeyword(e.target.value)
            }
          />

          <Select
            value={difficultyFilter}
            onValueChange={setDifficultyFilter}
          >
            <SelectTrigger className="w-[140px] border border-gray-400">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Easy">Easy</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Hard">Hard</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={searchWebCourses}>
            Search Courses
          </Button>

          <Button
            onClick={searchYouTubeVideos}
          >
            Search Videos
          </Button>
        </div>

        {loading && <p>Loading...</p>}

        <div className="grid md:grid-cols-3 gap-6">
          {filteredResults.map((item, index) => (
            <Card key={index} className="p-6 space-y-4">

              {item.thumbnail && (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="rounded-md w-full h-40 object-cover"
                />
              )}

              <div className="flex justify-between">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    item.platform === "YouTube"
                      ? "bg-red-200 text-red-700"
                      : "bg-gray-200"
                  }`}
                >
                  {item.platform}
                </span>

                <span
                  className={`text-xs px-2 py-1 rounded ${
                    item.difficulty === "Easy"
                      ? "bg-green-200"
                      : item.difficulty === "Hard"
                      ? "bg-red-200"
                      : "bg-yellow-200"
                  }`}
                >
                  {item.difficulty}
                </span>
              </div>

              <h3 className="font-semibold">
                {item.title}
              </h3>

              <p className="text-sm text-muted-foreground">
                {item.snippet}
              </p>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() =>
                    window.open(item.link, "_blank")
                  }
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open
                </Button>

                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    handleSaveCourse(item)
                  }
                >
                  <Bookmark className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ================= SAVED SECTION ================= */}
      <section className="space-y-6 border-t pt-12">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            Saved Resources ({savedCourses.length})
          </h2>

          <Select
            value={savedFilter}
            onValueChange={setSavedFilter}
          >
            <SelectTrigger className="w-[160px] border border-gray-400">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Courses">Courses</SelectItem>
              <SelectItem value="Videos">Videos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {filteredSaved.map((course) => (
            <Card key={course._id} className="p-6 space-y-4">

              {course.thumbnail && (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="rounded-md w-full h-40 object-cover"
                />
              )}

              <div className="flex justify-between">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    course.platform === "YouTube"
                      ? "bg-red-200 text-red-700"
                      : "bg-gray-200"
                  }`}
                >
                  {course.platform}
                </span>

                {course.difficulty && (
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      course.difficulty === "Easy"
                        ? "bg-green-200"
                        : course.difficulty === "Hard"
                        ? "bg-red-200"
                        : "bg-yellow-200"
                    }`}
                  >
                    {course.difficulty}
                  </span>
                )}
              </div>

              <h3 className="font-semibold">
                {course.title}
              </h3>

              <p className="text-sm text-muted-foreground">
                {course.snippet}
              </p>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() =>
                    window.open(course.link, "_blank")
                  }
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open
                </Button>

                <Button
                  variant="outline"
                  className="flex-1 text-red-600"
                  onClick={() =>
                    handleDeleteCourse(course._id)
                  }
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
