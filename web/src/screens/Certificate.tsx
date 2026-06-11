import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Share2, Download, BadgeCheck } from 'lucide-react';
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
    const r = await shareOrCopy({ title: 'My TELI Certificate', text: cert ? `I completed ${cert.title} on TELI!` : 'My certificate', url: `${location.origin}/course/${slug}` });
    setToast(r === 'copied' ? 'Link copied!' : 'Shared!'); setTimeout(() => setToast(''), 1800);
  };

  return (
    <div className="flex flex-col min-h-full bg-navy">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => nav(-1)} className="text-white"><ChevronLeft size={24} /></button>
        <h1 className="flex-1 font-bold text-white text-[16px]">Certificate</h1>
        <button onClick={share}><Share2 size={20} className="text-white" /></button>
      </div>
      {toast && <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-white text-navy text-sm font-semibold px-4 py-2 rounded-full fade-up">{toast}</div>}

      <div className="flex-1 flex items-center justify-center px-5">
        {cert === null ? (
          <p className="text-white/70 text-center">No certificate found for this course yet.<br />Complete all lessons to unlock it.</p>
        ) : (
          <div className="w-full bg-white rounded-2xl p-1.5 shadow-2xl">
            <div className="border-[3px] border-navy rounded-xl p-6 text-center relative">
              <div className="absolute inset-2 border border-amber-300/60 rounded-lg pointer-events-none" />
              <div className="flex justify-center mb-2"><BookMark size={44} /></div>
              <h2 className="text-xl font-extrabold tracking-[0.2em] text-navy">CERTIFICATE</h2>
              <p className="text-xs tracking-[0.3em] text-sub">OF COMPLETION</p>
              <p className="text-sm text-sub mt-5">This is to certify that</p>
              <p className="text-2xl font-extrabold text-navy mt-1" style={{ fontFamily: 'Georgia, serif' }}>{cert.recipient}</p>
              <div className="w-32 h-px bg-black/15 mx-auto my-3" />
              <p className="text-xs text-sub">has successfully completed the course</p>
              <p className="text-lg font-extrabold text-navy mt-1 leading-tight px-4">{cert.title}</p>
              <div className="flex items-center justify-center mt-5">
                <BadgeCheck size={48} className="text-amber-500" />
              </div>
              <div className="flex items-center justify-between mt-5 px-2">
                <div className="text-left">
                  <p className="text-xs font-bold text-navy border-t border-black/20 pt-1">{cert.issuedAt}</p>
                  <p className="text-[10px] text-sub">Date</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-navy border-t border-black/20 pt-1" style={{ fontFamily: 'Georgia, serif' }}>TELI Faculty</p>
                  <p className="text-[10px] text-sub">Signature</p>
                </div>
              </div>
              <p className="text-[9px] text-sub mt-4">The Elevate Learning Institute · Lagos, Nigeria</p>
            </div>
          </div>
        )}
      </div>

      {cert && (
        <div className="px-5 pb-7 pt-4 space-y-2">
          <button onClick={() => window.print()} className="btn-primary w-full"><Download size={18} /> Download / Print</button>
          <button onClick={() => nav('/learning')} className="w-full text-white/80 font-bold py-3">Back to My Learning</button>
        </div>
      )}
    </div>
  );
}
