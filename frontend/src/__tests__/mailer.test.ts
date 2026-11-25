import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMail = vi.fn(async () => ({ messageId: 'm1' }));
const createTransport = vi.fn((_opts: any) => ({ sendMail }));
vi.mock('nodemailer', () => ({ default: { createTransport }, createTransport }));

const load = async () => {
  vi.resetModules();
  return import('@/lib/mailer');
};

describe('mailer', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    for (const k of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM', 'EMAIL_REPLY_TO']) vi.stubEnv(k, '');
    sendMail.mockClear();
    createTransport.mockClear();
  });

  it('uses any SMTP provider (e.g. Brevo) when SMTP_* is set', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp-relay.brevo.com');
    vi.stubEnv('SMTP_PORT', '587');
    vi.stubEnv('SMTP_USER', 'login@brevo');
    vi.stubEnv('SMTP_PASS', 'key');
    vi.stubEnv('EMAIL_FROM', 'WAR <orders@war.in>');
    const { sendEmail } = await load();

    const res = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>', text: 'Hi' });

    expect(res).toEqual({ sent: true });
    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp-relay.brevo.com', port: 587, secure: false, auth: { user: 'login@brevo', pass: 'key' },
    });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: 'WAR <orders@war.in>', to: 'a@b.com', subject: 'Hi' }));
  });

  it('falls back to Gmail (EMAIL_USER / EMAIL_PASS) and sends from that address', async () => {
    vi.stubEnv('EMAIL_USER', 'shop@gmail.com');
    vi.stubEnv('EMAIL_PASS', 'app-password');
    const { sendEmail } = await load();

    await sendEmail({ to: 'a@b.com', subject: 'Hi', html: 'x', text: 'x' });

    expect(createTransport).toHaveBeenCalledWith({ service: 'gmail', auth: { user: 'shop@gmail.com', pass: 'app-password' } });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: 'WAR <shop@gmail.com>' }));
  });

  it('skips quietly (never throws) when email is not configured', async () => {
    const { sendEmail } = await load();
    expect(await sendEmail({ to: 'a@b.com', subject: 'Hi', html: 'x', text: 'x' })).toEqual({ sent: false, reason: 'not_configured' });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('reports a failure instead of throwing when the provider errors', async () => {
    vi.stubEnv('EMAIL_USER', 'shop@gmail.com');
    vi.stubEnv('EMAIL_PASS', 'pw');
    sendMail.mockRejectedValueOnce(new Error('SMTP down'));
    const { sendEmail } = await load();
    expect(await sendEmail({ to: 'a@b.com', subject: 'Hi', html: 'x', text: 'x' })).toEqual({ sent: false, reason: 'SMTP down' });
  });
});
