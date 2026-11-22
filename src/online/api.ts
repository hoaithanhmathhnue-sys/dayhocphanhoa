// Thao tác Firestore cho giáo viên và học sinh. Mọi truy vấn chỉ dùng điều kiện "==" (không cần tạo chỉ mục).
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { StationTier } from '../types/education';
import { createStudentAccount, fb } from './firebase';
import {
  generateClassCode,
  generatePin,
  loginKey,
  normalizeClassCode,
  splitForPublish,
  studentEmail,
  type AnswerKey,
  type AssignmentDraft,
  type EssayItem,
  type PublicMcq,
} from './model';

// ----------------------------- Kiểu dữ liệu lưu trên Firestore -----------------------------

export interface ClassDoc {
  id: string;
  teacherUid: string;
  teacherName: string;
  name: string;
  code: string;
  nextNumber: number;
  createdAt?: Date;
}

export interface StudentDoc {
  uid: string;
  classId: string;
  teacherUid: string;
  name: string;
  number: number;
  station: StationTier;
  loginKey: string;
  active: boolean;
}

export interface AssignmentDoc {
  id: string;
  teacherUid: string;
  classId: string;
  className: string;
  title: string;
  lessonTitle: string;
  instructions: string;
  dueAt: Date;
  createdAt?: Date;
  isOpen: boolean;
  passingScore: number;
  stations: Record<StationTier, PublicMcq[]>;
  essays: EssayItem[];
}

export interface SubmissionDoc {
  id: string;
  assignmentId: string;
  classId: string;
  teacherUid: string;
  studentUid: string;
  studentName: string;
  number: number;
  station: StationTier;
  answers: Record<string, string>;
  essays: Record<string, string>;
  submittedAt?: Date;
  essayScores?: Record<string, number>;
  feedback?: string;
  gradedAt?: Date;
}

export interface PinSlip {
  classCode: string;
  className: string;
  number: number;
  name: string;
  pin: string;
}

const toDate = (v: unknown): Date | undefined => (v instanceof Timestamp ? v.toDate() : undefined);

// ----------------------------- Phiên đăng nhập -----------------------------

export function watchAuth(cb: (u: User | null) => void): () => void {
  return onAuthStateChanged(fb().auth, cb);
}

export const isGoogleUser = (u: User | null): boolean =>
  Boolean(u && u.providerData.some((p) => p.providerId === 'google.com'));

export async function teacherSignIn(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(fb().auth, provider);
}

export async function logout(): Promise<void> {
  await signOut(fb().auth);
}

// ----------------------------- Giáo viên: lớp & học sinh -----------------------------

