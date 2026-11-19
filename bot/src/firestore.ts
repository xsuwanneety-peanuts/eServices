import type { KnowledgeArticle } from '../../src/types';
import type { Env } from './env';

// Reads Knowledge Base articles from Firestore over its REST API, signed in as the bot's own
// Firebase account. The Firestore rules therefore still apply: the bot sees what any signed-in
// employee sees for articles open to everyone.

interface Session {
  idToken: string;
  expiresAt: number;
}

let session: Session | undefined;
let cachedArticles: { at: number; articles: KnowledgeArticle[] } | undefined;
/** Articles change rarely; reading them once every few minutes keeps answers fast. */
const ARTICLES_TTL_MS = 5 * 60 * 1000;

const signIn = async (env: Env, signal?: AbortSignal): Promise<string> => {
  if (session && session.expiresAt > Date.now() + 60_000) return session.idToken;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: env.BOT_EMAIL, password: env.BOT_PASSWORD, returnSecureToken: true }),
      signal,
    }
  );
  if (!res.ok) {
    // Firebase names the reason, e.g. INVALID_LOGIN_CREDENTIALS or USER_DISABLED (no secrets in it)
    const reason = ((await res.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message;
    throw new Error(`Bot sign-in failed (${res.status} ${reason ?? 'unknown'}) for ${env.BOT_EMAIL}`);
  }
  const data = (await res.json()) as { idToken: string; expiresIn: string };
  session = { idToken: data.idToken, expiresAt: Date.now() + Number(data.expiresIn) * 1000 };
  return session.idToken;
};

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  timestampValue?: string;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

/** Firestore's typed JSON (stringValue, mapValue, ...) as plain values. */
const plain = (value: FirestoreValue): unknown => {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue?.values ?? []).map(plain);
  if ('mapValue' in value) return plainFields(value.mapValue?.fields ?? {});
  return null;
};
const plainFields = (fields: Record<string, FirestoreValue>) =>
  Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, plain(value)]));

/** Employee-written articles open to every department (visibility 'all'). */
export const readOpenArticles = async (env: Env, signal?: AbortSignal): Promise<KnowledgeArticle[]> => {
  if (cachedArticles && Date.now() - cachedArticles.at < ARTICLES_TTL_MS) return cachedArticles.articles;
  const started = Date.now();
  const idToken = await signIn(env, signal);
  console.log(`step signed in after ${Date.now() - started}ms`);
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'kbArticles' }],
          where: {
            fieldFilter: { field: { fieldPath: 'visibility' }, op: 'EQUAL', value: { stringValue: 'all' } },
          },
        },
      }),
      signal,
    }
  );
  if (!res.ok) throw new Error(`Reading articles failed (${res.status})`);
  const rows = (await res.json()) as { document?: { name: string; fields?: Record<string, FirestoreValue> } }[];
  const articles = rows
    .filter(row => row.document)
    .map(row => {
      const data = plainFields(row.document!.fields ?? {}) as Partial<KnowledgeArticle>;
      return {
        ...data,
        id: row.document!.name.split('/').pop()!,
        title: data.title ?? '',
        summary: data.summary ?? '',
        sections: data.sections ?? [],
        tags: data.tags ?? [],
      } as KnowledgeArticle;
    });
  cachedArticles = { at: Date.now(), articles };
  return articles;
};
