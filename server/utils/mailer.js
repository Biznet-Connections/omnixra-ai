import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.MAIL_FROM || "Omnixra <noreply@omnixra-ai.com>";

export async function sendEmail({ to, subject, html, replyTo }) {
  if (!resend) {
    console.warn("[mailer] RESEND_API_KEY not set - email skipped");
    return { success: false, message: "Email not configured" };
  }
  try {
    const res = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      replyTo: replyTo || undefined,
    });
    console.log("[mailer] sent to", to, "id:", res?.data?.id || res?.id);
    return { success: true, id: res?.data?.id || res?.id };
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
