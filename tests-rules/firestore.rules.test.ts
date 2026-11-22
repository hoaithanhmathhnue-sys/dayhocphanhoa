// Kiểm thử luật bảo mật Firestore bằng bộ giả lập (Firebase Emulator, cần Java 11+).
// Chạy: npm run test:rules
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { Timestamp, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';

let env: RulesTestEnvironment;

const T1 = 'teacher1';
const T2 = 'teacher2';
const S1 = 'student1';
const S2 = 'student2';
const SX = 'stranger';

const teacher = (uid: string) => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } }).firestore();
const student = (uid: string) => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'password' } }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const future = () => Timestamp.fromDate(new Date(Date.now() + 86_400_000));
const past = () => Timestamp.fromDate(new Date(Date.now() - 86_400_000));

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-mathdiff5',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env.cleanup();
});

// Dữ liệu nền: lớp c1 của T1 (S1, S2), lớp c2 của T2; bài a1 (mở, còn hạn), a2 (hết hạn), a3 (đã khoá), b1 của lớp c2.
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'classes/c1'), { teacherUid: T1, teacherName: 'GV1', name: '5A', code: 'ABCDEF', nextNumber: 3 });
    await setDoc(doc(db, 'classes/c2'), { teacherUid: T2, teacherName: 'GV2', name: '5B', code: 'GHJKMN', nextNumber: 1 });
    const prof = (n: number, station: string) => ({ classId: 'c1', teacherUid: T1, name: `HS${n}`, number: n, station, loginKey: `ABCDEF-0${n}`, active: true });
    await setDoc(doc(db, `studentProfiles/${S1}`), prof(1, 'khoi-hanh'));
    await setDoc(doc(db, `studentProfiles/${S2}`), prof(2, 'but-pha'));
    await setDoc(doc(db, 'loginMap/ABCDEF-01'), { email: 'abcdef-01-x@hs.mathdiff5.app', classId: 'c1', teacherUid: T1 });
    const asg = (classId: string, teacherUid: string, dueAt: Timestamp, isOpen: boolean) => ({
      teacherUid, classId, className: '5A', title: 'BTVN', lessonTitle: 'Bài 21', instructions: '', dueAt, isOpen, passingScore: 75,
      stations: { 'khoi-hanh': [{ id: 'q1', text: '4,8 ... 3,95', options: ['>', '<', '='] }], 'tang-toc': [], 'but-pha': [] }, essays: [],
    });
    await setDoc(doc(db, 'assignments/a1'), asg('c1', T1, future(), true));
    await setDoc(doc(db, 'assignments/a2'), asg('c1', T1, past(), true));
    await setDoc(doc(db, 'assignments/a3'), asg('c1', T1, future(), false));
    await setDoc(doc(db, 'assignments/b1'), asg('c2', T2, future(), true));
    for (const id of ['a1', 'a2', 'a3', 'b1']) await setDoc(doc(db, `assignments/${id}/private/key`), { answers: { 'khoi-hanh': { q1: { correct: '>', explanation: '4 > 3' } } } });
  });
});

const submission = (aid: string, uid: string, extra: Record<string, unknown> = {}) => ({
  assignmentId: aid, classId: 'c1', teacherUid: T1, studentUid: uid, studentName: 'HS1', number: 1, station: 'khoi-hanh',
  answers: { q1: '>' }, essays: {}, submittedAt: serverTimestamp(), ...extra,
});

describe('Vai trò và lớp học', () => {
  it('giáo viên (Google) tạo lớp của mình; học sinh và người lạ không tạo được', async () => {
    const data = (uid: string) => ({ teacherUid: uid, teacherName: '', name: '5C', code: 'PQRSTU', nextNumber: 1, createdAt: serverTimestamp() });
    await assertSucceeds(setDoc(doc(teacher(T1), 'classes/new1'), data(T1)));
    await assertFails(setDoc(doc(student(S1), 'classes/new2'), data(S1)));
    await assertFails(setDoc(doc(teacher(T2), 'classes/new3'), data(T1)));
  });

  it('giáo viên không xem được lớp của giáo viên khác', async () => {
    await assertSucceeds(getDoc(doc(teacher(T1), 'classes/c1')));
    await assertFails(getDoc(doc(teacher(T2), 'classes/c1')));
    await assertFails(getDoc(doc(student(S1), 'classes/c1')));
  });

  it('chỉ giáo viên chủ lớp thêm được hồ sơ học sinh vào lớp', async () => {
    const p = { classId: 'c1', teacherUid: T1, name: 'Mới', number: 3, station: 'tang-toc', loginKey: 'ABCDEF-03', active: true, createdAt: serverTimestamp() };
    await assertSucceeds(setDoc(doc(teacher(T1), 'studentProfiles/new-s'), p));
    await assertFails(setDoc(doc(teacher(T2), 'studentProfiles/new-s2'), { ...p, teacherUid: T2 }));
    await assertFails(setDoc(doc(student(S1), 'studentProfiles/new-s3'), p));
  });
});

