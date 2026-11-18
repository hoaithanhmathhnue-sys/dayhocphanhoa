import React, { useState } from 'react';
import { Lightbulb, Maximize2, X } from 'lucide-react';

interface SpotlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  badgeText: string;
  title: string;
  mainContent: string;
  hints?: string[];
}

/**
 * Hộp thoại phóng to toàn màn hình Tivi để cả lớp 30-35 học sinh ngồi cuối phòng đều đọc rõ câu hỏi/gợi ý
 */
export const SpotlightModal: React.FC<SpotlightModalProps> = ({
  isOpen,
  onClose,
  badgeText,
  title,
  mainContent,
  hints = [],
}) => {
  const [revealedCount, setRevealedCount] = useState(0);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spotlight-title"
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border-2 border-teal-400/50 bg-white shadow-2xl animate-fade-slide">
        <div className="flex items-center justify-between bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 px-6 py-4 text-white md:px-8 md:py-5">
          <div className="flex items-center gap-3">
            <Maximize2 className="h-6 w-6 text-amber-300" />
            <span className="rounded-full bg-white/20 px-3.5 py-1 text-sm font-bold">
              {badgeText}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/30"
          >
            <X className="h-5 w-5" /> Thu nhỏ lại
          </button>
        </div>

        <div className="space-y-6 p-6 md:p-10">
          <h2
            id="spotlight-title"
            className="text-2xl font-extrabold text-teal-900 md:text-3xl"
          >
            {title}
          </h2>

          <div className="rounded-2xl border-2 border-teal-200 bg-teal-50/60 p-6 md:p-8">
            <p className="text-xl leading-relaxed font-bold text-slate-900 md:text-3xl md:leading-normal">
              {mainContent}
            </p>
          </div>

          {hints.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-base font-bold text-amber-800">
                  💡 Gợi ý dẫn dắt từng bước (Không lộ đáp án cuối):
                </span>
                {revealedCount < hints.length && (
                  <button
                    type="button"
                    onClick={() => setRevealedCount((c) => c + 1)}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-base font-bold text-white shadow-sm transition hover:bg-amber-600"
                  >
                    <Lightbulb className="h-5 w-5" />
                    Mở gợi ý bước {revealedCount + 1}/{hints.length}
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {hints.slice(0, revealedCount).map((h, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-3.5 text-lg font-semibold text-amber-950 md:text-xl animate-fade-slide"
                  >
                    {h}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
