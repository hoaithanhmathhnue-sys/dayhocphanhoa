import { beforeEach, describe, expect, it } from 'vitest';
import { SAMPLE_LESSONS } from '../data/sampleLessons';
import {
  CUSTOM_LESSONS_KEY,
  checkLesson,
  duplicateLesson,
  exportLessonsJson,
  finalizeLesson,
  getDeletedIds,
  lessonFileName,
  loadCustomLessons,
  newBlankLesson,
  parseLessonsJson,
  removeLesson,
  sanitizeLesson,
  upsertLesson,
  LessonImportError,
} from '../services/lessonStore';
import { stationsFromLesson } from '../online/model';

beforeEach(() => localStorage.clear());

const filled = () => {
  const l = newBlankLesson();
  l.lessonCode = 'Bài 24';
  l.title = 'Phép nhân số thập phân với số tự nhiên';
  l.centralQuestion = 'Mỗi hộp sữa 0,25 l. 4 hộp có bao nhiêu lít?';
  l.situationItems = [{ id: 'i1', title: 'Hộp sữa', valueLabel: '0,25 l', numericValue: 0.25, unit: 'l', accentColor: 'teal' }];
  (['khoi-hanh', 'tang-toc', 'but-pha'] as const).forEach((s) => (l.stationTasks[s].corePrompt = `Nhiệm vụ ${s}`));
  l.practiceQuestions = (['khoi-hanh', 'tang-toc', 'but-pha'] as const).map((s, i) => ({
    id: `q${i}`,
    station: s,
    text: '0,25 × 4 = ?',
    type: 'multiple-choice' as const,
    options: ['1', '0,1', '10', ''],
    correctAnswer: '1',
    explanation: '0,25 × 4 = 1',
    difficulty: 1 as const,
  }));
  return l;
};

describe('Kiểm tra và chuẩn hoá bài học', () => {
  it('bài trống: chặn lưu khi thiếu số hiệu, tên; cảnh báo thiếu nhiệm vụ, câu luyện tập', () => {
    const c = checkLesson(newBlankLesson());
    expect(c.errors).toContain('Chưa nhập số hiệu bài (ví dụ: Bài 24).');
    expect(c.errors).toContain('Chưa nhập tên bài.');
    expect(c.warnings.some((w) => w.includes('Trạm Khởi Hành: chưa có nhiệm vụ'))).toBe(true);
    expect(c.warnings.some((w) => w.includes('chưa có câu luyện tập'))).toBe(true);
  });

  it('bài đủ nội dung: không lỗi; khi lưu bỏ phương án trống, đánh dấu GV đã duyệt, có mốc cập nhật', () => {
    const l = filled();
    expect(checkLesson(l).errors).toEqual([]);
    const f = finalizeLesson(l);
    expect(f.practiceQuestions[0].options).toEqual(['1', '0,1', '10']);
    expect(f.isApprovedByTeacher).toBe(true);
    expect(typeof f.updatedAt).toBe('number');
  });

  it('báo lỗi câu luyện tập chưa chọn đáp án hoặc phương án trùng', () => {
    const l = filled();
    l.practiceQuestions[0].correctAnswer = '';
    l.practiceQuestions[1].options = ['2', '2', '3'];
    l.practiceQuestions[1].correctAnswer = '3';
    const e = checkLesson(l).errors;
    expect(e.some((x) => x.includes('Trạm Khởi Hành, câu luyện tập 1: chưa chọn đáp án đúng'))).toBe(true);
    expect(e.some((x) => x.includes('Trạm Tăng Tốc, câu luyện tập 1: có phương án trùng nhau'))).toBe(true);
  });

  it('chuẩn hoá dữ liệu lạ (thiếu trường, sai kiểu) mà không lỗi', () => {
    const l = sanitizeLesson({ title: 'X', lessonCode: 'Bài 1', practiceQuestions: [{ text: 'a', station: 'sai', options: [1, 2], correctAnswer: 1 }] });
    expect(l.stationTasks['but-pha'].stationName).toBe('Trạm Bứt Phá');
    expect(l.practiceQuestions[0].station).toBe('tang-toc');
    expect(l.practiceQuestions[0].options).toEqual(['1', '2']);
    expect(l.passingScore).toBe(75);
  });

  it('bài mẫu Bài 21 qua chuẩn hoá vẫn nguyên câu luyện tập theo trạm', () => {
    const l = sanitizeLesson(JSON.parse(JSON.stringify(SAMPLE_LESSONS[0])));
    expect(stationsFromLesson(l)['but-pha']).toHaveLength(3);
    expect(l.situationItems.map((i) => i.numericValue)).toEqual([2.29, 3.5, 2.75]);
  });
});

describe('Lưu, nhân bản, xoá', () => {
  it('lưu, sửa và xoá bài; bài xoá được ghi nhớ để xoá trên tài khoản khi đồng bộ', () => {
    const l = finalizeLesson(filled());
    upsertLesson(l);
    upsertLesson({ ...l, title: 'Tên mới' });
    expect(loadCustomLessons()).toHaveLength(1);
    expect(loadCustomLessons()[0].title).toBe('Tên mới');
    removeLesson(l.id);
    expect(loadCustomLessons()).toHaveLength(0);
    expect(getDeletedIds()).toContain(l.id);
  });

  it('nhân bản bài mẫu thành bài của tôi với mã mới', () => {
    const c = duplicateLesson(SAMPLE_LESSONS[0]);
    expect(c.id).not.toBe(SAMPLE_LESSONS[0].id);
    expect(c.title).toContain('(bản sao)');
    expect(c.practiceQuestions).toHaveLength(SAMPLE_LESSONS[0].practiceQuestions.length);
  });

  it('không nạp nhầm bài mẫu vào danh sách bài của tôi', () => {
    localStorage.setItem(CUSTOM_LESSONS_KEY, JSON.stringify([SAMPLE_LESSONS[0], finalizeLesson(filled())]));
    expect(loadCustomLessons()).toHaveLength(1);
  });
});

describe('Xuất và nhập tệp bài học', () => {
  it('xuất rồi nhập lại: bài trùng mã được nhập thành bản mới, không ghi đè', () => {
    const l = finalizeLesson(filled());
    const json = exportLessonsJson([l]);
    const imported = parseLessonsJson(json, [l.id]);
    expect(imported).toHaveLength(1);
    expect(imported[0].id).not.toBe(l.id);
    expect(imported[0].title).toBe(l.title);
    const fresh = parseLessonsJson(json, []);
    expect(fresh[0].id).toBe(l.id);
  });

  it('từ chối tệp hỏng hoặc thiếu tên bài', () => {
    expect(() => parseLessonsJson('không phải json', [])).toThrow(LessonImportError);
    expect(() => parseLessonsJson(JSON.stringify({ format: 'mathdiff5-lessons', lessons: [{ title: '' }] }), [])).toThrow(LessonImportError);
  });

  it('tên tệp không dấu, an toàn', () => {
    expect(lessonFileName([finalizeLesson(filled())])).toBe('mathdiff5-bai-24-phep-nhan-so-thap-phan-voi-so-tu-nhien.json');
  });
});
