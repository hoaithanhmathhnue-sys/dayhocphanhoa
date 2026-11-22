import React, { Suspense, lazy, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Phần giao bài online tải riêng (chứa thư viện Firebase) để trang dạy trên lớp vẫn mở nhanh.
const TeacherPortal = lazy(() => import('./online/TeacherPortal'));
const StudentPortal = lazy(() => import('./online/StudentPortal'));
const LessonLibrary = lazy(() => import('./library/LessonLibrary'));

const routeOf = (hash: string) =>
  hash.startsWith('#/giao-bai') ? 'teacher' : hash.startsWith('#/hoc-sinh') ? 'student' : hash.startsWith('#/bai-hoc') ? 'library' : 'class';

const Root: React.FC = () => {
  const [route, setRoute] = useState(() => routeOf(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(routeOf(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  if (route === 'class') return <App />;
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm font-semibold text-slate-500">Đang tải…</div>}>
      {route === 'teacher' ? <TeacherPortal /> : route === 'library' ? <LessonLibrary /> : <StudentPortal />}
    </Suspense>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
