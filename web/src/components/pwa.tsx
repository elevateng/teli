import { useEffect, useState } from 'react';

type BIPEvent = Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> };

let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();
const ping = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BIPEvent; ping(); });
  window.addEventListener('appinstalled', () => { deferred = null; ping(); });
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}
export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  try { deferred.prompt(); const { outcome } = await deferred.userChoice; deferred = null; ping(); return outcome as any; }
  catch { return 'unavailable'; }
}

// React hook for components that want to offer install.
export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => { const cb = () => force((x) => x + 1); listeners.add(cb); return () => { listeners.delete(cb); }; }, []);
  return { canInstall: !!deferred, isStandalone: isStandalone(), isIos: isIos(), promptInstall };
}
