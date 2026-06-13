import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Save, CheckCircle2, LogOut, Camera, Trash2, Info, Mail, Sun, Moon, Download, FileText, Shield, LifeBuoy, ChevronRight, Smartphone } from 'lucide-react';
import { api, User as TUser, resizeImage } from '../api';
import { TopBar, Avatar, BookMark } from '../components/ui';
import { useAuth } from '../auth';
import { useTheme } from '../components/theme';
import { useInstall } from '../components/pwa';

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const nav = useNavigate();
  const { theme, setTheme } = useTheme();
  const { canInstall, isStandalone, isIos, promptInstall } = useInstall();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [tagline, setTagline] = useState(user?.tagline || '');
  const [savedMsg, setSavedMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [installMsg, setInstallMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickAvatar = async (file?: File) => {
    if (!file) return;
    setAvatarBusy(true);
    try { const { user } = await api.post<{ user: TUser }>('/auth/avatar', { dataUrl: await resizeImage(file, 256) }); setUser(user); }
    catch (e: any) { setSavedMsg(e.message || 'Could not update photo'); }
    finally { setAvatarBusy(false); }
  };
  const removeAvatar = async () => {
    setAvatarBusy(true);
    try { const { user } = await api.post<{ user: TUser }>('/auth/avatar', {}); setUser(user); }
    finally { setAvatarBusy(false); }
  };

  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  const saveProfile = async () => {
    setSavedMsg(''); setSaveErr('');
    try {
      const { user } = await api.post<{ user: TUser }>('/auth/profile', { fullName, tagline, email });
      setUser(user); setSavedMsg('Profile updated');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (e: any) { setSaveErr(e.message); }
  };
  const changePw = async () => {
    setPwMsg(''); setPwErr('');
    try { await api.post('/auth/change-password', { currentPassword: cur, newPassword: next }); setPwMsg('Password changed'); setCur(''); setNext(''); }
    catch (e: any) { setPwErr(e.message); }
  };
  const install = async () => {
    const r = await promptInstall();
    if (r === 'unavailable') setInstallMsg(isIos ? 'On iPhone/iPad: tap the Share button, then “Add to Home Screen”.' : 'Use your browser menu → “Install app” / “Add to Home screen”.');
    setTimeout(() => setInstallMsg(''), 6000);
  };

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Account Settings" onBack={() => nav(-1)} />
      <div className="px-5 py-5 space-y-6 max-w-[720px] mx-auto w-full">
        {/* profile */}
        <div className="card p-5">
          <h2 className="font-extrabold text-navy flex items-center gap-2 mb-4"><User size={18} /> Profile</h2>
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <Avatar name={user?.fullName} src={user?.avatar} size={72} />
              <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center ring-2 ring-white">
                <Camera size={14} />
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onPickAvatar(e.target.files?.[0])} />
            </div>
            <div>
              <button onClick={() => fileRef.current?.click()} disabled={avatarBusy} className="text-brand font-bold text-sm">{avatarBusy ? 'Updating…' : 'Change photo'}</button>
              {user?.avatar && <button onClick={removeAvatar} className="text-sub text-sm flex items-center gap-1 mt-1"><Trash2 size={13} /> Remove</button>}
            </div>
          </div>
          {saveErr && <div className="text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3 mb-3">{saveErr}</div>}
          <label className="block mb-3"><span className="text-sm font-bold text-navy">Full Name</span>
            <input className="field mt-1.5" value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
          <label className="block mb-3"><span className="text-sm font-bold text-navy">Email Address</span>
            <input className="field mt-1.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="block"><span className="text-sm font-bold text-navy">Tagline</span>
            <input className="field mt-1.5" value={tagline} onChange={(e) => setTagline(e.target.value)} /></label>
          <button onClick={saveProfile} className="btn-primary w-full mt-4"><Save size={18} /> Save Profile</button>
          {savedMsg && <p className="text-sm text-emerald-600 mt-2 flex items-center gap-1"><CheckCircle2 size={15} /> {savedMsg}</p>}
        </div>

        {/* appearance */}
        <div className="card p-5">
          <h2 className="font-extrabold text-navy flex items-center gap-2 mb-4"><Sun size={18} /> Appearance</h2>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setTheme('light')} className={`py-3.5 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold ${theme === 'light' ? 'border-brand bg-brand-50 text-brand' : 'border-black/10 text-navy'}`}>
              <Sun size={18} /> Light
            </button>
            <button onClick={() => setTheme('dark')} className={`py-3.5 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold ${theme === 'dark' ? 'border-brand bg-brand-50 text-brand' : 'border-black/10 text-navy'}`}>
              <Moon size={18} /> Dark
            </button>
          </div>
        </div>

        {/* install app */}
        {!isStandalone && (
          <div className="card p-5">
            <h2 className="font-extrabold text-navy flex items-center gap-2 mb-2"><Smartphone size={18} /> Install app</h2>
            <p className="text-sm text-sub mb-3">Add TELI to your home screen and open it like a native app — works offline-friendly, no browser bar.</p>
            <button onClick={install} className="btn-primary w-full"><Download size={18} /> Install TELI</button>
            {installMsg && <p className="text-sm text-navy mt-2">{installMsg}</p>}
          </div>
        )}

        {/* change password */}
        <div className="card p-5">
          <h2 className="font-extrabold text-navy flex items-center gap-2 mb-4"><Lock size={18} /> Change Password</h2>
          {pwErr && <div className="text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3 mb-3">{pwErr}</div>}
          <label className="block mb-3"><span className="text-sm font-bold text-navy">Current Password</span>
            <input type="password" className="field mt-1.5" value={cur} onChange={(e) => setCur(e.target.value)} /></label>
          <label className="block"><span className="text-sm font-bold text-navy">New Password</span>
            <input type="password" className="field mt-1.5" value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 8 characters" /></label>
          <button onClick={changePw} disabled={!next} className="btn-navy w-full mt-4 disabled:opacity-50">Update Password</button>
          {pwMsg && <p className="text-sm text-emerald-600 mt-2 flex items-center gap-1"><CheckCircle2 size={15} /> {pwMsg}</p>}
        </div>

        {/* support & legal */}
        <div className="card p-2">
          <Row icon={<LifeBuoy size={18} />} label="Help & Support" onClick={() => nav('/support')} />
          <Row icon={<FileText size={18} />} label="Terms & Conditions" onClick={() => nav('/legal/terms')} />
          <Row icon={<Shield size={18} />} label="Privacy Policy" onClick={() => nav('/legal/privacy')} last />
        </div>

        {/* about */}
        <div className="card p-5">
          <h2 className="font-extrabold text-navy flex items-center gap-2 mb-3"><Info size={18} /> About TELI</h2>
          <div className="flex items-center gap-3 mb-3">
            <BookMark size={40} />
            <div className="leading-tight">
              <p className="font-extrabold text-navy text-lg">TELI</p>
              <p className="text-xs text-sub">The Elevate Learning Institute</p>
            </div>
          </div>
          <p className="text-sm text-sub leading-relaxed">TELI delivers practical, accessible training for social-impact professionals and changemakers. Learn, lead, and elevate your impact.</p>
          <p className="text-sm text-navy font-semibold mt-3">An initiative of Elevate Development Foundation.</p>
          <div className="flex items-center gap-2 mt-3 text-xs text-sub">
            <Mail size={14} /> <a href="mailto:teli@elevateng.org" className="text-brand font-semibold">teli@elevateng.org</a>
          </div>
        </div>

        <button onClick={() => { logout(); nav('/'); }} className="w-full flex items-center justify-center gap-2 text-red-500 font-bold py-3 border border-red-200 rounded-2xl">
          <LogOut size={18} /> Log out
        </button>
      </div>
    </div>
  );
}

function Row({ icon, label, onClick, last }: { icon: React.ReactNode; label: string; onClick: () => void; last?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-3.5 text-left ${last ? '' : 'border-b border-black/[0.05]'}`}>
      <span className="text-brand">{icon}</span>
      <span className="flex-1 font-semibold text-navy">{label}</span>
      <ChevronRight size={18} className="text-sub" />
    </button>
  );
}
