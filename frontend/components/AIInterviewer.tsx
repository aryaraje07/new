"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  text: string;
  autoSpeak?: boolean;
}

export default function AIInterviewer({ text, autoSpeak }: Props) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [blink, setBlink] = useState(false);
  const idleRef = useRef<HTMLVideoElement>(null);
  const talkingRef = useRef<HTMLVideoElement>(null);

  // Blink simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 120);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const speak = () => {
    if (!text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (autoSpeak && text) {
      speak();
    }
  }, [text]);

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-full max-w-xl aspect-video">
        
        {/* Idle Video */}
        <video
          ref={idleRef}
          src="/ai-idle.mp4"
          autoPlay
          loop
          muted
          className={`absolute inset-0 w-full h-full object-cover rounded-2xl shadow-xl ${
            isSpeaking ? "opacity-0" : "opacity-100"
          }`}
        />

        {/* Talking Video */}
        <video
          ref={talkingRef}
          src="/ai-talking.mp4"
          autoPlay
          loop
          muted
          className={`absolute inset-0 w-full h-full object-cover rounded-2xl shadow-xl ${
            isSpeaking ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Blink Overlay */}
        {blink && (
          <div className="absolute inset-0 w-full h-full object-cover rounded-2xl shadow-xl bg-black opacity-20 transition-all duration-150" />
        )}
      </div>

      <button
        onClick={speak}
        className="mt-4 px-4 py-2 bg-primary text-white rounded"
      >
        Speak
      </button>
    </div>
  );
}
