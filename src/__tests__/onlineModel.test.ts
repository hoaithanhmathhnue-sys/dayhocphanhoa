import { describe, expect, it } from 'vitest';
import { SAMPLE_LESSONS } from '../data/sampleLessons';
import {
  emptyStations,
  generateClassCode,
  generatePin,
  gradeMcq,
  isPassed,
  isValidPin,
  loginKey,
  normalizeClassCode,
  parseNameList,
  questionToMcq,
  resultsToCsv,
  splitForPublish,
  stationsFromLesson,
  studentEmail,
  validateDraft,
  type AssignmentDraft,
} from '../online/model';

const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('Mã lớp, PIN, email học sinh', () => {
  it('mã lớp 6 kí tự, không có kí tự dễ nhầm và khớp luật Firestore ^[A-Z2-9]{6}$', () => {
    for (let i = 0; i < 200; i++) {
      const c = generateClassCode();
      expect(c).toMatch(/^[A-Z2-9]{6}$/);
      expect(c).not.toMatch(/[01OIL]/);
    }
  });

  it('PIN luôn đủ 6 chữ số, kể cả khi bắt đầu bằng 0', () => {
    expect(generatePin(seq([0, 0, 0.15, 0.99, 0.5, 0.3]))).toBe('001953');
    for (let i = 0; i < 100; i++) expect(isValidPin(generatePin())).toBe(true);
    expect(isValidPin('12345')).toBe(false);
    expect(isValidPin('12a456')).toBe(false);
  });

  it('chuẩn hoá mã lớp HS gõ (chữ thường, dấu cách, gạch)', () => {
    expect(normalizeClassCode(' k7mp-q2 ')).toBe('K7MPQ2');
  });

  it('khoá đăng nhập và email khớp mẫu email trong luật Firestore', () => {
    expect(loginKey('k7mpq2', 5)).toBe('K7MPQ2-05');
    const email = studentEmail('K7MPQ2', 5, 'AB3D');
    expect(email).toBe('k7mpq2-05-ab3d@hs.mathdiff5.app');
    expect(email).toMatch(/^[a-z0-9-]+@hs[.]mathdiff5[.]app$/);
  });

  it('tách danh sách tên dán vào, bỏ dòng trống và số thứ tự đầu dòng', () => {
    expect(parseNameList('1. Nguyễn Văn A\n\n  2) Trần  Thị B \r\nLê C')).toEqual(['Nguyễn Văn A', 'Trần Thị B', 'Lê C']);
  });
});

describe('Câu hỏi và bài giao', () => {
  const b21 = SAMPLE_LESSONS[0];

  it('nạp câu luyện tập Bài 21 theo đúng 3 trạm, đáp án nằm trong phương án', () => {
    const st = stationsFromLesson(b21);
    expect(st['khoi-hanh']).toHaveLength(3);
    expect(st['tang-toc']).toHaveLength(3);
    expect(st['but-pha']).toHaveLength(3);
    for (const s of Object.values(st)) for (const q of s) expect(q.options).toContain(q.correct);
  });

  it('câu Đúng/Sai không có phương án được tự thêm "Đúng", "Sai"; câu thiếu đáp án bị loại', () => {
    const tf = questionToMcq({ id: 't', station: 'khoi-hanh', text: '3,5 = 3,50', type: 'true-false', correctAnswer: 'Đúng', explanation: '', difficulty: 1 });
    expect(tf?.options).toEqual(['Đúng', 'Sai']);
    const bad = questionToMcq({ id: 'b', station: 'khoi-hanh', text: '?', type: 'fill-blank', correctAnswer: '2', explanation: '', difficulty: 1 });
    expect(bad).toBeNull();
  });

  const baseDraft = (): AssignmentDraft => ({
    title: 'BTVN Bài 21',
    lessonTitle: 'Bài 21',
    instructions: '',
    classId: 'c1',
    dueAt: new Date('2030-01-01T20:00:00'),
    passingScore: 75,
    stations: stationsFromLesson(b21),
    essays: [],
  });

  it('bài giao hợp lệ không báo lỗi; thiếu tên, hạn đã qua, không có câu hỏi thì báo lỗi', () => {
    expect(validateDraft(baseDraft(), new Date('2029-12-31'))).toEqual([]);
    const d = { ...baseDraft(), title: ' ', dueAt: new Date('2020-01-01'), stations: emptyStations() };
    const errs = validateDraft(d, new Date('2029-12-31'));
    expect(errs).toContain('Chưa nhập tên bài giao.');
    expect(errs).toContain('Hạn nộp phải sau thời điểm hiện tại.');
    expect(errs).toContain('Bài giao chưa có câu hỏi nào.');
  });

  it('báo lỗi câu chưa chọn đáp án, phương án trùng, câu tự luận thiếu đề', () => {
    const d = baseDraft();
    d.stations['khoi-hanh'][0] = { ...d.stations['khoi-hanh'][0], correct: '' };
    d.stations['tang-toc'][0] = { ...d.stations['tang-toc'][0], options: ['1', '1', '2', ''] , correct: '2' };
    d.essays = [{ id: 'e1', prompt: '', maxScore: 2 }];
    const errs = validateDraft(d, new Date('2029-12-31'));
    expect(errs.some((e) => e.includes('Trạm Khởi Hành, câu 1: chưa chọn đáp án đúng'))).toBe(true);
    expect(errs.some((e) => e.includes('Trạm Tăng Tốc, câu 1: có phương án trùng nhau'))).toBe(true);
    expect(errs).toContain('Câu tự luận 1: chưa có đề bài.');
  });

  it('phần công khai gửi cho HS KHÔNG chứa đáp án và lời giải thích', () => {
    const { publicStations, key } = splitForPublish(stationsFromLesson(b21));
    const json = JSON.stringify(publicStations);
    expect(json).not.toContain('correct');
    expect(json).not.toContain('explanation');
    expect(key['khoi-hanh']['b21-kh-1'].correct).toBe('4,8 > 3,95');
  });

  it('chấm trắc nghiệm theo trạm và ngưỡng đạt 75%', () => {
    const { publicStations, key } = splitForPublish(stationsFromLesson(b21));
    const qs = publicStations['khoi-hanh'];
    const g = gradeMcq('khoi-hanh', qs, { 'b21-kh-1': '4,8 > 3,95', 'b21-kh-2': '5,2', 'b21-kh-3': '6,4 < 6,40' }, key);
    expect(g.correct).toBe(2);
    expect(g.total).toBe(3);
    expect(g.percent).toBe(67);
    expect(g.perQuestion['b21-kh-3']).toBe(false);
    expect(isPassed(g.percent, 75)).toBe(false);
    expect(isPassed(75, 75)).toBe(true);
    // Câu bỏ trống tính là sai
    expect(gradeMcq('khoi-hanh', qs, {}, key).correct).toBe(0);
  });
});

describe('Xuất bảng điểm CSV', () => {
  it('có BOM cho Excel, bọc ô có dấu phẩy/ngoặc kép', () => {
    const csv = resultsToCsv(
      [
        { number: 1, name: 'Nguyễn "An", 5A', station: 'khoi-hanh', submitted: true, mcq: { correct: 3, total: 3, percent: 100, perQuestion: {} }, passed: true },
        { number: 2, name: 'Trần Bình', station: 'but-pha', submitted: false },
      ],
      75,
    );
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Nguyễn ""An"", 5A"');
    expect(csv).toContain('01,');
    expect(csv).toContain('3/3,100,Đạt');
    expect(csv).toContain('02,Trần Bình,Trạm Bứt Phá,Chưa');
  });
});
