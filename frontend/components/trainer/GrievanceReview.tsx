"use client";

import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import API from "@/lib/api";
import { io, Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Grievance {
  _id: string;
  student: { _id: string; fullName: string; email: string; phone: string };
  assignedFaculty: { _id: string; fullName: string; department?: string };
  initialGrievance: string;
  aiAnalysis?: { synthesizedMessage?: string };
  status: string;
  escalation?: { escalatedToParent: boolean };
  timeline?: { createdAt: string; updatedAt?: string; facultyReviewedAt?: string };
  resolution?: {
    status: string;
    timestamp?: string;
    studentVerificationRequired?: boolean;
    studentVerified?: boolean;
  };
}

interface ChatMessage {
  _id: string;
  message: string;
  sender: { fullName: string } | string;
  senderRole: string;
  attachments?: Array<{ fileName: string; fileUrl: string }>;
  createdAt: string;
}

export default function FacultyGrievanceReview() {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);

  // Initialize socket connection on mount
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user._id) {
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
        query: {
          userId: user._id,
          userRole: 'faculty'
        }
      });
      
      // Listen for student messages
      socket.on('student_message', (data: any) => {
        if (selectedGrievance && data.grievanceId === selectedGrievance._id) {
          fetchChatMessages(selectedGrievance._id);
        }
      });

      // Listen for student resolution confirmation
      socket.on('student_resolution_confirmation', (data: any) => {
        if (selectedGrievance && data.grievanceId === selectedGrievance._id) {
          alert(data.message);
          fetchGrievances();
        }
      });

      return () => {
        socket.off('student_message');
        socket.off('student_resolution_confirmation');
        socket.disconnect();
      };
    }
  }, [selectedGrievance]);

  // Fetch grievances on mount
  useEffect(() => {
    fetchGrievances();
  }, []);

  // Fetch chat messages when selected grievance changes
  useEffect(() => {
    if (selectedGrievance?._id) {
      fetchChatMessages(selectedGrievance._id);
    }
  }, [selectedGrievance?._id]);

  const fetchGrievances = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔄 Fetching faculty grievances...");
      const response = await API.get("/grievance/faculty/list");
      console.log("✅ Grievances fetched:", response.data);
      setGrievances(response.data.grievances || []);
    } catch (err: any) {
      console.error("❌ Error fetching grievances:", err);
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to load grievances";
      setError(errorMsg);
      setGrievances([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatMessages = async (grievanceId: string) => {
    try {
      const response = await API.get(
        `/grievance/${grievanceId}/chat`
      );
      setChatMessages(response.data.chatMessages);
    } catch (err) {
      console.error("Error fetching chat messages:", err);
    }
  };

  const handleSelectGrievance = (grievance: Grievance) => {
    setSelectedGrievance(grievance);
    fetchChatMessages(grievance._id);
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!chatMessage.trim() || !selectedGrievance) return;

    try {
      await API.post(
        `/grievance/${selectedGrievance._id}/faculty-message`,
        { message: chatMessage }
      );

      setChatMessage("");
      if (selectedGrievance?._id) fetchChatMessages(selectedGrievance._id);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleMarkSolved = async () => {
    try {
      await API.post(
        `/grievance/${selectedGrievance?._id}/mark-solved`,
        {}
      );

      alert("Grievance marked for verification. Student will verify resolution.");
      fetchGrievances();
      if (selectedGrievance?._id) fetchChatMessages(selectedGrievance._id);
    } catch (err) {
      console.error("Error marking grievance solved:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGrievance) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      await API.post(
        `/grievance/${selectedGrievance?._id}/upload-resolution`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert("File uploaded successfully!");
      setShowFileUpload(false);
      if (selectedGrievance?._id) fetchChatMessages(selectedGrievance._id);
    } catch (err) {
      console.error("Error uploading file:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "RESOLVED":
        return "bg-green-100 text-green-800";
      case "ESCALATED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEscalationWarning = (grievance: Grievance) => {
    if (!grievance.timeline?.createdAt) return null;
    
    const now = new Date();
    const created = new Date(grievance.timeline.createdAt);
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff >= 48) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 p-2 rounded text-sm">
          ⚠️ Escalated to Parent - 48+ hours pending
        </div>
      );
    } else if (hoursDiff >= 24) {
      return (
        <div className="bg-orange-100 border border-orange-400 text-orange-700 p-2 rounded text-sm">
          ⚠️ 24+ hours pending - Follow up required
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600">Loading grievances...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Grievance Review</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRIEVANCES LIST */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Assigned Grievances
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700">⚠️ {error}</p>
            </div>
          )}

          {!error && grievances.length === 0 && (
            <p className="text-gray-500">No grievances assigned</p>
          )}

          {!error && grievances.length > 0 && (
            <div className="space-y-2">
              {grievances.map((grievance) => (
                <div
                  key={grievance._id}
                  onClick={() => handleSelectGrievance(grievance)}
                  className={`p-3 border rounded-lg cursor-pointer transition ${
                    selectedGrievance?._id === grievance._id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-blue-400"
                  }`}
                >
                  <p className="font-semibold text-sm text-gray-800">
                    {grievance.student.fullName}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {grievance.initialGrievance.substring(0, 40)}...
                  </p>
                  <span
                    className={`inline-block mt-2 px-2 py-1 text-xs font-semibold rounded ${getStatusColor(
                      grievance.status
                    )}`}
                  >
                    {grievance.status}
                  </span>
                  {getEscalationWarning(grievance)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GRIEVANCE DETAILS */}
        {selectedGrievance && (
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedGrievance.student.fullName}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Email: {selectedGrievance.student.email}
                  </p>
                  <p className="text-gray-600 text-sm">
                    Phone: {selectedGrievance.student.phone}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 text-sm font-semibold rounded ${getStatusColor(
                      selectedGrievance.status
                    )}`}
                  >
                    {selectedGrievance.status}
                  </span>
                  {selectedGrievance.timeline?.createdAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Created: {new Date(selectedGrievance.timeline.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              
              {getEscalationWarning(selectedGrievance)}
              
              {selectedGrievance.resolution?.studentVerificationRequired && (
                <div className="bg-blue-100 border border-blue-400 text-blue-700 p-3 rounded mb-4">
                  <p className="text-sm font-semibold">
                    ⏳ Waiting for student verification
                  </p>
                  <p className="text-xs mt-1">
                    Student needs to verify if the grievance has been resolved to their satisfaction.
                  </p>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-600 font-semibold mb-2">
                  Student's Grievance (Processed by AI):
                </p>
                <p className="text-gray-800">
                  {selectedGrievance.aiAnalysis?.synthesizedMessage ||
                    selectedGrievance.initialGrievance}
                </p>
              </div>
            </div>

            {/* CHAT */}
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Chat
              </h3>

              <div className="bg-gray-100 p-4 rounded-lg h-64 overflow-y-auto mb-4 space-y-3">
                {chatMessages.length === 0 ? (
                  <p className="text-sm text-gray-600">No messages yet</p>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`p-3 rounded-lg ${
                        msg.senderRole === "faculty"
                          ? "bg-blue-100 ml-auto max-w-xs"
                          : "bg-gray-200 max-w-xs"
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-800">
                        {typeof msg.sender === "object" ? msg.sender.fullName : msg.sender}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">
                        {msg.message}
                      </p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2">
                          {msg.attachments.map((att, idx) => (
                            <a
                              key={idx}
                              href={att.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 text-xs hover:underline block"
                            >
                              📎 {att.fileName}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* MESSAGE INPUT */}
              <form onSubmit={handleSendMessage} className="space-y-3">
                <textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Send a message to student..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none h-20"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFileUpload(!showFileUpload)}
                    className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-semibold"
                  >
                    📎 Upload File
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Send Message
                  </button>
                </div>
              </form>

              {showFileUpload && (
                <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500"
                  />
                </div>
              )}

              {/* MARK SOLVED BUTTON */}
              <button
                onClick={handleMarkSolved}
                disabled={selectedGrievance.status === "RESOLVED"}
                className="w-full mt-4 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:bg-gray-400"
              >
                ✓ Mark Grievance as Solved
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
