"use client";

import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import API from "@/lib/api";
import { io, Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface AIAnalysis {
  isValid: boolean;
  validationReason?: string;
  followUpQuestions: string[];
  studentAnswers?: Array<{ question: string; answer: string }>;
  synthesizedMessage?: string;
}

interface Timeline {
  createdAt: string;
  updatedAt?: string;
  facultyReviewedAt?: string;
}

interface Resolution {
  status: string;
  timestamp?: string;
  studentVerificationRequired?: boolean;
  studentVerified?: boolean;
}

interface Grievance {
  _id: string;
  student: { fullName: string; email: string };
  assignedFaculty: { _id: string; fullName: string; email: string; department?: string };
  initialGrievance: string;
  aiAnalysis: AIAnalysis;
  status: string;
  timeline: Timeline;
  resolution: Resolution;
  escalation?: { escalatedToParent: boolean };
}

interface ChatMessage {
  _id: string;
  message: string;
  sender: string;
  senderRole: string;
  grievanceId: string;
  attachments?: Array<{ fileName: string; fileUrl: string }>;
  createdAt: string;
}

export default function StudentGrievanceList() {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [verificationGrievanceId, setVerificationGrievanceId] = useState("");
  const [showChatPopup, setShowChatPopup] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showResolutionPopup, setShowResolutionPopup] = useState(false);
  const [resolutionGrievanceId, setResolutionGrievanceId] = useState("");

  // Initialize socket connection and fetch grievances on mount
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user._id) {
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
        query: {
          userId: user._id,
          userRole: 'student'
        }
      });
      
      // Listen for resolution verification events
      socket.on('grievance_solved_verification', (event: any) => {
        if (event.requiresAction) {
          setResolutionGrievanceId(event.grievanceId);
          setShowResolutionPopup(true);
        }
      });

      // Listen for faculty messages
      socket.on('faculty_message', (data: any) => {
        if (selectedGrievance && data.grievanceId === selectedGrievance._id) {
          fetchChatMessages();
        }
      });

      return () => {
        socket.off('grievance_solved_verification');
        socket.off('faculty_message');
        socket.disconnect();
      };
    }
  }, []);

  // Fetch grievances on mount
  useEffect(() => {
    fetchGrievances();
  }, []);

  // Fetch chat messages when selected grievance changes
  useEffect(() => {
    if (selectedGrievance) {
      fetchChatMessages();
    }
  }, [selectedGrievance]);

  const fetchGrievances = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("🔄 Fetching grievances...");
      const response = await API.get("/grievance/student/list");
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

  const fetchGrievanceDetails = async (grievanceId: string) => {
    try {
      const response = await API.get(
        `/grievance/${grievanceId}/details`
      );
      setSelectedGrievance(response.data.grievance);
    } catch (err) {
      console.error("Error fetching grievance details:", err);
    }
  };

  const handleVerifyResolution = async (resolved: boolean) => {
    try {
      await API.post(
        `/grievance/${verificationGrievanceId}/verification`,
        { resolved }
      );

      setShowVerificationPopup(false);
      fetchGrievances();
      if (selectedGrievance?._id === verificationGrievanceId) {
        fetchGrievanceDetails(verificationGrievanceId);
      }

      alert(
        resolved
          ? "Grievance marked as resolved!"
          : "Grievance still marked as pending"
      );
    } catch (err) {
      console.error("Error verifying resolution:", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGrievance) return;

    try {
      await API.post(
        `/grievance/${selectedGrievance._id}/chat`,
        { message: newMessage }
      );

      setNewMessage("");
      fetchChatMessages();
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGrievance) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      await API.post(
        `/grievance/${selectedGrievance._id}/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      alert("File uploaded successfully!");
      fetchChatMessages();
    } catch (err) {
      console.error("Error uploading file:", err);
    } finally {
      setUploadingFile(false);
    }
  };

  const fetchChatMessages = async () => {
    if (!selectedGrievance) return;
    
    try {
      const response = await API.get(
        `/grievance/${selectedGrievance._id}/chat`
      );
      setChatMessages(response.data.chatMessages);
    } catch (err) {
      console.error("Error fetching chat messages:", err);
    }
  };

  const openChatPopup = (grievance: Grievance) => {
    setSelectedGrievance(grievance);
    setShowChatPopup(true);
    fetchChatMessages();
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800";
      case "RESOLVED":
        return "bg-green-100 text-green-800";
      case "CLOSED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading grievances...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">My Grievances</h1>

      {/* VERIFICATION POPUP */}
      {showVerificationPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Has Your Grievance Been Resolved?
            </h2>
            <p className="text-gray-600 mb-6">
              Faculty has marked your grievance as solved. Please verify if
              issue has been resolved to your satisfaction.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleVerifyResolution(false)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
              >
                Still Pending
              </button>
              <button
                onClick={() => handleVerifyResolution(true)}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
              >
                Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRIEVANCES LIST */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Grievance List</h2>
          
          {loading && (
            <p className="text-center text-gray-500 py-8">Loading grievances...</p>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700">⚠️ {error}</p>
            </div>
          )}
          
          {!loading && grievances.length === 0 && !error && (
            <p className="text-gray-500">No grievances submitted yet</p>
          )}
          
          {!loading && grievances.length > 0 && (
            <div className="space-y-2">
              {grievances.map((grievance) => (
                <div
                  key={grievance._id}
                  onClick={() => {
                    setSelectedGrievance(grievance);
                    fetchGrievanceDetails(grievance._id);
                  }}
                  className={`p-3 border rounded-lg cursor-pointer transition ${
                    selectedGrievance?._id === grievance._id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 hover:border-blue-400"
                  }`}
                >
                  <p className="font-semibold text-sm text-gray-800">
                    {grievance?.initialGrievance?.substring(0, 50)}...
                  </p>
                  <span
                    className={`inline-block mt-2 px-2 py-1 text-xs font-semibold rounded ${getStatusBadgeColor(
                      grievance?.status || 'PENDING'
                    )}`}
                  >
                    {grievance?.status || 'PENDING'}
                  </span>
                  <p className="text-xs text-gray-500 mt-2">
                    {grievance?.timeline?.createdAt 
                      ? new Date(grievance.timeline.createdAt).toLocaleDateString()
                      : 'Unknown date'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GRIEVANCE DETAILS */}
        {selectedGrievance && (
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Grievance Details</h2>
              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Faculty:</p>
                  <p className="font-semibold text-gray-800">
                    {selectedGrievance?.assignedFaculty?.fullName || 'Loading...'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status:</p>
                  <span
                    className={`inline-block px-3 py-1 text-sm font-semibold rounded ${getStatusBadgeColor(
                      selectedGrievance?.status || 'PENDING'
                    )}`}
                  >
                    {selectedGrievance?.status || 'PENDING'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Submitted:</p>
                  <p className="text-gray-800">
                    {selectedGrievance?.timeline?.createdAt 
                      ? new Date(selectedGrievance.timeline.createdAt).toLocaleString()
                      : 'Unknown date'}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Grievance:</p>
                <p className="text-gray-800">
                  {selectedGrievance?.initialGrievance || 'No grievance text'}
                </p>
              </div>
              {selectedGrievance?.aiAnalysis?.synthesizedMessage && (
                <div className="bg-blue-50 p-4 rounded-lg mt-4">
                  <p className="text-sm text-blue-600 font-semibold mb-2">Processed Message to Faculty:</p>
                  <p className="text-gray-800">
                    {selectedGrievance.aiAnalysis.synthesizedMessage}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Communication</h3>
              <button
                onClick={() => openChatPopup(selectedGrievance)}
                className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                💬 Open Chat with Faculty
              </button>
              <div className="bg-gray-100 p-4 rounded-lg h-96 overflow-y-auto mb-4">
                <p className="text-sm text-gray-600">
                  Click "Open Chat" to communicate with faculty about this grievance
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CHAT POPUP */}
      {showChatPopup && selectedGrievance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Chat with {selectedGrievance?.assignedFaculty?.fullName || 'Faculty'}
              </h3>
              <button
                onClick={() => setShowChatPopup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg) => (
                <div
                  key={msg._id}
                  className={`p-3 rounded-lg ${
                    msg.senderRole === "student"
                      ? "bg-blue-100 ml-auto max-w-xs"
                      : "bg-gray-200 max-w-xs"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-800">{msg.sender}</p>
                  <p className="text-sm text-gray-700 mt-1">{msg.message}</p>
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
              ))}
            </div>
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="text-sm"
                  />
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* RESOLUTION CONFIRMATION POPUP */}
      {showResolutionPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Grievance Resolution Confirmation
            </h2>
            <p className="text-gray-700 mb-6">
              Faculty has marked your grievance as resolved. Please verify if it has been resolved to your satisfaction.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={async () => {
                  try {
                    await API.post(`/grievance/${resolutionGrievanceId}/verification`, {
                      resolved: true
                    });
                    setShowResolutionPopup(false);
                    setResolutionGrievanceId("");
                    alert("Grievance confirmed as resolved!");
                    fetchGrievances();
                  } catch (err) {
                    console.error("Error confirming resolution:", err);
                    alert("Failed to confirm resolution");
                  }
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Yes, Resolved
              </button>
              <button
                onClick={async () => {
                  try {
                    await API.post(`/grievance/${resolutionGrievanceId}/verification`, {
                      resolved: false
                    });
                    setShowResolutionPopup(false);
                    setResolutionGrievanceId("");
                    alert("Grievance marked as not resolved");
                    fetchGrievances();
                  } catch (err) {
                    console.error("Error rejecting resolution:", err);
                    alert("Failed to reject resolution");
                  }
                }}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                No, Not Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
