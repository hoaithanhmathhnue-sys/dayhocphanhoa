// Đồng bộ thư viện bài học của giáo viên với Firestore (collection teacherLessons, chỉ chủ bài đọc/ghi).
import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import type { DifferentiatedLesson } from '../types/education';
import { fb } from './firebase';
import { getDeletedIds, loadCustomLessons, sanitizeLesson, saveCustomLessons, setDeletedIds } from '../services/lessonStore';

const docIdOf = (uid: string, lessonId: string) => `${uid}__${lessonId.replace(/[^A-Za-z0-9_-]/g, '_')}`;

// Mỗi máy nhớ các bài đã từng đồng bộ với tài khoản: bài đã đồng bộ mà không còn trên tài khoản
// nghĩa là đã bị xoá ở máy khác (không được đẩy ngược lên).
const syncedKey = (uid: string) => `mathdiff5_synced_lessons_v1:${uid}`;
export function getSyncedIds(uid: string): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(syncedKey(uid)) ?? '[]');
    return new Set(Array.isArray(v) ? v.map(String) : []);
  } catch {
    return new Set();
  }
}
function setSyncedIds(uid: string, ids: Iterable<string>): void {
  localStorage.setItem(syncedKey(uid), JSON.stringify([...new Set(ids)]));
}

export async function pushLesson(uid: string, l: DifferentiatedLesson): Promise<void> {
  await setDoc(doc(fb().db, 'teacherLessons', docIdOf(uid, l.id)), {
    ownerUid: uid,
    lessonId: l.id,
    title: `${l.lessonCode}: ${l.title}`.slice(0, 300),
    json: JSON.stringify(l),
    updatedAt: l.updatedAt ?? Date.now(),
  });
  setSyncedIds(uid, [...getSyncedIds(uid), l.id]);
}

export async function deleteCloudLesson(uid: string, lessonId: string): Promise<void> {
  await deleteDoc(doc(fb().db, 'teacherLessons', docIdOf(uid, lessonId)));
  const ids = getSyncedIds(uid);
  ids.delete(lessonId);
  setSyncedIds(uid, ids);
}

export interface SyncResult {
  pulled: number;
  pushed: number;
  deleted: number;
  total: number;
}

/**
 * Hai chiều: bài mới hơn ở đâu thì lấy bản đó; bài đã xoá trên máy này thì xoá trên tài khoản.
 * Trả về danh sách bài sau đồng bộ (đã lưu vào trình duyệt).
 */
export async function syncLessons(uid: string): Promise<SyncResult> {
  const { db } = fb();
  const snap = await getDocs(query(collection(db, 'teacherLessons'), where('ownerUid', '==', uid)));
  const deleted = new Set(getDeletedIds());
  const local = new Map(loadCustomLessons().map((l) => [l.id, l]));
  const cloud = new Map<string, DifferentiatedLesson>();
  let pulled = 0;
  let pushed = 0;
  let removed = 0;

  for (const d of snap.docs) {
    const data = d.data() as { lessonId?: string; json?: string; updatedAt?: number };
    let lesson: DifferentiatedLesson;
    try {
      lesson = sanitizeLesson(JSON.parse(String(data.json ?? '{}')));
    } catch {
      continue;
    }
    lesson.updatedAt = Number(data.updatedAt) || lesson.updatedAt || 0;
    if (deleted.has(lesson.id)) {
      await deleteDoc(d.ref);
      removed += 1;
      continue;
    }
    cloud.set(lesson.id, lesson);
  }

  for (const [id, c] of cloud) {
    const l = local.get(id);
    if (!l || (c.updatedAt ?? 0) > (l.updatedAt ?? 0)) {
      local.set(id, c);
      pulled += 1;
    }
  }
  const synced = getSyncedIds(uid);
  for (const [id, l] of [...local]) {
    const c = cloud.get(id);
    if (!c && synced.has(id)) {
      // đã xoá trên tài khoản (ở máy khác) → xoá ở máy này
      local.delete(id);
      removed += 1;
      continue;
    }
    if (!c || (l.updatedAt ?? 0) > (c.updatedAt ?? 0)) {
      await pushLesson(uid, { ...l, updatedAt: l.updatedAt ?? Date.now() });
      pushed += 1;
    }
  }

  const merged = [...local.values()].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  saveCustomLessons(merged);
  setDeletedIds([]);
  setSyncedIds(uid, merged.map((l) => l.id));
  return { pulled, pushed, deleted: removed, total: merged.length };
}
