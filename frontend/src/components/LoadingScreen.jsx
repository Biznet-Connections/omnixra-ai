import React, { useEffect } from "react";
import { Sparkles } from "lucide-react";

function LoadingScreen({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 3000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[999] loading-screen">
      <div className="loading-background" />
      <div className="loading-center">
        <div className="loading-logo-wrapper">
          <div className="loading-ring ring-one" />
          <div className="loading-ring ring-two" />
          <div className="loading-logo">
            <Sparkles size={56} strokeWidth={1.7} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
