"use client";

import * as faceapi from "face-api.js";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic2, Square, Send, Volume2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function OralSessionPage() {
  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const [session, setSession] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const hasSpokenRef = useRef(false);

  // const [tabWarnings, setTabWarnings] = useState(0);
  const [warningMessage, setWarningMessage] = useState("");
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState("");

  const [allowFullscreenExit, setAllowFullscreenExit] = useState(false);
  const hasFetchedRef = useRef(false);

  // face detection
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [studentEmbedding, setStudentEmbedding] = useState<number[] | null>(
    null,
  );
  const faceIntervalRef = useRef<any>(null);

  /* ================= CAMERA ================= */

  useEffect(() => {
    if (!session) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
        }

        setCameraError(null);
      } catch (err) {
        setCameraError("Camera permission denied.");
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [session]);

  // load face models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";

      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

      setModelsLoaded(true);
    };

    loadModels();
  }, []);

  useEffect(() => {
    const fetchEmbedding = async () => {
      const res = await fetch(`${API_URL}/user/face-embedding`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const data = await res.json();
      setStudentEmbedding(data.embedding);
    };

    fetchEmbedding();
  }, []);

  useEffect(() => {
    if (!modelsLoaded || !studentEmbedding || !videoRef.current) return;

    const verifyFace = async () => {
      const detections = await faceapi
        .detectAllFaces(
          videoRef.current!,
          new faceapi.TinyFaceDetectorOptions(),
        )
        .withFaceLandmarks()
        .withFaceDescriptors();

      // ❌ No face detected
      if (detections.length === 0) {
        setWarningMessage("⚠ No face detected!");
        return;
      }

      // ❌ Multiple faces detected
      if (detections.length > 1) {
        setWarningMessage("⚠ Multiple faces detected!");
        return;
      }

      // ✅ Compare embeddings
      const liveDescriptor = detections[0].descriptor;

      const distance = faceapi.euclideanDistance(
        new Float32Array(studentEmbedding),
        liveDescriptor,
      );

      // Threshold (0.5–0.6 good range)
      if (distance > 0.55) {
        setWarningMessage("⚠ Face mismatch detected!");
        return;
      }

      // ✅ Valid face
    };

    faceIntervalRef.current = setInterval(verifyFace, 3000); // every 3 seconds

    return () => {
      clearInterval(faceIntervalRef.current);
    };
  }, [modelsLoaded, studentEmbedding]);

  useEffect(() => {
    const enter = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch {}
    };

    enter();
  }, []);

  /* ================= FETCH SESSION ================= */

  useEffect(() => {
    if (!id || hasFetchedRef.current) return;

    hasFetchedRef.current = true;

    const fetchSession = async () => {
      const token = localStorage.getItem("token");

      if (type === "faculty") {
        const res = await fetch(`${API_URL}/learner/faculty-oral/${id}/start`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.message); // 🔥 show error
          router.push("/learner/oral"); // redirect back
          return;
        }

        setSession(data);
        setTimeRemaining(data.duration * 60);

        localStorage.setItem("attemptId", data.attemptId);
      } else {
        const res = await fetch(`${API_URL}/oral/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        setSession(data);
        setTimeRemaining(data.duration * 60);
      }
    };

    fetchSession();
  }, [id, type]);

  /* ================= TIMER ================= */

  useEffect(() => {
    if (timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmitOralExam();
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

  /* ================= AUTO FULLSCREEN ON START ================= */

  useEffect(() => {
    if (!session) return;
    
    // Auto-enter fullscreen when oral exam starts
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (error) {
        console.log('Fullscreen failed:', error);
      }
    };
    
    enterFullscreen();
  }, [session]);

  /* ================= AI SPEAK ================= */

  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  /* 🔥 Auto speak question first time */
  useEffect(() => {
    if (!session) return;

    if (!hasSpokenRef.current) {
      const question = session.questions[currentQuestionIndex]?.question || "";
      speakText(question);
      hasSpokenRef.current = true;
    }
  }, [session]);

  /* ================= ALT+TAB PREVENTION ================= */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Alt+Tab
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        
        // Show warning but don't allow tab switch
        setWarningMessage('⚠️ Alt+Tab blocked - Tab switching not allowed')
        
        // Force re-enter fullscreen
        setTimeout(async () => {
          try {
            if (!document.fullscreenElement) {
              await document.documentElement.requestFullscreen();
            }
          } catch (err) {
            console.log('Re-entry failed:', err);
          }
        }, 100)
        
        return false
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();

        // 🔴 ESC warning
        setWarningMessage("⚠️ ESC key disabled during exam.");
        
        // Force re-enter fullscreen immediately
        if (!document.fullscreenElement) {
          try {
            await document.documentElement.requestFullscreen();
          } catch (err) {
            console.log("Re-entry blocked:", err);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();

        setWarningMessage("⚠ ESC key disabled during exam.");

        // Force re-enter fullscreen immediately
        if (!document.fullscreenElement) {
          try {
            await document.documentElement.requestFullscreen();
          } catch (err) {
            console.log("Re-entry blocked:", err);
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /* ================= TAB SWITCH DETECTION ================= */

  useEffect(() => {
    const handleViolation = async (reason: string) => {
      // 🔴 Warning message
      setWarningMessage(`⚠️ ${reason}`);
      
      // Force re-enter fullscreen after 500ms
      setTimeout(async () => {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
        } catch (err) {
          console.log('Fullscreen re-entry failed:', err);
        }
      }, 500);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('Tab switch detected');
      }
    };

    const handleFullscreenChange = async () => {
      if (!document.fullscreenElement && !allowFullscreenExit) {
        handleViolation('Fullscreen exited');
        
        // Force immediate re-entry
        try {
          await document.documentElement.requestFullscreen();
        } catch (err) {
          console.log('Fullscreen re-entry failed:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [allowFullscreenExit]);

  useEffect(() => {
    const handleViolation = async (reason: string) => {
      setWarningCount((prev) => {
        const newCount = prev + 1;

        if (newCount <= 2) {
          setWarningMessage(`⚠ Warning ${newCount}/2: ${reason}`);
        }

        if (newCount >= 3) {
          setWarningMessage("❌ Violations exceeded. Exam submitting...");
          setTimeout(() => {
            handleSubmitOralExam();
          }, 1200);
        }

        return newCount;
      });

      setTimeout(() => {
        setWarningMessage("");
      }, 3000);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation("Tab switch detected");
      }
    };

    const handleFullscreenChange = async () => {
      if (!document.fullscreenElement && !allowFullscreenExit) {
        handleViolation("Fullscreen exited");

        // Force immediate re-entry
        try {
          await document.documentElement.requestFullscreen();
        } catch (err) {
          console.log("Fullscreen re-entry failed:", err);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [allowFullscreenExit]);

  const enterFullscreen = async () => {
    try {
      const elem = document.documentElement;

      if (!document.fullscreenElement) {
        await elem.requestFullscreen();
      }
    } catch (error) {
      console.log("Re-enter fullscreen blocked:", error);
    }
  };

  /* ================= SPEECH RECOGNITION ================= */

  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true; // 🔥 important (records until stop)
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += piece + " ";
        } else {
          interimTranscript += piece;
        }
      }

      setTranscript(finalTranscript + interimTranscript);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  /* ================= SUBMIT ANSWER ================= */

  const submitAnswer = async () => {
    if (!transcript.trim()) return;

    const token = localStorage.getItem("token");

    if (type === "faculty") {
      await fetch(`${API_URL}/learner/faculty-oral/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attemptId: localStorage.getItem("attemptId"),
          questionIndex: currentQuestionIndex,
          userAnswer: transcript,
        }),
      });
    } else {
      await fetch(`${API_URL}/oral/answer`, {
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
    }

    setTranscript("");

    if (currentQuestionIndex + 1 < session.totalQuestions) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);

      const nextQuestion = session.questions[nextIndex]?.question || "";
      speakText(nextQuestion);
    } else {
      handleSubmitOralExam();
    }
  };

  /* ================= EVALUATE ================= */

  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleSubmitOralExam = async () => {
    const token = localStorage.getItem("token");

    setAllowFullscreenExit(true);

    if (type === "faculty") {
      await fetch(`${API_URL}/learner/faculty-oral/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attemptId: localStorage.getItem("attemptId"),
        }),
      });
    } else {
      await fetch(`${API_URL}/oral/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId: id }),
      });
    }

    stopCamera();
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }

    if (type === "faculty") {
      router.push(
        `/learner/oral/results/${localStorage.getItem("attemptId")}?type=faculty`,
      );
    } else {
      router.push(`/learner/oral/results/${id}`);
    }
  };

  /* ================= UI ================= */

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

      <div className="w-full h-screen px-16 py-10 flex flex-col">
        {/* Header */}
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Oral Practice Session</h1>

            {/* 🔥 Question Progress */}
            <p className="text-sm text-muted-foreground mt-1">
              Question {currentQuestionIndex + 1} / {session.totalQuestions}
            </p>
          </div>

          <Card className="p-4">
            <p className="font-mono text-xl">{formatTime(timeRemaining)}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 flex-1">
          {/* AI Side */}
          <Card className="p-10 flex flex-col justify-center items-center text-center space-y-8 h-full">
            <img src="/ai-idle.png" className="w-80 lg:w-96 mx-auto" />

            <p className="text-lg font-medium">{currentQuestion}</p>

            <Button
              onClick={() => speakText(currentQuestion)}
              variant="outline"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Hear Question Again
            </Button>
          </Card>

          {/* Camera Side */}
          <Card className="p-10 flex flex-col justify-between h-full">
            <div className="flex-1 bg-black rounded-xl overflow-hidden relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  {cameraError}
                </div>
              )}
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

            <Button onClick={handleSubmitOralExam} variant="outline">
              End Oral Exam
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}