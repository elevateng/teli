import nodemailer from 'nodemailer';
import { config, emailEnabled } from './config.js';

let transporter = null;
if (emailEnabled) {
  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
  });
}

// In-memory log of "sent" mail when SMTP isn't configured (handy for the demo / dev).
export const sentMail = [];

function wrap(title, html) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;border:1px solid #eee;border-radius:14px;overflow:hidden">
    <div style="background:#0F2147;padding:20px 24px"><span style="color:#fff;font-weight:800;font-size:22px">TELI</span>
      <span style="color:#F26419;font-weight:800;font-size:22px"> ·</span></div>
    <div style="padding:24px;color:#0F2147">
      <h2 style="margin:0 0 12px">${title}</h2>
      ${html}
    </div>
    <div style="padding:16px 24px;background:#f7f8fb;color:#5b6577;font-size:12px">The Elevate Learning Institute · Lagos, Nigeria</div>
  </div>`;
}

export async function sendMail({ to, subject, title, html }) {
  const record = { to, subject, at: new Date().toISOString() };
  const body = wrap(title || subject, html);
  if (transporter) {
    try { await transporter.sendMail({ from: config.MAIL_FROM, to, subject, html: body }); record.delivered = true; }
    catch (e) { record.delivered = false; record.error = e.message; }
  } else {
    record.delivered = false; record.note = 'SMTP not configured — logged only';
    console.log(`[mail:dev] → ${to} | ${subject}`);
  }
  sentMail.unshift(record);
  if (sentMail.length > 100) sentMail.pop();
  return record;
}
