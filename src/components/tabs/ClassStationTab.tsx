import React, { useState } from 'react';
import {
  Award,
  Dices,
  RotateCcw,
  Sparkles,
  UserPlus,
  Users,
  ArrowRightLeft,
} from 'lucide-react';
import { ClassFileUpload } from '../ClassFileUpload';
import type { StationTier, Student } from '../../types/education';
import { CLASSDOJO_BADGES, STATION_META } from '../../utils/scoring';

interface ClassStationTabProps {
  students: Student[];
  tvMode: boolean;
  onMoveStudentStation: (studentId: string, newStation: StationTier) => void;
  onAwardBadge: (studentId: string, badgeId: string, points: number) => void;
  onAwardStationBonus: (station: StationTier, points: number) => void;
  onAddBulkStudents: (names: string[], defaultStation: StationTier) => void;
  onResetDefaultClass: () => void;
}

const AVATAR_POOL = ['🐼', '🐰', '🐻', '🐱', '🐶', '🐨', '🦊', '🐹', '🐯', '🐸', '🦁', '🦄', '🐵', '🐥', '🐧', '🦉', '🐬'];

export const ClassStationTab: React.FC<ClassStationTabProps> = ({
  students,
  tvMode,
  onMoveStudentStation,
  onAwardBadge,
  onAwardStationBonus,
  onAddBulkStudents,
  onResetDefaultClass,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [pickedStudent, setPickedStudent] = useState<{
    student: Student;
    station: StationTier;
  } | null>(null);
  const [showImportBox, setShowImportBox] = useState(false);
  const [bulkNamesText, setBulkNamesText] = useState('');
  const [fileNotice, setFileNotice] = useState<{ ok: boolean; msg: string } | null>(null);
  const [bulkStation, setBulkStation] = useState<StationTier>('tang-toc');

  const stationsOrder: StationTier[] = ['khoi-hanh', 'tang-toc', 'but-pha'];

  const handleRandomPick = (station: StationTier) => {
    const pool = students.filter((s) => s.station === station);
    if (pool.length === 0) return;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setPickedStudent({ student: chosen, station });
  };

  const handleImportSubmit = () => {
    const lines = bulkNamesText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    onAddBulkStudents(lines, bulkStation);
    setBulkNamesText('');
    setShowImportBox(false);
  };

  return (
    <div className="space-y-6 animate-fade-slide">
      {/* Thanh công cụ quản lý lớp kiểu ClassDojo */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-200 bg-white p-4 shadow-xs md:p-5">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            <h2 className="text-lg font-extrabold text-slate-900 md:text-xl">
              Bước 1: Quản lý Lớp 5A & Phân Trạm Linh Hoạt ({students.length} Học sinh)
            </h2>
          </div>
          {!tvMode && (
            <p className="mt-1 text-sm text-slate-600">
              Đảm bảo nguyên tắc sư phạm: Đặt tên Trạm tích cực, không gắn nhãn cố định — Giáo viên có thể chuyển học sinh giữa các Trạm ngay trong tiết học tùy sự tiến bộ.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowImportBox((v) => !v)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 px-3.5 py-2 text-sm font-bold text-teal-900 transition hover:bg-teal-100"
          >
            <UserPlus className="h-4 w-4" /> Thêm HS lớp thật
          </button>

          {!tvMode && (
            <button
              type="button"
              onClick={onResetDefaultClass}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <RotateCcw className="h-4 w-4" /> Khôi phục lớp mẫu 5A
            </button>
          )}
        </div>
      </div>

      {/* Form nhập nhanh danh sách học sinh của giáo viên */}
      {showImportBox && (
        <div className="rounded-2xl border-2 border-teal-300 bg-teal-50/50 p-5 shadow-sm animate-fade-slide">
          <h3 className="text-base font-bold text-teal-950">
            📋 Dán danh sách học sinh (mỗi dòng 1 họ tên) hoặc tải file Excel/Word
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <textarea
                rows={4}
                value={bulkNamesText}
                onChange={(e) => setBulkNamesText(e.target.value)}
                placeholder={'Nguyễn Văn Nam\nTrần Thị Mai Anh\nLê Hoàng Bách...'}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div className="flex flex-col justify-between space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Xếp vào Trạm ban đầu:
                </label>
                <select
                  value={bulkStation}
                  onChange={(e) => setBulkStation(e.target.value as StationTier)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
                >
                  <option value="khoi-hanh">🌱 Trạm Khởi Hành</option>
                  <option value="tang-toc">🚀 Trạm Tăng Tốc</option>
                  <option value="but-pha">🌟 Trạm Bứt Phá</option>
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  Avatar ngộ nghĩnh ({AVATAR_POOL.slice(0, 5).join(' ')}) sẽ được gán tự động và lưu trên máy tính này.
                </p>
              </div>
              <ClassFileUpload
                className="min-h-[40px] w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-50"
                onError={(m) => setFileNotice({ ok: false, msg: m })}
                onLoaded={(res, fileName) => {
                  setBulkNamesText(res.entries.map((e) => e.name).join('\n'));
                  const st = res.entries.find((e) => e.station)?.station;
                  if (st && res.entries.every((e) => !e.station || e.station === st)) setBulkStation(st);
                  setFileNotice({ ok: true, msg: `Đã đọc ${res.entries.length} họ tên từ "${fileName}". Kiểm tra lại rồi bấm "Lưu thêm vào lớp học".` });
                }}
              />
              {fileNotice && (
                <p className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${fileNotice.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}>
                  {fileNotice.msg}
                </p>
              )}
              <button
                type="button"
                onClick={handleImportSubmit}
                className="min-h-[44px] w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-700"
              >
                Lưu thêm vào lớp học
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hộp kết quả gọi ngẫu nhiên đại diện lên bảng tương tác */}
      {pickedStudent && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 px-6 py-4 shadow-md animate-fade-slide"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-xs">
              {pickedStudent.student.avatar}
            </span>
            <div>
              <span className="text-xs font-bold tracking-wider text-amber-800 uppercase">
                🎉 Xin mời đại diện {STATION_META[pickedStudent.station].emoji}{' '}
                {STATION_META[pickedStudent.station].name} lên Màn hình Tương tác!
              </span>
              <p className="text-xl font-extrabold text-slate-900 md:text-2xl">
                {pickedStudent.student.name}{' '}
                <span className="text-base font-semibold text-slate-600">
                  ({pickedStudent.student.groupTable} • ⭐ {pickedStudent.student.stars} sao)
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onAwardBadge(pickedStudent.student.id, 'explain', 2);
                setPickedStudent(null);
              }}
              className="min-h-[44px] rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-700"
            >
              🌟 Thưởng +2 Sao lên bảng giỏi
            </button>
            <button
              type="button"
              onClick={() => setPickedStudent(null)}
              className="min-h-[44px] rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-amber-100"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* 3 Cột Trạm Năng Lượng */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {stationsOrder.map((tier) => {
          const meta = STATION_META[tier];
          const stationStudents = students.filter((s) => s.station === tier);
          const totalStars = stationStudents.reduce((acc, s) => acc + s.stars, 0);

          return (
            <div
              key={tier}
              className={`flex flex-col overflow-hidden rounded-2xl border-2 ${meta.cardBorder} bg-white shadow-sm`}
            >
              {/* Header Trạm */}
              <div className={`bg-gradient-to-r ${meta.headerGradient} p-4 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{meta.emoji}</span>
                    <div>
                      <h3 className="text-lg font-extrabold">{meta.name}</h3>
                      <p className="text-xs text-white/90">{meta.shortDesc}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">
                      {stationStudents.length} HS • ⭐ {totalStars}
                    </span>
                  </div>
                </div>

                {!tvMode && (
                  <p className="mt-2 rounded-lg bg-black/15 px-2.5 py-1.5 text-xs text-white/95">
                    👩‍🏫 Định hướng GV: {meta.pedagogyFocus}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleRandomPick(tier)}
                    className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-xs transition hover:bg-white/30"
                  >
                    <Dices className="h-4 w-4" /> Gọi ngẫu nhiên lên bảng
                  </button>
                  <button
                    type="button"
                    onClick={() => onAwardStationBonus(tier, 1)}
                    className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-xs transition hover:bg-amber-50"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> +1⭐ Cả trạm
                  </button>
                </div>
              </div>

              {/* Danh sách Học sinh trong Trạm */}
              <div className="flex-1 space-y-2.5 p-3.5">
                {stationStudents.map((hs) => {
                  const otherTiers = stationsOrder.filter((t) => t !== tier);
                  return (
                    <div
                      key={hs.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 transition hover:border-teal-300 hover:bg-white"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedStudent(hs)}
                        className="flex min-h-[44px] flex-1 items-center gap-2.5 text-left"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-xs">
                          {hs.avatar}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {hs.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {hs.groupTable} • <strong className="text-amber-600">⭐ {hs.stars}</strong> • {hs.xp} XP
                          </p>
                        </div>
                      </button>

                      {/* Nút đổi trạm linh hoạt & thưởng sao */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(hs)}
                          title="Tặng sao khích lệ"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100"
                        >
                          <Award className="h-4 w-4" />
                        </button>

                        {!tvMode && (
                          <div className="flex flex-col gap-1">
                            {otherTiers.map((targetTier) => (
                              <button
                                key={targetTier}
                                type="button"
                                onClick={() => onMoveStudentStation(hs.id, targetTier)}
                                title={`Chuyển linh hoạt sang ${STATION_META[targetTier].name}`}
                                className="inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:border-teal-400 hover:text-teal-700"
                              >
                                <ArrowRightLeft className="h-2.5 w-2.5" />
                                {STATION_META[targetTier].emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {stationStudents.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-400">
                    Chưa có học sinh trong trạm này.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Tặng Huy hiệu ClassDojo & Chuyển Trạm cho 1 Học sinh */}
      {selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl animate-fade-slide">
            <div className="flex items-center gap-3.5">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-3xl">
                {selectedStudent.avatar}
              </span>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {selectedStudent.name}
                </h3>
                <p className="text-xs text-slate-600">
                  {selectedStudent.groupTable} • {STATION_META[selectedStudent.station].emoji}{' '}
                  {STATION_META[selectedStudent.station].name} • ⭐ {selectedStudent.stars} sao
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2.5 text-xs font-bold tracking-wider text-slate-500 uppercase">
                🌟 Tặng huy hiệu khích lệ (ClassDojo Tiểu học):
              </p>
              <div className="grid grid-cols-1 gap-2">
                {CLASSDOJO_BADGES.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      onAwardBadge(selectedStudent.id, b.id, b.points);
                      setSelectedStudent(null);
                    }}
                    className="flex min-h-[44px] items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:border-amber-400 hover:bg-amber-50"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{b.icon}</span> {b.label}
                    </span>
                    <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-extrabold text-amber-950">
                      +{b.points} ⭐
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="mb-2 text-xs font-bold text-slate-600">
                🔄 Điều chuyển Trạm linh hoạt theo sự tiến bộ:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {stationsOrder.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      onMoveStudentStation(selectedStudent.id, t);
                      setSelectedStudent(null);
                    }}
                    className={`min-h-[42px] rounded-xl border px-2 py-1.5 text-xs font-bold transition ${
                      selectedStudent.station === t
                        ? 'border-teal-600 bg-teal-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {STATION_META[t].emoji} {STATION_META[t].name.replace('Trạm ', '')}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedStudent(null)}
              className="mt-5 min-h-[44px] w-full rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
