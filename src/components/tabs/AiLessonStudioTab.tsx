import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Loader2,
  Send,
  ShieldAlert,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type {
  AiProvider,
  DifferentiatedLesson,
  StationTier,
} from '../../types/education';
import {
  generateDifferentiatedLessonAI,
  getFriendlyErrorMessage,
} from '../../services/geminiService';
import { STATION_META } from '../../utils/scoring';

interface AiLessonStudioTabProps {
  activeLesson: DifferentiatedLesson;
  hasApiKey: boolean;
  provider: AiProvider;
  onOpenApiModal: () => void;
  onAddGeneratedLesson: (lesson: DifferentiatedLesson) => void;
  onUpdateActiveLesson: (updated: DifferentiatedLesson) => void;
  onApproveAndLaunch: () => void;
}

const QUICK_TOAN5_PRESETS = [
  {
    lessonCode: 'Bài 24',
    title: 'Phép nhân số thập phân với số tự nhiên',
    objectives:
      'Thực hiện được phép nhân số thập phân với số tự nhiên; giải bài toán thực tế tính chu vi mảnh vườn hoặc khối lượng các túi gạo.',
    contextIdea:
      'Mỗi can mật ong rừng U Minh chứa 1,25 lít. Tính lượng mật ong trong 3 can, 4 can.',
  },
  {
    lessonCode: 'Bài 26',
    title: 'Hình thang. Diện tích hình thang',
    objectives:
      'Nhận biết đặc điểm hình thang và tính được diện tích hình thang biết độ dài hai đáy và chiều cao.',
    contextIdea:
      'So sánh diện tích 3 thửa ruộng bậc thang hình thang ở Tây Bắc để chọn thửa ruộng thu hoạch được nhiều lúa nhất.',
  },
  {
    lessonCode: 'Bài 40',
    title: 'Tìm tỉ số phần trăm của hai số',
    objectives:
      'Biết cách tìm tỉ số phần trăm của hai số và vận dụng tính tỉ lệ cây trồng sống tốt hoặc tỉ lệ hoàn thành kế hoạch nhỏ.',
    contextIdea:
      'Phong trào Kế hoạch nhỏ của 3 Tổ lớp 5A thu gom giấy vụn so với chỉ tiêu đề ra.',
  },
];

