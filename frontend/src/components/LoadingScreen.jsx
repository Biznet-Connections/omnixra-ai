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
            <Sparkles size={42} strokeWidth={1.7} />
          </div>
        </div>
        <div className="mt-7 text-center">
          <div className="text-3xl sm:text-4xl font-bold tracking-tight">
            omnixra<span className="text-indigo-400">-AI</span>
          </div>
          <div className="text-[10px] tracking-[.4em] text-slate-500 mt-2">
            INTELLIGENCE FOR YOUR CAREER
          </div>
        </div>
        <div className="mt-9 flex items-center gap-2 text-xs text-slate-500">
          <span className="loading-dot" />
          Preparing your employment network...
        </div>
        <div className="loading-progress"><div /></div>
      </div>
    </div>
  );
}

export default LoadingScreen;
