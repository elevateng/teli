import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Save, CheckCircle2, LogOut, Camera, Trash2, Info, Mail } from 'lucide-react';
import { api, User as TUser, resizeImage } from '../api';
import { TopBar, Avatar, BookMark } from '../components/ui';
import { useAuth } from '../auth';

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const nav = useNavigate();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [tagline, setTagline] = useState(user?.tagline || '');
  const [savedMsg, setSavedMsg] = useState('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickAvatar = async (file?: File) => {
    if (!file) return;
    setAvatarBusy(true);
    try {
      const dataUrl = await resizeImage(file, 256);
      const { user } = await api.post<{ user: TUser }>('/auth/avatar', { dataUrl });
      setUser(user);
    } catch (e: any) { setSavedMsg(e.message || 'Could not update photo'); }
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
    setSavedMsg('');
    const { user } = await api.post<{ user: TUser }>('/auth/profile', { fullName, tagline });
    setUser(user); setSavedMsg('Profile updated');
    setTimeout(() => setSavedMsg(''), 2500);
  };
  const changePw = async () => {
    setPwMsg(''); setPwErr('');
    try { await api.post('/auth/change-password', { currentPassword: cur, newPassword: next }); setPwMsg('Password changed'); setCur(''); setNext(''); }
    catch (e: any) { setPwErr(e.message); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title="Account Settings" onBack={() => nav(-1)} />
      <div className="px-5 py-5 space-y-6">
        <div className="card p-5">
          <h2 className="font-extrabold text-navy flex items-center gap-2 mb-4"><User size={18} /> Profile</h2>
          <div className="flex items-center gap-4 mb-5">
            <div className="relative">
              <Avatar name={user?.fullName} src={user?.avatar} size={72} />
              <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center ring-2 ring-white">
                <Camera size={14} />
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                onChange={(e) => onPickAvatar(e.target.files?.[0])} />
            </div>
            <div>
              <button onClick={() => fileRef.current?.click()} disabled={avatarBusy} className="text-brand font-bold text-sm">{avatarBusy ? 'Updating…' : 'Change photo'}</button>
              {user?.avatar && <button onClick={removeAvatar} className="text-sub text-sm flex items-center gap-1 mt-1"><Trash2 size={13} /> Remove</button>}
            </div>
          </div>
          <label className="block mb-3"><span className="text-sm font-bold text-navy">Full Name</span>
            <input className="field mt-1.5" value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
          <label className="block"><span className="text-sm font-bold text-navy">Tagline</span>
            <input className="field mt-1.5" value={tagline} onChange={(e) => setTagline(e.target.value)} /></label>
          <p className="text-xs text-sub mt-2">Email: {user?.email}</p>
          <button onClick={saveProfile} className="btn-primary w-full mt-4"><Save size={18} /> Save Profile</button>
          {savedMsg && <p className="text-sm text-emerald-600 mt-2 flex items-center gap-1"><CheckCircle2 size={15} /> {savedMsg}</p>}
        </div>

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

        <div className="card p-5">
          <h2 className="font-extrabold text-navy flex items-center gap-2 mb-3"><Info size={18} /> About TELI</h2>
          <div className="flex items-center gap-3 mb-3">
            <BookMark size={40} />
            <div className="leading-tight">
              <p className="font-extrabold text-navy text-lg">TELI</p>
              <p className="text-xs text-sub">The Elevate Learning Institute</p>
            </div>
          </div>
          <p className="text-sm text-sub leading-relaxed">
            TELI — The Elevate Learning Institute — delivers practical, accessible training for
            social-impact professionals and changemakers. Learn, lead, and elevate your impact.
          </p>
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
