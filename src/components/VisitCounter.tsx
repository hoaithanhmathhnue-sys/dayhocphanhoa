import React, { useEffect, useState } from 'react';

const APP_NAMESPACE = 'toan5-phanhoa-bp3-edugenvn';
const BASE_VISIT_OFFSET = 1280;
const COUNTER_API_URL = `https://api.counterapi.dev/v1/${APP_NAMESPACE}/visits/up`;

const VISIT_STORAGE_KEY = `${APP_NAMESPACE}_my_visits`;
const LAST_VISIT_KEY = `${APP_NAMESPACE}_last_visit_time`;
const FALLBACK_KEY = `${APP_NAMESPACE}_total_fallback`;

const getToday = (): string => new Date().toISOString().split('T')[0];

interface VisitData {
  myVisits: number;
  totalVisits: number;
  todayVisits: number;
}

const incrementLocalVisits = (): { myVisits: number; todayVisits: number } => {
  const today = getToday();
  const todayKey = `${APP_NAMESPACE}_today_${today}`;

  try {
    const myVisits = parseInt(localStorage.getItem(VISIT_STORAGE_KEY) || '0', 10) + 1;
    localStorage.setItem(VISIT_STORAGE_KEY, String(myVisits));

    const lastDate = localStorage.getItem(LAST_VISIT_KEY) || '';
    const prevToday =
      lastDate === today ? parseInt(localStorage.getItem(todayKey) || '0', 10) : 0;
    const todayVisits = prevToday + 1;
    localStorage.setItem(todayKey, String(todayVisits));
    localStorage.setItem(LAST_VISIT_KEY, today);

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    localStorage.removeItem(`${APP_NAMESPACE}_today_${yesterday}`);

    return { myVisits, todayVisits };
  } catch {
    return { myVisits: 1, todayVisits: 1 };
  }
};

const fetchServerVisitCount = async (): Promise<number> => {
  try {
    const response = await fetch(COUNTER_API_URL);
    const data = (await response.json()) as { count?: number };
    if (data && typeof data.count === 'number') {
      return BASE_VISIT_OFFSET + data.count;
    }
  } catch {
    // Fallback offline mượt mà
  }
  try {
    const fallback = parseInt(
      localStorage.getItem(FALLBACK_KEY) || String(BASE_VISIT_OFFSET),
      10,
    );
    const newFallback = fallback + 1;
    localStorage.setItem(FALLBACK_KEY, String(newFallback));
    return newFallback;
  } catch {
    return BASE_VISIT_OFFSET + 1;
  }
};

const AnimatedNumber: React.FC<{ value: number; duration?: number }> = ({
  value,
  duration = 700,
}) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) return;
    const startTime = performance.now();
    let frameId = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(value * eased));
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  return <>{display.toLocaleString('vi-VN')}</>;
};

export const VisitCounter: React.FC = () => {
  const [visitData, setVisitData] = useState<VisitData>({
    myVisits: 0,
    totalVisits: 0,
    todayVisits: 0,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const localData = incrementLocalVisits();
      const totalVisits = await fetchServerVisitCount();
      setVisitData({ ...localData, totalVisits });
      setIsLoaded(true);
    }, 450);

    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs">
      <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1.5 text-teal-800 shadow-xs">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span>
          Tổng: <strong className="font-bold text-teal-950"><AnimatedNumber value={visitData.totalVisits} /></strong> lượt truy cập
        </span>
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-900">
        <span aria-hidden="true">📅</span>
        <span>
          Hôm nay: <strong className="font-bold"><AnimatedNumber value={visitData.todayVisits} duration={500} /></strong>
        </span>
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sky-900">
        <span aria-hidden="true">👩‍🏫</span>
        <span>
          Phiên của bạn: <strong className="font-bold"><AnimatedNumber value={visitData.myVisits} duration={500} /></strong> lần
        </span>
      </div>
    </div>
  );
};
