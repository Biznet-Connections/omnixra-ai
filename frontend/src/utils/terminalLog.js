// Sends logs from frontend → server → terminal
// ONLY runs on local dev web (localhost:5173). Silent in production + native.

const __DEV_WEB__ =
  typeof window !== "undefined" &&
  window.location.hostname === "localhost" &&
  window.location.port === "5173";

const logQueue = [];
let flushTimer = null;

function flush() {
  if (logQueue.length === 0) return;
  if (!__DEV_WEB__) return;
  const batch = logQueue.splice(0, logQueue.length);
  fetch("/api/posts/debug/log-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logs: batch })
  }).catch(() => {});
}

export function tlog(tag, message) {
  if (!__DEV_WEB__) return;
  const text = `[${tag}] ${message}`;
  logQueue.push(text);
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, 200);
  }
}

// Only hijack console.log in dev web
if (__DEV_WEB__) {
  const origLog = console.log;
  const origErr = console.error;
  const origWarn = console.warn;

  console.log = (...args) => {
    origLog(...args);
    tlog("LOG", args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" "));
  };
  console.error = (...args) => {
    origErr(...args);
    tlog("ERR", args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" "));
  };
  console.warn = (...args) => {
    origWarn(...args);
    tlog("WARN", args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" "));
  };
}