export async function listClasses(teacherUid: string): Promise<ClassDoc[]> {
  const snap = await getDocs(query(collection(fb().db, 'classes'), where('teacherUid', '==', teacherUid)));
  return snap.docs
    .map((d) => ({ ...(d.data() as Omit<ClassDoc, 'id' | 'createdAt'>), id: d.id, createdAt: toDate(d.data().createdAt) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

export async function createClass(teacher: User, name: string): Promise<ClassDoc> {
  const ref = doc(collection(fb().db, 'classes'));
  const data = {
    teacherUid: teacher.uid,
    teacherName: teacher.displayName ?? '',
    name: name.trim(),
    code: generateClassCode(),
    nextNumber: 1,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, data);
  return { ...data, id: ref.id, createdAt: new Date() };
}

export async function renameClass(classId: string, name: string): Promise<void> {
  await updateDoc(doc(fb().db, 'classes', classId), { name: name.trim() });
}

export async function getClass(classId: string): Promise<ClassDoc | null> {
  const s = await getDoc(doc(fb().db, 'classes', classId));
  if (!s.exists()) return null;
  return { ...(s.data() as Omit<ClassDoc, 'id'>), id: s.id, createdAt: toDate(s.data().createdAt) };
}

export async function listStudents(classId: string, teacherUid: string): Promise<StudentDoc[]> {
  const snap = await getDocs(
    query(collection(fb().db, 'studentProfiles'), where('classId', '==', classId), where('teacherUid', '==', teacherUid)),
  );
  return snap.docs.map((d) => ({ ...(d.data() as Omit<StudentDoc, 'uid'>), uid: d.id })).sort((a, b) => a.number - b.number);
}

const randomSuffix = () => generateClassCode(undefined, 4).toLowerCase();

/** Tạo tài khoản + hồ sơ cho từng HS. Trả về phiếu PIN (PIN chỉ hiển thị lúc này, không được lưu). */
export async function addStudents(
  cls: ClassDoc,
  teacherUid: string,
  entries: { name: string; station: StationTier }[],
  onProgress?: (done: number, total: number) => void,
): Promise<PinSlip[]> {
  const { db } = fb();
  const fresh = await getClass(cls.id);
  let number = fresh?.nextNumber ?? cls.nextNumber;
  const slips: PinSlip[] = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const pin = generatePin();
    const email = studentEmail(cls.code, number, randomSuffix());
    const uid = await createStudentAccount(email, pin);
    const key = loginKey(cls.code, number);
    const batch = writeBatch(db);
    batch.set(doc(db, 'loginMap', key), { email, classId: cls.id, teacherUid });
    batch.set(doc(db, 'studentProfiles', uid), {
      classId: cls.id,
      teacherUid,
      name: e.name,
      number,
      station: e.station,
      loginKey: key,
      active: true,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'classes', cls.id), { nextNumber: increment(1) });
    await batch.commit();
    slips.push({ classCode: cls.code, className: cls.name, number, name: e.name, pin });
    number += 1;
    onProgress?.(i + 1, entries.length);
  }
  return slips;
}

/** Cấp lại PIN: tạo tài khoản mới cùng số thứ tự, chuyển hồ sơ sang tài khoản mới, tài khoản cũ mất quyền. */
export async function resetPin(cls: ClassDoc, teacherUid: string, st: StudentDoc): Promise<PinSlip> {
  const { db } = fb();
  const pin = generatePin();
  const email = studentEmail(cls.code, st.number, randomSuffix());
  const uid = await createStudentAccount(email, pin);
  const batch = writeBatch(db);
  batch.set(doc(db, 'loginMap', st.loginKey), { email, classId: cls.id, teacherUid });
  batch.set(doc(db, 'studentProfiles', uid), {
    classId: cls.id,
    teacherUid,
    name: st.name,
    number: st.number,
    station: st.station,
    loginKey: st.loginKey,
    active: st.active,
    createdAt: serverTimestamp(),
  });
  batch.delete(doc(db, 'studentProfiles', st.uid));
  await batch.commit();
  return { classCode: cls.code, className: cls.name, number: st.number, name: st.name, pin };
}

export async function updateStudent(uid: string, patch: Partial<Pick<StudentDoc, 'name' | 'station' | 'active'>>): Promise<void> {
  await updateDoc(doc(fb().db, 'studentProfiles', uid), patch);
}

export async function removeStudent(st: StudentDoc): Promise<void> {
  const { db } = fb();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'studentProfiles', st.uid));
  batch.delete(doc(db, 'loginMap', st.loginKey));
  await batch.commit();
}

// ----------------------------- Giáo viên: bài giao -----------------------------

const assignmentFrom = (id: string, d: Record<string, unknown>): AssignmentDoc => ({
  ...(d as unknown as Omit<AssignmentDoc, 'id' | 'dueAt' | 'createdAt'>),
  id,
  dueAt: toDate(d.dueAt) ?? new Date(0),
  createdAt: toDate(d.createdAt),
});

export async function publishAssignment(teacherUid: string, className: string, draft: AssignmentDraft): Promise<string> {
  const { db } = fb();
  const { publicStations, key } = splitForPublish(draft.stations);
  const ref = doc(collection(db, 'assignments'));
  await setDoc(ref, {
    teacherUid,
    classId: draft.classId,
    className,
    title: draft.title.trim(),
    lessonTitle: draft.lessonTitle,
    instructions: draft.instructions.trim(),
    dueAt: Timestamp.fromDate(draft.dueAt),
    createdAt: serverTimestamp(),
    isOpen: true,
    passingScore: draft.passingScore,
    stations: publicStations,
    essays: draft.essays.map((e) => ({ id: e.id, prompt: e.prompt.trim(), maxScore: e.maxScore })),
  });
  await setDoc(doc(db, 'assignments', ref.id, 'private', 'key'), { answers: key });
  return ref.id;
}

export async function listTeacherAssignments(teacherUid: string): Promise<AssignmentDoc[]> {
  const snap = await getDocs(query(collection(fb().db, 'assignments'), where('teacherUid', '==', teacherUid)));
  return snap.docs.map((d) => assignmentFrom(d.id, d.data())).sort((a, b) => b.dueAt.getTime() - a.dueAt.getTime());
}

export async function setAssignmentOpen(aid: string, isOpen: boolean): Promise<void> {
  await updateDoc(doc(fb().db, 'assignments', aid), { isOpen });
}

export async function setAssignmentDue(aid: string, dueAt: Date): Promise<void> {
  await updateDoc(doc(fb().db, 'assignments', aid), { dueAt: Timestamp.fromDate(dueAt) });
}

export async function getAnswerKey(aid: string): Promise<AnswerKey> {
  const s = await getDoc(doc(fb().db, 'assignments', aid, 'private', 'key'));
  return (s.exists() ? (s.data().answers as AnswerKey) : {}) ?? {};
}

const submissionFrom = (id: string, d: Record<string, unknown>): SubmissionDoc => ({
  ...(d as unknown as Omit<SubmissionDoc, 'id' | 'submittedAt' | 'gradedAt'>),
  id,
  submittedAt: toDate(d.submittedAt),
  gradedAt: toDate(d.gradedAt),
});

export async function listSubmissionsForAssignment(aid: string, teacherUid: string): Promise<SubmissionDoc[]> {
  const snap = await getDocs(
    query(collection(fb().db, 'submissions'), where('assignmentId', '==', aid), where('teacherUid', '==', teacherUid)),
  );
  return snap.docs.map((d) => submissionFrom(d.id, d.data()));
}

export async function gradeSubmission(sid: string, essayScores: Record<string, number>, feedback: string): Promise<void> {
  await updateDoc(doc(fb().db, 'submissions', sid), { essayScores, feedback: feedback.trim(), gradedAt: serverTimestamp() });
}

export async function allowRetry(sid: string): Promise<void> {
  await deleteDoc(doc(fb().db, 'submissions', sid));
}

export async function deleteAssignment(aid: string, teacherUid: string): Promise<void> {
  const { db } = fb();
  const subs = await listSubmissionsForAssignment(aid, teacherUid);
  for (const s of subs) await deleteDoc(doc(db, 'submissions', s.id));
  await deleteDoc(doc(db, 'assignments', aid, 'private', 'key'));
  await deleteDoc(doc(db, 'assignments', aid));
}

// ----------------------------- Học sinh -----------------------------

export class StudentLoginError extends Error {}

export async function studentSignIn(classCode: string, number: number, pin: string): Promise<void> {
  const { db, auth } = fb();
  const key = loginKey(normalizeClassCode(classCode), number);
  const m = await getDoc(doc(db, 'loginMap', key));
  if (!m.exists()) throw new StudentLoginError('Không tìm thấy mã lớp hoặc số thứ tự này. Em kiểm tra lại phiếu đăng nhập nhé.');
  try {
    await signInWithEmailAndPassword(auth, String(m.data().email), pin);
  } catch (e) {
    const code = (e as { code?: string }).code ?? '';
    if (code.includes('too-many-requests')) throw new StudentLoginError('Em nhập sai nhiều lần. Hãy chờ vài phút rồi thử lại.');
    throw new StudentLoginError('Mã PIN chưa đúng. Em kiểm tra lại phiếu đăng nhập nhé.');
  }
}

export async function getMyProfile(uid: string): Promise<StudentDoc | null> {
  const s = await getDoc(doc(fb().db, 'studentProfiles', uid));
  if (!s.exists()) return null;
  return { ...(s.data() as Omit<StudentDoc, 'uid'>), uid: s.id };
}

export async function listClassAssignments(classId: string): Promise<AssignmentDoc[]> {
  const snap = await getDocs(query(collection(fb().db, 'assignments'), where('classId', '==', classId)));
  return snap.docs.map((d) => assignmentFrom(d.id, d.data())).sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

export async function listMySubmissions(uid: string): Promise<SubmissionDoc[]> {
  const snap = await getDocs(query(collection(fb().db, 'submissions'), where('studentUid', '==', uid)));
  return snap.docs.map((d) => submissionFrom(d.id, d.data()));
}

export async function submitAssignment(
  a: AssignmentDoc,
  me: StudentDoc,
  answers: Record<string, string>,
  essays: Record<string, string>,
): Promise<void> {
  await setDoc(doc(fb().db, 'submissions', `${a.id}_${me.uid}`), {
    assignmentId: a.id,
    classId: a.classId,
    teacherUid: a.teacherUid,
    studentUid: me.uid,
    studentName: me.name,
    number: me.number,
    station: me.station,
    answers,
    essays,
    submittedAt: serverTimestamp(),
  });
}
