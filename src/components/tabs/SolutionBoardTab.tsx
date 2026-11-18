import React, { useState } from 'react';
import {
  AlertTriangle,
  Loader2,
  Maximize2,
  MessageSquarePlus,
  Sparkles,
  Star,
  MessagesSquare,
} from 'lucide-react';
import type {
  AiProvider,
  DifferentiatedLesson,
  SolutionPost,
  StationTier,
} from '../../types/education';
import {
  generateBoardDiscussionProbesAI,
  getFriendlyErrorMessage,
} from '../../services/geminiService';
import { STATION_META } from '../../utils/scoring';
import { SpotlightModal } from '../SpotlightModal';

interface SolutionBoardTabProps {
  lesson: DifferentiatedLesson;
  posts: SolutionPost[];
  tvMode: boolean;
  hasApiKey: boolean;
  provider: AiProvider;
  onOpenApiModal: () => void;
  onAddPost: (post: SolutionPost) => void;
  onStarPost: (postId: string) => void;
}

export const SolutionBoardTab: React.FC<SolutionBoardTabProps> = ({
  lesson,
  posts,
  tvMode,
  hasApiKey,
  provider,
  onOpenApiModal,
  onAddPost,
  onStarPost,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [authorName, setAuthorName] = useState('Nhóm đại diện Tổ 1');
  const [station, setStation] = useState<StationTier>('but-pha');
  const [methodTitle, setMethodTitle] = useState('');
  const [content, setContent] = useState('');
  const [isMisconception, setIsMisconception] = useState(false);

  const [aiProbes, setAiProbes] = useState<string[]>([]);
  const [isLoadingProbes, setIsLoadingProbes] = useState(false);
  const [probeError, setProbeError] = useState<string | null>(null);

  const [spotlightPost, setSpotlightPost] = useState<SolutionPost | null>(null);

  const handleSubmitNewPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!methodTitle.trim() || !content.trim()) return;
    onAddPost({
      id: `post-${Date.now()}`,
      authorName: authorName.trim() || 'Nhóm học sinh',
      station,
      methodTitle: methodTitle.trim(),
      content: content.trim(),
      stars: 1,
      isMisconception,
      createdAt: 'Vừa ghim lên bảng',
    });
    setMethodTitle('');
    setContent('');
    setIsMisconception(false);
    setShowAddForm(false);
  };

  const handleAskAiProbes = async () => {
    if (!hasApiKey) {
      onOpenApiModal();
      return;
    }
    setIsLoadingProbes(true);
    setProbeError(null);
    try {
      const questions = await generateBoardDiscussionProbesAI({
        lessonTitle: `${lesson.lessonCode}: ${lesson.title}`,
        posts,
      });
      setAiProbes(questions);
    } catch (err) {
      setProbeError(getFriendlyErrorMessage(err, provider));
    } finally {
      setIsLoadingProbes(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-slide">
      {/* Thanh tiêu đề Bức tường Đa Cách Giải kiểu Padlet */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-200 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-extrabold text-slate-900 md:text-xl">
              Bước 4: Bức Tường Đa Cách Giải & Thảo Luận Sâu ({posts.length} ý tưởng)
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-600 md:text-sm">
            Ghi nhận các hướng tiếp cận khác nhau của 3 Trạm trên Màn hình Tivi để cả lớp nhận xét, đối chiếu ưu/nhược điểm và sửa sai lầm.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-extrabold text-white shadow-xs transition hover:bg-teal-700"
          >
            <MessageSquarePlus className="h-4 w-4" /> Ghim thêm cách giải của HS
          </button>

          <button
            type="button"
            disabled={isLoadingProbes}
            onClick={handleAskAiProbes}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-extrabold text-amber-950 transition hover:bg-amber-100 disabled:opacity-60"
          >
            {isLoadingProbes ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-amber-600" />
            )}
            AI Gợi ý Câu hỏi Khai thác sâu
          </button>
        </div>
      </div>

      {/* Form ghim nhanh cách giải mới của học sinh lên bảng Padlet */}
      {showAddForm && (
        <form
          onSubmit={handleSubmitNewPost}
          className="rounded-2xl border-2 border-teal-300 bg-teal-50/50 p-5 shadow-sm animate-fade-slide"
        >
          <h3 className="text-base font-extrabold text-teal-950">
            📌 Ghim ý tưởng / bài giải của nhóm lên Bức tường chung
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Tên nhóm / Học sinh trình bày
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Thuộc Trạm học tập
              </label>
              <select
                value={station}
                onChange={(e) => setStation(e.target.value as StationTier)}
                className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
              >
                <option value="khoi-hanh">🌱 Trạm Khởi Hành</option>
                <option value="tang-toc">🚀 Trạm Tăng Tốc</option>
                <option value="but-pha">🌟 Trạm Bứt Phá</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Tên cách giải / Ý tưởng
              </label>
              <input
                type="text"
                required
                placeholder="VD: Cách 4: Vẽ sơ đồ đoạn thẳng..."
                value={methodTitle}
                onChange={(e) => setMethodTitle(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-bold text-slate-700">
              Nội dung trình bày tóm tắt của học sinh
            </label>
            <textarea
              rows={2}
              required
              placeholder="Nhập nhanh lời giải thích của nhóm học sinh..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-rose-800">
              <input
                type="checkbox"
                checked={isMisconception}
                onChange={(e) => setIsMisconception(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-rose-600"
              />
              Đánh dấu là "Tình huống nhầm lẫn cần cả lớp mổ xẻ"
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="min-h-[40px] rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/70"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="min-h-[40px] rounded-xl bg-teal-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-teal-700"
              >
                Ghim lên Bức tường
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Hộp câu hỏi gợi mở thảo luận sâu do Gemini AI đề xuất */}
      {probeError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-sm text-rose-900">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{probeError}</span>
        </div>
      )}

      {aiProbes.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-xs animate-fade-slide">
          <h3 className="text-sm font-extrabold text-amber-950 uppercase">
            🤖 Gợi ý 3 Câu hỏi Điều phối Thảo luận Sâu cho Giáo viên:
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            {aiProbes.map((q, i) => (
              <div
                key={i}
                className="rounded-xl border border-amber-200 bg-white p-3.5 text-sm font-semibold text-slate-800 shadow-2xs"
              >
                <span className="mb-1 block text-xs font-extrabold text-amber-700">
                  Câu hỏi khai thác {i + 1}:
                </span>
                {q}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lưới thẻ Padlet Đa Cách Giải */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {posts.map((post) => {
          const meta = STATION_META[post.station];
          return (
            <article
              key={post.id}
              className={`flex flex-col justify-between rounded-2xl border-2 p-5 shadow-sm transition hover:shadow-md ${
                post.isMisconception
                  ? 'border-rose-300 bg-rose-50/40'
                  : `${meta.cardBorder} bg-white`
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${
                      post.isMisconception
                        ? 'border-rose-300 bg-rose-100 text-rose-900'
                        : meta.badgeBg
                    }`}
                  >
                    {post.isMisconception ? '🤔 Bắt bệnh lỗi sai' : `${meta.emoji} ${meta.name}`}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onStarPost(post.id)}
                      aria-label={`Thả sao bình chọn cho ${post.methodTitle}`}
                      className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-900 transition hover:scale-105 hover:bg-amber-100"
                    >
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                      {post.stars}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSpotlightPost(post)}
                      title="Phóng to cách giải này lên toàn màn hình Tivi"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="mt-3 text-base font-extrabold text-slate-900 md:text-lg">
                  {post.methodTitle}
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  👤 Đóng góp bởi: {post.authorName}
                </p>

                <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 text-sm leading-relaxed font-medium text-slate-800 md:text-base">
                  {post.content}
                </div>
              </div>

              {post.teacherComment && !tvMode && (
                <p className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-xs font-medium text-teal-900">
                  <strong>👩‍🏫 Nhận xét định hướng GV:</strong> {post.teacherComment}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {/* Phóng to 1 cách giải lên Tivi */}
      <SpotlightModal
        isOpen={Boolean(spotlightPost)}
        onClose={() => setSpotlightPost(null)}
        badgeText={spotlightPost?.authorName || 'Góc Chia Sẻ Cách Giải'}
        title={spotlightPost?.methodTitle || ''}
        mainContent={spotlightPost?.content || ''}
        hints={
          spotlightPost?.isMisconception
            ? [
                'Em hãy đối chiếu phần nguyên của hai số thập phân trước khi nhìn số lượng chữ số ở phần thập phân nhé!',
              ]
            : []
        }
      />
    </div>
  );
};
