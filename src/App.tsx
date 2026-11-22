import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  MessagesSquare,
  RefreshCw,
  Sparkles,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';
import type {
  AiProvider,
  DifferentiatedLesson,
  SolutionPost,
  StationTier,
  Student,
  StudentLiveStatus,
} from './types/education';
import { INITIAL_STUDENTS_5A, SAMPLE_LESSONS } from './data/sampleLessons';
import { apiKeyManager } from './services/apiKeyManager';
import {
  ACTIVE_LESSON_KEY,
  OPEN_TAB_KEY,
  loadCustomLessons,
  saveCustomLessons,
} from './services/lessonStore';
import { setModelFallbackListener } from './services/geminiService';
import { STATUS_META } from './utils/scoring';
import { Header } from './components/Header';
import { ApiKeyModal } from './components/ApiKeyModal';
import { VisitCounter } from './components/VisitCounter';
import { ClassStationTab } from './components/tabs/ClassStationTab';
import { AiLessonStudioTab } from './components/tabs/AiLessonStudioTab';
import { LiveActivityTab } from './components/tabs/LiveActivityTab';
import { SolutionBoardTab } from './components/tabs/SolutionBoardTab';
import { AdaptivePracticeTab } from './components/tabs/AdaptivePracticeTab';

type StepTabId = 'step-1' | 'step-2' | 'step-3' | 'step-4' | 'step-5';

const STUDENTS_STORAGE_KEY = 'mathdiff5_students_v1';

const AVATARS = ['🐼', '🐰', '🐻', '🐱', '🐶', '🐨', '🦊', '🐹', '🐯', '🐸', '🦁', '🦄', '🐵', '🐥', '🐧', '🦉', '🐬'];

