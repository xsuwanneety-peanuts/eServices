import React, { useEffect, useState } from 'react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { MIN_PASSWORD_LENGTH } from '../utils/loginAccounts';
import companyLogo from '../assets/company-logo.png';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';

// Firebase's password email links here when the project's action URL points at the app:
// <app url>?mode=resetPassword&oobCode=...  The page replaces Firebase's own plain reset page.

/** The code from a password reset link in the current address, if there is one. */
export const passwordResetCodeFromUrl = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get('mode') === 'resetPassword' ? params.get('oobCode') : null;
};

/** Takes the reset link's details out of the address, so a reload shows the normal app. */
const clearResetLink = () => window.history.replaceState(null, '', window.location.pathname);

const resetErrorMessage = (error: unknown): string => {
  const code = (error as { code?: string })?.code ?? '';
  if (code === 'auth/expired-action-code') return 'ลิงก์นี้หมดอายุแล้ว กรุณาขอลิงก์ใหม่';
  if (code === 'auth/invalid-action-code') return 'ลิงก์นี้ใช้ไปแล้วหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่';
  if (code === 'auth/user-disabled') return 'บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อฝ่าย Information Technology';
  if (code === 'auth/user-not-found') return 'ไม่พบบัญชีนี้ในระบบ กรุณาติดต่อฝ่าย Information Technology';
  if (code === 'auth/weak-password') return `รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`;
  if (code === 'auth/network-request-failed') return 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ กรุณาลองใหม่';
  return 'ตั้งรหัสผ่านไม่สำเร็จ กรุณาลองใหม่';
};

type Stage =
  | { kind: 'checking' }
  | { kind: 'form'; email: string }
  | { kind: 'done'; email: string }
  | { kind: 'broken'; message: string };

export const ResetPasswordScreen: React.FC<{ code: string; onFinish: (requestNewLink: boolean) => void }> = ({
  code,
  onFinish,
}) => {
  const [stage, setStage] = useState<Stage>({ kind: 'checking' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Check the link first: it tells us whose password this is, or that the link no longer works
  useEffect(() => {
    let active = true;
    verifyPasswordResetCode(auth, code)
      .then(email => active && setStage({ kind: 'form', email }))
      .catch(err => active && setStage({ kind: 'broken', message: resetErrorMessage(err) }));
    return () => {
      active = false;
    };
  }, [code]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (stage.kind !== 'form') return;
    setError('');
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`);
      return;
    }
    if (password !== confirm) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      return;
    }
    setBusy(true);
    try {
      await confirmPasswordReset(auth, code, password);
      setStage({ kind: 'done', email: stage.email });
    } catch (err) {
      const message = resetErrorMessage(err);
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
        setStage({ kind: 'broken', message });
      } else {
        setError(message);
      }
    }
    setBusy(false);
  };

  const finish = (requestNewLink: boolean) => {
    clearResetLink();
    onFinish(requestNewLink);
  };

  const inputClass =
    'w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-sm text-slate-800 focus:outline-hidden focus:border-red-500';
  const primaryButton =
    'w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold shadow-xs transition-colors cursor-pointer';
  const longEnough = password.length >= MIN_PASSWORD_LENGTH;
  const matches = confirm.length > 0 && password === confirm;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center">
          <img src={companyLogo} alt="" className="w-14 h-14 object-contain" />
          <p className="mt-2 text-center text-3xl font-black tracking-tight text-red-700">JMI E-Service</p>
          <p className="text-center text-xs text-slate-500 mt-1">ระบบเอกสารภายในองค์กร</p>
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          {stage.kind === 'checking' && (
            <p className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin text-red-600" />
              กำลังตรวจสอบลิงก์...
            </p>
          )}

          {stage.kind === 'broken' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center gap-2 py-2">
                <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <p className="text-sm font-bold text-slate-900">ใช้ลิงก์นี้ไม่ได้</p>
                <p className="text-xs text-slate-500">{stage.message}</p>
              </div>
              <button type="button" onClick={() => finish(true)} className={primaryButton}>
                ขอลิงก์ใหม่
              </button>
              <button
                type="button"
                onClick={() => finish(false)}
                className="w-full text-xs font-semibold text-slate-600 hover:text-red-700 cursor-pointer"
              >
                กลับไปหน้าเข้าสู่ระบบ
              </button>
            </div>
          )}

          {stage.kind === 'done' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center gap-2 py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm font-bold text-slate-900">ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว</p>
                <p className="text-xs text-slate-500">
                  เข้าสู่ระบบด้วย <strong className="text-slate-700">{stage.email}</strong> และรหัสผ่านใหม่ได้เลย
                </p>
              </div>
              <button type="button" onClick={() => finish(false)} className={primaryButton}>
                <KeyRound className="w-4 h-4" />
                ไปหน้าเข้าสู่ระบบ
              </button>
            </div>
          )}

          {stage.kind === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-900">ตั้งรหัสผ่านใหม่</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  สำหรับบัญชี <strong className="text-slate-700 break-all">{stage.email}</strong>
                </p>
              </div>

              <div>
                <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสผ่านใหม่
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={`${inputClass} pr-10`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-700 mb-1">
                  ยืนยันรหัสผ่านใหม่
                </label>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className={inputClass}
                />
              </div>

              <ul className="text-[11px] space-y-0.5">
                <li className={longEnough ? 'text-emerald-700' : 'text-slate-400'}>
                  {longEnough ? '✓' : '•'} อย่างน้อย {MIN_PASSWORD_LENGTH} ตัวอักษร
                </li>
                <li className={matches ? 'text-emerald-700' : 'text-slate-400'}>
                  {matches ? '✓' : '•'} รหัสผ่านทั้งสองช่องตรงกัน
                </li>
              </ul>

              {error && (
                <p role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </p>
              )}

              <button type="submit" disabled={busy} className={primaryButton}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                บันทึกรหัสผ่านใหม่
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
