"use client";

import React, { useState, useEffect } from "react";
import GrievanceReview from "@/components/trainer/GrievanceReview";
import { useRouter } from "next/navigation";

export default function FacultyGrievancesPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        const userRole = localStorage.getItem("userRole");

        if (!token || userRole !== "faculty") {
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
            Grievance Review Dashboard
          </h1>
          <p className="text-gray-600">
            Review and resolve student grievances assigned to you
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow">
          <GrievanceReview />
        </div>
      </div>
    </div>
  );
}
