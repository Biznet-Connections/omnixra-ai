import React, { useEffect, useRef, useState } from "react";
import ModalPortal from "./ModalPortal";

export default function VideoTrimmer({ videoSrc, onTrim, onCancel }) {
  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [dragging, setDragging] = useState(null);
  const dragStart = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const MIN_DURATION = 1;

  const handleLoadedMetadata = () => {
    const d = videoRef.current?.duration || 0;
    setDuration(d);
    setStart(0);
    setEnd(d);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    if (time >= end) {
      videoRef.current.pause();
      videoRef.current.currentTime = start;
    }
  };

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const seekTo = (time) => {
    if (!videoRef.current) return;
    const safeTime = Math.max(0, Math.min(duration, time));
    videoRef.current.currentTime = safeTime;
    setCurrentTime(safeTime);
  };

  const previewSelection = async () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = start;
    try { await videoRef.current.play(); } catch (error) { console.log("Playback blocked:", error); }
  };

  const getTimeFromPointer = (clientX) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || duration <= 0) return 0;
    const percentage = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(1, percentage)) * duration;
  };

  const handlePointerDown = (type, e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragStart.current = { pointerId: e.pointerId, clientX: e.clientX, start, end };
    setDragging(type);
  };

  useEffect(() => {
    if (!dragging) return;
    const handlePointerMove = (e) => {
      e.preventDefault();
      const time = getTimeFromPointer(e.clientX);
      if (dragging === "start") {
        const newStart = Math.min(time, end - MIN_DURATION);
        setStart(Math.max(0, newStart));
        seekTo(newStart);
      }
      if (dragging === "end") {
        const newEnd = Math.max(time, start + MIN_DURATION);
        setEnd(Math.min(duration, newEnd));
        seekTo(newEnd);
      }
      if (dragging === "selection") {
        const selectionDuration = dragStart.current.end - dragStart.current.start;
        const originalTime = getTimeFromPointer(dragStart.current.clientX);
        const delta = time - originalTime;
        let newStart = dragStart.current.start + delta;
        let newEnd = dragStart.current.end + delta;
        if (newStart < 0) { newStart = 0; newEnd = selectionDuration; }
        if (newEnd > duration) { newEnd = duration; newStart = duration - selectionDuration; }
        setStart(newStart);
        setEnd(newEnd);
      }
    };
    const handlePointerUp = () => setDragging(null);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [dragging, start, end, duration]);

  const dataURLToBlob = async (dataURL) => {
    const response = await fetch(dataURL);
    return await response.blob();
  };

  const handleRealTrim = async () => {
    try {
      if (!videoSrc) return;
      setProcessing(true);
      setError("");
      const blob = await dataURLToBlob(videoSrc);
      const formData = new FormData();
      formData.append("video", blob, "omnixra-video.mp4");
      formData.append("start", String(start));
      formData.append("end", String(end));

      const response = await fetch("/api/video/trim", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Video trimming failed");
      }
      console.log("REAL TRIMMED VIDEO:", data);
      onTrim(data);
    } catch (error) {
      console.error("Trim error:", error);
      setError(error.message || "Could not trim video.");
    } finally {
      setProcessing(false);
    }
  };

  const startPercent = duration > 0 ? (start / duration) * 100 : 0;
  const endPercent = duration > 0 ? (end / duration) * 100 : 100;
  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-[#111] text-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <button onClick={(e) => { e.stopPropagation(); onCancel(); }} className="text-sm text-white/70 hover:text-white">Cancel</button>
            <h2 className="font-semibold">Trim video</h2>
            <button disabled={processing} onClick={(e) => { e.stopPropagation(); handleRealTrim(); }} className="text-sm font-semibold text-blue-400 hover:text-blue-300 disabled:opacity-50">
              {processing ? "Processing..." : "Done"}
            </button>
          </div>

          <div className="relative flex aspect-video items-center justify-center bg-black">
            <video ref={videoRef} src={videoSrc} className="h-full w-full object-contain" playsInline preload="metadata" onLoadedMetadata={handleLoadedMetadata} onTimeUpdate={handleTimeUpdate} onClick={(e) => { e.stopPropagation(); if (videoRef.current.paused) previewSelection(); else videoRef.current.pause(); }} />
          </div>

          <div className="flex items-center justify-between px-5 pt-4 text-xs">
            <span>Start: {formatTime(start)}</span>
            <span className="text-blue-400">Selected: {formatTime(end - start)}</span>
            <span>End: {formatTime(end)}</span>
          </div>

          <div className="px-5 pb-5 pt-4">
            <div ref={timelineRef} className="relative h-16 cursor-pointer rounded-lg bg-neutral-800 touch-none" style={{ touchAction: "none" }}>
              <div className="absolute left-0 top-0 bottom-0 bg-black/70 rounded-l-lg" style={{ width: `${startPercent}%` }} />
              <div className="absolute right-0 top-0 bottom-0 bg-black/70 rounded-r-lg" style={{ width: `${100 - endPercent}%` }} />
              <div className="absolute top-0 bottom-0 border-y-2 border-blue-400" style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }} onPointerDown={(e) => handlePointerDown("selection", e)} />
              <div className="pointer-events-none absolute top-0 bottom-0 w-[2px] bg-white" style={{ left: `${playheadPercent}%` }} />
              <div className="absolute top-0 bottom-0 z-10 w-6 -translate-x-1/2 cursor-ew-resize touch-none" style={{ left: `${startPercent}%`, touchAction: "none" }} onPointerDown={(e) => handlePointerDown("start", e)}>
                <div className="absolute left-1/2 top-1/2 h-10 w-5 -translate-x-1/2 -translate-y-1/2 rounded border-2 border-white bg-blue-500 shadow-lg"><div className="absolute left-1/2 top-1/2 h-4 w-[2px] -translate-x-1/2 -translate-y-1/2 bg-white/80" /></div>
              </div>
              <div className="absolute top-0 bottom-0 z-10 w-6 -translate-x-1/2 cursor-ew-resize touch-none" style={{ left: `${endPercent}%`, touchAction: "none" }} onPointerDown={(e) => handlePointerDown("end", e)}>
                <div className="absolute left-1/2 top-1/2 h-10 w-5 -translate-x-1/2 -translate-y-1/2 rounded border-2 border-white bg-blue-500 shadow-lg"><div className="absolute left-1/2 top-1/2 h-4 w-[2px] -translate-x-1/2 -translate-y-1/2 bg-white/80" /></div>
              </div>
            </div>
          </div>

          {error && <div className="px-5 pb-2 text-xs text-red-400">{error}</div>}

          <div className="flex justify-center px-5 pb-6">
            <button onClick={(e) => { e.stopPropagation(); previewSelection(); }} className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black active:scale-95">▶ Preview</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
