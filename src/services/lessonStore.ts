// Kho bài học của giáo viên (ngoài 3 bài mẫu): lưu trên trình duyệt, kiểm tra hợp lệ, xuất/nhập tệp.
import type {
  CoreRuleStep,
  DifferentiatedLesson,
  Question,
  SituationItem,
  SolutionPost,
  StationTask,
  StationTier,
} from '../types/education';
import { SAMPLE_LESSONS } from '../data/sampleLessons';

export const CUSTOM_LESSONS_KEY = 'mathdiff5_custom_lessons_v1';
export const DELETED_LESSONS_KEY = 'mathdiff5_deleted_lessons_v1';
export const ACTIVE_LESSON_KEY = 'mathdiff5_active_lesson_v1';
export const OPEN_TAB_KEY = 'mathdiff5_open_tab_v1';
export const TEXTBOOK_DEFAULT = 'Toán 5 — Kết nối tri thức với cuộc sống';
const TIERS: StationTier[] = ['khoi-hanh', 'tang-toc', 'but-pha'];
const STATION_NAME: Record<StationTier, string> = { 'khoi-hanh': 'Trạm Khởi Hành', 'tang-toc': 'Trạm Tăng Tốc', 'but-pha': 'Trạm Bứt Phá' };
const DIFFICULTY: Record<StationTier, 1 | 2 | 3> = { 'khoi-hanh': 1, 'tang-toc': 2, 'but-pha': 3 };

export const isSampleLesson = (id: string) => SAMPLE_LESSONS.some((l) => l.id === id);

let seq = 0;
export const genId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ----------------------------- Chuẩn hoá dữ liệu (dùng cho tệp nhập, đám mây, AI) -----------------------------

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : v === undefined || v === null ? d : String(v));
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const tier = (v: unknown): StationTier => (TIERS.includes(v as StationTier) ? (v as StationTier) : 'tang-toc');

function sanitizeTask(t: Partial<StationTask> | undefined, s: StationTier): StationTask {
  return {
    station: s,
    stationName: STATION_NAME[s],
    subtitle: str(t?.subtitle),
    corePrompt: str(t?.corePrompt),
    progressiveHints: arr<unknown>(t?.progressiveHints).map((h) => str(h)).filter(Boolean),
    expectedProduct: str(t?.expectedProduct),
    teacherGuidance: str(t?.teacherGuidance),
    interactiveWidget: (['place-value-table', 'symbol-compare', 'number-line', 'general'] as const).includes(t?.interactiveWidget as never)
      ? (t!.interactiveWidget as StationTask['interactiveWidget'])
      : s === 'khoi-hanh' ? 'place-value-table' : s === 'tang-toc' ? 'symbol-compare' : 'number-line',
  };
}

/** Đưa một đối tượng bất kì (tệp nhập, đám mây, AI) về đúng cấu trúc bài học; thiếu gì điền mặc định. */
export function sanitizeLesson(raw: unknown): DifferentiatedLesson {
  const r = (raw ?? {}) as Partial<DifferentiatedLesson> & Record<string, unknown>;
  const tasks = (r.stationTasks ?? {}) as Partial<Record<StationTier, StationTask>>;
  return {
    id: str(r.id) || genId('custom'),
    lessonCode: str(r.lessonCode),
    title: str(r.title),
    textbook: str(r.textbook, TEXTBOOK_DEFAULT) || TEXTBOOK_DEFAULT,
    topic: str(r.topic),
    objectives: arr<unknown>(r.objectives).map((o) => str(o)).filter(Boolean),
    centralQuestion: str(r.centralQuestion),
    contextStory: str(r.contextStory),
    situationItems: arr<Partial<SituationItem>>(r.situationItems).slice(0, 6).map((it, i) => ({
      id: str(it.id) || `item-${i + 1}`,
      title: str(it.title),
      location: str(it.location) || undefined,
      valueLabel: str(it.valueLabel),
      numericValue: Number.isFinite(Number(it.numericValue)) ? Number(it.numericValue) : 0,
      unit: str(it.unit),
      imageUrl: str(it.imageUrl) || undefined,
      accentColor: str(it.accentColor, 'teal') || 'teal',
    })),
    stationTasks: {
      'khoi-hanh': sanitizeTask(tasks['khoi-hanh'], 'khoi-hanh'),
      'tang-toc': sanitizeTask(tasks['tang-toc'], 'tang-toc'),
      'but-pha': sanitizeTask(tasks['but-pha'], 'but-pha'),
    },
    coreRules: arr<Partial<CoreRuleStep>>(r.coreRules).map((c, i) => ({
      stepNumber: i + 1,
      title: str(c.title),
      content: str(c.content),
      example: str(c.example),
    })),
    initialBoardPosts: arr<Partial<SolutionPost>>(r.initialBoardPosts).map((p, i) => ({
      id: str(p.id) || `post-${i + 1}`,
      authorName: str(p.authorName),
      station: tier(p.station),
      methodTitle: str(p.methodTitle),
      content: str(p.content),
      stars: Number.isFinite(Number(p.stars)) ? Number(p.stars) : 0,
      isMisconception: Boolean(p.isMisconception),
      teacherComment: str(p.teacherComment) || undefined,
      createdAt: str(p.createdAt, 'Hoạt động Khám phá') || 'Hoạt động Khám phá',
    })),
    practiceQuestions: arr<Partial<Question>>(r.practiceQuestions).map((q, i) => {
      const s = tier(q.station);
      return {
        id: str(q.id) || `q-${i + 1}`,
        station: s,
        text: str(q.text),
        type: q.type === 'true-false' || q.type === 'fill-blank' ? q.type : 'multiple-choice',
        options: arr<unknown>(q.options).map((o) => str(o)),
        correctAnswer: str(q.correctAnswer),
        explanation: str(q.explanation),
        hint: str(q.hint) || undefined,
        difficulty: ([1, 2, 3] as const).includes(q.difficulty as 1) ? (q.difficulty as 1 | 2 | 3) : DIFFICULTY[s],
      };
    }),
    passingScore: Number.isFinite(Number(r.passingScore)) ? Math.min(100, Math.max(0, Number(r.passingScore))) : 75,
    isApprovedByTeacher: Boolean(r.isApprovedByTeacher),
    updatedAt: Number.isFinite(Number(r.updatedAt)) ? Number(r.updatedAt) : undefined,
  };
}

