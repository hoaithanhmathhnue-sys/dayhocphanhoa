// Mục "Tác giả": nút trên thanh tiêu đề, hộp giới thiệu và dòng ghi tên ở chân trang.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { School, UserRound, X } from 'lucide-react';

export const AUTHOR = {
  name: 'Lê Thị Ngọc Mai',
  role: 'Giáo viên Trường Tiểu học Lý Thường Kiệt',
  photo: '/avatar.jpg',
  thumb: '/avatar-tron.jpg',
};

/** Hộp giới thiệu tác giả. Gắn thẳng vào <body> để không bị thanh tiêu đề (backdrop-blur) cắt mất. */
export const AuthorModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm no-print"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="author-title"
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-slide relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="h-28 bg-gradient-to-br from-teal-600 to-emerald-500" />
        <div className="-mt-20 flex flex-col items-center px-6 pb-7 text-center">
          <img
            src={AUTHOR.thumb}
            alt={`Ảnh tác giả ${AUTHOR.name}`}
            width={160}
            height={160}
            className="h-40 w-40 rounded-full border-4 border-white object-cover shadow-lg"
          />
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-teal-700">Tác giả</p>
          <h2 id="author-title" className="mt-1 text-2xl font-extrabold text-slate-900">
            {AUTHOR.name}
          </h2>
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <School className="h-4 w-4 text-teal-600" />
            {AUTHOR.role}
          </p>
          <p className="mt-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm leading-relaxed text-teal-950">
            Thiết kế ứng dụng <strong>MathDiff 5 AI</strong> hỗ trợ tổ chức dạy học phân hoá môn Toán lớp 5 (bộ sách Kết nối
            tri thức với cuộc sống).
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
};

/** Nút "Tác giả" có ảnh nhỏ, đặt trên thanh tiêu đề. */
export const AuthorButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Tác giả: ${AUTHOR.name} – ${AUTHOR.role}`}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white py-0.5 pl-0.5 pr-2.5 text-[11px] font-bold text-teal-800 transition hover:bg-teal-50'
            : 'inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white py-1.5 pl-1.5 pr-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100 md:text-sm'
        }
      >
        <img
          src={AUTHOR.thumb}
          alt=""
          width={32}
          height={32}
          className={compact ? 'h-6 w-6 rounded-full object-cover' : 'h-8 w-8 rounded-full object-cover'}
        />
        <span>Tác giả</span>
      </button>
      <AuthorModal open={open} onClose={() => setOpen(false)} />
    </>
  );
};

/** Dòng ghi tác giả ở chân trang; bấm vào để xem giới thiệu. */
export const AuthorCredit: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto inline-flex items-center gap-3 rounded-2xl px-3 py-2 text-left transition hover:bg-teal-50"
      >
        <img
          src={AUTHOR.thumb}
          alt={`Ảnh tác giả ${AUTHOR.name}`}
          width={48}
          height={48}
          className="h-12 w-12 rounded-full border-2 border-teal-200 object-cover"
        />
        <span className="text-xs leading-snug text-slate-600">
          <span className="inline-flex items-center gap-1 font-semibold text-teal-700">
            <UserRound className="h-3.5 w-3.5" /> Tác giả
          </span>
          <br />
          <strong className="text-sm text-slate-900">{AUTHOR.name}</strong>
          <br />
          {AUTHOR.role}
        </span>
      </button>
      <AuthorModal open={open} onClose={() => setOpen(false)} />
    </>
  );
};
