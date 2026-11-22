import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ImagePlus, Plus, Save, Trash2 } from 'lucide-react';
import type { DifferentiatedLesson, Question, SituationItem, SolutionPost, StationTier } from '../types/education';
import { checkLesson, compressImage, finalizeLesson, genId } from '../services/lessonStore';
import { STATIONS, STATION_EMOJI, STATION_LABEL } from '../online/model';
import { btn, inputCls } from '../online/ui';

const label = 'block text-xs font-bold text-slate-600';
const lines = (v: string[]) => v.join('\n');
/** Phần số của nhãn hiển thị ("2,29 km" → "2,29"). */
const numberText = (it: SituationItem) =>
  it.unit && it.valueLabel.trim().endsWith(it.unit) ? it.valueLabel.trim().slice(0, -it.unit.length).trim() : it.valueLabel.trim();
const joinLabel = (num: string, unit: string) => [num.trim(), unit.trim()].filter(Boolean).join(' ');
/** "2,29" → 2.29; "1.250,5" → 1250.5 */
const parseVi = (v: string) => {
  const n = Number(v.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const Section: React.FC<{ title: string; hint?: string; children: React.ReactNode; open?: boolean }> = ({ title, hint, children, open = true }) => (
  <details open={open} className="group rounded-2xl border border-teal-200 bg-white shadow-xs">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
      <span>
        <span className="text-sm font-extrabold text-slate-900">{title}</span>
        {hint && <span className="ml-2 text-xs text-slate-500">{hint}</span>}
      </span>
      <ChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
    </summary>
    <div className="space-y-3 border-t border-slate-100 p-4">{children}</div>
  </details>
);

interface Props {
  initial: DifferentiatedLesson;
  isNew: boolean;
  onSave: (l: DifferentiatedLesson) => Promise<void> | void;
  onCancel: () => void;
}

export const LessonEditor: React.FC<Props> = ({ initial, isNew, onSave, onCancel }) => {
  const [l, setL] = useState<DifferentiatedLesson>(() => JSON.parse(JSON.stringify(initial)));
  const [qTab, setQTab] = useState<StationTier>('khoi-hanh');
  const [check, setCheck] = useState<{ errors: string[]; warnings: string[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof DifferentiatedLesson>(k: K, v: DifferentiatedLesson[K]) => setL((p) => ({ ...p, [k]: v }));
  const setItem = (i: number, p: Partial<SituationItem>) =>
    set('situationItems', l.situationItems.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const setTask = (s: StationTier, p: Partial<DifferentiatedLesson['stationTasks'][StationTier]>) =>
    set('stationTasks', { ...l.stationTasks, [s]: { ...l.stationTasks[s], ...p } });
  const setPost = (i: number, p: Partial<SolutionPost>) => set('initialBoardPosts', l.initialBoardPosts.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const setQ = (id: string, p: Partial<Question>) => set('practiceQuestions', l.practiceQuestions.map((q) => (q.id === id ? { ...q, ...p } : q)));

  const save = async () => {
    const c = checkLesson(l);
    setCheck(c);
    if (c.errors.length) return;
    setSaving(true);
    setErr(null);
    try {
      await onSave(finalizeLesson(l));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const uploadImage = async (i: number, file?: File) => {
    if (!file) return;
    try {
      const data = await compressImage(file);
      if (data.length > 450_000) return setErr('Ảnh vẫn còn quá lớn sau khi nén. Hãy chọn ảnh khác nhỏ hơn.');
      setItem(i, { imageUrl: data });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  const qs = l.practiceQuestions.filter((q) => q.station === qTab);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className={btn.secondary} onClick={onCancel}>
          <ArrowLeft className="h-4 w-4" /> Về thư viện (không lưu)
        </button>
        <h2 className="text-lg font-extrabold text-slate-900">{isNew ? 'Soạn bài mới' : `Sửa bài: ${initial.lessonCode} – ${initial.title}`}</h2>
      </div>

      <Section title="1. Thông tin chung">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className={label}>
            Số hiệu bài
            <input className={`${inputCls} mt-1`} value={l.lessonCode} onChange={(e) => set('lessonCode', e.target.value)} placeholder="Bài 24" />
          </label>
          <label className={`${label} md:col-span-3`}>
            Tên bài
            <input className={`${inputCls} mt-1`} value={l.title} onChange={(e) => set('title', e.target.value)} placeholder="Phép nhân số thập phân với số tự nhiên" />
          </label>
          <label className={`${label} md:col-span-2`}>
            Chủ đề
            <input className={`${inputCls} mt-1`} value={l.topic} onChange={(e) => set('topic', e.target.value)} placeholder="Số thập phân" />
          </label>
          <label className={label}>
            Bộ sách
            <input className={`${inputCls} mt-1`} value={l.textbook} onChange={(e) => set('textbook', e.target.value)} />
          </label>
          <label className={label}>
            Ngưỡng đạt luyện tập (%)
            <input type="number" min={0} max={100} className={`${inputCls} mt-1`} value={l.passingScore} onChange={(e) => set('passingScore', Number(e.target.value))} />
          </label>
          <label className={`${label} md:col-span-4`}>
            Yêu cầu cần đạt (mỗi dòng một ý)
            <textarea className={`${inputCls} mt-1`} rows={3} value={lines(l.objectives)} onChange={(e) => set('objectives', e.target.value.split('\n'))} />
          </label>
        </div>
      </Section>

      <Section title="2. Tình huống chung (Bước 3)" hint="Số đo của các đối tượng được dùng cho học cụ: bảng tách hàng, sắp xếp thứ tự, trục số">
        <label className={label}>
          Lời dẫn tình huống
          <textarea className={`${inputCls} mt-1`} rows={2} value={l.contextStory} onChange={(e) => set('contextStory', e.target.value)} />
        </label>
        <label className={label}>
          Câu hỏi khám phá chung cho cả lớp
          <textarea className={`${inputCls} mt-1`} rows={2} value={l.centralQuestion} onChange={(e) => set('centralQuestion', e.target.value)} />
        </label>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {l.situationItems.map((it, i) => (
            <div key={it.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-600">Đối tượng {i + 1}</span>
                <button type="button" className={btn.danger} aria-label={`Xoá đối tượng ${i + 1}`} onClick={() => set('situationItems', l.situationItems.filter((_, j) => j !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <input className={inputCls} placeholder="Tên (Cầu Long Biên)" value={it.title} onChange={(e) => setItem(i, { title: e.target.value })} aria-label={`Tên đối tượng ${i + 1}`} />
              <input className={inputCls} placeholder="Địa điểm / mô tả ngắn" value={it.location ?? ''} onChange={(e) => setItem(i, { location: e.target.value })} />
              <div className="grid grid-cols-3 gap-2">
                <input
                  className={`${inputCls} col-span-2`}
                  placeholder="Số đo (2,29)"
                  value={numberText(it)}
                  onChange={(e) => setItem(i, { valueLabel: joinLabel(e.target.value, it.unit), numericValue: parseVi(e.target.value) })}
                  aria-label={`Số đo đối tượng ${i + 1}`}
                />
                <input
                  className={inputCls}
                  placeholder="km"
                  value={it.unit}
                  onChange={(e) => setItem(i, { unit: e.target.value.trim(), valueLabel: joinLabel(numberText(it), e.target.value) })}
                  aria-label={`Đơn vị đối tượng ${i + 1}`}
                />
              </div>
              {it.imageUrl ? (
                <div className="relative">
                  <img src={it.imageUrl} alt="" className="h-24 w-full rounded-lg object-cover" />
                  <button type="button" className="absolute top-1 right-1 rounded bg-white/90 px-2 py-0.5 text-xs font-bold text-rose-700" onClick={() => setItem(i, { imageUrl: undefined })}>
                    Bỏ ảnh
                  </button>
                </div>
              ) : (
                <label className={`${btn.small} w-full cursor-pointer`}>
                  <ImagePlus className="h-3.5 w-3.5" /> Thêm ảnh (tự thu nhỏ)
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => void uploadImage(i, e.target.files?.[0])} />
                </label>
              )}
            </div>
          ))}
        </div>
        {l.situationItems.length < 6 && (
          <button
            type="button"
            className={btn.small}
            onClick={() => set('situationItems', [...l.situationItems, { id: genId('item'), title: '', valueLabel: '', numericValue: 0, unit: l.situationItems[0]?.unit ?? '', accentColor: 'teal' }])}
          >
            <Plus className="h-3.5 w-3.5" /> Thêm đối tượng
          </button>
        )}
      </Section>

      <Section title="3. Nhiệm vụ và gợi ý của ba trạm (Bước 3)">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {STATIONS.map((s) => {
            const t = l.stationTasks[s];
            return (
              <div key={s} className="space-y-2 rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-extrabold">
                  {STATION_EMOJI[s]} {STATION_LABEL[s]}
                </p>
                <input className={inputCls} placeholder="Phụ đề ngắn" value={t.subtitle} onChange={(e) => setTask(s, { subtitle: e.target.value })} />
                <textarea className={inputCls} rows={3} placeholder="Nhiệm vụ của nhóm" value={t.corePrompt} onChange={(e) => setTask(s, { corePrompt: e.target.value })} aria-label={`Nhiệm vụ ${STATION_LABEL[s]}`} />
                <textarea className={inputCls} rows={3} placeholder="Gợi ý mở từng bước (mỗi dòng một gợi ý, không lộ đáp án)" value={lines(t.progressiveHints)} onChange={(e) => setTask(s, { progressiveHints: e.target.value.split('\n') })} />
                <input className={inputCls} placeholder="Sản phẩm mong đợi" value={t.expectedProduct} onChange={(e) => setTask(s, { expectedProduct: e.target.value })} />
                <input className={inputCls} placeholder="Lưu ý cho giáo viên" value={t.teacherGuidance} onChange={(e) => setTask(s, { teacherGuidance: e.target.value })} />
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="4. Cách giải mẫu và tình huống nhầm lẫn (Bước 4)" open={false}>
        {l.initialBoardPosts.map((p, i) => (
          <div key={p.id} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-6">
            <input className={`${inputCls} md:col-span-3`} placeholder="Tên cách giải" value={p.methodTitle} onChange={(e) => setPost(i, { methodTitle: e.target.value })} />
            <input className={`${inputCls} md:col-span-2`} placeholder="Nhóm đóng góp" value={p.authorName} onChange={(e) => setPost(i, { authorName: e.target.value })} />
            <select className={inputCls} value={p.station} onChange={(e) => setPost(i, { station: e.target.value as StationTier })}>
              {STATIONS.map((s) => (
                <option key={s} value={s}>
                  {STATION_LABEL[s]}
                </option>
              ))}
            </select>
            <textarea className={`${inputCls} md:col-span-6`} rows={2} placeholder="Nội dung cách giải" value={p.content} onChange={(e) => setPost(i, { content: e.target.value })} />
            <input className={`${inputCls} md:col-span-4`} placeholder="Nhận xét định hướng của giáo viên" value={p.teacherComment ?? ''} onChange={(e) => setPost(i, { teacherComment: e.target.value })} />
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <input type="checkbox" checked={Boolean(p.isMisconception)} onChange={(e) => setPost(i, { isMisconception: e.target.checked })} /> Tình huống nhầm lẫn
            </label>
            <button type="button" className={btn.danger} onClick={() => set('initialBoardPosts', l.initialBoardPosts.filter((_, j) => j !== i))}>
              <Trash2 className="h-3.5 w-3.5" /> Xoá
            </button>
          </div>
        ))}
        <button
          type="button"
          className={btn.small}
          onClick={() => set('initialBoardPosts', [...l.initialBoardPosts, { id: genId('post'), authorName: '', station: 'tang-toc', methodTitle: '', content: '', stars: 0, isMisconception: false, createdAt: 'Hoạt động Khám phá' }])}
        >
          <Plus className="h-3.5 w-3.5" /> Thêm cách giải
        </button>
      </Section>

      <Section title="5. Quy tắc cần ghi nhớ (Bước 5)" open={false}>
        {l.coreRules.map((c, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-6">
            <input className={`${inputCls} md:col-span-5`} placeholder={`Quy tắc ${i + 1}: tên ngắn`} value={c.title} onChange={(e) => set('coreRules', l.coreRules.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
            <button type="button" className={btn.danger} onClick={() => set('coreRules', l.coreRules.filter((_, j) => j !== i))}>
              <Trash2 className="h-3.5 w-3.5" /> Xoá
            </button>
            <textarea className={`${inputCls} md:col-span-6`} rows={2} placeholder="Nội dung quy tắc" value={c.content} onChange={(e) => set('coreRules', l.coreRules.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)))} />
            <input className={`${inputCls} md:col-span-6`} placeholder="Ví dụ minh hoạ" value={c.example} onChange={(e) => set('coreRules', l.coreRules.map((x, j) => (j === i ? { ...x, example: e.target.value } : x)))} />
          </div>
        ))}
        <button type="button" className={btn.small} onClick={() => set('coreRules', [...l.coreRules, { stepNumber: l.coreRules.length + 1, title: '', content: '', example: '' }])}>
          <Plus className="h-3.5 w-3.5" /> Thêm quy tắc
        </button>
      </Section>

      <Section title="6. Câu luyện tập theo trạm (Bước 5 và giao bài về nhà)">
        <div className="flex flex-wrap gap-2" role="tablist">
          {STATIONS.map((s) => (
            <button key={s} type="button" role="tab" aria-selected={qTab === s} onClick={() => setQTab(s)} className={`rounded-xl px-3 py-2 text-sm font-bold ${qTab === s ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {STATION_EMOJI[s]} {STATION_LABEL[s]} ({l.practiceQuestions.filter((q) => q.station === s).length})
            </button>
          ))}
        </div>
        {qs.map((q, i) => {
          const opts = [...(q.options ?? []), '', '', '', ''].slice(0, Math.max(4, q.options?.length ?? 0));
          return (
            <div key={q.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-600">Câu {i + 1}</span>
                <button type="button" className={btn.danger} aria-label={`Xoá câu luyện tập ${i + 1}`} onClick={() => set('practiceQuestions', l.practiceQuestions.filter((x) => x.id !== q.id))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <textarea className={inputCls} rows={2} placeholder="Nội dung câu hỏi" value={q.text} onChange={(e) => setQ(q.id, { text: e.target.value })} aria-label={`Nội dung câu luyện tập ${i + 1}`} />
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {opts.map((o, oi) => (
                  <label key={oi} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`ok-${q.id}`}
                      checked={Boolean(o.trim()) && q.correctAnswer === o}
                      onChange={() => setQ(q.id, { correctAnswer: o })}
                      aria-label={`Phương án ${String.fromCharCode(65 + oi)} là đáp án đúng`}
                    />
                    <span className="w-4 font-bold">{String.fromCharCode(65 + oi)}.</span>
                    <input
                      className={inputCls}
                      value={o}
                      onChange={(e) => {
                        const next = opts.map((x, j) => (j === oi ? e.target.value : x));
                        setQ(q.id, { options: next, correctAnswer: q.correctAnswer === o ? e.target.value : q.correctAnswer });
                      }}
                    />
                  </label>
                ))}
              </div>
              <input className={inputCls} placeholder="Lời giải thích (hiện sau khi chọn đáp án)" value={q.explanation} onChange={(e) => setQ(q.id, { explanation: e.target.value })} />
              <input className={inputCls} placeholder="Gợi ý nhẹ (tuỳ chọn, không lộ đáp án)" value={q.hint ?? ''} onChange={(e) => setQ(q.id, { hint: e.target.value })} />
            </div>
          );
        })}
        <button
          type="button"
          className={btn.small}
          onClick={() =>
            set('practiceQuestions', [
              ...l.practiceQuestions,
              { id: genId('q'), station: qTab, text: '', type: 'multiple-choice', options: ['', '', '', ''], correctAnswer: '', explanation: '', difficulty: qTab === 'khoi-hanh' ? 1 : qTab === 'tang-toc' ? 2 : 3 },
            ])
          }
        >
          <Plus className="h-3.5 w-3.5" /> Thêm câu cho {STATION_LABEL[qTab]}
        </button>
      </Section>

      {check && (check.errors.length > 0 || check.warnings.length > 0) && (
        <div role="alert" className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
          {check.errors.length > 0 && (
            <div className="text-rose-900">
              <p className="font-bold">Cần sửa trước khi lưu:</p>
              <ul className="ml-5 list-disc">
                {check.errors.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          {check.warnings.length > 0 && (
            <div className="text-amber-900">
              <p className="font-bold">Nên bổ sung (vẫn lưu được):</p>
              <ul className="ml-5 list-disc">
                {check.warnings.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {err && (
        <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-900">
          {err}
        </p>
      )}
      <div className="sticky bottom-3 flex justify-end">
        <button type="button" className={`${btn.primary} shadow-lg`} onClick={save} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? 'Đang lưu…' : 'Lưu bài học'}
        </button>
      </div>
    </div>
  );
};

