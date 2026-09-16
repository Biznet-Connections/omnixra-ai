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
