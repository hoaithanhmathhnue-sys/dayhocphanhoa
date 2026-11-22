// Kiểu dữ liệu và hàm thuần cho chức năng "Giao bài online" (không phụ thuộc Firebase để dễ kiểm thử).
import type { DifferentiatedLesson, Question, StationTier } from '../types/education';

export const STATIONS: StationTier[] = ['khoi-hanh', 'tang-toc', 'but-pha'];
export const STATION_LABEL: Record<StationTier, string> = {
  'khoi-hanh': 'Trạm Khởi Hành',
  'tang-toc': 'Trạm Tăng Tốc',
  'but-pha': 'Trạm Bứt Phá',
};
export const STATION_EMOJI: Record<StationTier, string> = {
  'khoi-hanh': '🌱',
  'tang-toc': '🚀',
  'but-pha': '🌟',
};

/** Tên miền giả cho tài khoản học sinh (Firebase không gửi thư tới địa chỉ này). */
export const STUDENT_EMAIL_DOMAIN = 'hs.mathdiff5.app';

// Bỏ các kí tự dễ nhầm (0/O, 1/I/L) để HS lớp 5 gõ mã lớp không sai.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export interface RandomSource {
  (): number; // trả về số trong [0, 1)
}

const defaultRandom: RandomSource = () => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
};

export function generateClassCode(rand: RandomSource = defaultRandom, length = 6): string {
  let s = '';
  for (let i = 0; i < length; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return s;
}

/** PIN 6 chữ số (Firebase yêu cầu mật khẩu tối thiểu 6 kí tự). */
export function generatePin(rand: RandomSource = defaultRandom): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += Math.floor(rand() * 10).toString();
  return s;
}

export function normalizeClassCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function formatStudentNumber(n: number): string {
  return String(n).padStart(2, '0');
}

/** Khoá tra cứu đăng nhập công khai: MÃLỚP-SỐTT, ví dụ "K7MPQ2-05". */
export function loginKey(classCode: string, number: number): string {
  return `${normalizeClassCode(classCode)}-${formatStudentNumber(number)}`;
}

/** Email tổng hợp cho tài khoản HS; hậu tố ngẫu nhiên cho phép "cấp lại PIN" bằng tài khoản mới. */
export function studentEmail(classCode: string, number: number, suffix: string): string {
  return `${loginKey(classCode, number).toLowerCase()}-${suffix.toLowerCase()}@${STUDENT_EMAIL_DOMAIN}`;
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

/** Tách danh sách họ tên dán vào (mỗi dòng một người), bỏ dòng trống, bỏ số thứ tự đầu dòng. */
export function parseNameList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*\d+\s*[.)\-:]\s*/, '').trim())
    .filter((l) => l.length > 0)
    .map((l) => l.replace(/\s+/g, ' '));
}

// ----------------------------- Câu hỏi & bài giao -----------------------------

/** Câu trắc nghiệm đầy đủ (chỉ nằm ở máy GV và trong tài liệu khoá đáp án). */
export interface McqItem {
  id: string;
  text: string;
  options: string[];
  correct: string; // trùng với một phần tử trong options
  explanation: string;
  source?: 'lesson' | 'teacher' | 'ai';
}

/** Phần câu hỏi HS được đọc trước khi nộp (không có đáp án). */
export interface PublicMcq {
  id: string;
  text: string;
  options: string[];
}

export interface EssayItem {
  id: string;
  prompt: string;
  maxScore: number;
}

export type StationQuestions = Record<StationTier, McqItem[]>;

export interface AssignmentDraft {
  title: string;
  lessonTitle: string;
  instructions: string;
  classId: string;
  dueAt: Date;
  passingScore: number;
  stations: StationQuestions;
  essays: EssayItem[];
}

export interface AnswerKey {
  [station: string]: { [qid: string]: { correct: string; explanation: string } };
}

export function emptyStations(): StationQuestions {
  return { 'khoi-hanh': [], 'tang-toc': [], 'but-pha': [] };
}

let idCounter = 0;
export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

/** Chuyển câu hỏi của bài học (dạng dùng trên lớp) thành câu trắc nghiệm giao về nhà. */
export function questionToMcq(q: Question): McqItem | null {
  let options = q.options ? [...q.options] : [];
  if (q.type === 'true-false' && options.length === 0) options = ['Đúng', 'Sai'];
  if (options.length < 2 || !options.includes(q.correctAnswer)) return null;
  return {
    id: q.id,
    text: q.text,
    options,
    correct: q.correctAnswer,
    explanation: q.explanation,
    source: 'lesson',
  };
}

export function stationsFromLesson(lesson: DifferentiatedLesson): StationQuestions {
  const out = emptyStations();
  for (const q of lesson.practiceQuestions) {
    const m = questionToMcq(q);
    if (m && out[q.station]) out[q.station].push(m);
  }
  return out;
}

