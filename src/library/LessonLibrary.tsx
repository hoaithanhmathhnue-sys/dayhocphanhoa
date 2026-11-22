import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { CloudUpload, Copy, Download, FilePlus2, LogOut, Pencil, PlayCircle, RefreshCw, Sparkles, Trash2, Upload } from 'lucide-react';
import type { DifferentiatedLesson } from '../types/education';
import { SAMPLE_LESSONS } from '../data/sampleLessons';
import {
  ACTIVE_LESSON_KEY,
  OPEN_TAB_KEY,
  LessonImportError,
  duplicateLesson,
  exportLessonsJson,
  getDeletedIds,
  lessonFileName,
  loadCustomLessons,
  newBlankLesson,
  parseLessonsJson,
  removeLesson,
  saveCustomLessons,
  setDeletedIds,
  upsertLesson,
} from '../services/lessonStore';
import { STATIONS, STATION_EMOJI, formatViDateTime } from '../online/model';
import { ErrorBox, OnlineShell, btn, friendlyError } from '../online/ui';
import { isFirebaseConfigured } from '../online/firebase';
import { LessonEditor } from './LessonEditor';

type Editing = { lesson: DifferentiatedLesson; isNew: boolean } | null;

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const goTeach = (id: string, tab?: string) => {
  localStorage.setItem(ACTIVE_LESSON_KEY, id);
  if (tab) localStorage.setItem(OPEN_TAB_KEY, tab);
  window.location.hash = '#/';
};

