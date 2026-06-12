import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, XCircle, ArrowLeft } from 'lucide-react';
import { api } from '../api';

// Both gateways redirect here after payment:
//   Flutterwave -> ?status=successful&tx_ref=TELI-...&transaction_id=123456
//   Paystack    -> ?reference=TELI-...&trxref=TELI-...
export default function CheckoutCallback() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [error, setError] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const stored = (() => { try { return JSON.parse(sessionStorage.getItem('teli_checkout') || '{}'); } catch { return {}; } })();
    const reference = params.get('tx_ref') || params.get('reference') || stored.reference;
    const transactionId = params.get('transaction_id') || undefined;
    const status = (params.get('status') || '').toLowerCase();
    const slug = stored.slug;

    (async () => {
      if (!reference) { setError('We could not find your payment reference.'); return; }
      if (status === 'cancelled' || status === 'failed') {
        setError('Your payment was cancelled. You have not been charged.');
        return;
      }
      try {
        const res = await api.post<{ status: string; course?: { slug: string } }>('/checkout/verify', { reference, transactionId });
        sessionStorage.removeItem('teli_checkout');
        const dest = res.course?.slug || slug;
        nav(dest ? `/course/${dest}/enrolled` : '/learning', { replace: true });
      } catch (e: any) {
        setError(e.message || 'We could not confirm your payment.');
      }
    })();
  }, []);

  return (
    <div className="flex flex-col h-full items-center justify-center px-8 text-center">
      {error ? (
        <>
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-5"><XCircle size={40} className="text-red-500" /></div>
          <h2 className="text-2xl font-extrabold text-navy">Payment not completed</h2>
          <p className="text-sub mt-2">{error}</p>
          <button onClick={() => nav('/learning', { replace: true })} className="btn-primary mt-6 px-6"><ArrowLeft size={18} /> Back to My Learning</button>
        </>
      ) : (
        <>
          <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center mb-5"><Loader2 size={40} className="text-brand animate-spin" /></div>
          <h2 className="text-2xl font-extrabold text-navy">Confirming your payment…</h2>
          <p className="text-sub mt-2">Just a moment while we finalise your enrollment.</p>
        </>
      )}
    </div>
  );
}
