import nodemailer from "nodemailer";
import { getAlertSender } from "./admin-email-settings.service.js";

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

interface ServiceAlertEmail {
  email: string;
  name: string;
  serviceName: string;
  event: "service_down" | "service_recovered";
  error: string | null;
  checkedAt: Date;
}

export async function sendServiceAlertEmail({
  email,
  name,
  serviceName,
  event,
  error,
  checkedAt,
}: ServiceAlertEmail): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass) {
    throw new Error("SMTP_CONFIGURATION_MISSING");
  }

  const sender = await getAlertSender();
  if (!sender.senderEmail) {
    throw new Error("ALERT_SENDER_EMAIL_MISSING");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
  });
  const failed = event === "service_down";
  const safeServiceName = serviceName.replace(/[\r\n]+/g, " ").slice(0, 100);
  const subject = failed
    ? `WakePulse alert: ${safeServiceName} is down`
    : `WakePulse recovery: ${safeServiceName} is back online`;
  const message = failed
    ? `${safeServiceName} failed a health check.${error ? ` Check result: ${error}.` : ""}`
    : `${safeServiceName} responded successfully after a previous failure.`;
  const safeSenderName = sender.senderName
    .replace(/[\r\n"\\]/g, "")
    .slice(0, 80);
  const from = `"${safeSenderName}" <${sender.senderEmail}>`;

  await transporter.sendMail({
    from,
    to: email,
    subject,
    text: [
      `Hi ${name},`,
      "",
      message,
      `Checked at: ${checkedAt.toISOString()}`,
      "",
      "Manage your monitored services in WakePulse.",
    ].join("\n"),
    html: [
      `<p>Hi ${escapeHtml(name)},</p>`,
      `<p>${escapeHtml(message)}</p>`,
      `<p><strong>Checked at:</strong> ${escapeHtml(checkedAt.toISOString())}</p>`,
      "<p>Manage your monitored services in WakePulse.</p>",
    ].join(""),
  });
}

export async function sendAdminTestEmail(
  email: string,
  name: string,
): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass) {
    throw new Error("SMTP_CONFIGURATION_MISSING");
  }

  const sender = await getAlertSender();
  if (!sender.senderEmail) {
    throw new Error("ALERT_SENDER_EMAIL_MISSING");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
  });
  const safeSenderName = sender.senderName
    .replace(/[\r\n"\\]/g, "")
    .slice(0, 80);

  await transporter.sendMail({
    from: `"${safeSenderName}" <${sender.senderEmail}>`,
    to: email,
    subject: "WakePulse email alerts are configured",
    text: `Hi ${name},\n\nThis test confirms WakePulse can send service alerts from the configured sender address.`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>This test confirms WakePulse can send service alerts from the configured sender address.</p>`,
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
