import { Bytes, doc, getDoc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { KbAttachment } from '../types';

// Knowledge Base attachments are stored in Firestore itself (no Cloud Storage bucket is
// needed). A Firestore document holds at most 1 MiB, so each file is split into chunks
// saved as kbFiles/{fileId}_{index}.
const COLLECTION = 'kbFiles';
const CHUNK_BYTES = 900 * 1024;

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES_PER_ARTICLE = 5;

const chunkId = (fileId: string, index: number) => `${fileId}_${index}`;

export const formatFileSize = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Marker for the one-time job that names each saved file's article (see linkKbFilesToArticles). */
export const KB_FILES_ARTICLE_MARKER = 'kb-files-linked-to-articles';

/**
 * Save a file's bytes and return what the article keeps about it. Each chunk names its
 * article, so the Firestore rules can let only the article's readers download it.
 */
export const uploadKbFile = async (file: File, createdBy: string, articleId: string): Promise<KbAttachment> => {
  const id = `kbf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const data = new Uint8Array(await file.arrayBuffer());
  const chunks = Math.max(1, Math.ceil(data.length / CHUNK_BYTES));
  const batch = writeBatch(db);
  for (let i = 0; i < chunks; i++) {
    batch.set(doc(db, COLLECTION, chunkId(id, i)), {
      fileId: id,
      index: i,
      createdBy,
      articleId,
      data: Bytes.fromUint8Array(data.subarray(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES)),
    });
  }
  await batch.commit();
  return { id, name: file.name, size: file.size, type: file.type || 'application/octet-stream', chunks };
};

/** Read a file back and hand it to the browser to open or save. */
export const downloadKbFile = async (attachment: KbAttachment): Promise<void> => {
  const parts = await Promise.all(
    Array.from({ length: attachment.chunks }, (_, i) => getDoc(doc(db, COLLECTION, chunkId(attachment.id, i))))
  );
  const blob = new Blob(
    parts.map(snap => {
      if (!snap.exists()) throw new Error('missing chunk');
      return (snap.get('data') as Bytes).toUint8Array() as Uint8Array<ArrayBuffer>;
    }),
    { type: attachment.type }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = attachment.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

/** Remove files' bytes (when an attachment or its whole article is deleted). */
export const deleteKbFiles = async (attachments: KbAttachment[]): Promise<void> => {
  if (attachments.length === 0) return;
  const batch = writeBatch(db);
  attachments.forEach(a => {
    for (let i = 0; i < a.chunks; i++) batch.delete(doc(db, COLLECTION, chunkId(a.id, i)));
  });
  await batch.commit();
};

/**
 * Files saved before chunks named their article get its id (admins only). Recorded as done
 * only once every chunk is updated, so a run refused by older Firestore rules is retried.
 */
export const linkKbFilesToArticlesOnce = async (
  articles: { id: string; attachments?: KbAttachment[] }[]
): Promise<void> => {
  const marker = doc(db, 'meta', KB_FILES_ARTICLE_MARKER);
  if ((await getDoc(marker)).exists()) return;
  await linkKbFilesToArticles(articles);
  await setDoc(marker, { doneAt: serverTimestamp() });
};

const linkKbFilesToArticles = async (
  articles: { id: string; attachments?: KbAttachment[] }[]
): Promise<void> => {
  const ids = articles.flatMap(article =>
    (article.attachments ?? []).flatMap(a =>
      Array.from({ length: a.chunks }, (_, i) => ({ chunk: chunkId(a.id, i), articleId: article.id }))
    )
  );
  // A batch holds at most 500 writes
  for (let start = 0; start < ids.length; start += 400) {
    const batch = writeBatch(db);
    ids.slice(start, start + 400).forEach(({ chunk, articleId }) =>
      batch.set(doc(db, COLLECTION, chunk), { articleId }, { merge: true })
    );
    await batch.commit();
  }
};
