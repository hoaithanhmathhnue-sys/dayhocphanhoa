import { describe, expect, it } from 'vitest';
import { LESSON_21_DECIMAL_COMPARE, SAMPLE_LESSONS } from '../data/sampleLessons';
import { calculateQuizXP, decomposeDecimal } from '../utils/scoring';

describe('Kịch bản Bài 21 So sánh số thập phân & Logic chấm điểm phân hóa', () => {
  it('nạp đầy đủ dữ liệu Bài 21 với 3 cây cầu chuẩn Biện pháp 3.docx và hình ảnh đi kèm', () => {
    expect(LESSON_21_DECIMAL_COMPARE.lessonCode).toBe('Bài 21');
    expect(LESSON_21_DECIMAL_COMPARE.passingScore).toBe(75);
    expect(LESSON_21_DECIMAL_COMPARE.situationItems).toHaveLength(3);

    const names = LESSON_21_DECIMAL_COMPARE.situationItems.map((i) => i.title);
    expect(names.some((n) => n.includes('Long Biên'))).toBe(true);
    expect(names.some((n) => n.includes('An Đông'))).toBe(true);
    expect(names.some((n) => n.includes('Cần Thơ'))).toBe(true);

    const values = LESSON_21_DECIMAL_COMPARE.situationItems.map((i) => i.numericValue);
    expect(values).toEqual([2.29, 3.5, 2.75]);

    // Mọi câu hỏi ở cả 3 trạm đều có explanation bắt buộc
    expect(LESSON_21_DECIMAL_COMPARE.practiceQuestions.length).toBeGreaterThanOrEqual(6);
    for (const q of LESSON_21_DECIMAL_COMPARE.practiceQuestions) {
      expect(q.explanation.trim().length).toBeGreaterThan(10);
    }

    expect(SAMPLE_LESSONS.length).toBeGreaterThanOrEqual(3);
  });

  it('tách đúng phần nguyên và các hàng phần thập phân hỗ trợ trực quan cho Trạm Khởi Hành', () => {
    expect(decomposeDecimal('2,29')).toEqual({
      integerPart: '2',
      tenths: '2',
      hundredths: '9',
      thousandths: '0',
      normalizedValue: 2.29,
    });
    expect(decomposeDecimal('3.5')).toEqual({
      integerPart: '3',
      tenths: '5',
      hundredths: '0',
      thousandths: '0',
      normalizedValue: 3.5,
    });
  });

  it('tính điểm XP công bằng gắn với nỗ lực học tập thực tế', () => {
    const xpPerfect = calculateQuizXP({
      scorePercent: 100,
      correctCount: 3,
      totalCount: 3,
      completedInTime: true,
      hintsUsed: 0,
    });
    const xpWithHints = calculateQuizXP({
      scorePercent: 100,
      correctCount: 3,
      totalCount: 3,
      completedInTime: false,
      hintsUsed: 2,
    });
    expect(xpPerfect).toBeGreaterThan(xpWithHints);
    expect(xpWithHints).toBeGreaterThan(0);
  });
});
