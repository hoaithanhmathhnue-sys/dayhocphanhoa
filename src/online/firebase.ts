// Khởi tạo Firebase từ biến môi trường Vercel (VITE_FIREBASE_*). Cấu hình web của Firebase là công khai;
// bảo mật dữ liệu nằm ở firestore.rules, không nằm ở việc giấu các giá trị này.
import { getApp, getApps, initializeApp, deleteApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

const env = import.meta.env;

export const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
};

export const isFirebaseConfigured = (): boolean =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);

// Chỉ dùng khi chạy thử trên máy với Firebase Emulator (VITE_USE_EMULATORS=1); bản thật không bật.
const useEmulators = env.VITE_USE_EMULATORS === '1';

let app: FirebaseApp | null = null;
let cache: { app: FirebaseApp; auth: Auth; db: Firestore } | null = null;

export function fb(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  if (!isFirebaseConfigured()) throw new Error('FIREBASE_NOT_CONFIGURED');
  if (cache) return cache;
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  cache = { app, auth, db };
  return cache;
}

/**
 * Tạo tài khoản HS bằng một "app phụ" để phiên đăng nhập Google của giáo viên không bị thay thế.
 * Trả về uid tài khoản mới.
 */
export async function createStudentAccount(email: string, pin: string): Promise<string> {
  const { createUserWithEmailAndPassword, signOut, getAuth: getAuthFor } = await import('firebase/auth');
  const secondary = initializeApp(firebaseConfig, `creator-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  try {
    const a = getAuthFor(secondary);
    if (useEmulators) connectAuthEmulator(a, 'http://127.0.0.1:9099', { disableWarnings: true });
    const cred = await createUserWithEmailAndPassword(a, email, pin);
    const uid = cred.user.uid;
    await signOut(a);
    return uid;
  } finally {
    await deleteApp(secondary);
  }
}
