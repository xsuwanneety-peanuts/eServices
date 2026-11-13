import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// Web app config from the Firebase console. These values identify the project; they are not
// secrets. Access to the data is controlled by Authentication and firestore.rules.
const firebaseConfig = {
  apiKey: 'AIzaSyCysbc_XjmF3SJss64puCE-zERLtnK4QpU',
  authDomain: 'e-service-mockup.firebaseapp.com',
  projectId: 'e-service-mockup',
  storageBucket: 'e-service-mockup.firebasestorage.app',
  messagingSenderId: '902153382803',
  appId: '1:902153382803:web:c9fa3465d39e81e7c0d666',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
// Optional fields are left undefined throughout the app; Firestore would reject them otherwise
export const db = initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true });

/**
 * Accounts that may open system settings (Employee Directory, access permissions, approval
 * flows). Keep this list in sync with isAdmin() in firestore.rules, which is what actually
 * enforces it; every other signed-in account can only submit and approve requests.
 */
export const ADMIN_EMAILS = ['it_1@jmi.local'];
