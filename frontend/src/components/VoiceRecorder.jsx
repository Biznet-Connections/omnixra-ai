import React, { useState, useRef, useEffect } from "react";
import { X, Mic, Square, Loader2, Send } from "lucide-react";

export default function VoiceRecorder({ onClose, onTranscribed }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const MAX_SECONDS = 60;

  useEffect(() => {
    startRecording();
    return () => {
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopAll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      try { mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => { handleUpload(); };
      mr.start();
      setRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev + 1 >= MAX_SECONDS) {
            stopRecording();
            return MAX_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (e) {
      setError("Microphone permission denied");
    }
  };

  const stopRecording = () => {
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleUpload = async () => {
    if (chunksRef.current.length === 0) return;
    setUploading(true);
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = String(reader.result).split(",")[1];
        try {
          const { default: api } = await import("../api/axios");
          const res = await api.post("/ai/transcribe", {
            audioBase64: base64,
            mimeType: "audio/webm",
          });
          const text = res.data.text || "";
          if (!text.trim()) {
            setError("Could not understand audio. Try again.");
            setUploading(false);
            return;
          }
          onTranscribed?.(text.trim());
        } catch (e) {
          setError(e.response?.data?.message || "Transcription failed");
          setUploading(false);
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      setError(e.message);
      setUploading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box text-center" onClick={e => e.stopPropagation()}>
        <div className="flex justify-end">
          <button onClick={onClose} className="icon-button"><X size={18} /></button>
        </div>

        {uploading ? (
          <div className="py-8">
            <Loader2 className="mx-auto animate-spin text-indigo-400 mb-3" size={40} />
            <p className="text-sm text-slate-400">Transcribing...</p>
          </div>
        ) : (
          <>
            <div className="py-6">
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${recording ? "bg-red-500/20 animate-pulse" : "bg-indigo-500/20"}`}>
                <Mic size={40} className={recording ? "text-red-400" : "text-indigo-400"} />
              </div>
              <div className="text-3xl font-bold mb-1">{seconds}s</div>
              <p className="text-xs text-slate-500">Max {MAX_SECONDS} seconds</p>
            </div>

            {error && <div className="text-xs text-red-400 mb-3">{error}</div>}

            <div className="flex gap-2">
              {recording ? (
                <button onClick={stopRecording} className="primary-button w-full">
                  <Square size={14} /> Stop & Send
                </button>
              ) : (
                <button onClick={startRecording} className="primary-button w-full">
                  <Mic size={14} /> Record again
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
