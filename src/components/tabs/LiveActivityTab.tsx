import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Eye,
  Lightbulb,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Ruler,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import type {
  DifferentiatedLesson,
  StationTier,
  Student,
  StudentLiveStatus,
} from '../../types/education';
import {
  decomposeDecimal,
  STATION_META,
  STATUS_META,
} from '../../utils/scoring';
import { SpotlightModal } from '../SpotlightModal';

interface LiveActivityTabProps {
  lesson: DifferentiatedLesson;
  students: Student[];
  tvMode: boolean;
  onCycleStudentStatus: (studentId: string) => void;
  onSetStationStatusAll: (station: StationTier, status: StudentLiveStatus) => void;
  onJumpToCopilotWithIssue: (issueText: string) => void;
}

export const LiveActivityTab: React.FC<LiveActivityTabProps> = ({
  lesson,
  students,
  tvMode,
  onCycleStudentStatus,
  onSetStationStatusAll,
  onJumpToCopilotWithIssue,
}) => {
  // Đồng hồ thảo luận nhóm trên Tivi
  const [secondsLeft, setSecondsLeft] = useState(180);
  const [timerRunning, setTimerRunning] = useState(false);

  // Mở khóa gợi ý từng bước cho từng trạm
  const [revealedHints, setRevealedHints] = useState<Record<StationTier, number>>({
    'khoi-hanh': 0,
    'tang-toc': 0,
    'but-pha': 0,
  });

  // Công cụ trực quan Trạm Khởi Hành: hiện tách hàng từng số
  const [revealedRows, setRevealedRows] = useState<Record<string, boolean>>({});

  // Công cụ tương tác Trạm Tăng Tốc: sắp xếp thứ tự từ lớn nhất -> bé nhất
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [orderCheckResult, setOrderCheckResult] = useState<'correct' | 'wrong' | null>(null);

  // Công cụ tương tác Trạm Bứt Phá: ghim điểm lên trục số & bật đổi đơn vị
  const [pinnedOnLineIds, setPinnedOnLineIds] = useState<string[]>([]);
  const [showUnitConversion, setShowUnitConversion] = useState(false);

  // Chế độ xem 3 cột song song hay phóng to 1 Trạm trên Tivi
  const [focusedStation, setFocusedStation] = useState<StationTier | 'all'>('all');

  // Chế độ mô phỏng tiến độ real-time khi báo cáo SKKN
  const [isSimulatingLive, setIsSimulatingLive] = useState(false);

  // Spotlight modal phóng to toàn màn hình
  const [spotlightData, setSpotlightData] = useState<{
    badgeText: string;
    title: string;
    mainContent: string;
    hints: string[];
  } | null>(null);

  // Reset trạng thái học cụ khi đổi bài học
  useEffect(() => {
    setRevealedHints({ 'khoi-hanh': 0, 'tang-toc': 0, 'but-pha': 0 });
    setRevealedRows({});
    setSelectedOrderIds([]);
    setOrderCheckResult(null);
    setPinnedOnLineIds([]);
    setShowUnitConversion(false);
  }, [lesson.id]);

  // Chạy đồng hồ thảo luận
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  // Chạy mô phỏng tiến độ lớp học real-time
  useEffect(() => {
    if (!isSimulatingLive || students.length === 0) return;
    const interval = setInterval(() => {
      const candidates = students.filter((s) => s.status !== 'completed');
      const pool = candidates.length > 0 ? candidates : students;
      const randomStudent = pool[Math.floor(Math.random() * pool.length)];
      if (randomStudent) {
        onCycleStudentStatus(randomStudent.id);
      }
    }, 1600);
    return () => clearInterval(interval);
  }, [isSimulatingLive, students, onCycleStudentStatus]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Kiểm tra sắp xếp thứ tự giảm dần (Trạm Tăng Tốc)
  const handleToggleOrderSelect = (id: string) => {
    setOrderCheckResult(null);
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleVerifyOrder = () => {
    if (selectedOrderIds.length !== lesson.situationItems.length) return;
    const pickedValues = selectedOrderIds.map(
      (id) => lesson.situationItems.find((i) => i.id === id)?.numericValue ?? 0,
    );
    const sortedValues = [...lesson.situationItems]
      .map((i) => i.numericValue)
      .sort((a, b) => b - a);

    const isExact = pickedValues.every((v, idx) => v === sortedValues[idx]);
    setOrderCheckResult(isExact ? 'correct' : 'wrong');
  };

  // Tính khoảng trục số tự động theo dữ liệu bài học
  const numericVals = lesson.situationItems.map((i) => i.numericValue);
  const minLine = Math.floor(Math.min(...(numericVals.length ? numericVals : [0])));
  const maxLine = Math.ceil(Math.max(...(numericVals.length ? numericVals : [4])));
  const safeSpan = Math.max(1, maxLine - minLine);

  const stations: StationTier[] = ['khoi-hanh', 'tang-toc', 'but-pha'];
  const visibleStations =
    focusedStation === 'all' ? stations : [focusedStation];

  const strugglingStudents = students.filter((s) => s.status === 'struggling');

  return (
    <div className="space-y-6 animate-fade-slide">
      {/* KHỐI 1: SÂN KHẤU TÌNH HUỐNG CHUNG TRÊN MÀN HÌNH TIVI */}
      <section className="overflow-hidden rounded-3xl border-2 border-teal-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 px-5 py-3.5 text-white md:px-6">
          <div>
            <span className="text-xs font-bold tracking-wider text-teal-100 uppercase">
              Bước 3 • Tình huống Học tập Chung trên Màn hình Tương tác
            </span>
            <h2 className="text-lg font-extrabold md:text-xl">
              {lesson.lessonCode}: {lesson.title}
            </h2>
          </div>

          {/* Đồng hồ đếm ngược thảo luận nhóm */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 font-mono text-base font-extrabold ${
                secondsLeft <= 30 && secondsLeft > 0
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-black/25 text-white'
              }`}
            >
              <Clock className="h-4 w-4" />
              {formatTime(secondsLeft)}
            </div>

            <button
              type="button"
              onClick={() => setTimerRunning((r) => !r)}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-extrabold text-teal-900 shadow-xs transition hover:bg-teal-50"
            >
              {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {timerRunning ? 'Tạm dừng' : 'Đếm giờ'}
            </button>

            <button
              type="button"
              onClick={() => {
                setTimerRunning(false);
                setSecondsLeft(180);
              }}
              title="Đặt lại 3 phút"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white transition hover:bg-white/30"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                setSpotlightData({
                  badgeText: `${lesson.lessonCode} • Câu hỏi Trung tâm`,
                  title: lesson.title,
                  mainContent: lesson.centralQuestion,
                  hints: [],
                })
              }
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-xs transition hover:bg-amber-300"
            >
              <Maximize2 className="h-4 w-4" /> Phóng to Tivi
            </button>
          </div>
        </div>

        <div className="space-y-5 p-5 md:p-6">
          <p className="text-sm leading-relaxed text-slate-700 md:text-base">
            {lesson.contextStory}
          </p>

          {/* 3 Thẻ Hình ảnh Tình huống (3 Cây cầu cho Bài 21) */}
          {lesson.situationItems.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {lesson.situationItems.map((item) => (
                <div
                  key={item.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-xs transition hover:border-teal-400 hover:shadow-md"
                >
                  {item.imageUrl ? (
                    <div className="relative h-44 w-full overflow-hidden bg-slate-200">
                      <img
                        src={item.imageUrl}
                        alt={`${item.title} — ${item.valueLabel}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      {item.location && (
                        <span className="absolute top-2.5 left-2.5 rounded-full bg-slate-900/75 px-3 py-1 text-xs font-bold text-white backdrop-blur-xs">
                          📍 {item.location}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-24 items-center justify-between bg-gradient-to-r from-teal-50 to-emerald-50 px-4">
                      <span className="text-xs font-bold text-teal-800">
                        📍 {item.location || 'Dữ kiện thực tế'}
                      </span>
                      <span className="text-2xl">📐</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 md:text-lg">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500">Số liệu đo thực tế</p>
                    </div>
                    <span className="rounded-xl bg-teal-600 px-3.5 py-1.5 text-lg font-extrabold text-white shadow-xs md:text-xl">
                      {item.valueLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Câu hỏi trung tâm */}
          <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 p-4 md:p-5">
            <p className="text-xs font-extrabold tracking-wider text-amber-800 uppercase">
              🎯 Câu hỏi khám phá chung cho cả lớp:
            </p>
            <p className="mt-1 text-lg font-extrabold text-slate-900 md:text-2xl">
              {lesson.centralQuestion}
            </p>
          </div>
        </div>
      </section>

      {/* KHỐI 2: GIAO NHIỆM VỤ PHÂN HÓA 3 TRẠM & CÔNG CỤ TƯƠNG TÁC TRÊN BẢNG TIVI */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 md:text-xl">
              📋 Bảng Giao Nhiệm Vụ Phân Hóa & Học Cụ Tương Tác Theo Trạm
            </h3>
            <p className="text-xs text-slate-600 md:text-sm">
              Chiếu song song cả 3 Trạm để các nhóm thảo luận, hoặc chọn từng Trạm để mời học sinh lên Màn hình Tivi thao tác trực tiếp.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setFocusedStation('all')}
              className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                focusedStation === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Xem song song 3 Trạm
            </button>
            {stations.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFocusedStation(t)}
                className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  focusedStation === t
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {STATION_META[t].emoji} {STATION_META[t].name}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`grid grid-cols-1 gap-5 ${
            focusedStation === 'all' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'
          }`}
        >
          {visibleStations.map((tier) => {
            const meta = STATION_META[tier];
            const task = lesson.stationTasks[tier];
            const hintCount = revealedHints[tier];

            return (
              <div
                key={tier}
                className={`flex flex-col justify-between overflow-hidden rounded-2xl border-2 ${meta.cardBorder} bg-white shadow-sm`}
              >
                <div>
                  {/* Header Trạm */}
                  <div className={`bg-gradient-to-r ${meta.headerGradient} px-4 py-3.5 text-white`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{meta.emoji}</span>
                        <div>
                          <h4 className="text-base font-extrabold md:text-lg">
                            {meta.name}
                          </h4>
                          <p className="text-xs text-white/90">{task.subtitle}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSpotlightData({
                            badgeText: `${meta.emoji} ${meta.name}`,
                            title: task.subtitle,
                            mainContent: task.corePrompt,
                            hints: task.progressiveHints,
                          })
                        }
                        title="Phóng to nhiệm vụ Trạm này lên Tivi"
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white transition hover:bg-white/30"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 md:p-5">
                    {/* Câu lệnh nhiệm vụ */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                      <p className="text-xs font-bold text-slate-500 uppercase">
                        Nhiệm vụ của nhóm:
                      </p>
                      <p className="mt-1 text-sm leading-relaxed font-bold text-slate-900 md:text-base">
                        {task.corePrompt}
                      </p>
                    </div>

                    {/* HỌC CỤ TƯƠNG TÁC CẢM ỨNG RIÊNG THEO TỪNG TRẠM */}
                    {tier === 'khoi-hanh' && lesson.situationItems.length > 0 && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-extrabold text-emerald-900">
                            🧮 Bảng Tách Hàng Trực Quan (Chạm để xem từng số):
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const allTrue: Record<string, boolean> = {};
                              lesson.situationItems.forEach((i) => {
                                allTrue[i.id] = true;
                              });
                              setRevealedRows(allTrue);
                            }}
                            className="text-xs font-bold text-emerald-700 hover:underline"
                          >
                            Hiện tất cả
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-center text-xs md:text-sm">
                            <thead>
                              <tr className="bg-emerald-100/80 text-emerald-950">
                                <th className="border border-emerald-200 px-2 py-1.5 text-left">
                                  Đối tượng
                                </th>
                                <th className="border border-emerald-200 px-2 py-1.5 font-extrabold">
                                  Phần nguyên
                                </th>
                                <th className="border border-emerald-200 px-1.5 py-1.5">,</th>
                                <th className="border border-emerald-200 px-2 py-1.5">
                                  Phần mười
                                </th>
                                <th className="border border-emerald-200 px-2 py-1.5">
                                  Phần trăm
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {lesson.situationItems.map((item) => {
                                const dec = decomposeDecimal(String(item.numericValue));
                                const isShown = Boolean(revealedRows[item.id]);
                                return (
                                  <tr key={item.id} className="bg-white">
                                    <td className="border border-emerald-200 px-2 py-2 text-left font-semibold text-slate-800">
                                      {item.title} ({item.valueLabel})
                                    </td>
                                    {isShown && dec ? (
                                      <>
                                        <td className="border border-emerald-200 bg-amber-50 px-2 py-2 text-base font-extrabold text-amber-900">
                                          {dec.integerPart}
                                        </td>
                                        <td className="border border-emerald-200 px-1 py-2 font-bold">
                                          ,
                                        </td>
                                        <td className="border border-emerald-200 px-2 py-2 font-bold text-teal-800">
                                          {dec.tenths}
                                        </td>
                                        <td className="border border-emerald-200 px-2 py-2 font-bold text-slate-700">
                                          {dec.hundredths}
                                        </td>
                                      </>
                                    ) : (
                                      <td
                                        colSpan={4}
                                        className="border border-emerald-200 px-2 py-1.5"
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setRevealedRows((prev) => ({
                                              ...prev,
                                              [item.id]: true,
                                            }))
                                          }
                                          className="inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                                        >
                                          <Eye className="h-3.5 w-3.5" /> Chạm tách số
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {tier === 'tang-toc' && lesson.situationItems.length >= 2 && (
                      <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3.5">
                        <p className="mb-2 text-xs font-extrabold text-sky-900">
                          👆 Tương tác trên Tivi: Chạm lần lượt theo thứ tự từ LỚN NHẤT → BÉ NHẤT:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {lesson.situationItems.map((item) => {
                            const orderIdx = selectedOrderIds.indexOf(item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleToggleOrderSelect(item.id)}
                                className={`min-h-[42px] rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                                  orderIdx >= 0
                                    ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                                    : 'border-slate-300 bg-white text-slate-800 hover:border-sky-400'
                                }`}
                              >
                                {orderIdx >= 0 ? `#${orderIdx + 1} ` : ''}
                                {item.title} ({item.valueLabel})
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            type="button"
                            disabled={selectedOrderIds.length !== lesson.situationItems.length}
                            onClick={handleVerifyOrder}
                            className="min-h-[38px] rounded-lg bg-sky-700 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-sky-800 disabled:opacity-40"
                          >
                            Kiểm tra thứ tự
                          </button>
                          {selectedOrderIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrderIds([]);
                                setOrderCheckResult(null);
                              }}
                              className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600"
                            >
                              Chọn lại
                            </button>
                          )}
                        </div>

                        {orderCheckResult && (
                          <div
                            role="status"
                            aria-live="polite"
                            className={`mt-2.5 rounded-lg p-2.5 text-xs font-bold ${
                              orderCheckResult === 'correct'
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-rose-100 text-rose-900'
                            }`}
                          >
                            {orderCheckResult === 'correct'
                              ? '✓ Chính xác tuyệt vời! Thứ tự giảm dần hoàn toàn đúng quy tắc.'
                              : '✗ Chưa đúng thứ tự từ lớn nhất đến bé nhất. Hãy kiểm tra phần nguyên rồi đến hàng phần mười nhé!'}
                          </div>
                        )}
                      </div>
                    )}

                    {tier === 'but-pha' && lesson.situationItems.length > 0 && (
                      <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-950">
                            <Ruler className="h-4 w-4 text-amber-700" /> Trục Số Tương Tác ({minLine} → {maxLine} {lesson.situationItems[0]?.unit || ''})
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowUnitConversion((v) => !v)}
                            className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
                          >
                            {showUnitConversion ? 'Ẩn đổi đơn vị' : '🔄 Kiểm chứng đổi đơn vị'}
                          </button>
                        </div>

                        {/* Nút chạm ghim từng số lên trục số */}
                        <div className="flex flex-wrap gap-1.5">
                          {lesson.situationItems.map((item) => {
                            const pinned = pinnedOnLineIds.includes(item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() =>
                                  setPinnedOnLineIds((prev) =>
                                    pinned
                                      ? prev.filter((x) => x !== item.id)
                                      : [...prev, item.id],
                                  )
                                }
                                className={`min-h-[36px] rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                                  pinned
                                    ? 'border-orange-600 bg-orange-600 text-white'
                                    : 'border-amber-300 bg-white text-slate-800 hover:bg-amber-100'
                                }`}
                              >
                                📍 {pinned ? 'Đã đặt: ' : 'Đặt lên tia số: '}
                                {item.valueLabel}
                              </button>
                            );
                          })}
                        </div>

                        {/* Hình vẽ Trục số SVG/CSS trực quan */}
                        <div className="relative mt-4 pt-7 pb-5">
                          <div className="h-2 w-full rounded-full bg-slate-300" />
                          {/* Các vạch chia từ minLine đến maxLine */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                            const val = +(minLine + ratio * safeSpan).toFixed(2);
                            return (
                              <div
                                key={ratio}
                                style={{ left: `${ratio * 100}%` }}
                                className="absolute top-6 -translate-x-1/2 text-center"
                              >
                                <div className="mx-auto h-3.5 w-0.5 bg-slate-600" />
                                <span className="mt-1 block text-[11px] font-bold text-slate-700">
                                  {String(val).replace('.', ',')}
                                </span>
                              </div>
                            );
                          })}

                          {/* Các cờ đã ghim */}
                          {lesson.situationItems
                            .filter((i) => pinnedOnLineIds.includes(i.id))
                            .map((item) => {
                              const pct = Math.min(
                                98,
                                Math.max(2, ((item.numericValue - minLine) / safeSpan) * 100),
                              );
                              return (
                                <div
                                  key={item.id}
                                  style={{ left: `${pct}%` }}
                                  className="absolute top-0 -translate-x-1/2 animate-fade-slide"
                                >
                                  <span className="block whitespace-nowrap rounded-md bg-orange-600 px-2 py-0.5 text-[11px] font-extrabold text-white shadow-sm">
                                    {item.valueLabel}
                                  </span>
                                  <div className="mx-auto h-3 w-0.5 bg-orange-600" />
                                </div>
                              );
                            })}
                        </div>

                        {showUnitConversion && (
                          <div className="rounded-lg border border-amber-300 bg-white p-2.5 text-xs text-slate-800 animate-fade-slide">
                            <strong className="text-amber-900">Cách kiểm chứng đổi ra đơn vị nhỏ hơn (× 1000):</strong>
                            <ul className="mt-1 space-y-0.5 font-semibold">
                              {lesson.situationItems.map((i) => (
                                <li key={i.id}>
                                  • {i.title}: {i.valueLabel} ={' '}
                                  <span className="font-extrabold text-orange-700">
                                    {Math.round(i.numericValue * 1000).toLocaleString('vi-VN')}
                                  </span>{' '}
                                  {i.unit === 'km' ? 'm' : i.unit === 'kg' ? 'g' : 'đơn vị nhỏ'}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* HỘP GỢI Ý MỞ KHÓA TỪNG BƯỚC (KHÔNG LỘ ĐÁP ÁN) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-800">
                          💡 Gợi ý dẫn dắt ({hintCount}/{task.progressiveHints.length}):
                        </span>
                        {hintCount < task.progressiveHints.length && (
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedHints((prev) => ({
                                ...prev,
                                [tier]: prev[tier] + 1,
                              }))
                            }
                            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
                          >
                            <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                            Mở gợi ý bước {hintCount + 1}
                          </button>
                        )}
                      </div>

                      {task.progressiveHints.slice(0, hintCount).map((h, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-xs font-medium text-amber-950 animate-fade-slide"
                        >
                          {h}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ghi chú riêng của GV (tự động ẩn khi bật Chế độ Tivi) */}
                {!tvMode && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
                    <strong>👩‍🏫 Lưu ý GV:</strong> {task.teacherGuidance}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* KHỐI 3: LIVE DASHBOARD THEO DÕI TIẾN ĐỘ REAL-TIME (CẢM HỨNG QUIZIZZ LESSONS) */}
      <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 md:text-lg">
                📊 Live Dashboard Theo Dõi Tiến Độ Học Tập Real-time
              </h3>
              <p className="text-xs text-slate-600">
                Giáo viên đi quan sát lớp và chạm 1-click vào tên học sinh trên màn hình để cập nhật trạng thái tức thời.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSimulatingLive((v) => !v)}
              className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                isSimulatingLive
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'border border-indigo-300 bg-indigo-50 text-indigo-900 hover:bg-indigo-100'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              {isSimulatingLive
                ? '⏹ Dừng mô phỏng tiến độ'
                : '▶ Mô phỏng Tiến độ Real-time (Demo)'}
            </button>
          </div>
        </div>

        {/* Cảnh báo thông minh khi phát hiện HS đang gặp khó khăn -> nối thẳng sang Bước 5 AI Ứng biến nóng */}
        {strugglingStudents.length > 0 && (
          <div
            role="status"
            aria-live="polite"
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
              <span>
                Phát hiện <strong>{strugglingStudents.length} học sinh</strong> (
                {strugglingStudents.map((s) => s.name).join(', ')}) đang cần hỗ trợ trực tiếp!
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                onJumpToCopilotWithIssue(
                  `Một số học sinh (${strugglingStudents
                    .map((s) => s.name)
                    .join(', ')}) đang lúng túng khi thực hiện nhiệm vụ bài "${
                    lesson.title
                  }", đặc biệt dễ nhầm giữa phần nguyên và độ dài chữ số phần thập phân.`,
                )
              }
              className="min-h-[40px] rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-rose-700"
            >
              ⚡ Nhờ AI tạo câu hỏi gỡ rối ngay
            </button>
          </div>
        )}

        {/* Thanh tiến độ % của 3 Trạm */}
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {stations.map((tier) => {
            const meta = STATION_META[tier];
            const list = students.filter((s) => s.station === tier);
            const doneCount = list.filter((s) => s.status === 'completed').length;
            const percent = list.length > 0 ? Math.round((doneCount / list.length) * 100) : 0;

            return (
              <div
                key={tier}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900">
                    {meta.emoji} {meta.name}
                  </span>
                  <span className="text-xs font-extrabold text-teal-800">
                    {doneCount}/{list.length} hoàn thành ({percent}%)
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Tiến độ ${meta.name}: ${percent}%`}
                  className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200"
                >
                  <div
                    style={{ width: `${percent}%` }}
                    className={`h-full bg-gradient-to-r ${meta.headerGradient} transition-all duration-500`}
                  />
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {list.map((hs) => {
                    const st = STATUS_META[hs.status];
                    return (
                      <button
                        key={hs.id}
                        type="button"
                        onClick={() => onCycleStudentStatus(hs.id)}
                        title={`${hs.name}: ${st.label} (Chạm để chuyển trạng thái)`}
                        className={`inline-flex min-h-[36px] items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition ${st.pillClass}`}
                      >
                        <span>{st.icon}</span>
                        <span>{hs.name.split(' ').slice(-2).join(' ')}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onSetStationStatusAll(tier, 'completed')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Đánh dấu cả Trạm xong
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Spotlight Modal phóng to Tivi */}
      <SpotlightModal
        isOpen={Boolean(spotlightData)}
        onClose={() => setSpotlightData(null)}
        badgeText={spotlightData?.badgeText || ''}
        title={spotlightData?.title || ''}
        mainContent={spotlightData?.mainContent || ''}
        hints={spotlightData?.hints || []}
      />
    </div>
  );
};
