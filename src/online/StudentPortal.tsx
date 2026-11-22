import React, { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { ArrowLeft, CheckCircle2, Clock, LogIn, LogOut, Send, XCircle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import {
  StudentLoginError,
  getMyProfile,
  isGoogleUser,
  listClassAssignments,
  listMySubmissions,
  logout,
  studentSignIn,
  submitAssignment,
  watchAuth,
  type AssignmentDoc,
  type StudentDoc,
  type SubmissionDoc,
} from './api';
import { fb, isFirebaseConfigured } from './firebase';
import {
  STATION_EMOJI,
  STATION_LABEL,
  formatViDateTime,
  gradeMcq,
  isPassed,
  isValidPin,
  normalizeClassCode,
  type AnswerKey,
} from './model';
import { ErrorBox, OnlineShell, Spinner, btn, friendlyError, inputCls } from './ui';

const StudentPortal: React.FC = () => {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    return watchAuth(setUser);
  }, []);

  return (
    <OnlineShell
      title="MathDiff 5 AI · Học sinh làm bài"
      subtitle="Bài tập về nhà môn Toán lớp 5"
      right={
        user ? (
          <button type="button" className={btn.secondary} onClick={() => void logout()}>
            <LogOut className="h-4 w-4" /> Đăng xuất
          </button>
        ) : null
      }
    >
      {user === undefined ? (
        <Spinner />
      ) : user === null ? (
        <LoginForm />
      ) : isGoogleUser(user) ? (
        <div className="mx-auto max-w-lg space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center text-sm">
          <p className="font-bold">Trình duyệt đang đăng nhập tài khoản giáo viên.</p>
          <p>
            Đây là trang của học sinh. Thầy/cô có thể vào <a className="font-bold underline" href="#/giao-bai">trang giáo viên</a> hoặc đăng xuất để học sinh đăng nhập.
          </p>
          <button type="button" className={btn.primary} onClick={() => void logout()}>
            Đăng xuất
          </button>
        </div>
      ) : (
        <StudentHome user={user} />
      )}
    </OnlineShell>
  );
};

