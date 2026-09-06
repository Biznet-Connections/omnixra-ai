import React from "react";
import { Sparkles } from "lucide-react";

function AIAvatar({ size = "medium" }) {
  const sizeMap = {
    small: "w-9 h-9",
    medium: "w-11 h-11",
    large: "w-20 h-20"
  };

  const iconSize = {
    small: 16,
    medium: 20,
    large: 32
  };

  return (
    <div className={`${sizeMap[size]} rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25`}>
      <Sparkles size={iconSize[size]} className="text-white" strokeWidth={2.2} />
    </div>
  );
}
export default AIAvatar;
