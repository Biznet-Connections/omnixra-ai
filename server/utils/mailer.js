// Email utility — Resend (HTTPS-based, works on Render)
import { Resend } from "resend";

let resend = null;

function getClient() {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY not set - email disabled");
    return null;
  }
  resend = new Resend(key);
  return resend;
}

function fromAddress() {
  return process.env.EMAIL_FROM || "Omnixra AI <onboarding@resend.dev>";
}

// ── Send verification code (signup) ──
export async function sendVerificationCode(email, code) {
  const client = getClient();
  if (!client) return { sent: false, reason: "mailer_disabled" };
  try {
    const { data, error } = await client.emails.send({
      from: fromAddress(),
      to: email,
      subject: "Your Omnixra verification code: " + code,
      text: [
        "Hi,",
        "",
        "Welcome to Omnixra AI!",
        "",
        "Your verification code is:",
        "",
        "    " + code,
        "",
        "This code expires in 10 minutes.",
        "",
        "If you did not sign up for Omnixra, ignore this email.",
        "",
        "- Omnixra AI"
      ].join("\n"),
      html: [
        '<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a;">',
        '  <h2 style="color:#6366f1;margin:0 0 16px;">Omnixra AI</h2>',
        '  <p>Hi,</p>',
        '  <p>Welcome to Omnixra AI! Use this code to verify your email:</p>',
        '  <div style="background:#f1f5f9;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">',
        '    <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#6366f1;">' + code + '</span>',
        '  </div>',
        '  <p style="color:#64748b;font-size:13px;">This code expires in 10 minutes.</p>',
        '  <p style="color:#64748b;font-size:12px;margin-top:32px;">If you did not sign up for Omnixra, ignore this email.</p>',
        '</div>'
      ].join(""),
    });
    if (error) {
      console.error("sendVerificationCode error:", error.message || error);
      return { sent: false, reason: error.message };
    }
    console.log("Verification email sent:", data && data.id);
    return { sent: true, id: data && data.id };
  } catch (e) {
    console.error("sendVerificationCode exception:", e.message);
    return { sent: false, reason: e.message };
  }
}

// ── Send password reset code ──
export async function sendResetCode(email, code, name) {
  const client = getClient();
  if (!client) return { sent: false, reason: "mailer_disabled" };
  try {
    const greeting = name ? ("Hi " + name + ",") : "Hi,";
    const { data, error } = await client.emails.send({
      from: fromAddress(),
      to: email,
      subject: "Your Omnixra password reset code: " + code,
      text: [
        greeting,
        "",
        "You asked to reset your Omnixra password.",
        "",
        "Your reset code is:",
        "",
        "    " + code,
        "",
        "This code expires in 10 minutes.",
        "",
        "If you did not request this, ignore this email. No one can access your account without this code.",
        "",
        "- Omnixra AI"
      ].join("\n"),
      html: [
        '<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a;">',
        '  <h2 style="color:#6366f1;margin:0 0 16px;">Omnixra AI</h2>',
        '  <p>' + greeting + '</p>',
        '  <p>You asked to reset your Omnixra password. Use this code:</p>',
        '  <div style="background:#f1f5f9;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">',
        '    <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#6366f1;">' + code + '</span>',
        '  </div>',
        '  <p style="color:#64748b;font-size:13px;">This code expires in 10 minutes.</p>',
        '  <p style="color:#64748b;font-size:12px;margin-top:32px;">If you did not request this, ignore this email. No one can access your account without this code.</p>',
        '</div>'
      ].join(""),
    });
    if (error) {
      console.error("sendResetCode error:", error.message || error);
      return { sent: false, reason: error.message };
    }
    console.log("Reset email sent:", data && data.id);
    return { sent: true, id: data && data.id };
  } catch (e) {
    console.error("sendResetCode exception:", e.message);
    return { sent: false, reason: e.message };
  }
}

export default { sendVerificationCode, sendResetCode };

// ═══════════════════════════════════════════════════════════
// NEW: Application + Profile email helpers (added for payments/apply flow)
// ═══════════════════════════════════════════════════════════

export async function sendEmail({ to, subject, html, replyTo }) {
  const client = getClient();
  if (!client) {
    console.warn("[mailer] RESEND_API_KEY not set - email skipped");
    return { success: false, message: "Email not configured" };
  }
  try {
    const { data, error } = await client.emails.send({
      from: fromAddress(),
      to,
      subject,
      html,
      replyTo: replyTo || undefined,
    });
    if (error) {
      console.error("[mailer] error:", error.message);
      return { success: false, message: error.message };
    }
    console.log("[mailer] sent to", to, "id:", data?.id);
    return { success: true, id: data?.id };
  } catch (e) {
    console.error("[mailer] error:", e.message);
    return { success: false, message: e.message };
  }
}

export function applicationEmailHtml({ applicantName, applicantEmail, applicantPhone, jobTitle, companyName, coverLetter, cvUrl }) {
  return `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
    <h2 style="color: #4f46e5;">New Application — ${jobTitle}</h2>
    <p><strong>${applicantName}</strong> has applied for <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>

    <div style="background: #f5f5ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0 0 8px;"><strong>Contact:</strong></p>
      <p style="margin: 0;">Email: ${applicantEmail}</p>
      ${applicantPhone ? `<p style="margin: 0;">Phone: ${applicantPhone}</p>` : ""}
    </div>

    <div style="background: #fafafa; padding: 16px; border-radius: 8px; border-left: 3px solid #4f46e5;">
      <p style="white-space: pre-wrap; margin: 0;">${coverLetter}</p>
    </div>

    ${cvUrl ? `<p style="margin-top: 20px;"><a href="${cvUrl}" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View CV</a></p>` : ""}

    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="font-size: 12px; color: #888;">Sent via Omnixra — omnixra-ai.com</p>
  </div>
  `;
}

export function profilePushEmailHtml({ user, companyName, message }) {
  return `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
    <h2 style="color: #4f46e5;">New Candidate — ${user.name}</h2>
    <p>${user.name} from ${user.location || "Zimbabwe"} is interested in opportunities at <strong>${companyName}</strong>.</p>

    <div style="background: #f5f5ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p style="margin: 0 0 8px;"><strong>Profile:</strong></p>
      <p style="margin: 0;">Name: ${user.name}</p>
      <p style="margin: 0;">Email: ${user.email}</p>
      ${user.headline ? `<p style="margin: 0;">Headline: ${user.headline}</p>` : ""}
      ${user.skills?.length ? `<p style="margin: 0;">Skills: ${user.skills.join(", ")}</p>` : ""}
    </div>

    ${message ? `<div style="background: #fafafa; padding: 16px; border-radius: 8px;"><p style="white-space: pre-wrap; margin: 0;">${message}</p></div>` : ""}

    <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="font-size: 12px; color: #888;">Sent via Omnixra — omnixra-ai.com</p>
  </div>
  `;
}