export const App: React.FC = () => {
  // Khởi tạo & di trú model mặc định v38 theo api.md
  const [provider, setProvider] = useState<AiProvider>(() => apiKeyManager.getProvider());
  const [activeModel, setActiveModel] = useState<string>(() => {
    apiKeyManager.initializeModelMigration('gemini-3.8-flash');
    return apiKeyManager.getSavedModel(apiKeyManager.getProvider());
  });
  const [hasApiKey, setHasApiKey] = useState<boolean>(() =>
    apiKeyManager.hasAnyConfiguredKey(),
  );
  const [isApiModalOpen, setIsApiModalOpen] = useState<boolean>(false);

  // Banner thông báo tự động chuyển model/key khi quá tải (tự xóa khi xong)
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  // Toast thông báo thao tác lớp học
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Chế độ trình chiếu Màn hình tương tác / Tivi lớp học
  const [tvMode, setTvMode] = useState<boolean>(false);

  // Tab hiện tại (Mặc định mở Bước 3 để thấy ngay Bài 21: 3 Cây cầu & Live Dashboard)
  const [activeTab, setActiveTab] = useState<StepTabId>(() => {
    // Thư viện bài học có thể yêu cầu mở thẳng một bước (ví dụ Xưởng AI soạn bài)
    const t = localStorage.getItem(OPEN_TAB_KEY);
    localStorage.removeItem(OPEN_TAB_KEY);
    return t === 'step-1' || t === 'step-2' || t === 'step-3' || t === 'step-4' || t === 'step-5' ? t : 'step-3';
  });

  // Danh sách bài học (3 bài mẫu chuẩn SGK + các bài GV tạo thêm bằng AI)
  const [lessons, setLessons] = useState<DifferentiatedLesson[]>(() => [
    ...SAMPLE_LESSONS,
    ...loadCustomLessons(),
  ]);

  const [activeLessonId, setActiveLessonId] = useState<string>(
    () => localStorage.getItem(ACTIVE_LESSON_KEY) || SAMPLE_LESSONS[0].id,
  );

  useEffect(() => {
    localStorage.setItem(ACTIVE_LESSON_KEY, activeLessonId);
  }, [activeLessonId]);

  // Danh sách học sinh lớp 5A
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem(STUDENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Student[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return INITIAL_STUDENTS_5A;
  });

  // Bức tường Padlet lưu theo từng bài học
  const [boardPostsByLesson, setBoardPostsByLesson] = useState<
    Record<string, SolutionPost[]>
  >({});

  // Chuyển tiếp tình huống HS gặp khó khăn từ Live Dashboard sang Bước 5 AI Ứng biến nóng
  const [prefilledCopilotIssue, setPrefilledCopilotIssue] = useState<string>('');

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2800);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Đăng ký listener fallbackNotice chuẩn api.md
  useEffect(() => {
    setModelFallbackListener((event) => {
      if (event.type === 'switch') {
        setFallbackNotice(
          `Đang tự động chuyển từ ${event.from} sang ${event.to} (do ${event.from} ${event.reason})...`,
        );
      } else {
        setFallbackNotice(null);
      }
    });
    return () => setModelFallbackListener(null);
  }, []);

  // Lưu học sinh xuống localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
    } catch {
      // Ignore quota errors
    }
  }, [students]);

  // Lưu các bài học AI tự tạo xuống localStorage
  useEffect(() => {
    try {
      const sampleIds = new Set(SAMPLE_LESSONS.map((s) => s.id));
      const customOnly = lessons.filter((l) => !sampleIds.has(l.id));
      saveCustomLessons(customOnly);
    } catch {
      // Ignore quota errors
    }
  }, [lessons]);

  const activeLesson =
    lessons.find((l) => l.id === activeLessonId) || lessons[0];

  const currentBoardPosts =
    boardPostsByLesson[activeLesson.id] ?? activeLesson.initialBoardPosts;

  // Các hàm điều phối Lớp học & Học sinh
  const handleMoveStudentStation = useCallback(
    (studentId: string, newStation: StationTier) => {
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, station: newStation } : s)),
      );
      showToast('🔄 Đã điều chuyển Trạm linh hoạt cho học sinh!');
    },
    [showToast],
  );

  const handleAwardBadge = useCallback(
    (studentId: string, badgeId: string, points: number) => {
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId
            ? {
                ...s,
                stars: s.stars + points,
                xp: s.xp + points * 10,
                badges: [...s.badges, badgeId],
              }
            : s,
        ),
      );
      showToast(`🌟 Đã thưởng +${points} Sao khích lệ!`);
    },
    [showToast],
  );

  const handleAwardStationBonus = useCallback(
    (station: StationTier, points: number) => {
      setStudents((prev) =>
        prev.map((s) =>
          s.station === station
            ? { ...s, stars: s.stars + points, xp: s.xp + points * 10 }
            : s,
        ),
      );
      showToast(`🎉 Đã thưởng +${points} Sao cho toàn bộ thành viên trong Trạm!`);
    },
    [showToast],
  );

  const handleAddBulkStudents = useCallback(
    (names: string[], defaultStation: StationTier) => {
      const added: Student[] = names.map((name, idx) => ({
        id: `hs-custom-${Date.now()}-${idx}`,
        name,
        avatar: AVATARS[idx % AVATARS.length],
        groupTable: `Tổ ${(idx % 4) + 1}`,
        station: defaultStation,
        status: 'working',
        stars: 5,
        xp: 50,
        badges: [],
        hintsUsed: 0,
        completedExercises: 0,
      }));
      setStudents((prev) => [...prev, ...added]);
      showToast(`✅ Đã thêm ${added.length} học sinh vào lớp học!`);
    },
    [showToast],
  );

  const handleCycleStudentStatus = useCallback((studentId: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        const nextStatus = STATUS_META[s.status].next;
        return {
          ...s,
          status: nextStatus,
          stars: nextStatus === 'completed' ? s.stars + 1 : s.stars,
        };
      }),
    );
  }, []);

  const handleSetStationStatusAll = useCallback(
    (station: StationTier, status: StudentLiveStatus) => {
      setStudents((prev) =>
        prev.map((s) => (s.station === station ? { ...s, status } : s)),
      );
      showToast('✅ Đã cập nhật tiến độ cho toàn bộ Trạm!');
    },
    [showToast],
  );

  // Các hàm cập nhật Bài học & Bức tường Padlet
  const handleAddGeneratedLesson = (newLesson: DifferentiatedLesson) => {
    setLessons((prev) => [{ ...newLesson, updatedAt: Date.now() }, ...prev]);
    setActiveLessonId(newLesson.id);
    showToast('✨ Đã tạo kịch bản phân hóa mới! Thầy/Cô hãy kiểm duyệt trước khi phát bài.');
  };

  const handleUpdateActiveLesson = (updated: DifferentiatedLesson) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === updated.id ? { ...updated, updatedAt: Date.now() } : l)),
    );
  };

  const handleApproveAndLaunch = () => {
    handleUpdateActiveLesson({ ...activeLesson, isApprovedByTeacher: true });
    setActiveTab('step-3');
    showToast('✅ Đã phê duyệt và chiếu nhiệm vụ 3 Trạm lên Màn hình Tivi!');
  };

  const handleAddPost = (post: SolutionPost) => {
    setBoardPostsByLesson((prev) => ({
      ...prev,
      [activeLesson.id]: [post, ...(prev[activeLesson.id] ?? activeLesson.initialBoardPosts)],
    }));
    showToast('📌 Đã ghim cách giải của nhóm lên Bức tường chung!');
  };

  const handleStarPost = (postId: string) => {
    setBoardPostsByLesson((prev) => {
      const current = prev[activeLesson.id] ?? activeLesson.initialBoardPosts;
      return {
        ...prev,
        [activeLesson.id]: current.map((p) =>
          p.id === postId ? { ...p, stars: p.stars + 1 } : p,
        ),
      };
    });
  };

  const handleRewardPracticeStudent = (
    studentId: string,
    starsEarned: number,
    xpEarned: number,
  ) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              stars: s.stars + starsEarned,
              xp: s.xp + xpEarned,
              status: 'completed',
              completedExercises: s.completedExercises + 1,
            }
          : s,
      ),
    );
    showToast(`🏆 Đã cộng +${starsEarned} Sao và +${xpEarned} XP cho học sinh!`);
  };

  const stepTabs: {
    id: StepTabId;
    stepNum: string;
    label: string;
    sub: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'step-1',
      stepNum: 'Bước 1',
      label: 'Lớp & Phân Trạm',
      sub: 'ClassDojo không nhãn',
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: 'step-2',
      stepNum: 'Bước 2',
      label: 'Xưởng AI Soạn Bài',
      sub: 'Gemini + GV duyệt',
      icon: <Wand2 className="h-4 w-4" />,
    },
    {
      id: 'step-3',
      stepNum: 'Bước 3',
      label: 'Giao Bài & Live',
      sub: 'Nearpod + Quizizz',
      icon: <Activity className="h-4 w-4" />,
    },
    {
      id: 'step-4',
      stepNum: 'Bước 4',
      label: 'Đa Cách Giải',
      sub: 'Bảng ghim Padlet',
      icon: <MessagesSquare className="h-4 w-4" />,
    },
    {
      id: 'step-5',
      stepNum: 'Bước 5',
      label: 'AI Ứng Biến & Quiz',
      sub: 'Củng cố & Vận dụng',
      icon: <Zap className="h-4 w-4" />,
    },
  ];

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-teal-50/60 via-slate-50 to-emerald-50/40 text-slate-900 ${
        tvMode ? 'tv-mode-active' : ''
      }`}
    >
      {/* Banner cảnh báo vàng tự động chuyển model khi quá tải (tự ẩn ngay khi hoàn tất) */}
      {fallbackNotice && (
        <div
          role="status"
          aria-live="polite"
          className="sticky top-0 z-50 flex items-center justify-center gap-2 border-b border-amber-300 bg-amber-100 px-4 py-2 text-xs font-bold text-amber-950"
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-700" />
          <span>{fallbackNotice}</span>
        </div>
      )}

      {/* Toast thông báo nhanh */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 bottom-5 z-50 flex items-center gap-2 rounded-2xl border border-teal-400 bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl animate-fade-slide"
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <Header
        lessons={lessons}
        activeLessonId={activeLesson.id}
        onSelectLesson={(id) => setActiveLessonId(id)}
        onJumpToStudio={() => setActiveTab('step-2')}
        tvMode={tvMode}
        onToggleTvMode={() => setTvMode((v) => !v)}
        hasApiKey={hasApiKey}
        provider={provider}
        activeModel={activeModel}
        onOpenApiModal={() => setIsApiModalOpen(true)}
      />

      {/* Thanh Điều hướng 5 Bước chuẩn Biện pháp 3 */}
      <nav
        aria-label="Quy trình 5 bước tổ chức dạy học phân hóa"
        className="mx-auto mt-4 max-w-7xl px-4 md:px-6"
      >
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-teal-200/80 bg-white p-2 shadow-xs sm:grid-cols-5">
          {stepTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? 'step' : undefined}
                className={`flex min-h-[54px] flex-col items-start justify-center rounded-xl px-3.5 py-2 text-left transition ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
                    : 'bg-slate-50/70 text-slate-700 hover:bg-teal-50/70'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase opacity-90">
                  {tab.icon}
                  <span>{tab.stepNum}</span>
                </div>
                <span className="mt-0.5 text-sm font-extrabold leading-tight">
                  {tab.label}
                </span>
                {!tvMode && (
                  <span
                    className={`text-[11px] ${
                      isActive ? 'text-teal-100' : 'text-slate-500'
                    }`}
                  >
                    {tab.sub}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Nội dung chính theo từng Bước */}
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {activeTab === 'step-1' && (
          <ClassStationTab
            students={students}
            tvMode={tvMode}
            onMoveStudentStation={handleMoveStudentStation}
            onAwardBadge={handleAwardBadge}
            onAwardStationBonus={handleAwardStationBonus}
            onAddBulkStudents={handleAddBulkStudents}
            onResetDefaultClass={() => {
              setStudents(INITIAL_STUDENTS_5A);
              showToast('🔄 Đã khôi phục danh sách mẫu lớp 5A!');
            }}
          />
        )}

        {activeTab === 'step-2' && (
          <AiLessonStudioTab
            activeLesson={activeLesson}
            hasApiKey={hasApiKey}
            provider={provider}
            onOpenApiModal={() => setIsApiModalOpen(true)}
            onAddGeneratedLesson={handleAddGeneratedLesson}
            onUpdateActiveLesson={handleUpdateActiveLesson}
            onApproveAndLaunch={handleApproveAndLaunch}
          />
        )}

        {activeTab === 'step-3' && (
          <LiveActivityTab
            lesson={activeLesson}
            students={students}
            tvMode={tvMode}
            onCycleStudentStatus={handleCycleStudentStatus}
            onSetStationStatusAll={handleSetStationStatusAll}
            onJumpToCopilotWithIssue={(issueText) => {
              setPrefilledCopilotIssue(issueText);
              setActiveTab('step-5');
            }}
          />
        )}

        {activeTab === 'step-4' && (
          <SolutionBoardTab
            lesson={activeLesson}
            posts={currentBoardPosts}
            tvMode={tvMode}
            hasApiKey={hasApiKey}
            provider={provider}
            onOpenApiModal={() => setIsApiModalOpen(true)}
            onAddPost={handleAddPost}
            onStarPost={handleStarPost}
          />
        )}

        {activeTab === 'step-5' && (
          <AdaptivePracticeTab
            lesson={activeLesson}
            students={students}
            tvMode={tvMode}
            hasApiKey={hasApiKey}
            provider={provider}
            prefilledIssue={prefilledCopilotIssue}
            onClearPrefilledIssue={() => setPrefilledCopilotIssue('')}
            onOpenApiModal={() => setIsApiModalOpen(true)}
            onRewardPracticeStudent={handleRewardPracticeStudent}
          />
        )}
      </main>

      {/* Footer & Bộ đếm lượt truy cập thực tế */}
      <footer className="mt-10 border-t border-teal-200/70 bg-white/80 py-6">
        <div className="mx-auto max-w-7xl space-y-3 px-4 text-center md:px-6">
          <p className="text-xs font-semibold text-slate-600">
            <strong>MathDiff 5 AI</strong> — Hỗ trợ thực hiện <em>Biện pháp 3: Vận dụng trí tuệ nhân tạo hỗ trợ tổ chức hoạt động dạy học phân hóa trên lớp</em> (Môn Toán lớp 5 • Bộ Kết nối tri thức với cuộc sống)
          </p>
          <VisitCounter />
        </div>
      </footer>

      {/* Modal Cấu hình API Key */}
      <ApiKeyModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        onSaved={(newProvider, newModel) => {
          setProvider(newProvider);
          setActiveModel(newModel);
          setHasApiKey(apiKeyManager.hasAnyConfiguredKey(newProvider));
          showToast('✅ Đã lưu cấu hình kết nối AI!');
        }}
      />
    </div>
  );
};

export default App;
