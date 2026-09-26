import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

// Clean up metadata prefixes and jammed-together text
function preclean(description) {
  if (!description) return "";
  let t = String(description);

  // 1. Strip leading "Expires: <date>" metadata line
  t = t.replace(/^\s*Expires[:\s]+[\d\w\s]+?(?=[A-Z]|$)/i, "").trim();

  // 2. Remove "job Description" label
  t = t.replace(/\bjob\s*Description\b/gi, "").trim();

  // 3. STRIP navigation junk
  t = t.replace(/Jobs\s+Categories\s+Search for CVs/gi, " ");
  t = t.replace(/Search for CVs/gi, " ");
  t = t.replace(/Jobseeker Register CV/gi, " ");
  t = t.replace(/Employer Register \/ Post Jobs/gi, " ");
  t = t.replace(/Candidate Sign ?Up\/Register/gi, " ");
  t = t.replace(/Employer Sign ?Up\/Register/gi, " ");
  t = t.replace(/Ads ?by ?google.*?push\(\{\}\);?/gi, " ");
  t = t.replace(/\(adsbygoogle[^)]*\)\.push\(\{\}\);/gi, " ");
  t = t.replace(/Similar Jobs/gi, " ");
  t = t.replace(/Browse Candidates/gi, " ");
  t = t.replace(/Add Resume \/ Curriculum Vitae/gi, " ");
  t = t.replace(/Terms and Privacy Policy/gi, " ");
  t = t.replace(/Register as a Job Seeker/gi, " ");
  t = t.replace(/Register as an Employer/gi, " ");
  t = t.replace(/Other Jobs in same location\.*\.*/gi, " ");
  t = t.replace(/Job Summary/gi, " ");
  t = t.replace(/Location\s+Harare/gi, " ");

  // 4. Collapse repeated "Expires DD MMM YYYY" lines
  t = t.replace(/(Expires \d{1,2} \w+ \d{4}\s*)+/gi, " ");

  // 5. Fix jammed uppercase
  t = t.replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2");

  // 6. Collapse whitespace
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");

  return t.trim();
}

// Parse raw job description text into structured sections
function parseSections(description) {
  if (!description || typeof description !== "string") return [];

  // Pre-clean
  const cleaned = preclean(description);

  // Try to split on separators first
  let chunks = cleaned.split(/\n?─{5,}\n?/);

  // If no separators, split on common section headers
  if (chunks.length === 1) {
    const headerRx = /\n?\s*(Duties and Responsibilities|Qualifications and Experience|Requirements:?|Responsibilities:?|How to Apply|About the Role|Job Description|Key Responsibilities|Skills Required|Education Required|Experience Required|Benefits)\s*\n?/gi;
    const parts = cleaned.split(headerRx);
    // parts = [prefix, header1, body1, header2, body2, ...]
    chunks = [];
    if (parts[0] && parts[0].trim()) chunks.push(parts[0].trim());
    for (let i = 1; i < parts.length; i += 2) {
      const header = parts[i];
      const body = parts[i + 1] || "";
      if (header) chunks.push(header.trim() + "\n" + body.trim());
    }
  }

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
