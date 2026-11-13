/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'development', 'uat' or 'production'; anything but production shows a badge. */
  readonly VITE_APP_ENV: string;
  /** 'true' to fill an empty project with sample employees and requests. */
  readonly VITE_SEED_SAMPLE_DATA: string;
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  /** Comma-separated admin sign-in emails. */
  readonly VITE_ADMIN_EMAILS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
