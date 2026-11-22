import React, { useRef, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { ClassListImportError, readClassListFile, type ImportResult } from '../utils/classListImport';

interface Props {
  onLoaded: (res: ImportResult, fileName: string) => void;
  onError: (msg: string) => void;
  className?: string;
}

/** Nút chọn file danh sách lớp (.xlsx, .docx, .csv, .txt). File được đọc ngay trên trình duyệt, không tải lên máy chủ. */
export const ClassFileUpload: React.FC<Props> = ({ onLoaded, onError, className }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    try {
      const res = await readClassListFile(f);
      if (res.entries.length === 0) onError(`Không tìm thấy họ tên học sinh nào trong "${f.name}". Hãy để danh sách trong một cột có tiêu đề "Họ và tên".`);
      else onLoaded(res, f.name);
    } catch (err) {
      onError(err instanceof ClassListImportError ? err.message : 'Không đọc được file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        title="Excel (.xlsx), Word (.docx), .csv hoặc .txt — có cột Họ và tên; nếu có cột Trạm sẽ tự xếp trạm"
        className={
          className ??
          'inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-50'
        }
      >
        <FileSpreadsheet className="h-4 w-4" /> {busy ? 'Đang đọc file…' : 'Tải danh sách từ file Excel/Word'}
      </button>
      <input
        ref={ref}
        type="file"
        accept=".xlsx,.docx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={onChange}
        aria-label="Chọn file danh sách lớp"
      />
    </>
  );
};
