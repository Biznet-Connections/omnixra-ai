import React, { useRef, useState, useEffect } from "react";
import { Volume2, VolumeX, X, Heart } from "lucide-react";

function ModernVideoPlayer({ src, text, authorName }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showHeart, setShowHeart] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(() => {});
          } else {
            videoRef.current?.pause();
          }
        });
      },
      { threshold: 0.5 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const toggleMute = () => setIsMuted(!isMuted);

  const handleDoubleTap = () => {
    setLiked(true);
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);
  };

  const openFullScreen = () => setIsFullScreen(true);

  return (
    <>
      <div ref={containerRef} className="modern-video-container" onClick={openFullScreen} onDoubleClick={handleDoubleTap}>
        <video
          ref={videoRef}
          src={src}
          muted={isMuted}
          loop
          playsInline
          preload="none"
          className="modern-video"
        />
        <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="sound-toggle">
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        {showHeart && (
          <div className="double-tap-heart">
            <Heart size={50} fill="white" />
          </div>
        )}
      </div>

      {isFullScreen && (
        <div className="fullscreen-video-backdrop" onClick={() => setIsFullScreen(false)}>
          <div className="fullscreen-video-content" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsFullScreen(false)} className="fullscreen-close"><X size={20} /></button>
            <video src={src} controls autoPlay loop className="fullscreen-video" />
            <div className="fullscreen-video-info">
              <div className="font-semibold text-sm">{authorName}</div>
              <p className="text-xs text-slate-400 mt-1">{text}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export default ModernVideoPlayer;
