export function openGmailCompose({ to, subject, body }) {
  const params = new URLSearchParams();
  if (to) params.set("to", to);
  if (subject) params.set("su", subject);
  if (body) params.set("body", body);
  const url = `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function buildApplicationEmail({ user, job }) {
  const subject = `Application: ${job.title} — ${user.name}`;
  const body = `Dear Hiring Manager,

I am writing to apply for the ${job.title} position at ${job.company}.

${user.headline ? user.headline + "\n\n" : ""}I would welcome the opportunity to discuss how I can contribute to your team.

Yours faithfully,
${user.name}
${user.email}${user.location ? "\n" + user.location : ""}`;
  return { subject, body };
}
