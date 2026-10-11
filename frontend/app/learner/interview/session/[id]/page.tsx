"use client";
import AIInterviewer from "@/components/AIInterviewer";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic2, Square, Send, Volume2 } from "lucide-react";

export default function InterviewSessionPage() {
  const router = useRouter();
  const { id } = useParams();

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [session, setSession] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);

  const [warningCount, setWarningCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState("");
  const [allowFullscreenExit, setAllowFullscreenExit] = useState(false);

  /* ================= FETCH SESSION ================= */

  useEffect(() => {
    if (!id) return;

    const fetchSession = async () => {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/interviews/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      setSession(data);
      setTimeRemaining(data.duration * 60);
    };

    fetchSession();
  }, [id]);

//   useEffect(() => {
//   const fakeSession = {
//     totalQuestions: 3,
//     duration: 5,
//     questions: [
//       { question: "Tell me about yourself." },
//       { question: "What are your strengths?" },
//       { question: "Why should we hire you?" },
//     ],
//   };

//   setSession(fakeSession);
//   setTimeRemaining(fakeSession.duration * 60);
// }, []);


  /* ================= TIMER ================= */

  useEffect(() => {
    if (timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmitInterview();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  /* ================= VIOLATION HANDLER ================= */
  const triggerViolation = (reason: string) => {
    setWarningCount((prev) => {
      const newCount = prev + 1;

      if (newCount <= 2) {
        setWarningMessage(`⚠ Warning ${newCount}/2: ${reason}`);
      }

      if (newCount >= 3) {
        setWarningMessage("❌ Violations exceeded. Interview submitting...");
        setTimeout(() => {
          handleSubmitInterview();
        }, 1000);
      }

      return newCount;
    });

    setTimeout(() => {
      setWarningMessage("");
    }, 3000);
  };

  /* ================= CAMERA ================= */

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        // Stop existing stream first (VERY IMPORTANT)
        if (videoRef.current?.srcObject) {
          const oldTracks = (
            videoRef.current.srcObject as MediaStream
          ).getTracks();
          oldTracks.forEach((track) => track.stop());
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true; // ✅ IMPORTANT
          await videoRef.current.play();
        }
      } catch (error: any) {
        console.error("Camera error:", error);

        if (error.name === "NotReadableError") {
          alert("Camera is already in use by another application.");
        } else if (error.name === "NotAllowedError") {
          alert("Camera permission denied.");
        } else {
          alert("Unable to access camera.");
        }
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  /* ================= FULLSCREEN WARNING ================= */

  /* ================= Escape key ================= */
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();

        triggerViolation("ESC key pressed");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // alt+tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation("Tab switch detected");
      }
    };

    const handleFullscreenChange = async () => {
      if (!document.fullscreenElement && !allowFullscreenExit) {
        triggerViolation("Fullscreen exited");

        try {
          await document.documentElement.requestFullscreen();
        } catch {}
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [allowFullscreenExit]);

  /* ================= SPEECH ================= */

  // const speakText = (text: string) => {
  //   window.speechSynthesis.cancel();
  //   const utterance = new SpeechSynthesisUtterance(text);
  //   window.speechSynthesis.speak(utterance);
  // };

  /* ================= RECORDING ================= */

  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += piece + " ";
        } else {
          interim += piece;
        }
      }

      setTranscript(finalTranscript + interim);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  /* ================= SAVE ANSWER ================= */

  const submitAnswer = async () => {
    if (!transcript.trim()) return;

    const token = localStorage.getItem("token");

    await fetch(`${API_URL}/interviews/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sessionId: id,
        questionIndex: currentQuestionIndex,
        userAnswer: transcript,
      }),
    });

    setTranscript("");

    if (currentQuestionIndex + 1 < session.totalQuestions) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);

      const nextQ = session.questions[nextIndex]?.question;
      // speakText(nextQ);
    } else {
      handleSubmitInterview();
    }
  };

  /* ================= FINAL EVALUATION ================= */

  const handleSubmitInterview = async () => {
    setAllowFullscreenExit(true);

    const token = localStorage.getItem("token");

    await fetch(`${API_URL}/interviews/evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sessionId: id }),
    });

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }

    router.push(`/learner/interview/results/${id}`);
  };

  // const hasSpokenRef = useRef(false);
  // useEffect(() => {
  //   if (!session) return;

  //   if (!hasSpokenRef.current) {
  //     const firstQuestion = session.questions[0]?.question;

  //     if (firstQuestion) {
  //       speakText(firstQuestion);
  //       hasSpokenRef.current = true;
  //     }
  //   }
  // }, [session]);

  if (!session) return <div className="p-8">Loading...</div>;

  const currentQuestion =
    session.questions[currentQuestionIndex]?.question || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 p-8">
      {warningMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg z-50 shadow-lg font-semibold animate-pulse">
          {warningMessage}
        </div>
      )}
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">AI Interview Session</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Question {currentQuestionIndex + 1} / {session.totalQuestions}
            </p>
          </div>

          <Card className="p-4">
            <p className="font-mono text-xl">{formatTime(timeRemaining)}</p>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* AI Side */}
          <Card className="p-8 text-center space-y-6">
            {/* <img src="/ai-idle.png" className="w-56 mx-auto" /> */}
            <AIInterviewer text={currentQuestion} autoSpeak={true} />

            <p className="text-lg font-medium">{currentQuestion}</p>

            {/* <Button
              onClick={() => speakText(currentQuestion)}
              variant="outline"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Hear Question
            </Button> */}
          </Card>

          {/* Camera Side */}
          <Card className="p-8 space-y-6">
            <div className="h-72 bg-black rounded overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            <Button
              onClick={isRecording ? stopRecording : startRecording}
              className={
                isRecording ? "bg-red-600 hover:bg-red-700" : "bg-primary"
              }
            >
              {isRecording ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic2 className="w-4 h-4 mr-2" />
                  Start Recording
                </>
              )}
            </Button>

            {transcript && (
              <>
                <div className="p-3 border rounded text-sm bg-gray-50">
                  <strong>Your Answer:</strong> {transcript}
                </div>

                <Button
                  onClick={submitAnswer}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Answer
                </Button>
              </>
            )}

            <Button onClick={handleSubmitInterview} variant="outline">
              End Interview
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
