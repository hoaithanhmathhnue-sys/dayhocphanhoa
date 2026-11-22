import React, { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { CheckCircle2, Plus, Send, Sparkles, Trash2 } from 'lucide-react';
import type { DifferentiatedLesson, StationTier } from '../../types/education';
import { SAMPLE_LESSONS } from '../../data/sampleLessons';
import { apiKeyManager } from '../../services/apiKeyManager';
import { generateStationQuestionsAI, getFriendlyErrorMessage } from '../../services/geminiService';
import { publishAssignment, type ClassDoc } from '../api';
import {
  STATIONS,
  STATION_EMOJI,
  STATION_LABEL,
  emptyStations,
  newId,
  stationsFromLesson,
  validateDraft,
  type EssayItem,
  type McqItem,
  type StationQuestions,
} from '../model';
import { ErrorBox, btn, friendlyError, inputCls } from '../ui';

const STATION_FOCUS: Record<StationTier, string> = {
  'khoi-hanh': 'nhận biết, làm theo quy tắc cơ bản, số liệu đơn giản, có thể kèm gợi ý trong lời giải thích',
  'tang-toc': 'vận dụng đầy đủ quy tắc, so sánh/sắp xếp nhiều số, có bước suy luận',
  'but-pha': 'vận dụng vào tình huống thực tế, bài toán mở hoặc có "bẫy" cần lập luận',
};

function loadLessons(): DifferentiatedLesson[] {
  try {
    const raw = localStorage.getItem('mathdiff5_custom_lessons_v1');
    const custom = raw ? (JSON.parse(raw) as DifferentiatedLesson[]) : [];
    return [...SAMPLE_LESSONS, ...(Array.isArray(custom) ? custom : [])];
  } catch {
    return SAMPLE_LESSONS;
  }
}

function defaultDue(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(20, 0, 0, 0);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const blankQuestion = (): McqItem => ({ id: newId('q'), text: '', options: ['', '', '', ''], correct: '', explanation: '', source: 'teacher' });

interface Props {
  user: User;
  classes: ClassDoc[];
  onPublished: (aid: string) => void;
}

export const AssignmentEditor: React.FC<Props> = ({ user, classes, onPublished }) => {
  const lessons = useMemo(loadLessons, []);
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? '');
  const lesson = lessons.find((l) => l.id === lessonId) ?? lessons[0];
  const [title, setTitle] = useState(lesson ? `Bài tập về nhà: ${lesson.lessonCode} – ${lesson.title}` : '');
  const [instructions, setInstructions] = useState('Em đọc kĩ từng câu, chọn một đáp án. Làm xong bấm "Nộp bài"; mỗi em chỉ nộp được một lần.');
  const [due, setDue] = useState(defaultDue());
  const [passing, setPassing] = useState(lesson?.passingScore ?? 75);
  const [stations, setStations] = useState<StationQuestions>(() => (lesson ? stationsFromLesson(lesson) : emptyStations()));
  const [essays, setEssays] = useState<EssayItem[]>([]);
  const [tab, setTab] = useState<StationTier>('khoi-hanh');
  const [aiBusy, setAiBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

  const changeLesson = (id: string) => {
    setLessonId(id);
    const l = lessons.find((x) => x.id === id);
    if (!l) return;
    const total = STATIONS.reduce((n, s) => n + stations[s].length, 0);
    if (total === 0 || window.confirm('Thay bộ câu hỏi hiện tại bằng câu hỏi luyện tập của bài học mới chọn?')) {
      setStations(stationsFromLesson(l));
      setTitle(`Bài tập về nhà: ${l.lessonCode} – ${l.title}`);
      setPassing(l.passingScore ?? 75);
    }
  };

  const updateQ = (s: StationTier, id: string, p: Partial<McqItem>) =>
    setStations((prev) => ({ ...prev, [s]: prev[s].map((q) => (q.id === id ? { ...q, ...p } : q)) }));

  const setOption = (s: StationTier, q: McqItem, idx: number, value: string) => {
    const options = q.options.map((o, i) => (i === idx ? value : o));
    updateQ(s, q.id, { options, correct: q.correct === q.options[idx] ? value : q.correct });
  };

  const aiGenerate = async () => {
    if (!lesson) return;
    if (!apiKeyManager.hasAnyConfiguredKey()) {
      setErr('Chưa có API Key Gemini. Hãy vào "Về trang dạy trên lớp" → "Cấu hình API Key" rồi quay lại.');
      return;
    }
    setAiBusy(true);
    setErr(null);
    try {
      const qs = await generateStationQuestionsAI({
        lessonTitle: `${lesson.lessonCode}: ${lesson.title}`,
        objectives: lesson.objectives,
        stationName: STATION_LABEL[tab],
        stationFocus: STATION_FOCUS[tab],
        count: 3,
      });
      if (qs.length === 0) throw new Error('AI chưa trả về câu hỏi hợp lệ. Hãy thử lại.');
      setStations((prev) => ({
        ...prev,
        [tab]: [...prev[tab], ...qs.map((q) => ({ ...q, id: newId('ai'), source: 'ai' as const }))],
      }));
    } catch (e) {
      setErr(e instanceof Error && e.message.startsWith('AI') ? e.message : getFriendlyErrorMessage(e, apiKeyManager.getProvider()));
    } finally {
      setAiBusy(false);
    }
  };

  const publish = async () => {
    const draft = {
      title,
      lessonTitle: lesson ? `${lesson.lessonCode}: ${lesson.title}` : '',
      instructions,
      classId,
      dueAt: new Date(due),
      passingScore: Number(passing),
      stations,
      essays,
    };
    const errs = validateDraft(draft);
    setErrors(errs);
    if (errs.length) return;
    const aiPending = STATIONS.some((s) => stations[s].some((q) => q.source === 'ai'));
    if (aiPending && !window.confirm('Bài có câu hỏi do AI tạo. Thầy/cô đã kiểm tra nội dung, đáp án và lời giải thích chưa?')) return;
    setPublishing(true);
    setErr(null);
    try {
      const cls = classes.find((c) => c.id === classId);
      const aid = await publishAssignment(user.uid, cls?.name ?? '', draft);
      onPublished(aid);
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setPublishing(false);
    }
  };

  if (classes.length === 0)
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Hãy tạo lớp và thêm học sinh ở thẻ "Lớp học" trước khi giao bài.
      </div>
    );

  const list = stations[tab];

  return (
    <div className="space-y-5">
      <ErrorBox msg={err} onClose={() => setErr(null)} />
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-teal-200 bg-white p-4 shadow-xs md:grid-cols-2">
        <label className="text-xs font-bold text-slate-600">
          Giao cho lớp
          <select className={`${inputCls} mt-1`} value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">
          Bài học (nạp sẵn câu luyện tập theo trạm)
          <select className={`${inputCls} mt-1`} value={lessonId} onChange={(e) => changeLesson(e.target.value)}>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.lessonCode}: {l.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600 md:col-span-2">
          Tên bài giao
          <input className={`${inputCls} mt-1`} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="text-xs font-bold text-slate-600 md:col-span-2">
          Lời dặn cho học sinh
          <textarea className={`${inputCls} mt-1`} rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        </label>
        <label className="text-xs font-bold text-slate-600">
          Hạn nộp
          <input type="datetime-local" className={`${inputCls} mt-1`} value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <label className="text-xs font-bold text-slate-600">
          Ngưỡng đạt phần trắc nghiệm (%)
          <input type="number" min={0} max={100} className={`${inputCls} mt-1`} value={passing} onChange={(e) => setPassing(Number(e.target.value))} />
        </label>
      </div>

      <div className="rounded-2xl border border-teal-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold text-slate-900">Câu trắc nghiệm theo trạm (mỗi học sinh chỉ thấy bộ câu của trạm mình)</h3>
          <button type="button" className={btn.secondary} onClick={aiGenerate} disabled={aiBusy}>
            <Sparkles className="h-4 w-4 text-amber-500" /> {aiBusy ? 'AI đang soạn…' : `AI tạo thêm 3 câu cho ${STATION_LABEL[tab]}`}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist">
          {STATIONS.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={tab === s}
              onClick={() => setTab(s)}
              className={`rounded-xl px-3 py-2 text-sm font-bold ${tab === s ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              {STATION_EMOJI[s]} {STATION_LABEL[s]} ({stations[s].length})
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          {list.length === 0 && <p className="text-sm text-slate-500">Trạm này chưa có câu hỏi.</p>}
          {list.map((q, i) => (
            <div key={q.id} className={`rounded-xl border p-3 ${q.source === 'ai' ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-600">
                  Câu {i + 1} {q.source === 'ai' && <span className="ml-1 rounded bg-amber-200 px-1.5 py-0.5 text-amber-900">AI tạo — cần duyệt</span>}
                </span>
                <div className="flex gap-1">
                  {q.source === 'ai' && (
                    <button type="button" className={btn.small} onClick={() => updateQ(tab, q.id, { source: 'teacher' })}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Đã duyệt
                    </button>
                  )}
                  <button
                    type="button"
                    className={btn.danger}
                    onClick={() => setStations((p) => ({ ...p, [tab]: p[tab].filter((x) => x.id !== q.id) }))}
                    aria-label={`Xoá câu ${i + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                className={`${inputCls} mt-2`}
                rows={2}
                value={q.text}
                placeholder="Nội dung câu hỏi"
                onChange={(e) => updateQ(tab, q.id, { text: e.target.value })}
                aria-label={`Nội dung câu ${i + 1}`}
              />
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                {q.options.map((o, oi) => (
                  <label key={oi} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={Boolean(o) && q.correct === o}
                      onChange={() => updateQ(tab, q.id, { correct: o })}
                      aria-label={`Chọn phương án ${String.fromCharCode(65 + oi)} là đáp án đúng`}
                    />
                    <span className="w-4 font-bold">{String.fromCharCode(65 + oi)}.</span>
                    <input className={inputCls} value={o} onChange={(e) => setOption(tab, q, oi, e.target.value)} />
                  </label>
                ))}
              </div>
              <input
                className={`${inputCls} mt-2`}
                placeholder="Lời giải thích hiện cho học sinh sau khi nộp"
                value={q.explanation}
                onChange={(e) => updateQ(tab, q.id, { explanation: e.target.value })}
                aria-label={`Lời giải thích câu ${i + 1}`}
              />
            </div>
          ))}
          <button type="button" className={btn.small} onClick={() => setStations((p) => ({ ...p, [tab]: [...p[tab], blankQuestion()] }))}>
            <Plus className="h-3.5 w-3.5" /> Thêm câu trắc nghiệm
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-teal-200 bg-white p-4 shadow-xs">
        <h3 className="text-sm font-extrabold text-slate-900">Câu tự luận (chung cho cả lớp, giáo viên chấm)</h3>
        <div className="mt-3 space-y-3">
          {essays.map((e, i) => (
            <div key={e.id} className="flex flex-wrap items-start gap-2">
              <textarea
                className={`${inputCls} flex-1`}
                rows={2}
                value={e.prompt}
                placeholder={`Đề bài câu tự luận ${i + 1}`}
                onChange={(ev) => setEssays((p) => p.map((x) => (x.id === e.id ? { ...x, prompt: ev.target.value } : x)))}
              />
              <label className="text-xs font-bold text-slate-600">
                Điểm tối đa
                <input
                  type="number"
                  min={1}
                  className={`${inputCls} mt-1 w-24`}
                  value={e.maxScore}
                  onChange={(ev) => setEssays((p) => p.map((x) => (x.id === e.id ? { ...x, maxScore: Number(ev.target.value) } : x)))}
                />
              </label>
              <button type="button" className={btn.danger} onClick={() => setEssays((p) => p.filter((x) => x.id !== e.id))} aria-label="Xoá câu tự luận">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button type="button" className={btn.small} onClick={() => setEssays((p) => [...p, { id: newId('e'), prompt: '', maxScore: 2 }])}>
            <Plus className="h-3.5 w-3.5" /> Thêm câu tự luận
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
          <p className="font-bold">Cần sửa trước khi giao:</p>
          <ul className="ml-5 list-disc">
            {errors.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex justify-end">
        <button type="button" className={btn.primary} onClick={publish} disabled={publishing}>
          <Send className="h-4 w-4" /> {publishing ? 'Đang giao…' : 'Giao bài cho lớp'}
        </button>
      </div>
    </div>
  );
};
