import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Home, ArrowLeft, Lightbulb, CheckCircle2, XCircle } from 'lucide-react';
import { api, CourseDetail as CD, QuizResult } from '../api';
import { Spinner, ProgressBar } from '../components/ui';

interface Q { q: string; options: string[]; answer: number; explanation: string; }

export default function Quiz() {
  const { slug, lessonId } = useParams();
  const nav = useNavigate();
  const [course, setCourse] = useState<CD | null>(null);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submittedThis, setSubmittedThis] = useState(false);
  const [busy, setBusy] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => { api.get<{ course: CD }>(`/courses/${slug}`).then((d) => setCourse(d.course)); }, [slug]);

  const lesson = useMemo(() => course?.modules.flatMap((m) => m.lessons).find((l) => l.id === Number(lessonId)), [course, lessonId]);
  const moduleTitle = useMemo(() => course?.modules.find((m) => m.lessons.some((l) => l.id === Number(lessonId)))?.title, [course, lessonId]);
  const questions: Q[] = lesson?.body?.quiz?.questions ?? [];

  useEffect(() => { if (questions.length) setAnswers(Array(questions.length).fill(null)); }, [questions.length]);

  if (!course || !lesson) return <Spinner />;
  const q = questions[i];
  const selected = answers[i];
  const isLast = i === questions.length - 1;

  const choose = (idx: number) => { if (submittedThis) return; setAnswers((a) => a.map((v, k) => (k === i ? idx : v))); };

  const submitAnswer = async () => {
    if (selected == null) return;
    if (!submittedThis) { setSubmittedThis(true); return; }
    // move next
    if (!isLast) { setI(i + 1); setSubmittedThis(false); return; }
    // finish quiz -> grade on server
    setBusy(true);
    const elapsed = Math.round((Date.now() - startRef.current) / 1000);
    const timeTaken = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
    try {
      const result = await api.post<QuizResult>(`/lessons/${lesson.id}/quiz`, { answers, timeTaken });
      nav(`/learn/${slug}/quiz/${lesson.id}/results`, { state: { result, courseTitle: course.title, moduleTitle, slug } });
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.05]">
        <button onClick={() => nav(`/course/${slug}`)} className="text-navy"><ChevronLeft size={24} /></button>
        <div className="flex-1 min-w-0 text-center">
          <h1 className="font-bold text-navy text-[15px] truncate">{course.title}</h1>
          <p className="text-xs text-sub truncate">{moduleTitle}</p>
        </div>
        <button onClick={() => nav('/home')} aria-label="Home"><Home size={20} className="text-navy" /></button>
      </div>

      <div className="px-5 py-3 flex items-center gap-3 border-b border-black/[0.05]">
        <span className="text-sm font-semibold text-navy whitespace-nowrap">Question {i + 1} of {questions.length}</span>
        <ProgressBar value={Math.round(((i + (submittedThis ? 1 : 0)) / questions.length) * 100)} className="flex-1" />
        <span className="text-sm font-bold text-navy">{Math.round((i / questions.length) * 100)}%</span>
      </div>

      <div className="px-5 py-6 flex-1">
        <div className="card p-5">
          <span className="chip bg-brand-50 text-brand">Multiple Choice</span>
          <h2 className="text-[22px] font-extrabold text-navy mt-3 leading-snug">{q.q}</h2>
          <p className="text-sub text-sm mt-1">Select the best answer.</p>

          <div className="mt-5 space-y-3">
            {q.options.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isSel = selected === idx;
              const isCorrect = idx === q.answer;
              let cls = 'border-black/10 bg-white';
              if (submittedThis) {
                if (isCorrect) cls = 'border-emerald-400 bg-emerald-50';
                else if (isSel) cls = 'border-red-300 bg-red-50';
              } else if (isSel) cls = 'border-brand bg-brand-50';
              return (
                <button key={idx} onClick={() => choose(idx)}
                  className={`w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition ${cls}`}>
                  <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${isSel || (submittedThis && isCorrect) ? 'border-brand' : 'border-black/20'}`}>
                    {submittedThis && isCorrect ? <CheckCircle2 size={18} className="text-emerald-500" />
                      : submittedThis && isSel ? <XCircle size={18} className="text-red-500" />
                      : isSel ? <span className="w-3 h-3 rounded-full bg-brand" /> : null}
                  </span>
                  <span className="font-bold text-navy">{letter}.</span>
                  <span className="text-navy text-[15px] flex-1">{opt}</span>
                </button>
              );
            })}
          </div>

          {submittedThis && (
            <div className={`mt-4 rounded-2xl p-4 ${selected === q.answer ? 'bg-emerald-50' : 'bg-orange-50'}`}>
              <p className={`font-bold text-sm ${selected === q.answer ? 'text-emerald-700' : 'text-brand'}`}>
                {selected === q.answer ? 'Correct! 🎉' : 'Not quite.'}
              </p>
              <p className="text-sm text-navy mt-1">{q.explanation}</p>
            </div>
          )}

          <button onClick={submitAnswer} disabled={selected == null || busy} className="btn-primary w-full mt-5 disabled:opacity-50">
            {!submittedThis ? 'Submit Answer' : isLast ? (busy ? 'Scoring…' : 'See Results') : 'Next Question'}
          </button>

          {!submittedThis && (
            <div className="mt-5 rounded-2xl bg-indigo-50 p-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shrink-0"><Lightbulb size={20} className="text-white" /></span>
              <div className="flex-1">
                <p className="font-bold text-navy text-sm">Need help?</p>
                <p className="text-xs text-sub">Review the lesson content or take a hint.</p>
              </div>
              <span className="text-indigo-600 font-bold text-sm border border-indigo-200 rounded-lg px-3 py-1.5">View Hint</span>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-black/[0.06] px-5 py-3 flex items-center justify-between">
        <button disabled={i === 0 || submittedThis} onClick={() => setI(i - 1)} className="flex items-center gap-2 font-bold text-brand disabled:opacity-30"><ArrowLeft size={18} /> Previous</button>
        <button onClick={() => { if (!isLast) { setI(i + 1); setSubmittedThis(false); } }} disabled={isLast} className="font-bold text-indigo-600 disabled:opacity-30">Skip Question</button>
      </div>
    </div>
  );
}
