import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Share2, Download, BadgeCheck } from 'lucide-react';
import { api, Certificate as Cert, shareOrCopy } from '../api';
import { Spinner } from '../components/ui';

// Fixed design canvas (A4 landscape ratio 1.414:1). The certificate is always
// laid out at this size, then scaled down to fit the screen — so the layout
// never collapses or overlaps, and the exported PDF is pixel-perfect.
const CW = 1000;
const CH = 707;

export default function Certificate() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [cert, setCert] = useState<Cert | null | undefined>(undefined);
  const [toast, setToast] = useState('');
  const [downloading, setDownloading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const certRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    api.get<{ certificates: Cert[] }>('/me/certificates').then((d) => setCert(d.certificates.find((c) => c.slug === slug) ?? null));
  }, [slug]);

  // Scale the fixed-size certificate to fit the available width.
  useEffect(() => {
    const fit = () => {
      const w = wrapRef.current?.clientWidth ?? CW;
      setScale(Math.min(w / CW, 1));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [cert]);

  if (cert === undefined) return <Spinner />;

  const share = async () => {
    const r = await shareOrCopy({ title: 'My TELI Certificate', text: cert ? `I completed ${cert.title} on TELI!` : '', url: `${location.origin}/course/${slug}` });
    setToast(r === 'copied' ? 'Link copied!' : 'Shared!'); setTimeout(() => setToast(''), 1800);
  };

  const download = async () => {
    const el = certRef.current;
    if (!el || !cert) return;
    setDownloading(true);
    const prevTransform = el.style.transform;
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      // Capture at full design size (strip the on-screen scale during capture).
      el.style.transform = 'none';
      // scale 4 → ~4000px wide canvas (~300dpi at A4) so the PDF stays crisp when zoomed.
      const canvas = await html2canvas(el, { scale: 4, backgroundColor: '#ffffff', useCORS: true, windowWidth: CW, windowHeight: CH });
      el.style.transform = prevTransform;
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      pdf.addImage(img, 'PNG', 0, 0, pw, ph);
      const safe = cert.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
      pdf.save(`TELI-Certificate-${safe}.pdf`);
    } catch {
      el.style.transform = prevTransform;
      setToast('Could not generate PDF — try again.'); setTimeout(() => setToast(''), 2200);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-navy">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => nav(-1)} className="text-white"><ChevronLeft size={24} /></button>
        <h1 className="flex-1 font-bold text-white text-[16px]">Certificate</h1>
        {cert && <button onClick={share}><Share2 size={20} className="text-white" /></button>}
      </div>
      {toast && <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-white text-navy text-sm font-semibold px-4 py-2 rounded-full fade-up">{toast}</div>}

      {cert === null ? (
        <p className="text-white/70 text-center px-8 mt-20">No certificate found for this course yet.<br />Complete all lessons to unlock it.</p>
      ) : (
        <div className="flex-1 flex items-start justify-center px-4 py-4">
          {/* responsive wrapper holds the scaled-down certificate */}
          <div ref={wrapRef} className="w-full max-w-[1000px]">
            <div style={{ width: '100%', aspectRatio: `${CW} / ${CH}`, position: 'relative', overflow: 'hidden' }} className="rounded-lg shadow-2xl">
              <div
                ref={certRef}
                style={{ width: CW, height: CH, position: 'absolute', top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: 'top left', background: '#ffffff' }}
              >
                <CertBody cert={cert} />
              </div>
            </div>
          </div>
        </div>
      )}

      {cert && (
        <div className="px-5 pb-7 pt-3 space-y-2">
          <button onClick={download} disabled={downloading} className="btn-primary w-full disabled:opacity-60">
            <Download size={18} /> {downloading ? 'Preparing PDF…' : 'Download PDF'}
          </button>
          <button onClick={() => nav('/learning')} className="w-full text-white/80 font-bold py-3">Back to My Learning</button>
        </div>
      )}
    </div>
  );
}

/* Fixed-size certificate artwork (1000×707). All sizes are in fixed px so the
   layout is identical on screen and in the exported PDF — no overlaps. */
function CertBody({ cert }: { cert: Cert }) {
  return (
    <div style={{ width: CW, height: CH, padding: 30, boxSizing: 'border-box' }}>
      <div style={{ width: '100%', height: '100%', border: '4px solid #10254a', borderRadius: 8, position: 'relative', boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', inset: 8, border: '1.5px solid rgba(242,100,25,0.45)', borderRadius: 5, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 70px', boxSizing: 'border-box' }}>
          {/* header — logo as an <img> so it aligns the same in the browser and the PDF */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 44 }}>
            <img src="/icon-512.png" width={40} height={40} style={{ display: 'block' }} alt="" crossOrigin="anonymous" />
            <span style={{ fontWeight: 800, color: '#10254a', fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1 }}>TELI</span>
          </div>
          <p style={{ fontSize: 12, letterSpacing: '0.3em', color: '#6b7280', marginTop: 8 }}>THE ELEVATE LEARNING INSTITUTE</p>

          <h2 style={{ fontSize: 44, fontWeight: 800, letterSpacing: '0.18em', color: '#10254a', marginTop: 22 }}>CERTIFICATE</h2>
          <p style={{ fontSize: 14, letterSpacing: '0.4em', color: '#6b7280', marginTop: 4 }}>OF COMPLETION</p>

          <p style={{ fontSize: 15, color: '#6b7280', marginTop: 26 }}>This is to certify that</p>
          <p style={{ fontSize: 44, fontWeight: 800, color: '#10254a', lineHeight: 1.1, marginTop: 8, fontFamily: 'Georgia, serif' }}>{cert.recipient}</p>
          <div style={{ width: 320, height: 1, background: 'rgba(0,0,0,0.15)', margin: '14px 0' }} />
          <p style={{ fontSize: 15, color: '#6b7280' }}>has successfully completed the course</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: '#10254a', lineHeight: 1.2, marginTop: 8, textAlign: 'center', maxWidth: 720 }}>{cert.title}</p>

          {/* seal — in normal flow, centered, cannot overlap */}
          <div style={{ marginTop: 14, width: 56, height: 56, borderRadius: '50%', background: 'rgba(242,100,25,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BadgeCheck size={34} color="#F26419" />
          </div>

          {/* footer pinned to bottom — value sits ON the line, label below */}
          <div style={{ marginTop: 'auto', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <SignBlock label="Date" value={<span style={{ fontSize: 17, fontWeight: 700, color: '#10254a' }}>{cert.issuedAt}</span>} />
            <SignBlock label="Authorised Signatory" value={
              cert.signatureImage
                ? <img src={cert.signatureImage} alt="signature" style={{ display: 'block', height: 48, maxWidth: 230, width: 'auto', objectFit: 'contain', margin: '0 auto' }} />
                : <span style={{ fontSize: 19, fontWeight: 700, color: '#10254a', fontFamily: 'Georgia, serif' }}>{cert.signatory}</span>
            } />
          </div>
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 12 }}>An initiative of Elevate Development Foundation</p>
        </div>
      </div>
    </div>
  );
}

// A signature/date block: the value rests on a line, with a small caption beneath the line.
function SignBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ width: 250, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ height: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>{value}</div>
      <div style={{ width: '100%', height: 1, background: 'rgba(0,0,0,0.35)' }} />
      <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{label}</p>
    </div>
  );
}
