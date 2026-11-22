import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { ArrowLeft, CalendarClock, Download, Lock, RotateCcw, Save, Trash2, Unlock } from 'lucide-react';
import {
  allowRetry,
  deleteAssignment,
  getAnswerKey,
  gradeSubmission,
  listStudents,
  listSubmissionsForAssignment,
  setAssignmentDue,
  setAssignmentOpen,
  type AssignmentDoc,
  type StudentDoc,
  type SubmissionDoc,
} from '../api';
import {
  STATION_EMOJI,
  STATION_LABEL,
  formatStudentNumber,
  formatViDateTime,
  gradeMcq,
  isPassed,
  resultsToCsv,
  type AnswerKey,
  type ResultRow,
} from '../model';
import { ErrorBox, Spinner, btn, friendlyError, inputCls } from '../ui';

interface Props {
  user: User;
  assignment: AssignmentDoc;
  onBack: () => void;
  onChanged: () => Promise<void>;
}

function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const AssignmentResults: React.FC<Props> = ({ user, assignment: a, onBack, onChanged }) => {
  const [students, setStudents] = useState<StudentDoc[] | null>(null);
  const [subs, setSubs] = useState<SubmissionDoc[]>([]);
  const [key, setKey] = useState<AnswerKey>({});
  const [err, setErr] = useState<string | null>(null);
  const [openNo, setOpenNo] = useState<number | null>(null);
  const [due, setDue] = useState(toLocalInput(a.dueAt));
  const [isOpen, setIsOpen] = useState(a.isOpen);

  const load = useCallback(async () => {
    try {
      const [st, sb, k] = await Promise.all([listStudents(a.classId, user.uid), listSubmissionsForAssignment(a.id, user.uid), getAnswerKey(a.id)]);
      setStudents(st);
      setSubs(sb);
      setKey(k);
    } catch (e) {
      setErr(friendlyError(e));
      setStudents([]);
    }
  }, [a.classId, a.id, user.uid]);

  useEffect(() => {
    void load();
  }, [load]);

  // Ghép bài nộp với học sinh theo số thứ tự (giữ đúng cả khi HS đã được cấp lại PIN); lấy bài nộp mới nhất.
  const latestByNumber = useMemo(() => {
    const m = new Map<number, SubmissionDoc>();
    for (const s of subs) {
      const cur = m.get(s.number);
      if (!cur || (s.submittedAt?.getTime() ?? 0) > (cur.submittedAt?.getTime() ?? 0)) m.set(s.number, s);
    }
    return m;
  }, [subs]);

  const essayMax = a.essays.reduce((n, e) => n + e.maxScore, 0);

  const rows: ResultRow[] = useMemo(() => {
    const list = students ?? [];
    const numbers = new Set(list.map((s) => s.number));
    const extra = [...latestByNumber.values()].filter((s) => !numbers.has(s.number));
    const base = [
      ...list.map((s) => ({ number: s.number, name: s.name, station: s.station })),
      ...extra.map((s) => ({ number: s.number, name: `${s.studentName} (đã rời lớp)`, station: s.station })),
    ].sort((x, y) => x.number - y.number);
    return base.map((b) => {
      const sub = latestByNumber.get(b.number);
      if (!sub) return { ...b, submitted: false };
      const qs = a.stations[sub.station] ?? [];
      const mcq = qs.length ? gradeMcq(sub.station, qs, sub.answers ?? {}, key) : undefined;
      const essayTotal = sub.essayScores ? Object.values(sub.essayScores).reduce((n, v) => n + (Number(v) || 0), 0) : undefined;
      return {
        ...b,
        station: sub.station,
        submitted: true,
        submittedAt: sub.submittedAt,
        mcq,
        passed: mcq ? isPassed(mcq.percent, a.passingScore) : undefined,
        essayTotal,
        essayMax: essayMax || undefined,
        feedback: sub.feedback,
      };
    });
  }, [students, latestByNumber, a, key, essayMax]);

  const submittedCount = rows.filter((r) => r.submitted).length;
  const passedCount = rows.filter((r) => r.passed).length;

  const exportCsv = () => {
    const blob = new Blob([resultsToCsv(rows, a.passingScore)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ket-qua-${a.className}-${a.title}`.replace(/[^\p{L}\p{N}-]+/gu, '-').slice(0, 80) + '.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleOpen = async () => {
    try {
      await setAssignmentOpen(a.id, !isOpen);
      setIsOpen(!isOpen);
      await onChanged();
    } catch (e) {
      setErr(friendlyError(e));
    }
  };

  const saveDue = async () => {
    const d = new Date(due);
    if (Number.isNaN(d.getTime())) return setErr('Hạn nộp không hợp lệ.');
    try {
      await setAssignmentDue(a.id, d);
      await onChanged();
      setErr(null);
    } catch (e) {
      setErr(friendlyError(e));
    }
  };

  const remove = async () => {
    if (!window.confirm('Xoá bài giao này cùng toàn bộ bài nộp? Không thể hoàn tác.')) return;
    try {
      await deleteAssignment(a.id, user.uid);
      await onChanged();
      onBack();
    } catch (e) {
      setErr(friendlyError(e));
    }
  };

  return (
    <div className="space-y-4">
      <button type="button" className={btn.secondary} onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Danh sách bài đã giao
      </button>
      <ErrorBox msg={err} onClose={() => setErr(null)} />
      <div className="rounded-2xl border border-teal-200 bg-white p-4 shadow-xs">
        <p className="text-xs font-bold uppercase text-slate-500">
          Lớp {a.className} · {a.lessonTitle}
        </p>
        <h2 className="text-lg font-extrabold text-slate-900">{a.title}</h2>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs font-bold text-slate-600">
            Hạn nộp
            <input type="datetime-local" className={`${inputCls} mt-1`} value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <button type="button" className={btn.small} onClick={saveDue}>
            <CalendarClock className="h-3.5 w-3.5" /> Lưu hạn mới
          </button>
          <button type="button" className={btn.small} onClick={toggleOpen}>
            {isOpen ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />} {isOpen ? 'Khoá nhận bài' : 'Mở lại nhận bài'}
          </button>
          <button type="button" className={btn.small} onClick={exportCsv} disabled={!students}>
            <Download className="h-3.5 w-3.5" /> Xuất bảng điểm (CSV)
          </button>
          <button type="button" className={btn.danger} onClick={remove}>
            <Trash2 className="h-3.5 w-3.5" /> Xoá bài giao
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-700">
          Đã nộp <strong>{submittedCount}</strong>/{rows.length} · Đạt phần trắc nghiệm (≥ {a.passingScore}%): <strong>{passedCount}</strong>
          {!isOpen && <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-xs font-bold">Đã khoá nhận bài</span>}
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        {students === null ? (
          <Spinner />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">STT</th>
                <th className="px-3 py-2">Họ và tên</th>
                <th className="px-3 py-2">Trạm</th>
                <th className="px-3 py-2">Nộp lúc</th>
                <th className="px-3 py-2">Trắc nghiệm</th>
                <th className="px-3 py-2">Tự luận</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <React.Fragment key={r.number}>
                  <tr className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono font-bold">{formatStudentNumber(r.number)}</td>
                    <td className="px-3 py-2 font-semibold">{r.name}</td>
                    <td className="px-3 py-2 text-xs">
                      {STATION_EMOJI[r.station]} {STATION_LABEL[r.station]}
                    </td>
                    <td className="px-3 py-2 text-xs">{r.submitted ? (r.submittedAt ? formatViDateTime(r.submittedAt) : 'Đã nộp') : <span className="text-slate-400">Chưa nộp</span>}</td>
                    <td className="px-3 py-2">
                      {r.mcq && (
                        <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${r.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                          {r.mcq.correct}/{r.mcq.total} ({r.mcq.percent}%)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.submitted && essayMax > 0 ? (r.essayTotal !== undefined ? `${r.essayTotal}/${essayMax}` : 'Chưa chấm') : ''}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.submitted && (
                        <button type="button" className={btn.small} onClick={() => setOpenNo(openNo === r.number ? null : r.number)}>
                          {openNo === r.number ? 'Thu gọn' : 'Xem / chấm'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {openNo === r.number && latestByNumber.get(r.number) && (
                    <tr>
                      <td colSpan={7} className="bg-slate-50/70 px-3 py-3">
                        <SubmissionDetail
                          a={a}
                          sub={latestByNumber.get(r.number)!}
                          answerKey={key}
                          onSaved={load}
                          onError={(m) => setErr(m)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const SubmissionDetail: React.FC<{
  a: AssignmentDoc;
  sub: SubmissionDoc;
  answerKey: AnswerKey;
  onSaved: () => Promise<void>;
  onError: (m: string) => void;
}> = ({ a, sub, answerKey, onSaved, onError }) => {
  const [scores, setScores] = useState<Record<string, number>>(sub.essayScores ?? {});
  const [feedback, setFeedback] = useState(sub.feedback ?? '');
  const [saving, setSaving] = useState(false);
  const qs = a.stations[sub.station] ?? [];
  const k = answerKey[sub.station] ?? {};

  const save = async () => {
    for (const e of a.essays) {
      const v = scores[e.id];
      if (v !== undefined && (v < 0 || v > e.maxScore)) return onError(`Điểm tự luận phải từ 0 đến ${e.maxScore}.`);
    }
    setSaving(true);
    try {
      await gradeSubmission(sub.id, scores, feedback);
      await onSaved();
    } catch (e) {
      onError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  const retry = async () => {
    if (!window.confirm(`Xoá bài nộp của ${sub.studentName} để em làm lại?`)) return;
    try {
      await allowRetry(sub.id);
      await onSaved();
    } catch (e) {
      onError(friendlyError(e));
    }
  };

  return (
    <div className="space-y-3 text-sm">
      {qs.length > 0 && (
        <ol className="ml-5 list-decimal space-y-1">
          {qs.map((q) => {
            const ans = sub.answers?.[q.id];
            const ok = ans !== undefined && k[q.id]?.correct === ans;
            return (
              <li key={q.id}>
                <span className="text-slate-800">{q.text}</span>{' '}
                <span className={ok ? 'font-bold text-emerald-700' : 'font-bold text-rose-700'}>
                  — Em chọn: {ans ?? '(bỏ trống)'} {ok ? '✓' : `✗ (đúng: ${k[q.id]?.correct ?? '?'})`}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {a.essays.map((e, i) => (
        <div key={e.id} className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-bold text-slate-600">
            Tự luận {i + 1}: {e.prompt}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-slate-900">{sub.essays?.[e.id] || <em className="text-slate-400">(bỏ trống)</em>}</p>
          <label className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-slate-600">
            Điểm (tối đa {e.maxScore})
            <input
              type="number"
              min={0}
              max={e.maxScore}
              step={0.25}
              className="w-24 rounded-lg border border-slate-300 px-2 py-1"
              value={scores[e.id] ?? ''}
              onChange={(ev) => setScores((p) => ({ ...p, [e.id]: Number(ev.target.value) }))}
            />
          </label>
        </div>
      ))}
      <label className="block text-xs font-bold text-slate-600">
        Nhận xét gửi học sinh
        <textarea className={`${inputCls} mt-1`} rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={1000} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn.primary} onClick={save} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? 'Đang lưu…' : 'Lưu điểm và nhận xét'}
        </button>
        <button type="button" className={btn.secondary} onClick={retry}>
          <RotateCcw className="h-4 w-4" /> Cho làm lại
        </button>
      </div>
    </div>
  );
};
