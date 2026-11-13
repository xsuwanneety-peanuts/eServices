import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// Which Firebase project the app talks to depends on how it was started:
//   npm run dev   -> .env.development (development project)
//   npm run build -> .env.production  (production project, the live site)
// These values identify the project; they are not secrets. Access to the data is
// controlled by Authentication and the firestore.rules published to each project.
const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);
if (missing.length > 0) {
  throw new Error(`Firebase config is missing ${missing.join(', ')} — check .env.${env.MODE}`);
}

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
// Optional fields are left undefined throughout the app; Firestore would reject them otherwise
export const db = initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true });

/** 'development', 'uat' or 'production'. Anything but production shows an environment badge. */
export const APP_ENV = env.VITE_APP_ENV || 'development';
export const IS_PRODUCTION = APP_ENV === 'production';
/** Short badge text, e.g. DEV or UAT. */
export const ENV_BADGE = APP_ENV === 'development' ? 'DEV' : APP_ENV.toUpperCase();
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;

/** Whether an empty project is filled with sample employees and requests (development only). */
export const SEED_SAMPLE_DATA = env.VITE_SEED_SAMPLE_DATA === 'true';

/**
 * Accounts that may open system settings (Employee Directory, access permissions, approval
 * flows). Keep this list in sync with isAdmin() in the firestore.rules of the same project,
 * which is what actually enforces it; every other signed-in account can only submit and
 * approve requests.
 */
export const ADMIN_EMAILS = (env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);
