import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, RuntimeConfig } from '../api';
import { useAuth, homeForRole } from '../auth';

// Reuse the Google "G" mark
function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.3 0-11.5-5.2-11.5-11.5S17.7 12.5 24 12.5c2.9 0 5.5 1.1 7.5 2.9l5.7-5.7C33.6 6.5 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.5 1.1 7.5 2.9l5.7-5.7C33.6 6.5 29.1 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43.5c5.2 0 9.6-2 12.9-5.2l-6-5c-1.9 1.4-4.3 2.2-6.9 2.2-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39 16.2 43.5 24 43.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.3l6 5c-.4.4 6.7-4.9 6.7-14.3 0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

declare global { interface Window { google?: any; } }

export default function GoogleButton() {
  const { googleAuth } = useAuth();
  const nav = useNavigate();
  const [cfg, setCfg] = useState<RuntimeConfig | null>(null);
  const [error, setError] = useState('');
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => { api.get<RuntimeConfig>('/config').then(setCfg).catch(() => setCfg(null)); }, []);

  // Live Google Identity Services
  useEffect(() => {
    if (!cfg?.googleEnabled || !cfg.googleClientId) return;
    const id = 'gsi-script';
    const init = () => {
      window.google?.accounts.id.initialize({
        client_id: cfg.googleClientId,
        callback: async (resp: any) => {
          try { const u = await googleAuth({ credential: resp.credential }); nav(homeForRole(u), { replace: true }); }
          catch (e: any) { setError(e.message); }
        },
      });
      if (slotRef.current) window.google?.accounts.id.renderButton(slotRef.current, { theme: 'outline', size: 'large', width: 320, text: 'continue_with' });
    };
    if (document.getElementById(id)) { init(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true; s.id = id;
    s.onload = init;
    document.body.appendChild(s);
  }, [cfg]);

  // Only show Google sign-in when it's actually configured. No insecure fallback.
  if (!cfg?.googleEnabled) return null;

  return (
    <div>
      <div className="flex items-center gap-3 my-5 text-sub text-sm">
        <div className="h-px flex-1 bg-black/10" /> or <div className="h-px flex-1 bg-black/10" />
      </div>
      <div ref={slotRef} className="flex justify-center" />
      {error && <p className="text-sm text-red-500 mt-2 text-center">{error}</p>}
    </div>
  );
}
