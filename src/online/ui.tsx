import React from 'react';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import { isFirebaseConfigured } from './firebase';

export function friendlyError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const msg = (e as { message?: string })?.message ?? String(e);
  if (code === 'permission-denied' || code.includes('permission-denied'))
    return 'Không có quyền thực hiện thao tác này (kiểm tra lại tài khoản đăng nhập hoặc luật Firestore đã được cập nhật chưa).';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Đã đóng cửa sổ đăng nhập Google.';
  if (code === 'auth/popup-blocked') return 'Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép cửa sổ bật lên rồi thử lại.';
  if (code === 'auth/unauthorized-domain')
    return 'Tên miền của trang chưa được thêm vào Firebase (Authentication → Settings → Authorized domains).';
  if (code === 'auth/operation-not-allowed')
    return 'Chưa bật phương thức đăng nhập trong Firebase (Authentication → Sign-in method: bật Google và Email/Password).';
  if (code === 'auth/too-many-requests' || code === 'auth/quota-exceeded')
    return 'Firebase tạm giới hạn số lần tạo tài khoản/đăng nhập. Hãy chờ khoảng 1 giờ rồi thử tiếp.';
  if (code === 'unavailable' || code === 'auth/network-request-failed') return 'Mất kết nối mạng. Hãy kiểm tra Internet rồi thử lại.';
  return msg;
}

export const Spinner: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-slate-500">
    <Loader2 className="h-5 w-5 animate-spin text-teal-600" /> {label ?? 'Đang tải...'}
  </div>
);

export const ErrorBox: React.FC<{ msg: string | null; onClose?: () => void }> = ({ msg, onClose }) =>
  msg ? (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
      <span>{msg}</span>
      {onClose && (
        <button type="button" onClick={onClose} className="text-rose-700 underline">
          Đóng
        </button>
      )}
    </div>
  ) : null;

export const btn = {
  primary:
    'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50',
  secondary:
    'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
  danger:
    'inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50',
  small:
    'inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-teal-400 hover:text-teal-800 disabled:opacity-50',
};

export const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200';

export const OnlineShell: React.FC<{
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  requireFirebase?: boolean;
}> = ({ title, subtitle, right, children, requireFirebase = true }) => (
  <div className="min-h-screen bg-gradient-to-b from-teal-50/60 via-slate-50 to-emerald-50/40 text-slate-900">
    <header className="border-b border-teal-200/80 bg-white/95 shadow-xs no-print">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-500 text-white shadow-md">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 md:text-lg">{title}</h1>
            <p className="text-xs text-slate-600">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {right}
          <a href="#/" className={btn.secondary}>
            <ArrowLeft className="h-4 w-4" /> Về trang dạy trên lớp
          </a>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      {!requireFirebase || isFirebaseConfigured() ? (
        children
      ) : (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 text-sm leading-relaxed text-amber-950">
          <p className="text-base font-extrabold">Chức năng giao bài online chưa được kết nối Firebase.</p>
          <p className="mt-2">
            Người quản trị cần tạo dự án Firebase (Authentication + Firestore) và khai báo các biến{' '}
            <code>VITE_FIREBASE_API_KEY</code>, <code>VITE_FIREBASE_AUTH_DOMAIN</code>, <code>VITE_FIREBASE_PROJECT_ID</code>,{' '}
            <code>VITE_FIREBASE_APP_ID</code> trong mục Environment Variables của Vercel, rồi triển khai lại. Xem tệp{' '}
            <code>HUONG_DAN_FIREBASE.md</code> trong mã nguồn.
          </p>
          <p className="mt-2">Phần dạy học trên lớp (5 bước) vẫn dùng bình thường, không cần Firebase.</p>
        </div>
      )}
    </main>
  </div>
);
