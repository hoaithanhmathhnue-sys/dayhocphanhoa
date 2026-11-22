import React, { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { ClipboardList, LogOut, PenSquare, Users } from 'lucide-react';
import {
  isGoogleUser,
  listClasses,
  listTeacherAssignments,
  logout,
  teacherSignIn,
  watchAuth,
  type AssignmentDoc,
  type ClassDoc,
} from './api';
import { formatViDateTime } from './model';
import { ErrorBox, OnlineShell, Spinner, btn, friendlyError } from './ui';
import { ClassManager } from './teacher/ClassManager';
import { AssignmentEditor } from './teacher/AssignmentEditor';
import { AssignmentResults } from './teacher/AssignmentResults';
import { isFirebaseConfigured } from './firebase';

type Tab = 'classes' | 'new' | 'list';

const TeacherPortal: React.FC = () => {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    return watchAuth(setUser);
  }, []);

  const signIn = async () => {
    setErr(null);
    try {
      await teacherSignIn();
    } catch (e) {
      setErr(friendlyError(e));
    }
  };

  return (
    <OnlineShell
      title="MathDiff 5 AI · Giao bài online"
      subtitle="Dành cho giáo viên: quản lí lớp, giao bài về nhà theo trạm, xem kết quả"
      right={
        user ? (
          <button type="button" className={btn.secondary} onClick={() => void logout()}>
            <LogOut className="h-4 w-4" /> Đăng xuất {isGoogleUser(user) ? user.displayName ?? '' : ''}
          </button>
        ) : null
      }
    >
      {user === undefined ? (
        <Spinner />
      ) : user === null ? (
        <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-teal-200 bg-white p-6 text-center shadow-xs">
          <h2 className="text-lg font-extrabold">Đăng nhập giáo viên</h2>
          <p className="text-sm text-slate-600">
            Giáo viên đăng nhập bằng tài khoản Google. Mỗi giáo viên chỉ thấy lớp, bài giao và kết quả của mình.
          </p>
          <ErrorBox msg={err} />
          <button type="button" className={btn.primary} onClick={signIn}>
            Đăng nhập bằng Google
          </button>
          <p className="text-xs text-slate-500">
            Học sinh không đăng nhập ở đây mà vào trang <a className="font-bold text-teal-700 underline" href="#/hoc-sinh">Học sinh làm bài</a>.
          </p>
        </div>
      ) : !isGoogleUser(user) ? (
        <div className="mx-auto max-w-lg space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center text-sm">
          <p className="font-bold">Trình duyệt đang đăng nhập bằng tài khoản học sinh.</p>
          <p>Trang giáo viên cần đăng nhập Google. Hãy đăng xuất rồi đăng nhập lại.</p>
          <button type="button" className={btn.primary} onClick={() => void logout()}>
            Đăng xuất
          </button>
        </div>
      ) : (
        <TeacherHome user={user} />
      )}
    </OnlineShell>
  );
};

const TeacherHome: React.FC<{ user: User }> = ({ user }) => {
  const [tab, setTab] = useState<Tab>('classes');
  const [classes, setClasses] = useState<ClassDoc[] | null>(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [assignments, setAssignments] = useState<AssignmentDoc[] | null>(null);
  const [openAid, setOpenAid] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reloadClasses = useCallback(
    async (select?: string) => {
      try {
        const cs = await listClasses(user.uid);
        setClasses(cs);
        setSelectedClass((cur) => select ?? (cur || cs[0]?.id || ''));
      } catch (e) {
        setErr(friendlyError(e));
        setClasses([]);
      }
    },
    [user.uid],
  );

  const reloadAssignments = useCallback(async () => {
    try {
      setAssignments(await listTeacherAssignments(user.uid));
    } catch (e) {
      setErr(friendlyError(e));
      setAssignments([]);
    }
  }, [user.uid]);

  useEffect(() => {
    void reloadClasses();
    void reloadAssignments();
  }, [reloadClasses, reloadAssignments]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'classes', label: 'Lớp học & PIN', icon: <Users className="h-4 w-4" /> },
    { id: 'new', label: 'Giao bài mới', icon: <PenSquare className="h-4 w-4" /> },
    { id: 'list', label: 'Bài đã giao & kết quả', icon: <ClipboardList className="h-4 w-4" /> },
  ];

  const opened = assignments?.find((a) => a.id === openAid) ?? null;

  return (
    <div className="space-y-5">
      <nav className="no-print flex flex-wrap gap-2 rounded-2xl border border-teal-200 bg-white p-2 shadow-xs" aria-label="Chức năng giáo viên">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setOpenAid(null);
            }}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
              tab === t.id ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white' : 'text-slate-700 hover:bg-teal-50'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>
      <ErrorBox msg={err} onClose={() => setErr(null)} />

      {classes === null ? (
        <Spinner />
      ) : tab === 'classes' ? (
        <ClassManager user={user} classes={classes} onClassesChanged={reloadClasses} selectedId={selectedClass} onSelect={setSelectedClass} />
      ) : tab === 'new' ? (
        <AssignmentEditor
          user={user}
          classes={classes}
          onPublished={async (aid) => {
            await reloadAssignments();
            setOpenAid(aid);
            setTab('list');
          }}
        />
      ) : opened ? (
        <AssignmentResults user={user} assignment={opened} onBack={() => setOpenAid(null)} onChanged={reloadAssignments} />
      ) : assignments === null ? (
        <Spinner />
      ) : assignments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Chưa giao bài nào.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {assignments.map((a) => {
            const overdue = a.dueAt.getTime() < Date.now();
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setOpenAid(a.id)}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-teal-400"
              >
                <p className="text-xs font-bold uppercase text-slate-500">Lớp {a.className}</p>
                <p className="mt-0.5 font-extrabold text-slate-900">{a.title}</p>
                <p className="mt-1 text-xs text-slate-600">
                  Hạn nộp: {formatViDateTime(a.dueAt)}{' '}
                  {!a.isOpen ? (
                    <span className="ml-1 rounded bg-slate-200 px-1.5 py-0.5 font-bold">Đã khoá</span>
                  ) : overdue ? (
                    <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-900">Đã hết hạn</span>
                  ) : (
                    <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">Đang nhận bài</span>
                  )}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeacherPortal;
