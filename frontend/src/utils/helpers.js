export function timeAgo(dateString) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return date.toLocaleDateString();
}

let audioCtx = null;

export function playSound(type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    switch(type) {
      case "like":
        osc.frequency.value = 600;
        gain.gain.value = 0.08;
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
        break;
      case "follow":
        osc.frequency.value = 800;
        gain.gain.value = 0.08;
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
        break;
      case "comment":
        osc.frequency.value = 500;
        gain.gain.value = 0.06;
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
        break;
      case "post":
        osc.frequency.value = 900;
        gain.gain.value = 0.1;
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
        break;
      default: break;
    }
  } catch (e) { console.log("Sound not supported"); }
}