export const AiLessonStudioTab: React.FC<AiLessonStudioTabProps> = ({
  activeLesson,
  hasApiKey,
  provider,
  onOpenApiModal,
  onAddGeneratedLesson,
  onUpdateActiveLesson,
  onApproveAndLaunch,
}) => {
  const [lessonCode, setLessonCode] = useState('Bài 24');
  const [title, setTitle] = useState('Phép nhân số thập phân với số tự nhiên');
  const [objectivesInput, setObjectivesInput] = useState(
    'Thực hiện được phép nhân một số thập phân với một số tự nhiên; vận dụng giải bài toán thực tiễn.',
  );
  const [contextIdea, setContextIdea] = useState(
    ' Ba thùng sữa tươi học đường có dung tích mỗi hộp khác nhau (0,25 lít; 0,5 lít; 1,25 lít) để chuẩn bị cho buổi dã ngoại lớp 5A.',
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!hasApiKey) {
      onOpenApiModal();
      return;
    }
    if (!title.trim() || !objectivesInput.trim()) {
      setErrorMsg('Vui lòng nhập Tên bài học và Yêu cầu cần đạt trước khi gọi AI.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const newLesson = await generateDifferentiatedLessonAI({
        lessonCode: lessonCode.trim() || 'Bài Toán 5',
        title: title.trim(),
        objectivesInput: objectivesInput.trim(),
        contextIdea: contextIdea.trim(),
      });
      onAddGeneratedLesson(newLesson);
    } catch (err) {
      if (err instanceof Error && err.message === 'MISSING_API_KEY') {
        onOpenApiModal();
      } else {
        setErrorMsg(getFriendlyErrorMessage(err, provider));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateStationPrompt = (tier: StationTier, value: string) => {
    onUpdateActiveLesson({
      ...activeLesson,
      stationTasks: {
        ...activeLesson.stationTasks,
        [tier]: {
          ...activeLesson.stationTasks[tier],
          corePrompt: value,
        },
      },
    });
  };

  const handleUpdateStationHints = (tier: StationTier, multiline: string) => {
    const hints = multiline
      .split('\n')
      .map((h) => h.trim())
      .filter(Boolean);
    onUpdateActiveLesson({
      ...activeLesson,
      stationTasks: {
        ...activeLesson.stationTasks,
        [tier]: {
          ...activeLesson.stationTasks[tier],
          progressiveHints: hints,
        },
      },
    });
  };

  const stations: StationTier[] = ['khoi-hanh', 'tang-toc', 'but-pha'];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 animate-fade-slide">
      {/* Cột trái: Form tạo mới bằng Gemini AI */}
      <div className="space-y-5 lg:col-span-5">
        <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 text-white">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Bước 2: Xưởng AI Thiết Kế Bài Dạy Phân Hóa
              </h2>
              <p className="text-xs text-slate-600">
                Từ 1 yêu cầu cần đạt chung → Gemini sinh tình huống & 3 gói nhiệm vụ
              </p>
            </div>
          </div>

          {/* Gợi ý nhanh các bài Toán 5 KNTT */}
          <div className="mt-4">
            <span className="mb-1.5 block text-xs font-bold text-slate-600">
              ⚡ Chọn mẫu gợi ý nhanh (Toán 5 — Kết nối tri thức):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TOAN5_PRESETS.map((p) => (
                <button
                  key={p.lessonCode}
                  type="button"
                  onClick={() => {
                    setLessonCode(p.lessonCode);
                    setTitle(p.title);
                    setObjectivesInput(p.objectives);
                    setContextIdea(p.contextIdea);
                  }}
                  className="rounded-lg border border-teal-200 bg-teal-50/70 px-2.5 py-1.5 text-xs font-semibold text-teal-900 transition hover:bg-teal-100"
                >
                  {p.lessonCode}: {p.title}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3.5">
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Số hiệu bài
                </label>
                <input
                  type="text"
                  value={lessonCode}
                  onChange={(e) => setLessonCode(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Tên bài học Toán 5
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-teal-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Yêu cầu cần đạt cốt lõi của tiết học
              </label>
              <textarea
                rows={3}
                value={objectivesInput}
                onChange={(e) => setObjectivesInput(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Ý tưởng tình huống thực tế (để trống nếu muốn AI tự sáng tạo)
              </label>
              <textarea
                rows={2}
                value={contextIdea}
                onChange={(e) => setContextIdea(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-medium text-rose-900"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerate}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:from-teal-700 hover:to-emerald-700 disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang thiết kế tình huống & câu hỏi 3 Trạm...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Gemini AI Thiết kế Kịch bản Phân hóa 3 Trạm
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Cột phải: Bàn Kiểm Duyệt Sư Phạm của Giáo Viên */}
      <div className="space-y-5 lg:col-span-7">
        <div className="rounded-2xl border-2 border-amber-300/80 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2.5">
              <Edit3 className="h-5 w-5 text-amber-600" />
              <div>
                <h3 className="text-base font-extrabold text-slate-900 md:text-lg">
                  Bàn Thẩm định & Điều chỉnh của Giáo viên: {activeLesson.lessonCode} — {activeLesson.title}
                </h3>
                <p className="text-xs text-slate-600">
                  Giáo viên giữ vai trò chủ đạo kiểm tra nội dung AI trước khi chiếu lên Màn hình Tivi lớp học.
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                activeLesson.isApprovedByTeacher
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {activeLesson.isApprovedByTeacher ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Đã thẩm định sư phạm
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4" /> Bản nháp AI — Chờ GV duyệt
                </>
              )}
            </span>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                📺 Câu hỏi tình huống trung tâm (chiếu chung cho cả lớp):
              </label>
              <textarea
                rows={2}
                value={activeLesson.centralQuestion}
                onChange={(e) =>
                  onUpdateActiveLesson({
                    ...activeLesson,
                    centralQuestion: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm font-bold text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Chỉnh sửa gói nhiệm vụ của từng Trạm */}
            <div className="space-y-3">
              {stations.map((tier) => {
                const meta = STATION_META[tier];
                const task = activeLesson.stationTasks[tier];
                return (
                  <div
                    key={tier}
                    className={`rounded-xl border ${meta.cardBorder} bg-slate-50/50 p-3.5`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className={`text-sm font-extrabold ${meta.accentText}`}>
                        {meta.emoji} {meta.name} — {task.subtitle}
                      </span>
                    </div>

                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Nhiệm vụ giao riêng cho Trạm:
                    </label>
                    <textarea
                      rows={2}
                      value={task.corePrompt}
                      onChange={(e) => handleUpdateStationPrompt(tier, e.target.value)}
                      className="mb-2 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm focus:border-teal-600 focus:outline-none"
                    />

                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                      Gợi ý mở khóa từng bước (mỗi dòng 1 bước — đảm bảo KHÔNG ghi sẵn đáp án cuối):
                    </label>
                    <textarea
                      rows={2}
                      value={task.progressiveHints.join('\n')}
                      onChange={(e) => handleUpdateStationHints(tier, e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-700 focus:border-teal-600 focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onApproveAndLaunch}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-sm font-extrabold text-white shadow-md transition hover:from-amber-600 hover:to-orange-700"
              >
                <Send className="h-4 w-4" />
                Duyệt Kịch Bản & Phát Nhiệm Vụ Lên Màn Hình Tivi (Sang Bước 3)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
