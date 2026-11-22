export type AiProvider = 'gemini' | 'agent-platform';

export type StationTier = 'khoi-hanh' | 'tang-toc' | 'but-pha';

export type StudentLiveStatus =
  | 'working'
  | 'need-hint'
  | 'struggling'
  | 'completed';

export interface BadgeAward {
  id: string;
  label: string;
  icon: string;
  points: number;
}

export interface Student {
  id: string;
  name: string;
  avatar: string;
  groupTable: string; // Tổ 1, Tổ 2, Tổ 3, Tổ 4
  station: StationTier;
  status: StudentLiveStatus;
  stars: number;
  xp: number;
  badges: string[];
  hintsUsed: number;
  completedExercises: number;
}

export interface SituationItem {
  id: string;
  title: string;
  location?: string;
  valueLabel: string;
  numericValue: number;
  unit: string;
  imageUrl?: string;
  accentColor: string;
}

export interface StationTask {
  station: StationTier;
  stationName: string;
  subtitle: string;
  corePrompt: string;
  progressiveHints: string[]; // Gợi ý mở khóa từng bước — KHÔNG lộ đáp án cuối
  expectedProduct: string;
  teacherGuidance: string;
  interactiveWidget: 'place-value-table' | 'symbol-compare' | 'number-line' | 'general';
}

export interface Question {
  id: string;
  station: StationTier;
  text: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank';
  options?: string[];
  correctAnswer: string;
  explanation: string; // BẮT BUỘC — luôn giải thích đáp án rõ ràng cho HS lớp 5
  hint?: string;
  difficulty: 1 | 2 | 3;
}

export interface SolutionPost {
  id: string;
  authorName: string;
  station: StationTier;
  methodTitle: string;
  content: string;
  stars: number;
  isMisconception?: boolean; // Tình huống nhầm lẫn thường gặp để thảo luận Bước 4
  teacherComment?: string;
  createdAt: string;
}

export interface CoreRuleStep {
  stepNumber: number;
  title: string;
  content: string;
  example: string;
}

export interface DifferentiatedLesson {
  id: string;
  lessonCode: string; // VD: "Bài 21"
  title: string;
  textbook: string; // "Toán 5 — Kết nối tri thức với cuộc sống"
  topic: string;
  objectives: string[];
  centralQuestion: string;
  contextStory: string;
  situationItems: SituationItem[];
  stationTasks: Record<StationTier, StationTask>;
  coreRules: CoreRuleStep[];
  initialBoardPosts: SolutionPost[];
  practiceQuestions: Question[];
  passingScore: number; // 75%
  isApprovedByTeacher: boolean;
  updatedAt?: number; // mốc sửa gần nhất (ms) — dùng khi đồng bộ bài học giữa các máy
}

export interface QuizAttemptResult {
  scorePercent: number;
  correctCount: number;
  totalCount: number;
  completedInTime: boolean;
  hintsUsed: number;
}

export interface LiveAiCopilotResponse {
  id: string;
  scenarioType: 'misconception' | 'fast-finisher' | 'real-world' | 'discussion-probe';
  title: string;
  promptForStudents: string;
  stepByStepHints: string[];
  teacherNote: string;
  targetStation: StationTier | 'all';
  approved: boolean;
}