export function newBlankLesson(): DifferentiatedLesson {
  const l = sanitizeLesson({ id: genId('custom'), passingScore: 75 });
  l.situationItems = [1, 2, 3].map((i) => ({ id: `item-${i}`, title: '', valueLabel: '', numericValue: 0, unit: '', accentColor: 'teal' }));
  l.stationTasks['khoi-hanh'].subtitle = 'Tiếp cận trực quan, gợi ý từng bước';
  l.stationTasks['tang-toc'].subtitle = 'Tự khám phá và giải thích quy tắc';
  l.stationTasks['but-pha'].subtitle = 'Đa cách giải và mở rộng thực tiễn';
  return l;
}

export function duplicateLesson(l: DifferentiatedLesson): DifferentiatedLesson {
  const copy = sanitizeLesson(JSON.parse(JSON.stringify(l)));
  copy.id = genId('custom');
  copy.title = `${l.title} (bản sao)`;
  copy.updatedAt = Date.now();
  return copy;
}

// ----------------------------- Kiểm tra trước khi lưu -----------------------------

export interface LessonCheck {
  errors: string[]; // chặn lưu
  warnings: string[]; // vẫn lưu được nhưng nên sửa
}

export function checkLesson(l: DifferentiatedLesson): LessonCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!l.lessonCode.trim()) errors.push('Chưa nhập số hiệu bài (ví dụ: Bài 24).');
  if (!l.title.trim()) errors.push('Chưa nhập tên bài.');
  if (!l.centralQuestion.trim()) warnings.push('Chưa có câu hỏi tình huống chung cho cả lớp.');
  TIERS.forEach((s) => {
    if (!l.stationTasks[s].corePrompt.trim()) warnings.push(`${STATION_NAME[s]}: chưa có nhiệm vụ.`);
    if (!l.practiceQuestions.some((q) => q.station === s)) warnings.push(`${STATION_NAME[s]}: chưa có câu luyện tập.`);
  });
  l.situationItems.forEach((it, i) => {
    if (!it.title.trim() || !it.valueLabel.trim()) warnings.push(`Đối tượng tình huống ${i + 1}: thiếu tên hoặc số liệu hiển thị.`);
  });
  TIERS.forEach((s) =>
    l.practiceQuestions
      .filter((q) => q.station === s)
      .forEach((q, i) => {
        const where = `${STATION_NAME[s]}, câu luyện tập ${i + 1}`;
        const opts = (q.options ?? []).map((o) => o.trim()).filter(Boolean);
        if (!q.text.trim()) errors.push(`${where}: chưa có nội dung.`);
        if (opts.length < 2) errors.push(`${where}: cần ít nhất 2 phương án.`);
        if (new Set(opts).size !== opts.length) errors.push(`${where}: có phương án trùng nhau.`);
        if (!q.correctAnswer.trim() || !opts.includes(q.correctAnswer.trim())) errors.push(`${where}: chưa chọn đáp án đúng.`);
        if (!q.explanation.trim()) warnings.push(`${where}: chưa có lời giải thích.`);
      }),
  );
  return { errors, warnings };
}

