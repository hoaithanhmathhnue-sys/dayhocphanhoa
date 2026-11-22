// Đọc danh sách học sinh từ file Excel (.xlsx), Word (.docx), .csv hoặc .txt — xử lí hoàn toàn trên trình duyệt.
import { unzipSync, strFromU8 } from 'fflate';
import type { StationTier } from '../types/education';

export interface ImportedStudent {
  name: string;
  station?: StationTier;
}

export interface ImportResult {
  entries: ImportedStudent[];
  source: string; // mô tả ngắn: "bảng tính, cột Họ và tên"...
}

export class ClassListImportError extends Error {}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export function stationFromText(raw: string): StationTier | undefined {
  const t = fold(raw);
  if (!t) return undefined;
  if (t.includes('khoi hanh')) return 'khoi-hanh';
  if (t.includes('tang toc')) return 'tang-toc';
  if (t.includes('but pha')) return 'but-pha';
  return undefined;
}

const cleanName = (s: string) =>
  s
    .replace(/^\s*\d+\s*[.)\-:]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Một ô "trông giống họ tên": toàn chữ cái, 2–7 từ, không có chữ số. */
export function looksLikeName(s: string): boolean {
  const t = cleanName(s);
  if (!t || /\d/.test(t)) return false;
  if (!/^[\p{L}][\p{L} .'-]*$/u.test(t)) return false;
  const words = t.split(' ').length;
  return words >= 2 && words <= 7;
}

// Dòng tiêu đề/ghi chú (so khớp đầu dòng, đã bỏ dấu). Không dùng từ đơn như "truong", "tong"
// vì sẽ loại nhầm họ Trương, Tống.
const SKIP_LINE = /^(danh sach|truong (tieu hoc|th |thcs|thpt|pt|mam non)|lop \d|lop:|nam hoc|giao vien|gvcn|si so|stt$|tt$|tong (cong|so)|ho (va )?ten)/;

/** Chuyển bảng (mảng các hàng) thành danh sách học sinh: tìm dòng tiêu đề, cột tên, cột trạm (nếu có). */
export function rowsToEntries(rows: string[][]): ImportResult {
  const R = rows.map((r) => r.map((c) => (c ?? '').toString().trim()));
  let headerIdx = -1;
  let fullCol = -1;
  let lastCol = -1;
  let firstCol = -1;
  let stationCol = -1;
  for (let i = 0; i < Math.min(R.length, 15) && headerIdx < 0; i++) {
    R[i].forEach((c, j) => {
      const f = fold(c);
      if (/^(ho (va )?ten|ho va ten hoc sinh|ho ten hoc sinh|ho va ten hs|ho ten hs|hoc sinh)$/.test(f)) fullCol = j;
      else if (/^(ho (va )?ten dem|ho dem|ho)$/.test(f)) firstCol = j;
      else if (/^ten$/.test(f)) lastCol = j;
      else if (/^tram/.test(f)) stationCol = j;
    });
    if (fullCol >= 0 || lastCol >= 0) headerIdx = i;
    else stationCol = -1;
  }

  const out: ImportedStudent[] = [];
  const push = (name: string, stationCell?: string) => {
    const n = cleanName(name);
    if (!n || SKIP_LINE.test(fold(n))) return;
    out.push({ name: n, station: stationCell ? stationFromText(stationCell) : undefined });
  };

  if (headerIdx >= 0) {
    for (const r of R.slice(headerIdx + 1)) {
      const name =
        fullCol >= 0
          ? r[fullCol] ?? ''
          : [firstCol >= 0 ? r[firstCol] ?? '' : '', r[lastCol] ?? ''].join(' ');
      if (!name.trim() || /\d/.test(name)) continue;
      push(name, stationCol >= 0 ? r[stationCol] : undefined);
    }
    const label = fullCol >= 0 ? 'cột "Họ và tên"' : firstCol >= 0 ? 'ghép cột "Họ đệm" và "Tên"' : 'cột "Tên"';
    return { entries: out, source: label + (stationCol >= 0 ? ', có cột "Trạm"' : '') };
  }

  // Không có tiêu đề: chọn cột có nhiều ô "giống họ tên" nhất.
  const width = Math.max(0, ...R.map((r) => r.length));
  let best = -1;
  let bestCount = 0;
  for (let j = 0; j < width; j++) {
    const n = R.filter((r) => looksLikeName(r[j] ?? '')).length;
    if (n > bestCount) {
      best = j;
      bestCount = n;
    }
  }
  if (best < 0) return { entries: [], source: 'không tìm thấy cột họ tên' };
  for (const r of R) if (looksLikeName(r[best] ?? '')) push(r[best]);
  return { entries: out, source: `cột thứ ${best + 1}` };
}

/** Danh sách theo dòng (Word không có bảng, .txt). */
export function linesToEntries(text: string): ImportResult {
  const entries = text
    .split(/\r?\n/)
    .map(cleanName)
    .filter((l) => l && !SKIP_LINE.test(fold(l)) && looksLikeName(l))
    .map((name) => ({ name }));
  return { entries, source: 'từng dòng' };
}

// ----------------------------- Excel (.xlsx) -----------------------------

const parseXml = (s: string) => new DOMParser().parseFromString(s, 'application/xml');
const byTag = (el: Document | Element, tag: string) => Array.from(el.getElementsByTagNameNS('*', tag));

function colIndex(ref: string): number {
  const letters = ref.replace(/\d+$/, '');
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function xlsxToRows(bytes: Uint8Array): string[][] {
  const z = unzipSync(bytes);
  const get = (p: string) => (z[p] ? strFromU8(z[p]) : '');
  const shared = get('xl/sharedStrings.xml')
    ? byTag(parseXml(get('xl/sharedStrings.xml')), 'si').map((si) => byTag(si, 't').map((t) => t.textContent ?? '').join(''))
    : [];
  // Trang tính đầu tiên theo thứ tự trong workbook
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const wb = get('xl/workbook.xml');
  const rels = get('xl/_rels/workbook.xml.rels');
  if (wb && rels) {
    const first = byTag(parseXml(wb), 'sheet')[0];
    const rid = first?.getAttribute('r:id') ?? first?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const rel = byTag(parseXml(rels), 'Relationship').find((r) => r.getAttribute('Id') === rid);
    const target = rel?.getAttribute('Target');
    if (target) sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  }
  const sheet = get(sheetPath);
  if (!sheet) throw new ClassListImportError('Không đọc được trang tính đầu tiên trong file Excel.');
  const rows: string[][] = [];
  for (const row of byTag(parseXml(sheet), 'row')) {
    const r: string[] = [];
    for (const c of byTag(row, 'c')) {
      const ref = c.getAttribute('r');
      const idx = ref ? colIndex(ref) : r.length;
      const t = c.getAttribute('t');
      let v = '';
      if (t === 's') v = shared[Number(byTag(c, 'v')[0]?.textContent ?? -1)] ?? '';
      else if (t === 'inlineStr') v = byTag(c, 't').map((x) => x.textContent ?? '').join('');
      else v = byTag(c, 'v')[0]?.textContent ?? '';
      r[idx] = v;
    }
    rows.push(Array.from(r, (x) => x ?? ''));
  }
  return rows;
}

// ----------------------------- Word (.docx) -----------------------------

export function docxToResult(bytes: Uint8Array): ImportResult {
  const z = unzipSync(bytes);
  if (!z['word/document.xml']) throw new ClassListImportError('File Word không hợp lệ.');
  const doc = parseXml(strFromU8(z['word/document.xml']));
  const paraText = (p: Element) => byTag(p, 't').map((t) => t.textContent ?? '').join('');
  for (const tbl of byTag(doc, 'tbl')) {
    const rows = byTag(tbl, 'tr').map((tr) => byTag(tr, 'tc').map((tc) => byTag(tc, 'p').map(paraText).join(' ').trim()));
    if (rows.length >= 2) {
      const res = rowsToEntries(rows);
      if (res.entries.length) return { ...res, source: `bảng trong Word, ${res.source}` };
    }
  }
  const lines = byTag(doc, 'p').map(paraText).join('\n');
  const res = linesToEntries(lines);
  return { ...res, source: `văn bản Word, ${res.source}` };
}

// ----------------------------- CSV / TXT -----------------------------

export function csvToRows(text: string): string[][] {
  const sep = (text.match(/;/g)?.length ?? 0) > (text.match(/,/g)?.length ?? 0) ? ';' : text.includes('\t') ? '\t' : ',';
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => l.split(sep).map((c) => c.replace(/^"|"$/g, '').trim()));
}

export async function readClassListFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  if (file.size > 10 * 1024 * 1024) throw new ClassListImportError('File quá lớn (tối đa 10 MB).');
  if (name.endsWith('.xls') || name.endsWith('.doc'))
    throw new ClassListImportError('Đây là định dạng Office cũ. Hãy mở file và "Lưu thành" .xlsx (Excel) hoặc .docx (Word) rồi tải lại.');
  try {
    if (name.endsWith('.xlsx')) {
      const res = rowsToEntries(xlsxToRows(new Uint8Array(await file.arrayBuffer())));
      return { ...res, source: `Excel, ${res.source}` };
    }
    if (name.endsWith('.docx')) return docxToResult(new Uint8Array(await file.arrayBuffer()));
    if (name.endsWith('.csv')) {
      const res = rowsToEntries(csvToRows(await file.text()));
      return { ...res, source: `CSV, ${res.source}` };
    }
    if (name.endsWith('.txt')) return linesToEntries(await file.text());
  } catch (e) {
    if (e instanceof ClassListImportError) throw e;
    throw new ClassListImportError('Không đọc được file. Hãy kiểm tra file có mở được bằng Excel/Word không.');
  }
  throw new ClassListImportError('Chỉ nhận file .xlsx, .docx, .csv hoặc .txt.');
}
