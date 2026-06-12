import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Home, Trophy, CheckCircle2, XCircle, ChevronDown, ArrowRight, ClipboardCheck } from 'lucide-react';
import { QuizResult } from '../api';
import { Confetti } from '../components/ui';

export default function QuizResults() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { state } = useLocation() as { state: { result: QuizResult; courseTitle: string; moduleTitle: string } | null };
  const [open, setOpen] = useState<number | null>(null);

  if (!state?.result) { nav(`/course/${slug}`); return null; }
  const { result, courseTitle, moduleTitle } = state;
  const firstWrong = result.breakdown.find((b) => !b.correct);

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.05]">
        <button onClick={() => nav(`/course/${slug}`)} className="text-navy"><ChevronLeft size={24} /></button>
        <div className="flex-1 min-w-0 text-center">
          <h1 className="font-bold text-navy text-[15px] truncate">{courseTitle}</h1>
          <p className="text-xs text-sub truncate">{moduleTitle}</p>
        </div>
        <button onClick={() => nav('/home')} aria-label="Home"><Home size={20} className="text-navy" /></button>
      </div>

      <div className="px-5 py-3 flex items-center gap-3 border-b border-black/[0.05]">
        <span className="text-sm font-semibold text-navy whitespace-nowrap">Quiz Completed</span>
        <div className="flex-1 h-2 rounded-full bg-emerald-100"><div className="h-full bg-emerald-500 rounded-full w-full" /></div>
        <span className="text-sm font-bold text-navy">{result.total} of {result.total}</span>
      </div>

      <div className="px-5 py-6">
        <div className="card p-6 relative overflow-hidden">
          <Confetti />
          <div className="relative text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 flex items-center justify-center pop"><Trophy size={44} className="text-amber-400" /></div>
            <h2 className="text-[26px] font-extrabold text-navy mt-3">{result.passed ? 'Great Job! 🎉' : 'Keep Going!'}</h2>
            <p className="text-sub">You've completed the quiz.</p>

            <div className="grid grid-cols-3 gap-2 mt-5 rounded-2xl bg-black/[0.03] p-4">
              <Stat label="Your Score" value={`${result.percent}%`} sub={`${result.score} of ${result.total} correct`} color="text-emerald-600" />
              <Stat label="Result" value={result.passed ? 'Passed' : 'Retry'} sub={result.passed ? 'Well done!' : 'Try again'} color={result.passed ? 'text-emerald-600' : 'text-brand'} />
              <Stat label="Time Taken" value={result.timeTaken || '—'} sub="minutes" color="text-navy" />
            </div>
          </div>
        </div>

        <h3 className="font-extrabold text-navy text-lg mt-6 mb-3">Question Breakdown</h3>
        <div className="card divide-y divide-black/[0.05]">
          {result.breakdown.map((b, idx) => {
            const expanded = open === idx;
            return (
              <div key={idx}>
                <button onClick={() => setOpen(expanded ? null : idx)} className="w-full flex items-center gap-3 p-4 text-left">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${b.correct ? 'bg-emerald-500' : 'bg-brand'}`}>{idx + 1}</span>
                  <span className="flex-1 text-sm text-navy leading-tight">{b.question}</span>
                  <span className={`flex items-center gap-1 text-sm font-bold ${b.correct ? 'text-emerald-600' : 'text-brand'}`}>
                    {b.correct ? <CheckCircle2 size={17} /> : <XCircle size={17} />}{b.correct ? 'Correct' : 'Incorrect'}
                  </span>
                  <ChevronDown size={18} className={`text-sub transition ${expanded ? 'rotate-180' : ''}`} />
                </button>
                {expanded && (
                  <div className="px-4 pb-4 text-sm">
                    <p className="text-navy"><b>Correct Answer:</b> {String.fromCharCode(65 + b.correctAnswer)}. {b.options[b.correctAnswer]}</p>
                    {!b.correct && <p className="text-brand mt-1"><b>Your Answer:</b> {b.yourAnswer != null ? `${String.fromCharCode(65 + b.yourAnswer)}. ${b.options[b.yourAnswer]}` : 'Skipped'}</p>}
                    <p className="text-sub mt-2">{b.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {firstWrong && (
          <div className="mt-5 rounded-2xl bg-orange-50 p-4 flex gap-3">
            <div className="flex-1">
              <p className="text-brand font-bold text-sm">Question {firstWrong.index + 1}</p>
              <p className="text-navy text-sm mt-1"><b>Correct Answer:</b> {String.fromCharCode(65 + firstWrong.correctAnswer)}. {firstWrong.options[firstWrong.correctAnswer]}</p>
              <p className="text-sub text-sm mt-1">{firstWrong.explanation}</p>
            </div>
            <ClipboardCheck size={36} className="text-brand shrink-0" />
          </div>
        )}
      </div>

      <div className="mt-auto px-5 pb-7 space-y-3">
        <button onClick={() => nav(-1)} className="btn-navy w-full">Review Quiz</button>
        <button onClick={() => nav(`/course/${slug}`)} className="btn-outline w-full">Continue Learning <ArrowRight size={18} /></button>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-sub">{label}</p>
      <p className={`text-xl font-extrabold ${color}`}>{value}</p>
      <p className="text-[11px] text-sub">{sub}</p>
    </div>
  );
}
