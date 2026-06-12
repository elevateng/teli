import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldCheck, GraduationCap, Award, UserPlus, X, Ban, Trash2, Eye, ChevronRight } from 'lucide-react';
import { api, AdminUser, Role } from '../../api';
import { StatusBar, Spinner } from '../../components/ui';
import { useAuth } from '../../auth';

const ROLE_LABEL: Record<Role, string> = { learner: 'Learner', admin: 'Admin', super_admin: 'Super Admin' };
const ROLE_STYLE: Record<Role, string> = {
  learner: 'bg-violet-100 text-violet-700', admin: 'bg-brand-50 text-brand', super_admin: 'bg-navy text-white',
};

export default function AdminUsers() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Role | 'all'>('all');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const isSuper = user?.role === 'super_admin';
  const load = () => api.get<{ users: AdminUser[] }>('/admin/users').then((d) => setUsers(d.users));
  useEffect(() => { load(); }, []);

  const changeRole = async (u: AdminUser, role: Role) => {
    setError(''); setSavingId(u.id);
    try { await api.post(`/admin/users/${u.id}/role`, { role }); await load(); }
    catch (e: any) { setError(e.message); } finally { setSavingId(null); }
  };
  const toggleActive = async (u: AdminUser) => {
    setError('');
    try { await api.post(`/admin/users/${u.id}/active`, { active: !u.active }); await load(); }
    catch (e: any) { setError(e.message); }
  };
  const remove = async (u: AdminUser) => {
    if (!confirm(`Delete ${u.fullName}? This cannot be undone.`)) return;
    setError('');
    try { await api.del(`/admin/users/${u.id}`); await load(); }
    catch (e: any) { setError(e.message); }
  };

  if (!users) return <Spinner />;
  const filtered = users.filter((u) =>
    (filter === 'all' || u.role === filter) &&
    (u.fullName.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="pb-6">
      <StatusBar />
      <div className="px-5 pt-3 flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold text-navy">Manage Users</h1>
          <p className="text-sub text-sm">{users.length} accounts</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary px-4 py-2.5 text-sm"><UserPlus size={18} /> Invite</button>
      </div>

      {error && <div className="mx-5 mt-3 text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3">{error}</div>}

      <div className="px-5 mt-4">
        <div className="flex items-center gap-2 bg-black/[0.04] rounded-2xl px-4 py-3">
          <Search size={18} className="text-sub" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="flex-1 bg-transparent outline-none text-[15px]" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 mt-3">
        {(['all', 'learner', 'admin', 'super_admin'] as const).map((r) => (
          <button key={r} onClick={() => setFilter(r)}
            className={`chip whitespace-nowrap border ${filter === r ? 'bg-brand text-white border-brand' : 'bg-white text-navy border-black/10'}`}>
            {r === 'all' ? 'All' : ROLE_LABEL[r]}
          </button>
        ))}
      </div>

      <div className="px-5 mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
        {filtered.map((u) => {
          const isSelf = u.id === user?.id;
          const canManageStaff = isSuper || u.role === 'learner';
          return (
            <div key={u.id} className={`card p-4 ${u.active ? '' : 'opacity-60'}`}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-navy/10 text-navy flex items-center justify-center font-extrabold">{u.fullName.charAt(0)}</div>
                <button onClick={() => nav(`/admin/users/${u.id}`)} className="flex-1 min-w-0 text-left">
                  <p className="font-bold text-navy leading-tight truncate">{u.fullName}{isSelf && <span className="text-sub font-normal"> (you)</span>}</p>
                  <p className="text-xs text-sub truncate">{u.email}</p>
                </button>
                <span className={`chip ${ROLE_STYLE[u.role]} flex items-center gap-1`}>
                  {u.role !== 'learner' && <ShieldCheck size={12} />}{ROLE_LABEL[u.role]}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-sub">
                <span className="flex items-center gap-1"><GraduationCap size={14} /> {u.enrollments}</span>
                <span className="flex items-center gap-1"><Award size={14} /> {u.certificates}</span>
                {!u.active && <span className="chip bg-red-100 text-red-600">Suspended</span>}
                <button onClick={() => nav(`/admin/users/${u.id}`)} className="ml-auto flex items-center gap-1 text-brand font-bold"><Eye size={14} /> View</button>
              </div>

              {!isSelf && (
                <div className="mt-3 pt-3 border-t border-black/[0.05] flex flex-wrap items-center gap-2">
                  {isSuper && (
                    <>
                      <span className="text-xs font-semibold text-sub">Role:</span>
                      {(['learner', 'admin', 'super_admin'] as Role[]).map((r) => (
                        <button key={r} disabled={savingId === u.id || u.role === r} onClick={() => changeRole(u, r)}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border ${u.role === r ? 'bg-navy text-white border-navy' : 'border-black/15 text-navy disabled:opacity-40'}`}>
                          {ROLE_LABEL[r]}
                        </button>
                      ))}
                    </>
                  )}
                  {canManageStaff && (
                    <div className="flex gap-2 ml-auto">
                      <button onClick={() => toggleActive(u)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-700 flex items-center gap-1">
                        <Ban size={13} /> {u.active ? 'Suspend' : 'Reactivate'}
                      </button>
                      <button onClick={() => remove(u)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-red-200 text-red-500 flex items-center gap-1">
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-sub py-10">No users match.</p>}
      </div>

      {adding && <AddUser isSuper={isSuper} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); load(); }} />}
    </div>
  );
}

function AddUser({ isSuper, onClose, onAdded }: { isSuper: boolean; onClose: () => void; onAdded: () => void }) {
  const [fullName, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('learner');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ emailed: boolean; tempPassword?: string; email: string } | null>(null);

  const save = async () => {
    setBusy(true); setError('');
    try {
      const r = await api.post<{ emailed: boolean; tempPassword?: string }>('/admin/users', { fullName, email, role });
      setDone({ emailed: r.emailed, tempPassword: r.tempPassword, email });
      onAdded();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="absolute inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl p-5 fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-navy">{done ? 'Invitation sent' : 'Invite a user'}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center"><X size={18} /></button>
        </div>

        {done ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-navy">
              <p className="font-bold text-emerald-700 mb-1">{done.emailed ? 'Email sent ✅' : 'Account created ✅'}</p>
              <p>{done.email} can now log in. They'll be asked to set their own password on first login.</p>
            </div>
            {done.tempPassword && (
              <div className="rounded-2xl bg-amber-50 p-4 text-sm">
                <p className="font-bold text-amber-800">Email isn't configured yet — share this temporary password securely:</p>
                <p className="font-mono text-navy text-base mt-1 select-all bg-white rounded-lg px-3 py-2 inline-block">{done.tempPassword}</p>
              </div>
            )}
            <button onClick={onClose} className="btn-primary w-full mt-2">Done</button>
          </div>
        ) : (
          <>
            {error && <div className="text-sm bg-red-50 text-red-600 rounded-xl px-4 py-3 mb-3">{error}</div>}
            <div className="space-y-4">
              <input className="field" placeholder="Full name" value={fullName} onChange={(e) => setName(e.target.value)} />
              <input className="field" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
              <div>
                <span className="text-sm font-bold text-navy">Role</span>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {(['learner', 'admin', 'super_admin'] as Role[]).map((r) => {
                    const disabled = r !== 'learner' && !isSuper;
                    return (
                      <button key={r} disabled={disabled} onClick={() => setRole(r)}
                        className={`py-2.5 rounded-xl border-2 text-xs font-bold ${role === r ? 'border-brand bg-brand-50 text-brand' : 'border-black/10 text-navy'} disabled:opacity-30`}>
                        {ROLE_LABEL[r]}
                      </button>
                    );
                  })}
                </div>
                {!isSuper && <p className="text-xs text-sub mt-2">Admins can add learners. Only a Super Admin can add staff.</p>}
              </div>
              <p className="text-xs text-sub">A secure password is generated and emailed automatically — you don't set one.</p>
            </div>
            <button onClick={save} disabled={busy || !fullName || !email} className="btn-primary w-full mt-5">{busy ? 'Sending…' : 'Send Invitation'}</button>
          </>
        )}
      </div>
    </div>
  );
}
