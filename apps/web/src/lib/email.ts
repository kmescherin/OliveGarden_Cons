import nodemailer from "nodemailer";

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log("[email] SMTP not configured, logging instead:", { to, subject, text });
    return { ok: true };
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "noreply@olivegarden.example";

  try {
    const transporter = nodemailer.createTransport({ host, port, auth: { user, pass } });
    await transporter.sendMail({ from, to, subject, html, text });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[email] Failed to send:", message);
    return { ok: false, error: message };
  }
}