const LessonLibrary: React.FC = () => {
  const [mine, setMine] = useState<DifferentiatedLesson[]>(() => loadCustomLessons());
  const [editing, setEditing] = useState<Editing>(null);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cloud = isFirebaseConfigured();
  const google = Boolean(user && user.providerData.some((p) => p.providerId === 'google.com'));

  // Firebase chỉ tải khi đã cấu hình, để thư viện vẫn chạy khi chưa có Firebase.
  useEffect(() => {
    if (!cloud) return;
    let off = () => {};
    void import('../online/api').then(({ watchAuth }) => {
      off = watchAuth(setUser);
    });
    return () => off();
  }, [cloud]);

  const sync = useCallback(async () => {
    if (!user || !google) return;
    setSyncing(true);
    setErr(null);
    try {
      const { syncLessons } = await import('../online/lessonSync');
      const r = await syncLessons(user.uid);
      setMine(loadCustomLessons());
      setInfo(`Đã đồng bộ với tài khoản: ${r.total} bài (lấy về ${r.pulled}, gửi lên ${r.pushed}${r.deleted ? `, xoá ${r.deleted}` : ''}).`);
    } catch (e) {
      setErr(`Chưa đồng bộ được: ${friendlyError(e)}`);
    } finally {
      setSyncing(false);
    }
  }, [user, google]);

  useEffect(() => {
    void sync();
  }, [sync]);

  const afterLocalChange = async (changed?: DifferentiatedLesson, deletedId?: string) => {
    setMine(loadCustomLessons());
    if (!user || !google) return;
    try {
      const s = await import('../online/lessonSync');
      if (changed) await s.pushLesson(user.uid, changed);
      if (deletedId) {
        await s.deleteCloudLesson(user.uid, deletedId);
        setDeletedIds(getDeletedIds().filter((x) => x !== deletedId));
      }
    } catch (e) {
      setErr(`Đã lưu trên máy này nhưng chưa lưu lên tài khoản: ${friendlyError(e)}`);
    }
  };

  const save = async (l: DifferentiatedLesson) => {
    upsertLesson(l);
    setEditing(null);
    setInfo(`Đã lưu "${l.lessonCode}: ${l.title}".`);
    await afterLocalChange(l);
  };

  const duplicate = async (l: DifferentiatedLesson) => {
    const c = duplicateLesson(l);
    try {
      upsertLesson(c);
    } catch (e) {
      return setErr(e instanceof Error ? e.message : String(e));
    }
    setInfo(`Đã tạo bản sao "${c.title}". Bấm "Sửa" để chỉnh.`);
    await afterLocalChange(c);
  };

  const remove = async (l: DifferentiatedLesson) => {
    if (!window.confirm(`Xoá bài "${l.lessonCode}: ${l.title}"?${google ? ' Bài cũng bị xoá khỏi tài khoản.' : ''} Nên xuất tệp lưu trữ trước nếu còn cần.`)) return;
    removeLesson(l.id);
    setInfo(`Đã xoá "${l.title}".`);
    await afterLocalChange(undefined, l.id);
  };

  const importFile = async (f?: File) => {
    if (!f) return;
    setErr(null);
    try {
      const list = parseLessonsJson(await f.text(), [...mine.map((m) => m.id)]);
      saveCustomLessons([...list, ...loadCustomLessons()]);
      setInfo(`Đã nhập ${list.length} bài từ "${f.name}".`);
      setMine(loadCustomLessons());
      if (user && google) {
        const s = await import('../online/lessonSync');
        for (const l of list) await s.pushLesson(user.uid, l);
      }
    } catch (e) {
      setErr(e instanceof LessonImportError ? e.message : friendlyError(e));
    }
  };

  const signIn = async () => {
    try {
      const { teacherSignIn } = await import('../online/api');
      await teacherSignIn();
    } catch (e) {
      setErr(friendlyError(e));
    }
  };

  if (editing)
    return (
      <OnlineShell title="MathDiff 5 AI · Thư viện bài học" subtitle="Soạn và sửa bài dạy phân hoá theo 3 trạm" requireFirebase={false}>
        <LessonEditor initial={editing.lesson} isNew={editing.isNew} onSave={save} onCancel={() => setEditing(null)} />
      </OnlineShell>
    );

  const card = (l: DifferentiatedLesson, sample: boolean) => {
    const counts = STATIONS.map((s) => `${STATION_EMOJI[s]} ${l.practiceQuestions.filter((q) => q.station === s).length}`).join('  ');
    return (
      <div key={l.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-teal-600 px-2 py-0.5 text-xs font-extrabold text-white">{l.lessonCode || '—'}</span>
            {sample && <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">Bài mẫu</span>}
            {!sample && !l.isApprovedByTeacher && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">Chờ GV duyệt</span>}
          </div>
          <p className="mt-1.5 font-extrabold text-slate-900">{l.title || '(chưa có tên)'}</p>
          <p className="mt-1 text-xs text-slate-500">
            Câu luyện tập: {counts}
            {l.updatedAt ? ` · Sửa lúc ${formatViDateTime(new Date(l.updatedAt))}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={btn.small} onClick={() => goTeach(l.id)}>
            <PlayCircle className="h-3.5 w-3.5 text-teal-600" /> Dạy bài này
          </button>
          {!sample && (
            <button type="button" className={btn.small} onClick={() => setEditing({ lesson: l, isNew: false })}>
              <Pencil className="h-3.5 w-3.5" /> Sửa
            </button>
          )}
          <button type="button" className={btn.small} onClick={() => void duplicate(l)}>
            <Copy className="h-3.5 w-3.5" /> {sample ? 'Nhân bản để sửa' : 'Nhân bản'}
          </button>
          <button type="button" className={btn.small} onClick={() => download(lessonFileName([l]), exportLessonsJson([l]))}>
            <Download className="h-3.5 w-3.5" /> Xuất tệp
          </button>
          {!sample && (
            <button type="button" className={btn.danger} onClick={() => void remove(l)} aria-label={`Xoá bài ${l.title}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <OnlineShell
      title="MathDiff 5 AI · Thư viện bài học"
      subtitle="Thêm, sửa, sao lưu và chia sẻ bài dạy phân hoá theo 3 trạm"
      requireFirebase={false}
      right={
        google ? (
          <button type="button" className={btn.secondary} onClick={() => void import('../online/api').then((m) => m.logout())}>
            <LogOut className="h-4 w-4" /> Đăng xuất
          </button>
        ) : null
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-teal-200 bg-white p-3 shadow-xs">
          <button type="button" className={btn.primary} onClick={() => setEditing({ lesson: newBlankLesson(), isNew: true })}>
            <FilePlus2 className="h-4 w-4" /> Tự soạn bài mới
          </button>
          <button type="button" className={btn.secondary} onClick={() => goTeach(mine[0]?.id ?? SAMPLE_LESSONS[0].id, 'step-2')}>
            <Sparkles className="h-4 w-4 text-amber-500" /> Soạn bằng AI (Xưởng AI)
          </button>
          <button type="button" className={btn.secondary} onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Nhập bài từ tệp
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { void importFile(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" className={btn.secondary} disabled={mine.length === 0} onClick={() => download(lessonFileName(mine), exportLessonsJson(mine))}>
            <Download className="h-4 w-4" /> Xuất tất cả bài của tôi
          </button>
        </div>

        {cloud && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
            {google ? (
              <>
                <span>
                  <CloudUpload className="mr-1 inline h-4 w-4" /> Bài của tôi được lưu cả trên tài khoản <strong>{user?.email}</strong>; đăng nhập trên máy khác sẽ thấy lại.
                </span>
                <button type="button" className={btn.small} onClick={() => void sync()} disabled={syncing}>
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Đang đồng bộ…' : 'Đồng bộ ngay'}
                </button>
              </>
            ) : (
              <>
                <span>Bài của tôi hiện chỉ lưu trên trình duyệt này. Đăng nhập Google để lưu lên tài khoản và dùng trên mọi máy.</span>
                <button type="button" className={btn.small} onClick={() => void signIn()}>
                  Đăng nhập Google
                </button>
              </>
            )}
          </div>
        )}

        <ErrorBox msg={err} onClose={() => setErr(null)} />
        {info && <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900">{info}</p>}

        <section>
          <h2 className="mb-2 text-sm font-extrabold uppercase text-slate-600">Bài của tôi ({mine.length})</h2>
          {mine.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              Chưa có bài nào. Bấm "Tự soạn bài mới", "Soạn bằng AI", nhân bản một bài mẫu, hoặc nhập tệp bài học của đồng nghiệp.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">{mine.map((l) => card(l, false))}</div>
          )}
        </section>
        <section>
          <h2 className="mb-2 text-sm font-extrabold uppercase text-slate-600">Bài mẫu có sẵn</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">{SAMPLE_LESSONS.map((l) => card(l, true))}</div>
        </section>
      </div>
    </OnlineShell>
  );
};

export default LessonLibrary;
