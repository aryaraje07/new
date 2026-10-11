"use client";

import React, { useState, useEffect } from "react";
import GrievanceSubmission from "@/components/learner/GrievanceSubmission";
import GrievanceList from "@/components/learner/GrievanceList";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function StudentGrievancesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"submit" | "list">("submit");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        const userRole = localStorage.getItem("userRole");

        if (!token || userRole !== "student") {
          router.push("/login");
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error("Authentication check failed:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Grievance Management
          </h1>
          <p className="text-gray-600">
            Submit academic grievances and track their resolution status
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("submit")}
            className={`px-6 py-3 font-medium text-lg transition-colors ${
              activeTab === "submit"
                ? "text-blue-600 border-b-2 border-blue-600 -mb-0.5"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Submit Grievance
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`px-6 py-3 font-medium text-lg transition-colors ${
              activeTab === "list"
                ? "text-blue-600 border-b-2 border-blue-600 -mb-0.5"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            My Grievances
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === "submit" ? (
            <GrievanceSubmission onSubmitSuccess={() => setActiveTab("list")} />
          ) : (
            <GrievanceList />
          )}
        </div>
      </div>
    </div>
  );
}
