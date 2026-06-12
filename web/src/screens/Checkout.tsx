import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tag, ShieldCheck, Lock, CheckCircle2, Loader2, CreditCard } from 'lucide-react';
import { api, CourseDetail as CD, Quote, naira } from '../api';
import { TopBar, CourseThumb, Spinner } from '../components/ui';

export default function Checkout() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [course, setCourse] = useState<CD | null>(null);
  const [coupon, setCoupon] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [checking, setChecking] = useState(false);
  const [stage, setStage] = useState<'review' | 'paying'>('review');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get<{ course: CD }>(`/courses/${slug}`).then((d) => setCourse(d.course)); }, [slug]);

  if (!course) return <Spinner />;
  const amount = quote ? quote.amount : course.price;
  const discount = quote?.discount ?? 0;

  const applyCoupon = async () => {
    setChecking(true); setError('');
    try {
      const q = await api.post<Quote>('/checkout/quote', { courseId: course.id, couponCode: coupon.trim() });
      setQuote(q);
      if (q.error) setError(q.error);
    } finally { setChecking(false); }
  };

  const pay = async () => {
    setBusy(true); setError('');
    try {
      const init = await api.post<{ mode: string; reference: string; amount: number; authorizationUrl?: string }>(
        '/checkout/init', { courseId: course.id, couponCode: quote?.appliedCoupon || undefined });
      if (init.mode === 'free') {
        await api.post('/checkout/verify', { reference: init.reference });
        nav(`/course/${slug}/enrolled`); return;
      }
      if (init.authorizationUrl) {
        // real gateway (Flutterwave / Paystack): remember which course, then redirect
        sessionStorage.setItem('teli_checkout', JSON.stringify({ reference: init.reference, slug }));
        window.location.href = init.authorizationUrl; return;
      }
      // sandbox — show simulated processing then verify
      setStage('paying');
      await new Promise((r) => setTimeout(r, 1600));
      await api.post('/checkout/verify', { reference: init.reference });
      nav(`/course/${slug}/enrolled`);
    } catch (e: any) { setError(e.message); setStage('review'); }
    finally { setBusy(false); }
  };

  if (stage === 'paying') {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-50 flex items-center justify-center mb-5">
          <Loader2 size={40} className="text-brand animate-spin" />
        </div>
        <h2 className="text-2xl font-extrabold text-navy">Processing payment…</h2>
        <p className="text-sub mt-2">Securely confirming your {naira(amount)} payment (sandbox).</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Checkout" subtitle="Secure payment" onBack={() => nav(`/course/${slug}`)} />

      <div className="px-5 py-5 flex-1">
        <div className="card p-4 flex items-center gap-4">
          <CourseThumb icon={course.icon} color={course.color} size={72} />
          <div className="flex-1 min-w-0">
            <span className="chip bg-brand-50 text-brand">{course.category}</span>
            <h2 className="font-extrabold text-navy leading-tight mt-1.5">{course.title}</h2>
            <p className="text-xs text-sub mt-1">{course.moduleCount} modules · {course.lessonCount} lessons</p>
          </div>
        </div>

        {/* coupon */}
        <div className="mt-5">
          <label className="text-sm font-bold text-navy flex items-center gap-2"><Tag size={16} /> Have a coupon?</label>
          <div className="flex gap-2 mt-2">
            <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Enter code"
              className="field flex-1 uppercase" />
            <button onClick={applyCoupon} disabled={!coupon.trim() || checking}
              className="btn-navy px-5 py-3 disabled:opacity-50">{checking ? '…' : 'Apply'}</button>
          </div>
          {quote?.appliedCoupon && (
            <p className="text-sm text-emerald-600 font-semibold mt-2 flex items-center gap-1">
              <CheckCircle2 size={15} /> Coupon {quote.appliedCoupon} applied — you save {naira(discount)}
            </p>
          )}
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>

        {/* summary */}
        <div className="card p-4 mt-5">
          <h3 className="font-bold text-navy mb-3">Order Summary</h3>
          <Row label="Course price" value={naira(course.price)} />
          {discount > 0 && <Row label={`Discount (${quote?.appliedCoupon})`} value={`– ${naira(discount)}`} green />}
          <div className="border-t border-black/10 my-3" />
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-navy">Total</span>
            <span className="text-2xl font-extrabold text-navy">{amount === 0 ? 'FREE' : naira(amount)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-sub mt-4">
          <Lock size={14} /> Payments are processed securely by Paystack. 7-day money-back guarantee.
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-black/[0.06] px-5 py-4">
        <button onClick={pay} disabled={busy} className="btn-primary w-full text-[17px]">
          {busy ? 'Please wait…' : amount === 0 ? 'Enrol for Free' : <>Pay {naira(amount)} <CreditCard size={19} /></>}
        </button>
        <div className="flex items-center justify-center gap-1.5 text-xs text-sub mt-2">
          <ShieldCheck size={14} className="text-navy" /> Trusted learning. Real impact.
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sub text-sm">{label}</span>
      <span className={`font-semibold ${green ? 'text-emerald-600' : 'text-navy'}`}>{value}</span>
    </div>
  );
}