describe('Đăng nhập học sinh', () => {
  it('ai cũng tra được một khoá đăng nhập cụ thể nhưng không liệt kê được cả bảng', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'loginMap/ABCDEF-01')));
    await assertFails(getDocs(collection(anon(), 'loginMap')));
    await assertFails(setDoc(doc(anon(), 'loginMap/ABCDEF-09'), { email: 'x@hs.mathdiff5.app', classId: 'c1', teacherUid: T1 }));
  });

  it('học sinh đọc hồ sơ của mình, không đọc hồ sơ bạn, không tự đổi trạm/lớp', async () => {
    await assertSucceeds(getDoc(doc(student(S1), `studentProfiles/${S1}`)));
    await assertFails(getDoc(doc(student(S1), `studentProfiles/${S2}`)));
    await assertFails(updateDoc(doc(student(S1), `studentProfiles/${S1}`), { station: 'but-pha' }));
    await assertFails(updateDoc(doc(student(S1), `studentProfiles/${S1}`), { classId: 'c2' }));
  });

  it('người đăng nhập không có hồ sơ (tự tạo tài khoản) không đọc được bài giao', async () => {
    await assertFails(getDoc(doc(student(SX), 'assignments/a1')));
  });
});

describe('Bài giao và đáp án', () => {
  it('học sinh liệt kê được bài của lớp mình, không đọc được bài lớp khác', async () => {
    await assertSucceeds(getDocs(query(collection(student(S1), 'assignments'), where('classId', '==', 'c1'))));
    await assertFails(getDoc(doc(student(S1), 'assignments/b1')));
    await assertFails(getDocs(query(collection(student(S1), 'assignments'), where('classId', '==', 'c2'))));
  });

  it('học sinh bị khoá đăng nhập (active = false) không đọc được bài', async () => {
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), `studentProfiles/${S1}`), { active: false }));
    await assertFails(getDoc(doc(student(S1), 'assignments/a1')));
  });

  it('học sinh KHÔNG đọc được đáp án trước khi nộp, đọc được sau khi nộp', async () => {
    const db = student(S1);
    await assertFails(getDoc(doc(db, 'assignments/a1/private/key')));
    await assertSucceeds(setDoc(doc(db, `submissions/a1_${S1}`), submission('a1', S1)));
    await assertSucceeds(getDoc(doc(db, 'assignments/a1/private/key')));
  });

  it('học sinh không sửa được bài giao; giáo viên khác không sửa được', async () => {
    await assertFails(updateDoc(doc(student(S1), 'assignments/a1'), { isOpen: false }));
    await assertFails(updateDoc(doc(teacher(T2), 'assignments/a1'), { isOpen: false }));
    await assertSucceeds(updateDoc(doc(teacher(T1), 'assignments/a1'), { isOpen: false }));
  });
});

