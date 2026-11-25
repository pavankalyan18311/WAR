import nodemailer from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type SendResult = { sent: true } | { sent: false; reason: string };

/**
 * Picks the mail server from env:
 *  - SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS — any provider (Brevo: smtp-relay.brevo.com:587)
 *  - otherwise EMAIL_USER / EMAIL_PASS — a Gmail account with an app password (fine for testing)
 * EMAIL_FROM (e.g. "WAR <orders@yourdomain.in>") is the sender; EMAIL_REPLY_TO is optional.
 */
function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_USER, EMAIL_PASS, EMAIL_FROM } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    const port = Number(SMTP_PORT) || 587;
    return {
      transport: nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } }),
      from: EMAIL_FROM || `WAR <${SMTP_USER}>`,
    };
  }
  if (EMAIL_USER && EMAIL_PASS) {
    return {
      transport: nodemailer.createTransport({ service: 'gmail', auth: { user: EMAIL_USER, pass: EMAIL_PASS } }),
      from: EMAIL_FROM || `WAR <${EMAIL_USER}>`,
    };
  }
  return null;
}

/** Sends one email. Never throws — a mail problem must not break an order. */
export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const mailer = getTransport();
  if (!mailer) {
    console.warn('[email] not configured — skipped:', msg.subject);
    return { sent: false, reason: 'not_configured' };
  }
  try {
    await mailer.transport.sendMail({
      from: mailer.from,
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    return { sent: true };
  } catch (err: any) {
    console.error('[email] send failed:', msg.subject, err?.message);
    return { sent: false, reason: err?.message || 'send_failed' };
  }
}
