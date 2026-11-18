import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookCheck,
  CheckCircle2,
  Compass,
  Lightbulb,
  Loader2,
  Maximize2,
  Rocket,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import type {
  AiProvider,
  DifferentiatedLesson,
  LiveAiCopilotResponse,
  StationTier,
  Student,
} from '../../types/education';
import {
  generateLiveCopilotPromptAI,
  getFriendlyErrorMessage,
} from '../../services/geminiService';
import { calculateQuizXP, STATION_META } from '../../utils/scoring';
import { SpotlightModal } from '../SpotlightModal';

interface AdaptivePracticeTabProps {
  lesson: DifferentiatedLesson;
  students: Student[];
  tvMode: boolean;
  hasApiKey: boolean;
  provider: AiProvider;
  prefilledIssue: string;
  onClearPrefilledIssue: () => void;
  onOpenApiModal: () => void;
  onRewardPracticeStudent: (studentId: string, starsEarned: number, xpEarned: number) => void;
}

export const AdaptivePracticeTab: React.FC<AdaptivePracticeTabProps> = ({
  lesson,
  students,
  tvMode,
  hasApiKey,
  provider,
  prefilledIssue,
  onClearPrefilledIssue,
  onOpenApiModal,
  onRewardPracticeStudent,
}) => {
  // Khối 1: AI Ứng Biến Nóng (Live Classroom AI Co-pilot)
  const [scenarioType, setScenarioType] = useState<
    'misconception' | 'fast-finisher' | 'real-world'
  >('misconception');
  const [situationText, setSituationText] = useState(
    'Một số học sinh còn nhầm lẫn giữa phần nguyên và phần thập phân (so sánh hai số có cùng phần nguyên như 2,29 và 2,75 hoặc nghĩ 2,29 > 3,5 vì nhiều chữ số hơn).',
  );
  const [copilotResult, setCopilotResult] = useState<LiveAiCopilotResponse | null>(null);
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const [showSpotlightCopilot, setShowSpotlightCopilot] = useState(false);

  // Khối 2: Chuẩn hóa quy tắc từng bước
  const [revealedRulesCount, setRevealedRulesCount] = useState<number>(1);

  // Khối 3: Đấu trường Luyện tập Tương tác Phân hóa 3 Trạm trên Tivi
  const [practiceStation, setPracticeStation] = useState<StationTier>('khoi-hanh');
  const [activeStudentId, setActiveStudentId] = useState<string>('');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [openedQuizHints, setOpenedQuizHints] = useState<Record<string, boolean>>({});
  const [rewardedDone, setRewardedDone] = useState<boolean>(false);

  useEffect(() => {
    if (prefilledIssue) {
      setScenarioType('misconception');
      setSituationText(prefilledIssue);
      onClearPrefilledIssue();
    }
  }, [prefilledIssue, onClearPrefilledIssue]);

  // Reset khi đổi bài hoặc đổi trạm luyện tập
  useEffect(() => {
    setSelectedAnswers({});
    setOpenedQuizHints({});
    setRewardedDone(false);
  }, [lesson.id, practiceStation]);

  const handleRunCopilot = async (
    overrideType?: 'misconception' | 'fast-finisher' | 'real-world',
    overrideText?: string,
  ) => {
    if (!hasApiKey) {
      onOpenApiModal();
      return;
    }
    const targetType = overrideType ?? scenarioType;
    const targetText = overrideText ?? situationText;
    setScenarioType(targetType);
    setSituationText(targetText);

    setIsCopilotLoading(true);
    setCopilotError(null);
    try {
      const response = await generateLiveCopilotPromptAI({
        lessonTitle: `${lesson.lessonCode}: ${lesson.title}`,
        centralQuestion: lesson.centralQuestion,
        scenarioType: targetType,
        customSituationText: targetText,
      });
      setCopilotResult(response);
    } catch (err) {
      setCopilotError(getFriendlyErrorMessage(err, provider));
    } finally {
      setIsCopilotLoading(false);
    }
  };

  // Danh sách câu hỏi theo Trạm đang chọn
  const stationQuestions = lesson.practiceQuestions.filter(
    (q) => q.station === practiceStation,
  );
  const stationStudents = students.filter((s) => s.station === practiceStation);

  const answeredCount = stationQuestions.filter((q) =>
    Boolean(selectedAnswers[q.id]),
  ).length;
  const correctCount = stationQuestions.filter(
    (q) => selectedAnswers[q.id] === q.correctAnswer,
  ).length;
  const allAnswered =
    stationQuestions.length > 0 && answeredCount === stationQuestions.length;
  const scorePercent =
    stationQuestions.length > 0
      ? Math.round((correctCount / stationQuestions.length) * 100)
      : 0;
  const isPassed = scorePercent >= lesson.passingScore;
  const earnedXP = allAnswered
    ? calculateQuizXP({
        scorePercent,
        correctCount,
        totalCount: stationQuestions.length,
        completedInTime: true,
        hintsUsed: Object.values(openedQuizHints).filter(Boolean).length,
      })
    : 0;

  return (
    <div className="space-y-7 animate-fade-slide">
      {/* PHẦN 1: TRỢ LÝ "AI ỨNG BIẾN NÓNG" THEO DIỄN BIẾN LỚP HỌC (BƯỚC 5) */}
      <section className="rounded-3xl border-2 border-amber-300 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xs">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 md:text-xl">
                Bước 5: Trợ Lý "AI Ứng Biến Nóng" Theo Diễn Biến Thực Tế Lớp Học
              </h2>
              <p className="text-xs text-slate-600 md:text-sm">
                Tạo tức thì câu hỏi dẫn dắt khi học sinh nhầm lẫn hoặc câu hỏi mở "Nếu thay đổi dữ kiện..." cho học sinh xong sớm.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Nút kịch bản 1-Click sát sườn Biện pháp 3 */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              handleRunCopilot(
                'misconception',
                `Trong bài "${lesson.title}", một số học sinh đang nhầm lẫn bước so sánh hoặc cách xác định hàng của số liệu. Hãy tạo 1 câu hỏi dẫn dắt ngắn gọn để các em tự phát hiện lỗi sai (không cho sẵn đáp án).`,
              )
            }
            className="flex min-h-[48px] items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-left text-xs font-extrabold text-rose-950 transition hover:bg-rose-100"
          >
            <Lightbulb className="h-5 w-5 shrink-0 text-rose-600" />
            <span>⚡ 1-Click: Tạo câu hỏi gỡ rối lỗi sai (Không lộ đáp án)</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleRunCopilot(
                'fast-finisher',
                `Nhóm học sinh Trạm Bứt Phá đã hoàn thành sớm nhiệm vụ bài "${lesson.title}". Hãy tạo câu hỏi mở "Nếu thay đổi dữ kiện..." hoặc tìm số thập phân nằm giữa hai số đã cho.`,
              )
            }
            className="flex min-h-[48px] items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-left text-xs font-extrabold text-amber-950 transition hover:bg-amber-100"
          >
            <Rocket className="h-5 w-5 shrink-0 text-amber-600" />
            <span>🚀 1-Click: Thử thách "Thay đổi dữ kiện" cho HS xong sớm</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleRunCopilot(
                'real-world',
                `Tạo một bài toán vận dụng thực tiễn gần gũi với học sinh lớp 5 Việt Nam (đi siêu thị, đo chiều cao, thi chạy điền kinh...) sử dụng kiến thức bài "${lesson.title}".`,
              )
            }
            className="flex min-h-[48px] items-center gap-2 rounded-xl border border-teal-300 bg-teal-50 px-4 py-2.5 text-left text-xs font-extrabold text-teal-950 transition hover:bg-teal-100"
          >
            <Compass className="h-5 w-5 shrink-0 text-teal-600" />
            <span>🌍 1-Click: Gợi ý tình huống Vận dụng thực tế cuối bài</span>
          </button>
        </div>

        {/* Hoặc GV nhập diễn biến tùy ý */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={situationText}
            onChange={(e) => setSituationText(e.target.value)}
            placeholder="Nhập diễn biến thực tế vừa quan sát thấy trên lớp..."
            className="min-h-[46px] flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium focus:border-amber-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={isCopilotLoading}
            onClick={() => handleRunCopilot()}
            className="inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {isCopilotLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-amber-400" />
            )}
            Đề xuất bằng AI
          </button>
        </div>

        {copilotError && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-900">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{copilotError}</span>
          </div>
        )}

        {/* Kết quả AI Ứng biến nóng (Cho phép GV sửa & bấm chiếu toàn màn hình Tivi) */}
        {copilotResult && (
          <div className="mt-4 rounded-2xl border-2 border-teal-400 bg-teal-50/50 p-4 md:p-5 animate-fade-slide">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-teal-700 px-3 py-1 text-xs font-bold text-white">
                ✨ Đề xuất từ AI — Giáo viên kiểm duyệt trước khi chiếu
              </span>
              <button
                type="button"
                onClick={() => {
                  setCopilotResult({ ...copilotResult, approved: true });
                  setShowSpotlightCopilot(true);
                }}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:from-teal-700 hover:to-emerald-700"
              >
                <Maximize2 className="h-4 w-4" /> Duyệt & Chiếu Toàn Màn Hình Tivi
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              <input
                type="text"
                value={copilotResult.title}
                onChange={(e) =>
                  setCopilotResult({ ...copilotResult, title: e.target.value })
                }
                className="w-full rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm font-extrabold text-teal-950"
              />
              <textarea
                rows={2}
                value={copilotResult.promptForStudents}
                onChange={(e) =>
                  setCopilotResult({
                    ...copilotResult,
                    promptForStudents: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-teal-300 bg-white p-3 text-base font-bold text-slate-900"
              />
              {!tvMode && (
                <p className="text-xs text-slate-600">
                  <strong>👩‍🏫 Gợi ý điều phối GV:</strong> {copilotResult.teacherNote}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* PHẦN 2: HỘP CHUẨN HÓA QUY TẮC TRỌNG TÂM TRÊN BẢNG LỚP */}
      {lesson.coreRules.length > 0 && (
        <section className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50/80 to-emerald-50/60 p-5 shadow-xs md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BookCheck className="h-6 w-6 text-teal-700" />
              <h3 className="text-lg font-extrabold text-teal-950">
                📌 Ghi Nhớ Quy Tắc Chuẩn Hóa ({lesson.lessonCode}: {lesson.title})
              </h3>
            </div>
            {revealedRulesCount < lesson.coreRules.length && (
              <button
                type="button"
                onClick={() => setRevealedRulesCount((c) => c + 1)}
                className="min-h-[40px] rounded-xl bg-teal-600 px-4 py-2 text-xs font-extrabold text-white transition hover:bg-teal-700"
              >
                Mở tiếp bước quy tắc ({revealedRulesCount}/{lesson.coreRules.length})
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {lesson.coreRules.slice(0, revealedRulesCount).map((rule) => (
              <div
                key={rule.stepNumber}
                className="rounded-2xl border border-teal-200 bg-white p-4 shadow-2xs animate-fade-slide"
              >
                <span className="inline-block rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-extrabold text-teal-900">
                  Quy tắc {rule.stepNumber}
                </span>
                <h4 className="mt-2 text-base font-extrabold text-slate-900">
                  {rule.title}
                </h4>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                  {rule.content}
                </p>
                <div className="mt-2.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-950">
                  Ví dụ: {rule.example}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PHẦN 3: TRẠM LUYỆN TẬP TƯƠNG TÁC PHÂN HÓA TRÊN MÀN HÌNH CẢM ỨNG */}
      <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 md:text-xl">
              🎮 Trạm Luyện Tập Tương Tác Phân Hóa Trên Màn Hình Tivi
            </h3>
            <p className="text-xs text-slate-600 md:text-sm">
              Mời đại diện từng Trạm lên chạm chọn đáp án trực tiếp • Mục tiêu đạt chuẩn: ≥ {lesson.passingScore}%
            </p>
          </div>

          {/* Chọn học sinh đại diện đang lên bảng để cộng Sao & XP tự động */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Chọn học sinh lên bảng làm bài"
              value={activeStudentId}
              onChange={(e) => setActiveStudentId(e.target.value)}
              className="min-h-[42px] rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800"
            >
              <option value="">-- Chọn HS lên bảng nhận Sao (Tuỳ chọn) --</option>
              {stationStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.avatar} {s.name} ({s.groupTable})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setSelectedAnswers({});
                setOpenedQuizHints({});
                setRewardedDone(false);
              }}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              <RotateCcw className="h-4 w-4" /> Làm lượt mới
            </button>
          </div>
        </div>

        {/* Tabs chuyển đổi 3 gói bài tập 3 Trạm */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(['khoi-hanh', 'tang-toc', 'but-pha'] as StationTier[]).map((tier) => {
            const meta = STATION_META[tier];
            const count = lesson.practiceQuestions.filter((q) => q.station === tier).length;
            const active = practiceStation === tier;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => setPracticeStation(tier)}
                className={`flex min-h-[54px] items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition ${
                  active
                    ? `${meta.cardBorder} bg-gradient-to-r ${meta.headerGradient} text-white shadow-md`
                    : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-white'
                }`}
              >
                <span className="text-sm font-extrabold md:text-base">
                  {meta.emoji} {meta.name}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    active ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count} câu
                </span>
              </button>
            );
          })}
        </div>

        {/* Danh sách câu hỏi tương tác của Trạm đang chọn */}
        <div className="mt-5 space-y-5">
          {stationQuestions.map((q, idx) => {
            const chosen = selectedAnswers[q.id];
            const isRevealed = Boolean(chosen);
            const hintShown = Boolean(openedQuizHints[q.id]);

            return (
              <div
                key={q.id}
                role="group"
                aria-label={`Câu ${idx + 1}: ${q.text}`}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-base font-extrabold text-slate-900 md:text-lg">
                    Câu {idx + 1}: {q.text}
                  </p>
                  {q.hint && !isRevealed && (
                    <button
                      type="button"
                      onClick={() =>
                        setOpenedQuizHints((prev) => ({ ...prev, [q.id]: true }))
                      }
                      className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100"
                    >
                      <Lightbulb className="h-3.5 w-3.5 text-amber-600" /> Gợi ý
                    </button>
                  )}
                </div>

                {hintShown && !isRevealed && q.hint && (
                  <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-950">
                    💡 {q.hint}
                  </p>
                )}

                <div className="mt-3.5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {(q.options || []).map((opt, optIdx) => {
                    const isCorrectOpt = opt === q.correctAnswer;
                    const isSelectedOpt = opt === chosen;

                    let btnStyle =
                      'border-slate-300 bg-white text-slate-900 hover:border-teal-500 hover:bg-teal-50/40';
                    if (isRevealed) {
                      if (isCorrectOpt) {
                        btnStyle =
                          'border-emerald-500 bg-emerald-100 text-emerald-950 ring-2 ring-emerald-400/40';
                      } else if (isSelectedOpt) {
                        btnStyle = 'border-rose-500 bg-rose-100 text-rose-950';
                      } else {
                        btnStyle = 'border-slate-200 bg-slate-100 text-slate-500 opacity-75';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={isRevealed}
                        aria-pressed={isSelectedOpt}
                        onClick={() =>
                          setSelectedAnswers((prev) => ({ ...prev, [q.id]: opt }))
                        }
                        className={`flex min-h-[50px] items-center justify-between rounded-xl border-2 px-4 py-3 text-left text-sm font-bold transition md:text-base ${btnStyle}`}
                      >
                        <span>
                          <strong className="mr-2 text-teal-700">
                            {String.fromCharCode(65 + optIdx)}.
                          </strong>
                          {opt}
                        </span>
                        {/* Luôn hiển thị cả biểu tượng ✓ / ✗ chuẩn Accessibility */}
                        {isRevealed && isCorrectOpt && (
                          <span aria-label="Đáp án đúng" className="text-lg font-extrabold text-emerald-700">
                            ✓
                          </span>
                        )}
                        {isRevealed && isSelectedOpt && !isCorrectOpt && (
                          <span aria-label="Đáp án chưa đúng" className="text-lg font-extrabold text-rose-700">
                            ✗
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Giải thích đáp án bắt buộc sau khi chọn */}
                {isRevealed && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`mt-3 rounded-xl border p-3.5 text-sm ${
                      chosen === q.correctAnswer
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                        : 'border-amber-300 bg-amber-50 text-amber-950'
                    }`}
                  >
                    <strong>
                      {chosen === q.correctAnswer
                        ? '✅ Chính xác! Giỏi lắm!'
                        : '💡 Cùng xem lại cách suy luận đúng nhé:'}
                    </strong>
                    <p className="mt-1 leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tổng kết kết quả lượt làm bài trên bảng & Cộng thưởng ClassDojo */}
        {allAnswered && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 p-5 ${
              isPassed
                ? 'border-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50'
                : 'border-amber-400 bg-amber-50'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <Trophy
                className={`h-10 w-10 ${
                  isPassed ? 'text-emerald-600' : 'text-amber-600'
                }`}
              />
              <div>
                <h4 className="text-lg font-extrabold text-slate-900">
                  Kết quả {STATION_META[practiceStation].name}: Đúng {correctCount}/
                  {stationQuestions.length} câu ({scorePercent}%) —{' '}
                  {isPassed ? '🎉 ĐẠT YÊU CẦU XUẤT SẮC!' : '💪 Cố gắng thêm chút nữa nhé!'}
                </h4>
                <p className="text-xs font-semibold text-slate-600">
                  Điểm thưởng nỗ lực: +{earnedXP} XP • +{isPassed ? 3 : 1} Sao khích lệ
                </p>
              </div>
            </div>

            {activeStudentId && !rewardedDone && (
              <button
                type="button"
                onClick={() => {
                  onRewardPracticeStudent(activeStudentId, isPassed ? 3 : 1, earnedXP);
                  setRewardedDone(true);
                }}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" /> Cộng +{isPassed ? 3 : 1} ⭐ & +{earnedXP} XP cho HS
              </button>
            )}
            {rewardedDone && (
              <span className="rounded-xl bg-emerald-200 px-4 py-2 text-xs font-extrabold text-emerald-950">
                ✓ Đã cộng Sao vào bảng lớp 5A!
              </span>
            )}
          </div>
        )}
      </section>

      {/* Chiếu câu hỏi AI Ứng biến nóng toàn màn hình Tivi */}
      <SpotlightModal
        isOpen={showSpotlightCopilot && Boolean(copilotResult)}
        onClose={() => setShowSpotlightCopilot(false)}
        badgeText="⚡ Câu hỏi Điều chỉnh Linh hoạt trên Lớp"
        title={copilotResult?.title || ''}
        mainContent={copilotResult?.promptForStudents || ''}
        hints={copilotResult?.stepByStepHints || []}
      />
    </div>
  );
};
