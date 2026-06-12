import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Share2, Printer, BadgeCheck } from 'lucide-react';
import { api, Certificate as Cert, shareOrCopy } from '../api';
import { Spinner, BookMark } from '../components/ui';

export default function Certificate() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [cert, setCert] = useState<Cert | null | undefined>(undefined);
  const [toast, setToast] = useState('');

  useEffect(() => {
    api.get<{ certificates: Cert[] }>('/me/certificates').then((d) => setCert(d.certificates.find((c) => c.slug === slug) ?? null));
  }, [slug]);

  if (cert === undefined) return <Spinner />;

  const share = async () => {
    const r = await shareOrCopy({ title: 'My TELI Certificate', text: cert ? `I completed ${cert.title} on TELI!` : '', url: `${location.origin}/course/${slug}` });
    setToast(r === 'copied' ? 'Link copied!' : 'Shared!'); setTimeout(() => setToast(''), 1800);
  };

  return (
    <div className="flex flex-col min-h-full bg-navy">
      {/* print: only the certificate, landscape A4 */}
      <style>{`@media print { @page { size: A4 landscape; margin: 0 } body * { visibility: hidden } #cert, #cert * { visibility: visible } #cert { position: fixed; inset: 0; width: 100vw; height: 100vh; border-radius: 0 } .no-print { display: none } }`}</style>

      <div className="flex items-center gap-3 px-4 py-3 no-print">
        <button onClick={() => nav(-1)} className="text-white"><ChevronLeft size={24} /></button>
        <h1 className="flex-1 font-bold text-white text-[16px]">Certificate</h1>
        <button onClick={share}><Share2 size={20} className="text-white" /></button>
      </div>
      {toast && <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-white text-navy text-sm font-semibold px-4 py-2 rounded-full fade-up no-print">{toast}</div>}

      {cert === null ? (
        <p className="text-white/70 text-center px-8 mt-20">No certificate found for this course yet.<br />Complete all lessons to unlock it.</p>
      ) : (
        <div className="flex-1 flex items-center justify-center px-3 py-2">
          {/* landscape A4 certificate */}
          <div id="cert" className="w-full max-w-[640px] bg-white" style={{ aspectRatio: '1.414 / 1' }}>
            <div className="w-full h-full p-[3%]">
              <div className="w-full h-full border-[3px] border-navy rounded-md relative flex flex-col items-center justify-center text-center px-[6%]">
                <div className="absolute inset-[6px] border border-amber-300/70 rounded pointer-events-none" />
                <div className="flex items-center gap-2 mb-1"><BookMark size={34} /><span className="font-extrabold text-navy text-xl tracking-tight">TELI</span></div>
                <p className="text-[10px] tracking-[0.25em] text-sub">THE ELEVATE LEARNING INSTITUTE</p>

                <h2 className="text-[clamp(18px,4.5vw,30px)] font-extrabold tracking-[0.18em] text-navy mt-3">CERTIFICATE</h2>
                <p className="text-[11px] tracking-[0.35em] text-sub -mt-0.5">OF COMPLETION</p>

                <p className="text-sub text-xs mt-4">This is to certify that</p>
                <p className="text-[clamp(22px,5.5vw,38px)] font-extrabold text-navy leading-tight mt-1" style={{ fontFamily: 'Georgia, serif' }}>{cert.recipient}</p>
                <div className="w-1/2 h-px bg-black/15 my-2" />
                <p className="text-sub text-xs">has successfully completed the course</p>
                <p className="text-[clamp(15px,3.5vw,22px)] font-extrabold text-navy leading-tight mt-1 px-4">{cert.title}</p>

                <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: '14%' }}><BadgeCheck size={44} className="text-amber-500" /></div>

                <div className="w-full flex items-end justify-between mt-auto px-[4%] pb-[2%]" style={{ marginTop: 'auto' }}>
                  <div className="text-center">
                    <p className="text-xs font-bold text-navy border-t border-black/30 pt-1 px-3">{cert.issuedAt}</p>
                    <p className="text-[9px] text-sub">Date</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-navy border-t border-black/30 pt-1 px-3" style={{ fontFamily: 'Georgia, serif' }}>{cert.signatory}</p>
                    <p className="text-[9px] text-sub">Authorised Signatory</p>
                  </div>
                </div>
                <p className="absolute bottom-[2%] left-1/2 -translate-x-1/2 text-[8px] text-sub">An initiative of Elevate Development Foundation · Lagos, Nigeria</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {cert && (
        <div className="px-5 pb-7 pt-3 space-y-2 no-print">
          <button onClick={() => window.print()} className="btn-primary w-full"><Printer size={18} /> Download / Print (A4)</button>
          <button onClick={() => nav('/learning')} className="w-full text-white/80 font-bold py-3">Back to My Learning</button>
        </div>
      )}
    </div>
  );
}
