import React, { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { KeyRound, Plus, Printer, Trash2, UserPlus, Users } from 'lucide-react';
import type { Student, StationTier } from '../../types/education';
import {
  addStudents,
  createClass,
  listStudents,
  removeStudent,
  resetPin,
  updateStudent,
  type ClassDoc,
  type PinSlip,
  type StudentDoc,
} from '../api';
import { STATIONS, STATION_EMOJI, STATION_LABEL, formatStudentNumber, parseNameList } from '../model';
import { ErrorBox, Spinner, btn, friendlyError, inputCls } from '../ui';
import { PinSlips } from './PinSlips';

interface Props {
  user: User;
  classes: ClassDoc[];
  onClassesChanged: (select?: string) => Promise<void>;
  selectedId: string;
  onSelect: (id: string) => void;
}

const studentLink = () => `${window.location.origin}${window.location.pathname}#/hoc-sinh`;

/** Danh sách lớp dùng trên lớp (Bước 1) lưu ở máy giáo viên — dùng để nhập nhanh tên và trạm. */
function readLocalClass(): { name: string; station: StationTier }[] {
  try {
    const raw = localStorage.getItem('mathdiff5_students_v1');
    const arr = raw ? (JSON.parse(raw) as Student[]) : [];
    return Array.isArray(arr) ? arr.map((s) => ({ name: s.name, station: s.station })) : [];
  } catch {
    return [];
  }
}

export const ClassManager: React.FC<Props> = ({ user, classes, onClassesChanged, selectedId, onSelect }) => {
  const [newName, setNewName] = useState('');
  const [students, setStudents] = useState<StudentDoc[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [namesText, setNamesText] = useState('');
  const [station, setStation] = useState<StationTier>('tang-toc');
  const [localImport, setLocalImport] = useState<{ name: string; station: StationTier }[] | null>(null);
  const [slips, setSlips] = useState<PinSlip[] | null>(null);

  const cls = classes.find((c) => c.id === selectedId) ?? null;

  const reload = useCallback(async () => {
    if (!cls) return setStudents(null);
    setStudents(null);
    try {
      setStudents(await listStudents(cls.id, user.uid));
    } catch (e) {
      setErr(friendlyError(e));
      setStudents([]);
    }
  }, [cls, user.uid]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setBusy('create');
    setErr(null);
    try {
      const c = await createClass(user, newName);
      setNewName('');
      await onClassesChanged(c.id);
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const handleAdd = async () => {
    if (!cls) return;
    const entries = localImport ?? parseNameList(namesText).map((name) => ({ name, station }));
    if (entries.length === 0) return;
    if (students && students.some((s) => entries.some((e) => e.name === s.name))) {
      if (!window.confirm('Một số tên đã có trong lớp. Vẫn thêm (sẽ tạo thêm tài khoản mới)?')) return;
    }
    setErr(null);
    setBusy(`add:0/${entries.length}`);
    let made: PinSlip[] = [];
    try {
      made = await addStudents(cls, user.uid, entries, (d, t) => setBusy(`add:${d}/${t}`));
      setNamesText('');
      setLocalImport(null);
    } catch (e) {
      setErr(`${friendlyError(e)} (Các học sinh tạo xong trước khi lỗi vẫn được giữ lại.)`);
    } finally {
      setBusy(null);
      await onClassesChanged(cls.id);
      await reload();
      if (made.length) setSlips(made);
    }
  };

  const handleReset = async (st: StudentDoc) => {
    if (!cls) return;
    if (!window.confirm(`Cấp PIN mới cho ${st.name}? PIN cũ sẽ không dùng được nữa.`)) return;
    setBusy(`reset:${st.uid}`);
    setErr(null);
    try {
      const slip = await resetPin(cls, user.uid, st);
      await reload();
      setSlips([slip]);
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async (st: StudentDoc) => {
    if (!window.confirm(`Xoá ${st.name} khỏi lớp? Học sinh này sẽ không đăng nhập được nữa (bài đã nộp vẫn được giữ).`)) return;
    setBusy(`rm:${st.uid}`);
    try {
      await removeStudent(st);
      await reload();
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const patch = async (st: StudentDoc, p: Partial<Pick<StudentDoc, 'station' | 'active'>>) => {
    try {
      await updateStudent(st.uid, p);
      setStudents((prev) => prev?.map((s) => (s.uid === st.uid ? { ...s, ...p } : s)) ?? prev);
    } catch (e) {
      setErr(friendlyError(e));
    }
  };

  if (slips) return <PinSlips slips={slips} link={studentLink()} onClose={() => setSlips(null)} />;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      <aside className="space-y-3 lg:col-span-4">
        <div className="rounded-2xl border border-teal-200 bg-white p-4 shadow-xs">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Users className="h-4 w-4 text-teal-600" /> Lớp của tôi
          </h3>
          <div className="mt-3 space-y-2">
            {classes.length === 0 && <p className="text-xs text-slate-500">Chưa có lớp nào. Tạo lớp đầu tiên bên dưới.</p>}
            {classes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-bold transition ${
                  c.id === selectedId ? 'border-teal-500 bg-teal-50 text-teal-900' : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <span>{c.name}</span>
                <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs text-white">{c.code}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              className={inputCls}
              placeholder="Tên lớp, ví dụ 5A"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              aria-label="Tên lớp mới"
            />
            <button type="button" className={btn.primary} onClick={handleCreate} disabled={busy === 'create' || !newName.trim()}>
              <Plus className="h-4 w-4" /> Tạo
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600">
          <p className="font-bold text-slate-800">Học sinh đăng nhập ở:</p>
          <p className="mt-1 break-all font-mono text-teal-800">{studentLink()}</p>
          <p className="mt-2">Mỗi học sinh dùng mã lớp, số thứ tự và mã PIN 6 số in trên phiếu. PIN chỉ hiện một lần khi tạo; nếu học sinh quên, bấm "Cấp lại PIN".</p>
        </div>
      </aside>

      <section className="space-y-4 lg:col-span-8">
        <ErrorBox msg={err} onClose={() => setErr(null)} />
        {!cls ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Chọn hoặc tạo một lớp để quản lí học sinh.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-white p-4 shadow-xs">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Lớp</p>
                <p className="text-xl font-extrabold text-slate-900">{cls.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase text-slate-500">Mã lớp</p>
                <p className="font-mono text-2xl font-extrabold tracking-widest text-teal-700">{cls.code}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-teal-200 bg-white p-4 shadow-xs">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <UserPlus className="h-4 w-4 text-teal-600" /> Thêm học sinh và cấp PIN
              </h3>
              {localImport ? (
                <div className="mt-3 rounded-xl bg-teal-50 p-3 text-sm">
                  Sẽ thêm <strong>{localImport.length}</strong> học sinh từ danh sách Bước 1 (giữ nguyên trạm của từng em).
                  <button type="button" className="ml-2 text-xs font-bold text-teal-800 underline" onClick={() => setLocalImport(null)}>
                    Huỷ
                  </button>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <textarea
                    className={`${inputCls} md:col-span-2`}
                    rows={5}
                    placeholder={'Dán danh sách, mỗi dòng một họ tên\nNguyễn Văn A\nTrần Thị B'}
                    value={namesText}
                    onChange={(e) => setNamesText(e.target.value)}
                    aria-label="Danh sách họ tên học sinh"
                  />
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600">
                      Xếp vào trạm
                      <select className={`${inputCls} mt-1`} value={station} onChange={(e) => setStation(e.target.value as StationTier)}>
                        {STATIONS.map((s) => (
                          <option key={s} value={s}>
                            {STATION_EMOJI[s]} {STATION_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className={btn.small}
                      onClick={() => {
                        const l = readLocalClass();
                        if (l.length === 0) setErr('Không tìm thấy danh sách lớp ở Bước 1 trên máy này.');
                        else setLocalImport(l);
                      }}
                    >
                      Lấy tên và trạm từ danh sách Bước 1
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  className={btn.primary}
                  onClick={handleAdd}
                  disabled={Boolean(busy) || (!localImport && parseNameList(namesText).length === 0)}
                >
                  <KeyRound className="h-4 w-4" /> Tạo tài khoản và in phiếu PIN
                </button>
                {busy?.startsWith('add:') && <span className="text-sm font-semibold text-teal-700">Đang tạo {busy.slice(4)}…</span>}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              {students === null ? (
                <Spinner />
              ) : students.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">Lớp chưa có học sinh.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">STT</th>
                      <th className="px-3 py-2">Họ và tên</th>
                      <th className="px-3 py-2">Trạm (bài giao về nhà)</th>
                      <th className="px-3 py-2">Được đăng nhập</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.uid} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-mono font-bold">{formatStudentNumber(s.number)}</td>
                        <td className="px-3 py-2 font-semibold">{s.name}</td>
                        <td className="px-3 py-2">
                          <select
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                            value={s.station}
                            onChange={(e) => void patch(s, { station: e.target.value as StationTier })}
                            aria-label={`Trạm của ${s.name}`}
                          >
                            {STATIONS.map((t) => (
                              <option key={t} value={t}>
                                {STATION_EMOJI[t]} {STATION_LABEL[t]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={s.active}
                            onChange={(e) => void patch(s, { active: e.target.checked })}
                            aria-label={`Cho phép ${s.name} đăng nhập`}
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <button type="button" className={btn.small} onClick={() => void handleReset(s)} disabled={Boolean(busy)}>
                            <KeyRound className="h-3.5 w-3.5" /> Cấp lại PIN
                          </button>{' '}
                          <button type="button" className={btn.danger} onClick={() => void handleRemove(s)} disabled={Boolean(busy)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Printer className="h-3.5 w-3.5" /> Đổi trạm ở đây chỉ áp dụng cho bài giao về nhà; danh sách dạy trên lớp (Bước 1) vẫn lưu riêng trên máy.
            </p>
          </>
        )}
      </section>
    </div>
  );
};
