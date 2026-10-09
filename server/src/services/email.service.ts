import nodemailer from "nodemailer";

interface PasswordResetEmail {
  email: string;
  name: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  email,
  name,
  resetUrl,
}: PasswordResetEmail): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass || !from) {
    throw new Error("SMTP_CONFIGURATION_MISSING");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: "Reset your WakePulse password",
    text: [
      `Hi ${name},`,
      "",
      "We received a request to reset your WakePulse password.",
      `Use this link within one hour: ${resetUrl}`,
      "",
      "If you did not request this change, you can ignore this email.",
    ].join("\n"),
    html: `<p>Hi ${escapeHtml(name)},</p><p>We received a request to reset your WakePulse password.</p><p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p><p>This link expires in one hour. If you did not request this change, you can ignore this email.</p>`,
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character] ?? character;
  });
}
