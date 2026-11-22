import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { csvToRows, docxToResult, linesToEntries, rowsToEntries, stationFromText, xlsxToRows } from '../utils/classListImport';

const names = (r: { entries: { name: string }[] }) => r.entries.map((e) => e.name);

// Tạo file .xlsx tối thiểu (chuỗi dùng chung + một ô số + một ô inlineStr)
function makeXlsx(rows: (string | number)[][]): Uint8Array {
  const shared: string[] = [];
  const sheetRows = rows
    .map((r, i) => {
      const cells = r
        .map((v, j) => {
          const ref = String.fromCharCode(65 + j) + (i + 1);
          if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
          if (v === '') return '';
          shared.push(v);
          return `<c r="${ref}" t="s"><v>${shared.length - 1}</v></c>`;
        })
        .join('');
      return `<row r="${i + 1}">${cells}</row>`;
    })
    .join('');
  const ns = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  return zipSync({
    'xl/workbook.xml': strToU8(`<workbook ${ns} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="DS" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="x"/></Relationships>`),
    'xl/sharedStrings.xml': strToU8(`<sst ${ns}>${shared.map((s) => `<si><t>${s}</t></si>`).join('')}</sst>`),
    'xl/worksheets/sheet1.xml': strToU8(`<worksheet ${ns}><sheetData>${sheetRows}</sheetData></worksheet>`),
  });
}

function makeDocx(body: string): Uint8Array {
  return zipSync({
    'word/document.xml': strToU8(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`),
  });
}
const wp = (t: string) => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`;
const wtr = (cells: string[]) => `<w:tr>${cells.map((c) => `<w:tc>${wp(c)}</w:tc>`).join('')}</w:tr>`;

describe('Đọc danh sách lớp từ Excel', () => {
  it('mẫu điển hình: tiêu đề trường, dòng STT | Họ và tên | Ngày sinh, có ô trống', () => {
    const x = makeXlsx([
      ['TRƯỜNG TIỂU HỌC ABC'],
      ['DANH SÁCH HỌC SINH LỚP 5A'],
      ['STT', 'Họ và tên', 'Ngày sinh'],
      [1, 'Nguyễn Minh An', '01/02/2015'],
      [2, 'Trương Bảo Châu', '03/04/2015'],
      [3, '', ''],
      [4, 'Tống Hoàng Dũng', '05/06/2015'],
    ]);
    const r = rowsToEntries(xlsxToRows(x));
    expect(names(r)).toEqual(['Nguyễn Minh An', 'Trương Bảo Châu', 'Tống Hoàng Dũng']);
    expect(r.source).toContain('Họ và tên');
  });

  it('ghép cột "Họ đệm" và "Tên"; đọc cột "Trạm"', () => {
    const x = makeXlsx([
      ['TT', 'Họ đệm', 'Tên', 'Trạm'],
      [1, 'Nguyễn Minh', 'An', 'Khởi Hành'],
      [2, 'Lê Đăng', 'Khoa', 'Trạm Bứt Phá'],
      [3, 'Bùi Khánh', 'Chi', ''],
    ]);
    const r = rowsToEntries(xlsxToRows(x));
    expect(r.entries).toEqual([
      { name: 'Nguyễn Minh An', station: 'khoi-hanh' },
      { name: 'Lê Đăng Khoa', station: 'but-pha' },
      { name: 'Bùi Khánh Chi', station: undefined },
    ]);
  });

  it('không có dòng tiêu đề: tự chọn cột trông giống họ tên', () => {
    const x = makeXlsx([
      [1, 'Phạm Ngọc Hân', 'Nữ'],
      [2, 'Vũ Tuấn Kiệt', 'Nam'],
    ]);
    expect(names(rowsToEntries(xlsxToRows(x)))).toEqual(['Phạm Ngọc Hân', 'Vũ Tuấn Kiệt']);
  });
});

describe('Đọc danh sách lớp từ Word', () => {
  it('bảng trong Word', () => {
    const d = makeDocx(wp('DANH SÁCH LỚP 5B') + `<w:tbl>${wtr(['STT', 'Họ và tên học sinh'])}${wtr(['1', 'Đặng Phương Linh'])}${wtr(['2', 'Hoàng Gia Bảo'])}</w:tbl>`);
    const r = docxToResult(d);
    expect(names(r)).toEqual(['Đặng Phương Linh', 'Hoàng Gia Bảo']);
    expect(r.source).toContain('bảng');
  });

  it('không có bảng: đọc từng dòng, bỏ tiêu đề và số thứ tự, giữ họ Trương', () => {
    const d = makeDocx(wp('DANH SÁCH HỌC SINH') + wp('Trường Tiểu học Kim Đồng') + wp('Năm học 2026 – 2027') + wp('1. Trương Thị Mai Anh') + wp('2) Lê Văn Bách') + wp(''));
    expect(names(docxToResult(d))).toEqual(['Trương Thị Mai Anh', 'Lê Văn Bách']);
  });
});

describe('CSV, TXT và trạm', () => {
  it('CSV dùng dấu chấm phẩy (Excel tiếng Việt)', () => {
    expect(names(rowsToEntries(csvToRows('STT;Họ tên;Trạm\n1;Ngô Thanh Hà;Tăng Tốc\n2;Võ Bảo Ngọc;')))).toEqual(['Ngô Thanh Hà', 'Võ Bảo Ngọc']);
  });

  it('TXT mỗi dòng một tên', () => {
    expect(names(linesToEntries('Nguyễn Văn Nam\n\nTrần Thị Mai Anh\n'))).toEqual(['Nguyễn Văn Nam', 'Trần Thị Mai Anh']);
  });

  it('nhận diện trạm có/không dấu', () => {
    expect(stationFromText('tang toc')).toBe('tang-toc');
    expect(stationFromText('TRẠM KHỞI HÀNH')).toBe('khoi-hanh');
    expect(stationFromText('khác')).toBeUndefined();
  });
});
