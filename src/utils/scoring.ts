import type {
  BadgeAward,
  QuizAttemptResult,
  StationTier,
  StudentLiveStatus,
} from '../types/education';

export interface DecimalDecomposition {
  integerPart: string;
  tenths: string;
  hundredths: string;
  thousandths: string;
  normalizedValue: number;
}

/**
 * Tách số thập phân hỗ trợ bảng trực quan cho Trạm Khởi Hành (VD: "2,29" -> phần nguyên 2, phần mười 2, phần trăm 9)
 */
export const decomposeDecimal = (raw: string): DecimalDecomposition | null => {
  const cleaned = raw.trim().replace(',', '.');
  if (!cleaned || Number.isNaN(Number(cleaned))) {
    return null;
  }
  const [intRaw = '0', decRaw = ''] = cleaned.split('.');
  const integerNormalized = String(parseInt(intRaw || '0', 10));
  return {
    integerPart: integerNormalized,
    tenths: decRaw[0] ?? '0',
    hundredths: decRaw[1] ?? '0',
    thousandths: decRaw[2] ?? '0',
    normalizedValue: Number(cleaned),
  };
};

/**
 * Tính điểm kinh nghiệm XP gắn với kết quả và nỗ lực tự lực thực tế
 */
export const calculateQuizXP = (result: QuizAttemptResult): number => {
  const base = 15;
  const accuracyBonus = Math.round((result.scorePercent / 100) * 25);
  const timeBonus = result.completedInTime ? 5 : 0;
  const independenceBonus = Math.max(0, 6 - result.hintsUsed * 3);
  return base + accuracyBonus + timeBonus + independenceBonus;
};

export const STATION_META: Record<
  StationTier,
  {
    name: string;
    emoji: string;
    shortDesc: string;
    pedagogyFocus: string;
    badgeBg: string;
    cardBorder: string;
    headerGradient: string;
    accentText: string;
  }
> = {
  'khoi-hanh': {
    name: 'Trạm Khởi Hành',
    emoji: '🌱',
    shortDesc: 'Tiếp cận trực quan • Gợi ý từng bước',
    pedagogyFocus: 'Hỗ trợ học sinh nắm chắc kiến thức nền qua mô hình trực quan & câu hỏi dẫn dắt',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    cardBorder: 'border-emerald-300',
    headerGradient: 'from-emerald-600 to-teal-600',
    accentText: 'text-emerald-700',
  },
  'tang-toc': {
    name: 'Trạm Tăng Tốc',
    emoji: '🚀',
    shortDesc: 'Tự khám phá • Vận dụng quy tắc',
    pedagogyFocus: 'Học sinh chủ động xác định dữ kiện, giải thích và bảo vệ cách làm',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-300',
    cardBorder: 'border-sky-300',
    headerGradient: 'from-sky-600 to-blue-600',
    accentText: 'text-sky-700',
  },
  'but-pha': {
    name: 'Trạm Bứt Phá',
    emoji: '🌟',
    shortDesc: 'Đa cách giải • Mở rộng thực tiễn',
    pedagogyFocus: 'Thử thách biểu diễn trục số, đổi đơn vị, thay đổi dữ kiện & sáng tạo đề toán mới',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    cardBorder: 'border-amber-300',
    headerGradient: 'from-amber-500 to-orange-600',
    accentText: 'text-amber-800',
  },
};

export const STATUS_META: Record<
  StudentLiveStatus,
  {
    label: string;
    shortLabel: string;
    icon: string;
    pillClass: string;
    next: StudentLiveStatus;
  }
> = {
  working: {
    label: 'Đang suy nghĩ / Thảo luận',
    shortLabel: 'Đang làm',
    icon: '⏳',
    pillClass: 'bg-sky-100 text-sky-800 border-sky-300',
    next: 'need-hint',
  },
  'need-hint': {
    label: 'Đang mở gợi ý dẫn dắt',
    shortLabel: 'Mở gợi ý',
    icon: '💡',
    pillClass: 'bg-amber-100 text-amber-900 border-amber-300',
    next: 'struggling',
  },
  struggling: {
    label: 'Cần GV hỗ trợ trực tiếp',
    shortLabel: 'Cần hỗ trợ',
    icon: '⚠️',
    pillClass: 'bg-rose-100 text-rose-800 border-rose-400 animate-pulse',
    next: 'completed',
  },
  completed: {
    label: 'Đã hoàn thành nhiệm vụ',
    shortLabel: 'Hoàn thành',
    icon: '✅',
    pillClass: 'bg-emerald-100 text-emerald-800 border-emerald-400',
    next: 'working',
  },
};

export const CLASSDOJO_BADGES: BadgeAward[] = [
  { id: 'effort', label: 'Nỗ lực vượt khó', icon: '💪', points: 2 },
  { id: 'creative', label: 'Cách giải sáng tạo', icon: '💡', points: 3 },
  { id: 'teamwork', label: 'Hợp tác nhóm tốt', icon: '🤝', points: 2 },
  { id: 'explain', label: 'Giải thích rõ ràng', icon: '🎤', points: 2 },
  { id: 'sharp', label: 'Phát hiện lỗi sai hay', icon: '🔍', points: 3 },
];
