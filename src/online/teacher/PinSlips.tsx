import React from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import type { PinSlip } from '../api';
import { formatStudentNumber } from '../model';
import { btn } from '../ui';

/** Phiếu đăng nhập in cắt phát cho học sinh. PIN chỉ hiển thị ở màn hình này. */
export const PinSlips: React.FC<{ slips: PinSlip[]; link: string; onClose: () => void }> = ({ slips, link, onClose }) => (
  <div className="space-y-4">
    <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p>
        <strong>Hãy in hoặc ghi lại ngay.</strong> Mã PIN không được lưu trên hệ thống; sau khi rời trang này chỉ có thể cấp PIN mới.
      </p>
      <div className="flex gap-2">
        <button type="button" className={btn.primary} onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> In phiếu
        </button>
        <button type="button" className={btn.secondary} onClick={onClose}>
          <ArrowLeft className="h-4 w-4" /> Xong
        </button>
      </div>
    </div>
    <div className="print-area grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {slips.map((s) => (
        <div key={`${s.number}-${s.pin}`} className="slip rounded-xl border-2 border-dashed border-slate-400 bg-white p-4">
          <p className="text-xs font-bold uppercase text-slate-500">Phiếu đăng nhập làm bài · {s.className}</p>
          <p className="mt-1 text-lg font-extrabold text-slate-900">{s.name}</p>
          <table className="mt-2 w-full text-sm">
            <tbody>
              <tr>
                <td className="py-0.5 text-slate-600">Mã lớp</td>
                <td className="py-0.5 text-right font-mono text-lg font-extrabold tracking-widest">{s.classCode}</td>
              </tr>
              <tr>
                <td className="py-0.5 text-slate-600">Số thứ tự</td>
                <td className="py-0.5 text-right font-mono text-lg font-extrabold">{formatStudentNumber(s.number)}</td>
              </tr>
              <tr>
                <td className="py-0.5 text-slate-600">Mã PIN</td>
                <td className="py-0.5 text-right font-mono text-lg font-extrabold tracking-widest">{s.pin}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 break-all text-[11px] text-slate-500">Vào trang: {link}</p>
        </div>
      ))}
    </div>
  </div>
);
