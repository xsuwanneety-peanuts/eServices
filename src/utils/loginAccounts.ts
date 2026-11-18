import { deleteApp, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth, firebaseApp } from '../lib/firebase';

// Sign-in accounts for employees, made from the Employee Directory so an admin adds a person
// in one place. Firebase signs in whoever creates an account, so accounts are created through
// a second, short-lived copy of the app: the admin stays signed in as themselves.

/** How a new employee gets their password. */
export type AccountSetup = 'reset_link' | 'set_password' | 'none';

export const MIN_PASSWORD_LENGTH = 6;

/** Password reset emails are written in Thai. */
auth.languageCode = 'th';

/** A long random password nobody knows; the employee replaces it from the reset link. */
const randomPassword = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('') + 'Aa1!';
};

export type AccountResult =
  | { ok: true; created: boolean; linkSent: boolean }
  | { ok: false; message: string };

const errorMessage = (error: unknown, fallback = 'สร้างบัญชีเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่'): string => {
  const code = (error as { code?: string })?.code ?? '';
  if (code === 'auth/invalid-email') return 'รูปแบบอีเมลไม่ถูกต้อง';
  if (code === 'auth/weak-password') return `รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`;
  if (code === 'auth/operation-not-allowed') {
    return 'โปรเจกต์ Firebase นี้ยังไม่ได้เปิดการเข้าสู่ระบบด้วยอีเมล/รหัสผ่าน';
  }
  if (code === 'auth/network-request-failed') return 'เชื่อมต่ออินเทอร์เน็ตไม่ได้ กรุณาลองใหม่';
  if (code === 'auth/too-many-requests') return 'ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';
  return fallback;
};

/**
 * Firebase's own page sets the new password (the project's action URL can't be changed in the
 * console yet); afterwards it shows a "Continue" button back to this app.
 */
const appLinkSettings = () => ({
  url: `${window.location.origin}${import.meta.env.BASE_URL}`,
  handleCodeInApp: false,
});

/** Sends the "set your password" email to an existing account. */
export const sendPasswordLink = async (email: string): Promise<AccountResult> => {
  try {
    try {
      await sendPasswordResetEmail(auth, email, appLinkSettings());
    } catch (error) {
      // The app's address isn't in the project's authorized domains yet: send Firebase's plain link
      const code = (error as { code?: string })?.code ?? '';
      if (code !== 'auth/unauthorized-continue-uri' && code !== 'auth/invalid-continue-uri') throw error;
      await sendPasswordResetEmail(auth, email);
    }
    return { ok: true, created: false, linkSent: true };
  } catch (error) {
    return { ok: false, message: errorMessage(error, 'ส่งลิงก์ตั้งรหัสผ่านไม่สำเร็จ กรุณาลองใหม่') };
  }
};

/**
 * Creates the sign-in account for `email`. With a password the admin chose, that is the
 * password; otherwise a random one is set and a link to choose their own goes to the email.
 * An account that already exists is left as it is (a link is still sent when asked for).
 */
export const createLoginAccount = async (email: string, password?: string): Promise<AccountResult> => {
  const helper = initializeApp(firebaseApp.options, `account-maker-${Date.now()}`);
  const helperAuth = getAuth(helper);
  try {
    await createUserWithEmailAndPassword(helperAuth, email, password || randomPassword());
    await signOut(helperAuth);
    if (password) return { ok: true, created: true, linkSent: false };
    const sent = await sendPasswordLink(email);
    return sent.ok ? { ok: true, created: true, linkSent: true } : sent;
  } catch (error) {
    if ((error as { code?: string })?.code === 'auth/email-already-in-use') {
      if (password) return { ok: true, created: false, linkSent: false };
      const sent = await sendPasswordLink(email);
      return sent.ok ? { ok: true, created: false, linkSent: true } : sent;
    }
    return { ok: false, message: errorMessage(error) };
  } finally {
    await deleteApp(helper).catch(() => undefined);
  }
};