describe('Nộp bài', () => {
  it('chỉ nộp được một lần và không sửa được sau khi nộp', async () => {
    const db = student(S1);
    await assertSucceeds(setDoc(doc(db, `submissions/a1_${S1}`), submission('a1', S1)));
    await assertFails(setDoc(doc(db, `submissions/a1_${S1}`), submission('a1', S1, { answers: { q1: '<' } })));
    await assertFails(updateDoc(doc(db, `submissions/a1_${S1}`), { answers: { q1: '<' } }));
    await assertFails(deleteDoc(doc(db, `submissions/a1_${S1}`)));
  });

  it('không nộp được khi hết hạn, khi bài đã khoá, hoặc bài của lớp khác', async () => {
    const db = student(S1);
    await assertFails(setDoc(doc(db, `submissions/a2_${S1}`), submission('a2', S1)));
    await assertFails(setDoc(doc(db, `submissions/a3_${S1}`), submission('a3', S1)));
    await assertFails(setDoc(doc(db, `submissions/b1_${S1}`), submission('b1', S1, { classId: 'c2', teacherUid: T2 })));
  });

  it('không nộp thay bạn, không khai sai trạm/số thứ tự, không tự ghi điểm', async () => {
    const db = student(S1);
    await assertFails(setDoc(doc(db, `submissions/a1_${S2}`), submission('a1', S2)));
    await assertFails(setDoc(doc(db, `submissions/a1_${S1}`), submission('a1', S1, { station: 'but-pha' })));
    await assertFails(setDoc(doc(db, `submissions/a1_${S1}`), submission('a1', S1, { number: 2 })));
    await assertFails(setDoc(doc(db, `submissions/a1_${S1}`), submission('a1', S1, { essayScores: { e1: 10 } })));
  });

  it('học sinh không xem được bài nộp của bạn', async () => {
    await assertSucceeds(setDoc(doc(student(S1), `submissions/a1_${S1}`), submission('a1', S1)));
    await assertFails(getDoc(doc(student(S2), `submissions/a1_${S1}`)));
    await assertFails(getDocs(query(collection(student(S2), 'submissions'), where('assignmentId', '==', 'a1'))));
    await assertSucceeds(getDocs(query(collection(student(S1), 'submissions'), where('studentUid', '==', S1))));
  });

  it('giáo viên chủ bài xem, chấm, cho làm lại; giáo viên khác không được; không sửa câu trả lời của HS', async () => {
    await assertSucceeds(setDoc(doc(student(S1), `submissions/a1_${S1}`), submission('a1', S1)));
    const t1 = teacher(T1);
    await assertSucceeds(getDocs(query(collection(t1, 'submissions'), where('assignmentId', '==', 'a1'), where('teacherUid', '==', T1))));
    await assertSucceeds(updateDoc(doc(t1, `submissions/a1_${S1}`), { essayScores: { e1: 2 }, feedback: 'Tốt', gradedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(t1, `submissions/a1_${S1}`), { answers: { q1: '<' } }));
    await assertFails(getDoc(doc(teacher(T2), `submissions/a1_${S1}`)));
    await assertFails(updateDoc(doc(teacher(T2), `submissions/a1_${S1}`), { feedback: 'x' }));
    await assertSucceeds(deleteDoc(doc(t1, `submissions/a1_${S1}`)));
  });
});

describe('Thư viện bài học trên tài khoản giáo viên', () => {
  const lesson = (uid: string) => ({ ownerUid: uid, lessonId: 'custom-1', title: 'Bài 24: Nhân', json: '{"id":"custom-1"}', updatedAt: Date.now() });

  it('giáo viên lưu, đọc, xoá bài của mình', async () => {
    const db = teacher(T1);
    await assertSucceeds(setDoc(doc(db, `teacherLessons/${T1}__custom-1`), lesson(T1)));
    await assertSucceeds(getDoc(doc(db, `teacherLessons/${T1}__custom-1`)));
    await assertSucceeds(getDocs(query(collection(db, 'teacherLessons'), where('ownerUid', '==', T1))));
    await assertSucceeds(deleteDoc(doc(db, `teacherLessons/${T1}__custom-1`)));
  });

  it('không đọc, không sửa, không ghi đè bài của giáo viên khác; không ghi vào mã của người khác', async () => {
    await assertSucceeds(setDoc(doc(teacher(T1), `teacherLessons/${T1}__custom-1`), lesson(T1)));
    await assertFails(getDoc(doc(teacher(T2), `teacherLessons/${T1}__custom-1`)));
    await assertFails(setDoc(doc(teacher(T2), `teacherLessons/${T1}__custom-1`), lesson(T2)));
    await assertFails(setDoc(doc(teacher(T2), `teacherLessons/${T1}__custom-2`), lesson(T2)));
    await assertFails(getDocs(query(collection(teacher(T2), 'teacherLessons'), where('ownerUid', '==', T1))));
    await assertFails(deleteDoc(doc(teacher(T2), `teacherLessons/${T1}__custom-1`)));
  });

  it('học sinh và người chưa đăng nhập không đọc/ghi được thư viện', async () => {
    await assertSucceeds(setDoc(doc(teacher(T1), `teacherLessons/${T1}__custom-1`), lesson(T1)));
    await assertFails(getDoc(doc(student(S1), `teacherLessons/${T1}__custom-1`)));
    await assertFails(setDoc(doc(student(S1), `teacherLessons/${S1}__x`), lesson(S1)));
    await assertFails(getDoc(doc(anon(), `teacherLessons/${T1}__custom-1`)));
  });

  it('chặn tài liệu quá lớn hoặc có trường lạ', async () => {
    const db = teacher(T1);
    await assertFails(setDoc(doc(db, `teacherLessons/${T1}__big`), { ...lesson(T1), json: 'x'.repeat(900001) }));
    await assertFails(setDoc(doc(db, `teacherLessons/${T1}__extra`), { ...lesson(T1), role: 'admin' }));
  });
});