/** Kiểm tra bài giao trước khi phát; trả về danh sách lỗi (rỗng = hợp lệ). */
export function validateDraft(d: AssignmentDraft, now: Date = new Date()): string[] {
  const errs: string[] = [];
  if (!d.title.trim()) errs.push('Chưa nhập tên bài giao.');
  if (!d.classId) errs.push('Chưa chọn lớp.');
  if (!(d.dueAt instanceof Date) || Number.isNaN(d.dueAt.getTime())) errs.push('Hạn nộp không hợp lệ.');
  else if (d.dueAt.getTime() <= now.getTime()) errs.push('Hạn nộp phải sau thời điểm hiện tại.');
  if (d.passingScore < 0 || d.passingScore > 100) errs.push('Ngưỡng đạt phải từ 0 đến 100%.');
  const total = STATIONS.reduce((n, s) => n + d.stations[s].length, 0);
  if (total === 0 && d.essays.length === 0) errs.push('Bài giao chưa có câu hỏi nào.');
  for (const s of STATIONS) {
    d.stations[s].forEach((q, i) => {
      const where = `${STATION_LABEL[s]}, câu ${i + 1}`;
      if (!q.text.trim()) errs.push(`${where}: chưa có nội dung câu hỏi.`);
      const opts = q.options.map((o) => o.trim());
      if (opts.filter(Boolean).length < 2) errs.push(`${where}: cần ít nhất 2 phương án.`);
      if (new Set(opts.filter(Boolean)).size !== opts.filter(Boolean).length) errs.push(`${where}: có phương án trùng nhau.`);
      if (!opts.includes(q.correct.trim()) || !q.correct.trim()) errs.push(`${where}: chưa chọn đáp án đúng.`);
    });
  }
  d.essays.forEach((e, i) => {
    if (!e.prompt.trim()) errs.push(`Câu tự luận ${i + 1}: chưa có đề bài.`);
    if (!(e.maxScore > 0)) errs.push(`Câu tự luận ${i + 1}: điểm tối đa phải lớn hơn 0.`);
  });
  return errs;
}

/** Tách bài giao thành phần công khai (HS đọc) và khoá đáp án (chỉ GV, hoặc HS sau khi đã nộp). */
export function splitForPublish(stations: StationQuestions): {
  publicStations: Record<StationTier, PublicMcq[]>;
  key: AnswerKey;
} {
  const publicStations = { 'khoi-hanh': [], 'tang-toc': [], 'but-pha': [] } as Record<StationTier, PublicMcq[]>;
  const key: AnswerKey = {};
  for (const s of STATIONS) {
    key[s] = {};
    for (const q of stations[s]) {
      const options = q.options.map((o) => o.trim()).filter(Boolean);
      publicStations[s].push({ id: q.id, text: q.text.trim(), options });
      key[s][q.id] = { correct: q.correct.trim(), explanation: q.explanation.trim() };
    }
  }
  return { publicStations, key };
}

export interface McqGrade {
  correct: number;
  total: number;
  percent: number; // làm tròn đến số nguyên
  perQuestion: Record<string, boolean>;
}

export function gradeMcq(
  station: StationTier,
  questions: PublicMcq[],
  answers: Record<string, string>,
  key: AnswerKey,
): McqGrade {
  const k = key[station] ?? {};
  const perQuestion: Record<string, boolean> = {};
  let correct = 0;
  for (const q of questions) {
    const ok = answers[q.id] !== undefined && k[q.id] !== undefined && answers[q.id] === k[q.id].correct;
    perQuestion[q.id] = ok;
    if (ok) correct += 1;
  }
  const total = questions.length;
  return { correct, total, percent: total ? Math.round((correct / total) * 100) : 0, perQuestion };
}

export function isPassed(percent: number, passingScore: number): boolean {
  return percent >= passingScore;
}

// ----------------------------- Xuất bảng điểm -----------------------------

export interface ResultRow {
  number: number;
  name: string;
  station: StationTier;
  submitted: boolean;
  submittedAt?: Date;
  mcq?: McqGrade;
  passed?: boolean;
  essayTotal?: number;
  essayMax?: number;
  feedback?: string;
}

function csvCell(v: string | number | undefined): string {
  const s = v === undefined ? '' : String(v);
  return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function viDate(d?: Date): string {
  if (!d) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** CSV có BOM để Excel đọc đúng tiếng Việt. */
export function resultsToCsv(rows: ResultRow[], passingScore: number): string {
  const head = ['STT', 'Họ và tên', 'Trạm', 'Đã nộp', 'Thời điểm nộp', 'Trắc nghiệm đúng', 'Tỉ lệ (%)', `Đạt (≥ ${passingScore}%)`, 'Điểm tự luận', 'Nhận xét'];
  const lines = [head.map(csvCell).join(',')];
  for (const r of rows) {
    lines.push(
      [
        formatStudentNumber(r.number),
        r.name,
        STATION_LABEL[r.station],
        r.submitted ? 'Có' : 'Chưa',
        viDate(r.submittedAt),
        r.mcq ? `${r.mcq.correct}/${r.mcq.total}` : '',
        r.mcq ? r.mcq.percent : '',
        r.passed === undefined ? '' : r.passed ? 'Đạt' : 'Chưa đạt',
        r.essayMax ? `${r.essayTotal ?? ''}/${r.essayMax}` : '',
        r.feedback ?? '',
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return '﻿' + lines.join('\r\n');
}

export function formatViDateTime(d: Date): string {
  return viDate(d);
}
