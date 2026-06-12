import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

// minimal .env loader (no dependency) — does not overwrite real process.env
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim().replace(/^["']|["']$/g, '');
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

export const config = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'teli-dev-secret-change-me',
  APP_URL: process.env.APP_URL || 'http://localhost:5173',
  // Paystack
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || '',
  PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY || '',
  // Flutterwave
  FLW_SECRET_KEY: process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY || '',
  FLW_PUBLIC_KEY: process.env.FLW_PUBLIC_KEY || process.env.FLUTTERWAVE_PUBLIC_KEY || '',
  FLW_SECRET_HASH: process.env.FLW_SECRET_HASH || '', // for webhook verification
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  // SMTP / email
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || 'TELI <no-reply@teli.africa>',
};

// A gateway is "live" only when its secret key is configured; otherwise the app
// runs a built-in sandbox so the whole checkout flow still works for testing.
export const paystackEnabled = config.PAYSTACK_SECRET_KEY.startsWith('sk_');
export const flutterwaveEnabled = config.FLW_SECRET_KEY.startsWith('FLWSECK');
// Active gateway: prefer Flutterwave, then Paystack, else sandbox.
export const paymentProvider = flutterwaveEnabled ? 'flutterwave' : (paystackEnabled ? 'paystack' : 'sandbox');
export const googleEnabled = !!config.GOOGLE_CLIENT_ID;
export const emailEnabled = !!config.SMTP_HOST;
