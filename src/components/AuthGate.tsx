import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { ADMIN_EMAILS, auth } from '../lib/firebase';
import { AlertTriangle, KeyRound, Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User;
  /** Signed in with one of the admin accounts listed in ADMIN_EMAILS. */
  isAdminLogin: boolean;
  signOutUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthGate');
  return context;
};

/** Shows the sign-in screen until someone is signed in, then renders the app. */
export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // undefined: still checking the saved sign-in, null: signed out
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user === undefined) return <FullScreenLoader message="กำลังตรวจสอบการเข้าสู่ระบบ..." />;
  if (user === null) return <SignInScreen />;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdminLogin: ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? ''),
        signOutUser: () => void signOut(auth),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const FullScreenLoader: React.FC<{ message: string }> = ({ message }) => (
  <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-500">
    <div className="flex items-center gap-2 text-sm">
      <Loader2 className="w-5 h-5 animate-spin text-red-600" />
      {message}
    </div>
  </div>
);

const signInErrorMessage = (error: unknown): string => {
  const code = (error as { code?: string })?.code ?? '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'รหัสผ่านหรืออีเมลไม่ถูกต้อง';
  }
  if (code === 'auth/invalid-email') return 'รูปแบบอีเมลไม่ถูกต้อง';
  if (code === 'auth/too-many-requests') return 'ลองผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่';
  if (code === 'auth/network-request-failed') return 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ กรุณาลองใหม่';
  return 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่';
};

const SignInScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(signInErrorMessage(err));
      setBusy(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-sm text-slate-800 focus:outline-hidden focus:border-red-500';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="text-center text-3xl font-black tracking-tight text-red-700">e-Service</p>
        <p className="text-center text-xs text-slate-500 mt-1">ระบบเดินเอกสารภายในองค์กร</p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4"
        >
          <div>
            <label htmlFor="signin-email" className="block text-xs font-semibold text-slate-700 mb-1">
              อีเมล
            </label>
            <input
              id="signin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="signin-password" className="block text-xs font-semibold text-slate-700 mb-1">
              รหัสผ่าน
            </label>
            <input
              id="signin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && (
            <p role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            เข้าสู่ระบบ
          </button>

          <p className="text-[11px] text-slate-400 text-center">
            ขอบัญชีเข้าใช้งานได้จากฝ่าย Information Technology — เข้าครั้งเดียวต่อเครื่อง
          </p>
        </form>
      </div>
    </div>
  );
};