/** Chuẩn hoá trước khi lưu: bỏ phương án trống, đánh lại số bước quy tắc, đặt thời điểm cập nhật. */
export function finalizeLesson(l: DifferentiatedLesson): DifferentiatedLesson {
  const out = sanitizeLesson(JSON.parse(JSON.stringify(l)));
  out.practiceQuestions = out.practiceQuestions.map((q) => ({
    ...q,
    options: (q.options ?? []).map((o) => o.trim()).filter(Boolean),
    correctAnswer: q.correctAnswer.trim(),
  }));
  out.coreRules = out.coreRules.filter((c) => c.title.trim() || c.content.trim()).map((c, i) => ({ ...c, stepNumber: i + 1 }));
  out.initialBoardPosts = out.initialBoardPosts.filter((p) => p.methodTitle.trim() || p.content.trim());
  out.situationItems = out.situationItems.filter((it) => it.title.trim() || it.valueLabel.trim());
  out.isApprovedByTeacher = true;
  out.updatedAt = Date.now();
  return out;
}

// ----------------------------- Lưu trên trình duyệt -----------------------------

export function loadCustomLessons(): DifferentiatedLesson[] {
  try {
    const raw = localStorage.getItem(CUSTOM_LESSONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(sanitizeLesson).filter((l) => !isSampleLesson(l.id)) : [];
  } catch {
    return [];
  }
}

export class LessonStorageFullError extends Error {}

export function saveCustomLessons(list: DifferentiatedLesson[]): void {
  try {
    localStorage.setItem(CUSTOM_LESSONS_KEY, JSON.stringify(list));
  } catch {
    throw new LessonStorageFullError('Bộ nhớ trình duyệt đã đầy (thường do ảnh quá lớn). Hãy xoá bớt ảnh hoặc bài không dùng.');
  }
}

export function upsertLesson(l: DifferentiatedLesson): DifferentiatedLesson[] {
  const list = loadCustomLessons();
  const i = list.findIndex((x) => x.id === l.id);
  const next = i >= 0 ? list.map((x) => (x.id === l.id ? l : x)) : [l, ...list];
  saveCustomLessons(next);
  return next;
}

export function getDeletedIds(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(DELETED_LESSONS_KEY) ?? '[]');
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function setDeletedIds(ids: string[]): void {
  localStorage.setItem(DELETED_LESSONS_KEY, JSON.stringify([...new Set(ids)]));
}

export function removeLesson(id: string): DifferentiatedLesson[] {
  const next = loadCustomLessons().filter((x) => x.id !== id);
  saveCustomLessons(next);
  setDeletedIds([...getDeletedIds(), id]);
  return next;
}

// ----------------------------- Xuất / nhập tệp -----------------------------

export const EXPORT_FORMAT = 'mathdiff5-lessons';

export function exportLessonsJson(list: DifferentiatedLesson[]): string {
  return JSON.stringify({ format: EXPORT_FORMAT, version: 1, exportedAt: new Date().toISOString(), lessons: list }, null, 2);
}

export class LessonImportError extends Error {}

/** Đọc tệp bài học; bài trùng mã với bài đang có (hoặc bài mẫu) được nhập thành bản mới để không ghi đè. */
export function parseLessonsJson(text: string, existingIds: string[]): DifferentiatedLesson[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new LessonImportError('Tệp không đúng định dạng bài học MathDiff 5.');
  }
  const d = data as { format?: string; lessons?: unknown };
  const rawList = d && d.format === EXPORT_FORMAT ? d.lessons : Array.isArray(data) ? data : null;
  if (!Array.isArray(rawList) || rawList.length === 0) throw new LessonImportError('Tệp không có bài học nào.');
  const taken = new Set(existingIds);
  return rawList.map((raw) => {
    const l = sanitizeLesson(raw);
    if (!l.title.trim() || !l.lessonCode.trim()) throw new LessonImportError('Có bài trong tệp thiếu số hiệu hoặc tên bài.');
    if (taken.has(l.id) || isSampleLesson(l.id)) l.id = genId('custom');
    taken.add(l.id);
    l.updatedAt = Date.now();
    return l;
  });
}

export function lessonFileName(list: DifferentiatedLesson[]): string {
  const base = list.length === 1 ? `${list[0].lessonCode}-${list[0].title}` : `${list.length}-bai-hoc`;
  const slug = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `mathdiff5-${slug || 'bai-hoc'}.json`;
}

// ----------------------------- Ảnh tình huống -----------------------------

/** Thu nhỏ ảnh (cạnh dài tối đa 800px, JPEG) để lưu được trong trình duyệt và trên đám mây. */
export function compressImage(file: File, maxSide = 800, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Chỉ nhận tệp ảnh.'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      const ctx = c.getContext('2d');
      if (!ctx) return reject(new Error('Trình duyệt không hỗ trợ xử lí ảnh.'));
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh.'));
    };
    img.src = url;
  });
}
