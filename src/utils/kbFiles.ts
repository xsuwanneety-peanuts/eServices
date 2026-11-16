import { Bytes, doc, getDoc, writeBatch } from 'firebase/firestore';
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

/** Save a file's bytes and return what the article keeps about it. */
export const uploadKbFile = async (file: File, createdBy: string): Promise<KbAttachment> => {
  const id = `kbf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const data = new Uint8Array(await file.arrayBuffer());
  const chunks = Math.max(1, Math.ceil(data.length / CHUNK_BYTES));
  const batch = writeBatch(db);
  for (let i = 0; i < chunks; i++) {
    batch.set(doc(db, COLLECTION, chunkId(id, i)), {
      fileId: id,
      index: i,
      createdBy,
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