const LoginForm: React.FC = () => {
  const [code, setCode] = useState('');
  const [num, setNum] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = normalizeClassCode(code);
    const n = Number(num);
    if (c.length !== 6) return setErr('Mã lớp gồm 6 kí tự, em xem trên phiếu nhé.');
    if (!Number.isInteger(n) || n <= 0) return setErr('Số thứ tự chưa đúng.');
    if (!isValidPin(pin)) return setErr('Mã PIN gồm 6 chữ số.');
    setBusy(true);
    setErr(null);
    try {
      await studentSignIn(c, n, pin);
    } catch (ex) {
      setErr(ex instanceof StudentLoginError ? ex.message : friendlyError(ex));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 rounded-2xl border border-teal-200 bg-white p-6 shadow-xs">
      <h2 className="text-center text-xl font-extrabold text-slate-900">Đăng nhập làm bài</h2>
      <p className="text-center text-sm text-slate-600">Em nhập đúng các thông tin trên phiếu thầy/cô phát.</p>
      <label className="block text-sm font-bold text-slate-700">
        Mã lớp
        <input
          className={`${inputCls} mt-1 font-mono text-lg uppercase tracking-widest`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={8}
          autoComplete="off"
          autoCapitalize="characters"
          inputMode="text"
        />
      </label>
      <label className="block text-sm font-bold text-slate-700">
        Số thứ tự
        <input className={`${inputCls} mt-1 font-mono text-lg`} value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={3} autoComplete="off" />
      </label>
      <label className="block text-sm font-bold text-slate-700">
        Mã PIN (6 chữ số)
        <input
          type="password"
          className={`${inputCls} mt-1 font-mono text-lg tracking-widest`}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          maxLength={6}
          autoComplete="off"
        />
      </label>
      <ErrorBox msg={err} />
      <button type="submit" className={`${btn.primary} w-full text-base`} disabled={busy}>
        <LogIn className="h-5 w-5" /> {busy ? 'Đang đăng nhập…' : 'Vào làm bài'}
      </button>
    </form>
  );
};

type View = { kind: 'list' } | { kind: 'do'; a: AssignmentDoc } | { kind: 'result'; a: AssignmentDoc };

const StudentHome: React.FC<{ user: User }> = ({ user }) => {
  const [me, setMe] = useState<StudentDoc | null | undefined>(undefined);
  const [assignments, setAssignments] = useState<AssignmentDoc[] | null>(null);
  const [subs, setSubs] = useState<SubmissionDoc[]>([]);
  const [view, setView] = useState<View>({ kind: 'list' });
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const p = await getMyProfile(user.uid);
      setMe(p);
      if (!p || !p.active) return;
      const [as, ss] = await Promise.all([listClassAssignments(p.classId), listMySubmissions(user.uid)]);
      setAssignments(as);
      setSubs(ss);
    } catch (e) {
      setErr(friendlyError(e));
      setAssignments([]);
    }
  }, [user.uid]);

  useEffect(() => {
    void load();
  }, [load]);

  if (me === undefined) return <Spinner />;
  if (me === null || !me.active)
    return (
      <div className="mx-auto max-w-lg space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center text-sm">
        <p className="font-bold">Tài khoản này hiện không dùng được.</p>
        <p>Có thể thầy/cô đã cấp mã PIN mới hoặc tạm khoá đăng nhập. Em hỏi thầy/cô để nhận phiếu mới nhé.</p>
        <button type="button" className={btn.primary} onClick={() => void logout()}>
          Đăng xuất
        </button>
      </div>
    );

  const subOf = (aid: string) => subs.find((s) => s.assignmentId === aid);

  if (view.kind === 'do')
    return (
      <DoAssignment
        a={view.a}
        me={me}
        onBack={() => setView({ kind: 'list' })}
        onSubmitted={async () => {
          await load();
          setView({ kind: 'result', a: view.a });
        }}
      />
    );
  if (view.kind === 'result') {
    const s = subOf(view.a.id);
    if (s) return <ResultView a={view.a} sub={s} onBack={() => setView({ kind: 'list' })} />;
  }

  const now = Date.now();
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-xs">
        <p className="text-sm text-slate-600">Chào em</p>
        <p className="text-2xl font-extrabold text-slate-900">{me.name}</p>
        <p className="mt-1 text-sm font-semibold text-teal-800">
          {STATION_EMOJI[me.station]} {STATION_LABEL[me.station]}
        </p>
      </div>
      <ErrorBox msg={err} onClose={() => setErr(null)} />
      {assignments === null ? (
        <Spinner />
      ) : assignments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Hiện chưa có bài tập nào.</p>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const s = subOf(a.id);
            const canDo = !s && a.isOpen && a.dueAt.getTime() > now;
            return (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div>
                  <p className="font-extrabold text-slate-900">{a.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                    <Clock className="h-3.5 w-3.5" /> Hạn nộp: {formatViDateTime(a.dueAt)}
                  </p>
                </div>
                {s ? (
                  <button type="button" className={btn.secondary} onClick={() => setView({ kind: 'result', a })}>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Đã nộp · Xem kết quả
                  </button>
                ) : canDo ? (
                  <button type="button" className={btn.primary} onClick={() => setView({ kind: 'do', a })}>
                    Làm bài
                  </button>
                ) : (
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">Đã hết hạn</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const DoAssignment: React.FC<{ a: AssignmentDoc; me: StudentDoc; onBack: () => void; onSubmitted: () => Promise<void> }> = ({
  a,
  me,
  onBack,
  onSubmitted,
}) => {
  const qs = a.stations[me.station] ?? [];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [essays, setEssays] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const answered = qs.filter((q) => answers[q.id] !== undefined).length;

  const submit = async () => {
    const missing = qs.length - answered;
    const msg = missing > 0 ? `Em còn ${missing} câu chưa chọn đáp án. Vẫn nộp bài?` : 'Em chắc chắn nộp bài? Sau khi nộp sẽ không sửa được.';
    if (!window.confirm(msg)) return;
    setBusy(true);
    setErr(null);
    try {
      await submitAssignment(a, me, answers, essays);
      await onSubmitted();
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      setErr(code.includes('permission-denied') ? 'Không nộp được: bài đã hết hạn, đã bị khoá hoặc em đã nộp rồi.' : friendlyError(e));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <button type="button" className={btn.secondary} onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Danh sách bài
      </button>
      <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-xs">
        <h2 className="text-xl font-extrabold text-slate-900">{a.title}</h2>
        {a.instructions && <p className="mt-1 text-sm text-slate-700">{a.instructions}</p>}
        <p className="mt-1 text-xs text-slate-500">Hạn nộp: {formatViDateTime(a.dueAt)}</p>
      </div>
      {qs.length === 0 && a.essays.length === 0 && (
        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Bài này chưa có câu hỏi cho trạm của em. Em báo thầy/cô nhé.</p>
      )}
      {qs.map((q, i) => (
        <fieldset key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <legend className="px-1 text-xs font-bold uppercase text-teal-700">Câu {i + 1}</legend>
          <p className="text-lg font-bold text-slate-900">{q.text}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {q.options.map((o, oi) => {
              const chosen = answers[q.id] === o;
              return (
                <button
                  key={oi}
                  type="button"
                  onClick={() => setAnswers((p) => ({ ...p, [q.id]: o }))}
                  aria-pressed={chosen}
                  className={`min-h-[52px] rounded-xl border-2 px-4 py-2 text-left text-base font-semibold transition ${
                    chosen ? 'border-teal-600 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-800 hover:border-teal-300'
                  }`}
                >
                  <span className="mr-2 font-extrabold text-teal-700">{String.fromCharCode(65 + oi)}.</span>
                  {o}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      {a.essays.map((e, i) => (
        <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-bold uppercase text-teal-700">Tự luận {i + 1}</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{e.prompt}</p>
          <textarea
            className={`${inputCls} mt-3 text-base`}
            rows={5}
            maxLength={3000}
            placeholder="Em trình bày lời giải ở đây"
            value={essays[e.id] ?? ''}
            onChange={(ev) => setEssays((p) => ({ ...p, [e.id]: ev.target.value }))}
          />
        </div>
      ))}
      <ErrorBox msg={err} />
      <div className="sticky bottom-3 flex items-center justify-between gap-3 rounded-2xl border border-teal-300 bg-white/95 p-3 shadow-lg">
        <span className="text-sm font-semibold text-slate-700">
          Đã chọn {answered}/{qs.length} câu trắc nghiệm
        </span>
        <button type="button" className={btn.primary} onClick={submit} disabled={busy}>
          <Send className="h-4 w-4" /> {busy ? 'Đang nộp…' : 'Nộp bài'}
        </button>
      </div>
    </div>
  );
};

const ResultView: React.FC<{ a: AssignmentDoc; sub: SubmissionDoc; onBack: () => void }> = ({ a, sub, onBack }) => {
  const [key, setKey] = useState<AnswerKey | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    getDoc(doc(fb().db, 'assignments', a.id, 'private', 'key'))
      .then((s) => setKey((s.data()?.answers as AnswerKey) ?? {}))
      .catch((e) => setErr(friendlyError(e)));
  }, [a.id]);

  const qs = a.stations[sub.station] ?? [];
  const g = key ? gradeMcq(sub.station, qs, sub.answers ?? {}, key) : null;
  const k = key?.[sub.station] ?? {};
  const essayMax = a.essays.reduce((n, e) => n + e.maxScore, 0);
  const essayTotal = sub.essayScores ? Object.values(sub.essayScores).reduce((n, v) => n + (Number(v) || 0), 0) : undefined;

  return (
    <div className="space-y-4">
      <button type="button" className={btn.secondary} onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Danh sách bài
      </button>
      <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-xs">
        <h2 className="text-xl font-extrabold text-slate-900">{a.title}</h2>
        <p className="text-xs text-slate-500">Đã nộp lúc {sub.submittedAt ? formatViDateTime(sub.submittedAt) : ''}</p>
        {g && g.total > 0 && (
          <p className={`mt-3 text-lg font-extrabold ${isPassed(g.percent, a.passingScore) ? 'text-emerald-700' : 'text-amber-700'}`}>
            Trắc nghiệm: đúng {g.correct}/{g.total} câu ({g.percent}%) —{' '}
            {isPassed(g.percent, a.passingScore) ? 'Đạt yêu cầu. Giỏi lắm!' : 'Chưa đạt, em xem lại lời giải thích nhé.'}
          </p>
        )}
        {essayMax > 0 && (
          <p className="mt-1 text-sm font-semibold text-slate-700">
            Tự luận: {essayTotal !== undefined ? `${essayTotal}/${essayMax} điểm` : 'thầy/cô đang chấm'}
          </p>
        )}
        {sub.feedback && <p className="mt-2 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">Lời nhận xét của thầy/cô: {sub.feedback}</p>}
      </div>
      <ErrorBox msg={err} />
      {!key && !err && <Spinner label="Đang tải đáp án…" />}
      {key &&
        qs.map((q, i) => {
          const ans = sub.answers?.[q.id];
          const ok = g?.perQuestion[q.id];
          return (
            <div key={q.id} className={`rounded-2xl border-2 bg-white p-4 ${ok ? 'border-emerald-300' : 'border-rose-300'}`}>
              <p className="flex items-start gap-2 font-bold text-slate-900">
                {ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <XCircle className="h-5 w-5 shrink-0 text-rose-600" />}
                Câu {i + 1}: {q.text}
              </p>
              <p className="mt-1 text-sm">
                Em chọn: <strong>{ans ?? '(bỏ trống)'}</strong>
                {!ok && (
                  <>
                    {' '}
                    · Đáp án đúng: <strong>{k[q.id]?.correct}</strong>
                  </>
                )}
              </p>
              {k[q.id]?.explanation && <p className="mt-1 text-sm text-slate-700">{k[q.id].explanation}</p>}
            </div>
          );
        })}
    </div>
  );
};

export default StudentPortal;
