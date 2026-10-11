"use client";

import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import API from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Faculty {
  _id: string;
  fullName: string;
  email: string;
  department?: string;
  specialization?: string;
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

interface GrievanceData {
  _id: string;
  initialGrievance: string;
  assignedFaculty: { _id: string; fullName: string; email: string; department?: string };
  aiAnalysis: {
    isValid: boolean;
    validationReason?: string;
    followUpQuestions: string[];
    studentAnswers?: Array<{ question: string; answer: string }>;
    synthesizedMessage?: string;
  };
  status: string;
  timeline: {
    createdAt: string;
    updatedAt?: string;
    facultyReviewedAt?: string;
  };
  resolution: {
    status: string;
    timestamp?: string;
    studentVerificationRequired?: boolean;
    studentVerified?: boolean;
  };
  escalation?: { escalatedToParent: boolean };
}

interface GrievanceSubmissionProps {
  onSubmitSuccess?: () => void;
}

export default function GrievanceSubmission({
  onSubmitSuccess,
}: GrievanceSubmissionProps) {
  const [step, setStep] = useState(1);
  const [grievanceText, setGrievanceText] = useState("");
  const [assignedFaculty, setAssignedFaculty] = useState("");
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [grievanceId, setGrievanceId] = useState("");
  const [showChatInterface, setShowChatInterface] = useState(false);
  const [currentGrievance, setCurrentGrievance] = useState<GrievanceData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetchAssignedFaculty();
  }, []);

  const fetchAssignedFaculty = async () => {
    try {
      const response = await API.get("/student/assigned-faculty");
      setFacultyList(response.data.faculty);
    } catch (err) {
      console.error("Error fetching faculty:", err);
      setError("Failed to load assigned faculty. Please try again.");
    }
  };

  const handleSubmitGrievance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await API.post(
        `/grievance/submit`,
        {
          grievanceText,
          assignedFacultyId: assignedFaculty,
        }
      );

      setGrievanceId(response.data.grievanceId);
      setFollowUpQuestions(response.data.followUpQuestions);
      setStep(2);
      setSuccessMessage("Grievance submitted! Please answer the follow-up questions.");
    } catch (err) {
      const error = err as AxiosError<{ message?: string; reason?: string }>;
      setError(
        error.response?.data?.message ||
          (error.response?.data?.reason
            ? `Grievance rejected: ${error.response.data.reason}`
            : "Failed to submit grievance")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmitAnswers = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await API.post(
        `/grievance/${grievanceId}/answers`,
        { answers }
      );

      setStep(3);
      setSuccessMessage("Thank you! Your grievance has been submitted. The faculty will review it shortly.");

      if (onSubmitSuccess) {
        setTimeout(() => {
          onSubmitSuccess();
        }, 2000);
      }
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || "Failed to submit answers");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentGrievance) return;

    try {
      await API.post(
        `/grievance/${currentGrievance._id}/chat`,
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
    if (!file || !currentGrievance) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      await API.post(
        `/grievance/${currentGrievance._id}/upload`,
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
    if (!currentGrievance) return;
    
    try {
      const response = await API.get(
        `/grievance/${currentGrievance._id}/chat`
      );
      setChatMessages(response.data.chatMessages);
    } catch (err) {
      console.error("Error fetching chat messages:", err);
    }
  };

  const openChatInterface = (grievance: GrievanceData) => {
    setCurrentGrievance(grievance);
    setShowChatInterface(true);
    fetchChatMessages();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Submit a Grievance
      </h1>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        <div
          className={`flex-1 text-center pb-2 ${
            step >= 1
              ? "border-b-4 border-blue-500"
              : "border-b-2 border-gray-300"
          }`}
        >
          <p
            className={`font-semibold ${
              step >= 1 ? "text-blue-600" : "text-gray-500"
            }`}
          >
            Step 1: Grievance
          </p>
        </div>
        <div className="mx-2 text-gray-400">→</div>
        <div
          className={`flex-1 text-center pb-2 ${
            step >= 2
              ? "border-b-4 border-blue-500"
              : "border-b-2 border-gray-300"
          }`}
        >
          <p
            className={`font-semibold ${
              step >= 2 ? "text-blue-600" : "text-gray-500"
            }`}
          >
            Step 2: Follow-up
          </p>
        </div>
        <div className="mx-2 text-gray-400">→</div>
        <div
          className={`flex-1 text-center pb-2 ${
            step >= 3
              ? "border-b-4 border-blue-500"
              : "border-b-2 border-gray-300"
          }`}
        >
          <p
            className={`font-semibold ${
              step >= 3 ? "text-blue-600" : "text-gray-500"
            }`}
          >
            Step 3: Review
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
        </div>
      )}

      {/* STEP 1: INITIAL GRIEVANCE SUBMISSION */}
      {step === 1 && (
        <form onSubmit={handleSubmitGrievance} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Faculty
            </label>
            <select
              value={assignedFaculty}
              onChange={(e) => setAssignedFaculty(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">Choose a faculty member...</option>
              {facultyList.map((faculty) => (
                <option key={faculty._id} value={faculty._id}>
                  {faculty.fullName}{faculty.department ? ` - ${faculty.department}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Describe Your Grievance
            </label>
            <textarea
              value={grievanceText}
              onChange={(e) => setGrievanceText(e.target.value)}
              placeholder="For example: I am not satisfied with today's test marks..."
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none h-32"
            />
            <p className="text-xs text-gray-500 mt-2">
              Be specific and clear about your concern
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Submitting..." : "Submit Grievance"}
          </button>
        </form>
      )}

      {/* STEP 2: FOLLOW-UP QUESTIONS */}
      {step === 2 && followUpQuestions.length > 0 && (
        <form onSubmit={handleSubmitAnswers} className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-blue-800">
              AI has validated your grievance. Please answer these follow-up
              questions to help us better understand your concern:
            </p>
          </div>

          {followUpQuestions.map((question, index) => (
            <div key={index}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Question {index + 1}: {question}
              </label>
              <textarea
                value={answers[index]}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                placeholder="Your answer..."
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none h-24"
              />
            </div>
          ))}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 bg-gray-300 text-gray-800 font-semibold py-2 rounded-lg hover:bg-gray-400"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Processing..." : "Process & Submit"}
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: SUCCESS */}
      {step === 3 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">
            Grievance Submitted Successfully!
          </h2>
          <p className="text-gray-600 mb-6">
            Your grievance has been sent to the faculty member and will be reviewed shortly.
          </p>
          <button
            onClick={() => {
              setStep(1);
              setGrievanceId("");
              setFollowUpQuestions([]);
              setGrievanceText("");
              setAnswers(["", "", ""]);
              setSuccessMessage("");
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Submit Another Grievance
          </button>
        </div>
      )}

      {/* CHAT INTERFACE POPUP */}
      {showChatInterface && currentGrievance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Chat with {currentGrievance.assignedFaculty?.fullName || 'Faculty'}
              </h3>
              <button
                onClick={() => setShowChatInterface(false)}
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
                  <p className="text-sm font-semibold text-gray-800">
                    {msg.sender}
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
    </div>
  );
}
