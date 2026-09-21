import React from "react";

// Split text by @Name tokens and render pills.
// Returns React nodes — caller wraps in <p> or <div>.
// Props:
//   text — the raw comment text
//   mentions — array of { id, name } (structured, from backend)
//   onUserClick — (userId) => void

export default function MentionRenderer({ text, mentions = [], onUserClick }) {
  if (!text) return null;

  // Build a name→id lookup from the structured mentions array
  const byName = {};
  for (const m of mentions) {
    if (m && m.name) byName[m.name.toLowerCase()] = m.id || m._id;
  }

  // Regex: match "@Name" — greedy on word chars + spaces up to 3 words
  // We try longest-first by scanning the text and matching known mention names.
  const names = Object.keys(byName).sort((a, b) => b.length - a.length);
  if (names.length === 0) {
    // No structured mentions — just render text, but still highlight @tokens for style
    return <>{renderAtText(text)}</>;
  }

  const parts = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "@") {
      let matched = null;
      const rest = text.slice(i + 1).toLowerCase();
      for (const name of names) {
        if (rest.startsWith(name)) {
          // Ensure the next char is not a word char (so we don't match "@Joel" inside "@Joelx")
          const nextChar = rest[name.length];
          if (!nextChar || /[\s.,!?;:)\]}]/.test(nextChar)) {
            matched = name;
            break;
          }
        }
      }
      if (matched) {
        const userId = byName[matched];
        const display = text.slice(i + 1, i + 1 + matched.length);
        parts.push(
          <span
            key={`m-${i}`}
            className="mention-pill"
            onClick={(e) => { e.stopPropagation(); onUserClick && onUserClick(userId); }}
            role="link"
          >
            @{display}
          </span>
        );
        i += 1 + matched.length;
        continue;
      }
    }
    parts.push(text[i]);
    i++;
  }
  return <>{parts}</>;
}

// Fallback — just bold @tokens visually, no clickability
function renderAtText(text) {
  const parts = [];
  const rx = /@([A-Za-z][A-Za-z0-9 ]{0,40}?)(?=[\s.,!?;:)\]}]|$)/g;
  let last = 0;
  let m;
  while ((m = rx.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<span key={`at-${m.index}`} className="mention-pill">{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
