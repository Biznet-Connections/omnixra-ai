import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

// Clean up metadata prefixes and jammed-together text
function preclean(description) {
  if (!description) return "";
  let t = String(description);

  // 1. Strip leading "Expires: <date>" metadata line
  t = t.replace(/^\s*Expires[:\s]+[\d\w\s]+?(?=[A-Z]|$)/i, "").trim();

  // 2. Remove "job Description" label that leaks from the meta widget
  t = t.replace(/\bjob\s*Description\b/gi, "").trim();

  // 3. Insert spaces between jammed uppercase sequences:
  //    "FUNDVACANCY" → "FUND VACANCY", "NOTICEApplications" → "NOTICE Applications"
  t = t.replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2");

  // 4. Collapse repeated whitespace
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

// Parse raw job description text into structured sections
function parseSections(description) {
  if (!description || typeof description !== "string") return [];

  // Pre-clean the description
  const cleaned = preclean(description);

  // Split on the separator we generate
  const chunks = cleaned.split(/\n?─{5,}\n?/);

  const sections = [];
  for (const raw of chunks) {
    const text = raw.trim();
    if (!text) continue;

    // Find the heading — first line, if short and title-like
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    let heading = "";
    let body = text;

    const first = lines[0];
    if (first.length <= 80 && /^[A-Z0-9][A-Za-z0-9\s\-&,.'()\/]{3,80}$/.test(first) && !/[.!?]$/.test(first)) {
      // Short, no punctuation at end — treat as heading
      heading = first;
      body = lines.slice(1).join("\n\n");
    }

    sections.push({ heading, body });
  }

  return sections;
}

// Split body into bullets + paragraphs
function parseBody(body) {
  if (!body) return { paragraphs: [], bullets: [] };

  // Detect bullet-style lines (•, -, *)
  const bulletPattern = /^\s*[•\-*·]\s*/;

  const paragraphs = [];
  const bullets = [];

  const lines = body.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  let currentParagraph = [];
  for (const line of lines) {
    if (bulletPattern.test(line)) {
      // Flush any pending paragraph
      if (currentParagraph.length) {
        paragraphs.push(currentParagraph.join(" "));
        currentParagraph = [];
      }
      bullets.push(line.replace(bulletPattern, "").trim());
    } else if (line.includes("•")) {
      // Inline bullets (iHarare style: "text• text• text")
      if (currentParagraph.length) {
        paragraphs.push(currentParagraph.join(" "));
        currentParagraph = [];
      }
      const parts = line.split(/•/).map((s) => s.trim()).filter((s) => s.length > 2);
      bullets.push(...parts);
    } else {
      currentParagraph.push(line);
    }
  }
  if (currentParagraph.length) paragraphs.push(currentParagraph.join(" "));

  return { paragraphs, bullets };
}

function Section({ heading, body, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const { paragraphs, bullets } = parseBody(body);
  const hasContent = paragraphs.length > 0 || bullets.length > 0;
  if (!hasContent) return null;

  const count = bullets.length || paragraphs.length;

  if (!heading) {
    // No heading — just render inline
    return (
      <div className="job-desc-section">
        {paragraphs.map((p, i) => <p key={`p-${i}`} className="job-desc-p">{p}</p>)}
        {bullets.length > 0 && (
          <ul className="job-desc-list">
            {bullets.map((b, i) => <li key={`b-${i}`}>{b}</li>)}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className={`job-desc-section ${open ? "open" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="job-desc-heading"
      >
        <span className="job-desc-heading-icon">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="job-desc-heading-text">{heading}</span>
        {count > 1 && <span className="job-desc-heading-count">{count}</span>}
      </button>
      {open && (
        <div className="job-desc-body">
          {paragraphs.map((p, i) => <p key={`p-${i}`} className="job-desc-p">{p}</p>)}
          {bullets.length > 0 && (
            <ul className="job-desc-list">
              {bullets.map((b, i) => <li key={`b-${i}`}>{b}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function JobDescriptionBody({ description }) {
  const sections = parseSections(description);

  if (sections.length === 0) {
    return <p className="text-sm text-slate-400 italic">No description provided.</p>;
  }

  return (
    <div className="job-desc">
      {sections.map((s, i) => (
        <Section
          key={i}
          heading={s.heading}
          body={s.body}
          defaultOpen={i === 0}
        />
      ))}
    </div>
  );
}
