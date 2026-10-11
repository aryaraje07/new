"use client";
"use client";

import * as faceapi from "face-api.js";
import { loadFaceModels } from "@/lib/faceApi";
import API from "@/lib/api";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle, Sparkles } from "lucide-react";
import Link from "next/link";

interface FaceRegistrationModalProps {
  onVerified: () => void;
}

export function FaceRegistrationModal({
  onVerified,
}: FaceRegistrationModalProps) {
  const [faceVerified, setFaceVerified] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await loadFaceModels();
        setModelsReady(true);
      } catch {
        setError("Failed to load face recognition models");
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (cameraActive && videoRef.current) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [cameraActive]);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Unable to access camera. Please check permissions.");
      setCameraActive(false);
      console.log("[v0] Camera access error:", err);
    }
  };

  const stopCamera = () => {
  if (videoRef.current) {
    const stream = videoRef.current.srcObject as MediaStream | null;

    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    videoRef.current.srcObject = null;
  }
};



  const handleCaptureClick = async () => {
    if (!videoRef.current) return;

    if (!modelsReady) {
      setError("Face recognition models are still loading");
      return;
    }

    try {
      setLoading(true);

      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 }),
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError("No face detected. Please try again.");
        return;
      }

      const embedding = Array.from(detection.descriptor);

      await API.post("/learner/face-register", { embedding });

      setFaceVerified(true);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Face capture failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 font-bold text-2xl"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-foreground">SkillifyAI</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">
            Face Verification
          </h1>
          <p className="text-muted-foreground">
            Capture your face for exam proctoring verification
          </p>
        </div>

        {/* Face Registration Card */}
        <Card className="p-8 border border-border shadow-lg space-y-6">
          {/* Camera Preview */}
          <div className="space-y-4">
            <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden relative group">
              {cameraActive ? (
                <>
                  {/* Live camera feed */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover rounded-lg"
                  />
                  {/* Camera indicator */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs text-white">Camera Active</span>
                  </div>
                </>
              ) : (
                <Camera className="w-16 h-16 text-primary/40" />
              )}
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              {cameraActive
                ? "Position your face in the center"
                : 'Click "Start Camera" to begin'}
            </p>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Instructions */}
          {!faceVerified && (
            <div className="bg-secondary/50 border border-border rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-sm text-foreground">
                Requirements:
              </h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Ensure good lighting on your face</li>
                <li>• Face should be clearly visible</li>
                <li>• Avoid glasses or accessories</li>
              </ul>
            </div>
          )}

          {/* Face Verified Badge */}
          {faceVerified && (
            <div className="bg-green-100 border border-green-200 rounded-lg p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Face Verified</p>
                  <p className="text-xs text-green-700">
                    Your face has been successfully registered
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="space-y-3 pt-4">
            {!faceVerified ? (
              <>
                <Button
                  onClick={() => setCameraActive(!cameraActive)}
                  variant={cameraActive ? "destructive" : "default"}
                  className="w-full h-10"
                >
                  {cameraActive ? "Stop Camera" : "Start Camera"}
                </Button>
                {cameraActive && (
                  <Button
                    onClick={handleCaptureClick}
                    disabled={loading || !modelsReady}
                    className="w-full h-10 bg-primary hover:bg-primary/90"
                  >
                    {!modelsReady
                      ? "Loading Models..."
                      : loading
                        ? "Processing..."
                        : "Capture Face"}
                  </Button>
                )}
              </>
            ) : (
              <Button
  onClick={async () => {
    stopCamera();
    setCameraActive(false);

    // Give browser 200ms to fully stop camera
    await new Promise((resolve) => setTimeout(resolve, 200));

    onVerified();
  }}
  className="w-full h-10 bg-primary hover:bg-primary/90"
>
  Continue to Dashboard
</Button>

            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
