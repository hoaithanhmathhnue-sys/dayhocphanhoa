import React from 'react';
import {
  BookOpen,
  KeyRound,
  Monitor,
  Send,
  Sparkles,
  Tv,
  CheckCircle2,
} from 'lucide-react';
import type { AiProvider, DifferentiatedLesson } from '../types/education';

interface HeaderProps {
  lessons: DifferentiatedLesson[];
  activeLessonId: string;
  onSelectLesson: (id: string) => void;
  onJumpToStudio: () => void;
  tvMode: boolean;
  onToggleTvMode: () => void;
  hasApiKey: boolean;
  provider: AiProvider;
  activeModel: string;
  onOpenApiModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lessons,
  activeLessonId,
  onSelectLesson,
  onJumpToStudio,
  tvMode,
  onToggleTvMode,
  hasApiKey,
  provider,
  activeModel,
  onOpenApiModal,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-teal-200/80 bg-white/95 shadow-xs backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-500 text-white shadow-md">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 md:text-lg">
                MathDiff 5 AI
              </h1>
              <span className="hidden rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-bold text-teal-800 sm:inline-block">
                Biện pháp 3 • Toán 5 KNTT
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Điều phối dạy học phân hóa trên lớp (1 Máy tính GV + Màn hình tương tác/Tivi)
            </p>
          </div>
        </div>

        {/* Lesson selector & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1">
            <span className="hidden text-xs font-semibold text-slate-600 lg:inline">
              Bài dạy:
            </span>
            <select
              aria-label="Chọn bài học Toán 5"
              value={activeLessonId}
              onChange={(e) => onSelectLesson(e.target.value)}
              className="min-h-[38px] max-w-[240px] bg-transparent text-sm font-bold text-teal-900 focus:outline-none sm:max-w-[300px]"
            >
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.lessonCode}: {l.title} {l.isApprovedByTeacher ? '✓' : '(Chờ GV duyệt)'}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onJumpToStudio}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-100 md:text-sm"
          >
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span className="hidden sm:inline">Soạn bài AI mới</span>
          </button>

          {/* Giao bài online (cần đăng nhập) */}
          <a
            href="#/giao-bai"
            title="Giáo viên giao bài tập về nhà theo trạm, học sinh làm online bằng mã lớp và mã PIN"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 px-3.5 py-2 text-xs font-bold text-teal-900 transition hover:bg-teal-100 md:text-sm"
          >
            <Send className="h-4 w-4 text-teal-600" />
            <span>Giao bài online</span>
          </a>

          {/* Chế độ Màn hình Tivi */}
          <button
            type="button"
            onClick={onToggleTvMode}
            aria-pressed={tvMode}
            title="Chế độ trình chiếu Tivi: Phóng to cỡ chữ cho học sinh cuối lớp & ẩn ghi chú riêng của giáo viên"
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition md:text-sm ${
              tvMode
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {tvMode ? <Tv className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            <span>{tvMode ? 'Đang bật Chế độ Tivi' : 'Chế độ Tivi'}</span>
          </button>

          {/* Nút Cài đặt API Key */}
          <button
            type="button"
            onClick={onOpenApiModal}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition md:text-sm ${
              hasApiKey
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                : 'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100'
            }`}
          >
            {hasApiKey ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <KeyRound className="h-4 w-4 text-rose-600" />
            )}
            <span className="hidden xl:inline">
              {hasApiKey
                ? `${provider === 'agent-platform' ? 'Agent' : 'Gemini'}: ${activeModel}`
                : 'Cấu hình API Key'}
            </span>
            <span className="xl:hidden">{hasApiKey ? 'AI Sẵn sàng' : 'Nhập API Key'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
