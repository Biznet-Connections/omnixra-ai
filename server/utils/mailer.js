// Nodemailer setup — sends emails via Gmail SMTP using App Password
import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn("⚠️  GMAIL_USER or GMAIL_APP_PASSWORD not set — email disabled");
    return null;
  }
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // TLS via STARTTLS
    auth: { user, pass },
  });
  return transporter;
}

function fromAddress() {
  return process.env.EMAIL_FROM || process.env.GMAIL_USER;
}

// ── Send verification code (signup) ──
export async function sendVerificationCode(email, code) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "mailer_disabled" };
  try {
    await t.sendMail({
      from: fromAddress(),
      to: email,
      subject: `Your Omnixra verification code: ${code}`,
      text:
`Hi,

Welcome to Omnixra AI!

Your verification code is:

    ${code}

This code expires in 10 minutes.

If you didn't sign up for Omnixra, ignore this email.

— Omnixra AI
${fromAddress()}`,
      html:
`<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a;">
  <h2 style="color:#6366f1;margin:0 0 16px;">Omnixra AI</h2>
  <p>Hi,</p>
  <p>Welcome to Omnixra AI! Use this code to verify your email:</p>
  <div style="background:#f1f5f9;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
    <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#6366f1;">${code}</span>
  </div>
  <p style="color:#64748b;font-size:13px;">This code expires in 10 minutes.</p>
  <p style="color:#64748b;font-size:12px;margin-top:32px;">If you didn't sign up for Omnixra, ignore this email.</p>
</div>`,
    });
    return { sent: true };
  } catch (e) {
    console.error("sendVerificationCode error:", e.message);
    return { sent: false, reason: e.message };
  }
}

// ── Send password reset code ──
export async function sendResetCode(email, code) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "mailer_disabled" };
  try {
    await t.sendMail({
      from: fromAddress(),
      to: email,
      subject: `Your Omnixra reset code: ${code}`,
      text:
`Hi,

You asked to reset your Omnixra password.

Your reset code is:

    ${code}

This code expires in 10 minutes.

If you didn't request this, ignore this email.

— Omnixra AI
${fromAddress()}`,
      html:
`<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a;">
  <h2 style="color:#6366f1;margin:0 0 16px;">Omnixra AI</h2>
  <p>Hi,</p>
  <p>You asked to reset your Omnixra password. Use this code:</p>
  <div style="background:#f1f5f9;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
    <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#6366f1;">${code}</span>
  </div>
  <p style="color:#64748b;font-size:13px;">This code expires in 10 minutes.</p>
  <p style="color:#64748b;font-size:12px;margin-top:32px;">If you didn't request this, ignore this email.</p>
</div>`,
    });
    return { sent: true };
  } catch (e) {
    console.error("sendResetCode error:", e.message);
    return { sent: false, reason: e.message };
  }
}

export default { sendVerificationCode, sendResetCode };
