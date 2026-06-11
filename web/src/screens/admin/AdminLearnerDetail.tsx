import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mail, GraduationCap, Award, CheckCircle2, XCircle, CreditCard } from 'lucide-react';
import { api, LearnerDetail, naira } from '../../api';
import { TopBar, CourseThumb, ProgressBar, Spinner } from '../../components/ui';

export default function AdminLearnerDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<LearnerDetail | null>(null);

  useEffect(() => { api.get<LearnerDetail>(`/admin/users/${id}`).then(setData); }, [id]);
  if (!data) return <Spinner />;
  const u = data.user;

  return (
    <div className="flex flex-col min-h-full">
      <TopBar title={u.fullName} subtitle={u.role} onBack={() => nav('/admin/users')} />
      <div className="px-5 py-5 space-y-6">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-navy/10 text-navy flex items-center justify-center text-2xl font-extrabold">{u.fullName.charAt(0)}</div>
          <div className="flex-1 min-w-0">
            <h2 className="font-extrabold text-navy">{u.fullName}</h2>
            <p className="text-sm text-sub flex items-center gap-1"><Mail size={13} /> {u.email}</p>
            <div className="flex gap-2 mt-1.5">
              <span className="chip bg-violet-100 text-violet-700">{u.points.toLocaleString()} pts</span>
              <span className={`chip ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{u.active ? 'Active' : 'Suspended'}</span>
            </div>
          </div>
        </div>

        <Section icon={<GraduationCap size={18} />} title={`Enrollments (${data.enrollments.length})`}>
          {data.enrollments.length === 0 ? <Empty>No enrollments</Empty> : data.enrollments.map((e) => (
            <div key={e.slug} className="flex items-center gap-3 py-2.5">
              <CourseThumb icon={e.icon} color={e.color} size={44} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy text-sm truncate">{e.title}</p>
                <ProgressBar value={e.progress} className="mt-1" />
              </div>
              <span className="font-bold text-navy text-sm">{e.progress}%</span>
            </div>
          ))}
        </Section>

        <Section icon={<Award size={18} />} title={`Certificates (${data.certificates.length})`}>
          {data.certificates.length === 0 ? <Empty>None yet</Empty> : data.certificates.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <span className="text-sm text-navy">{c.title}</span>
              <span className="text-xs text-sub">{c.issued_at}</span>
            </div>
          ))}
        </Section>

        <Section icon={<CheckCircle2 size={18} />} title={`Quiz History (${data.quizzes.length})`}>
          {data.quizzes.length === 0 ? <Empty>No attempts</Empty> : data.quizzes.map((q, i) => (
            <div key={i} className="flex items-center gap-2 py-2">
              {q.passed ? <CheckCircle2 size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-red-500" />}
              <span className="text-sm text-navy flex-1 truncate">{q.title}</span>
              <span className="text-xs font-bold text-navy">{q.score}/{q.total}</span>
            </div>
          ))}
        </Section>

        <Section icon={<CreditCard size={18} />} title={`Payments (${data.orders.length})`}>
          {data.orders.length === 0 ? <Empty>No payments</Empty> : data.orders.map((o, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="min-w-0">
                <p className="text-sm text-navy truncate">{o.title}</p>
                <p className="text-[11px] text-sub">{o.reference}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-navy text-sm">{o.amount === 0 ? 'FREE' : naira(o.amount)}</p>
                <span className={`chip ${o.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-black/[0.06] text-sub'}`}>{o.status}</span>
              </div>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="font-extrabold text-navy flex items-center gap-2 mb-2">{icon} {title}</h3>
      <div className="divide-y divide-black/[0.05]">{children}</div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-sub py-2">{children}</p>;
}
