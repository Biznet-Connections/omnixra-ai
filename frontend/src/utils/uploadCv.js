// uploadCv.js — presigned CV upload to Cloudflare R2
// Usage:
//   const cvData = await uploadCvToR2(file);
//   → { cvAttachmentUrl, cvAttachmentName, cvAttachmentSize }
//
// Backend presign endpoint: POST /api/jobs/cv/presign
// Backend then accepts `cvAttachmentUrl` on /apply routes.

import api from "../api/axios"; // axios instance — if your project uses fetch instead, adjust

const ALLOWED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function uploadCvToR2(file) {
  if (!file) throw new Error("No file provided");
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Only PDF / DOC / DOCX allowed");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("CV must be under 10 MB");
  }

  // 1. Ask backend for a presigned PUT URL
  const { data } = await api.post("/jobs/cv/presign", {
    filename: file.name,
    contentType: file.type,
  });

  if (!data?.uploadUrl || !data?.publicUrl) {
    throw new Error("Presign response missing uploadUrl / publicUrl");
  }

  // 2. PUT the file directly to R2
  const putRes = await fetch(data.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!putRes.ok) {
    const txt = await putRes.text().catch(() => "");
    throw new Error(`R2 upload failed (${putRes.status}): ${txt}`);
  }

  // 3. Return what the backend expects
  return {
    cvAttachmentUrl:  data.publicUrl,
    cvAttachmentName: file.name,
    cvAttachmentSize: file.size,
  };
}
