import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ActionEmailNotification, DocumentRequest, MenuItemPermission } from '../types';
import { requestNumbering } from './forms';

// Requests made before a form got its fixed number (MEMO-, ITR-, JRF-, TICKET-, 5 digits; see
// requestNumbering) are given numbers in the new format once, by an admin's sign-in. Each form's
// requests are numbered in the order they were made, per year, after any request that already
// has a new-format number. The number is also copied into the request's notifications and, on a
// JRF, its Client's Reference Number, so those are changed too.

export const RENUMBER_MARKER = 'renumber-requests-2026-11';

export interface Renumbering {
  id: string;
  from: string;
  to: string;
}

const CODE = /^([A-Za-z][A-Za-z0-9]*)-(\d{4})-(\d+)$/;

/** dd.mm.yyyy hh:mm as yyyymmddhhmm, so requests sort in the order they were made. */
const madeAt = (createdAt: string) => {
  const m = createdAt.match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/);
  return m ? `${m[3]}${m[2]}${m[1]}${m[4]}${m[5]}` : createdAt;
};

/** Which requests get a new number, and what it is. Requests without a form are left alone. */
export const planRenumbering = (
  requests: Pick<DocumentRequest, 'id' | 'code' | 'createdAt' | 'formId'>[],
  forms: Pick<MenuItemPermission, 'id' | 'template' | 'docPrefix'>[]
): Renumbering[] => {
  const formById = new Map(forms.map(f => [f.id, f]));
  const groups = new Map<string, { used: number; digits: number; prefix: string; year: string; todo: typeof requests }>();

  requests.forEach(request => {
    const form = request.formId ? formById.get(request.formId) : undefined;
    if (!form) return;
    const { prefix, digits } = requestNumbering(form);
    if (!prefix) return;
    const year = request.code.match(CODE)?.[2] ?? request.createdAt.match(/\d{4}/)?.[0];
    if (!year) return;
    const key = `${prefix}-${year}`;
    const group = groups.get(key) ?? { used: 0, digits, prefix, year, todo: [] };
    groups.set(key, group);
    const current = request.code.match(CODE);
    const alreadyNew = current && current[1] === prefix && current[2] === year && current[3].length === digits;
    if (alreadyNew) group.used = Math.max(group.used, Number(current[3]));
    else group.todo.push(request);
  });

  const plan: Renumbering[] = [];
  groups.forEach(group => {
    group.todo
      .sort((a, b) => madeAt(a.createdAt).localeCompare(madeAt(b.createdAt)) || a.code.localeCompare(b.code))
      .forEach(request => {
        group.used += 1;
        plan.push({
          id: request.id,
          from: request.code,
          to: `${group.prefix}-${group.year}-${String(group.used).padStart(group.digits, '0')}`,
        });
      });
  });
  return plan;
};

/** Gives old requests their new-format numbers, once per project. Returns what was changed. */
export const renumberRequestsOnce = async (
  requests: DocumentRequest[],
  notifications: ActionEmailNotification[],
  forms: MenuItemPermission[]
): Promise<Renumbering[]> => {
  const marker = doc(db, 'meta', RENUMBER_MARKER);
  if ((await getDoc(marker)).exists()) return [];

  const plan = planRenumbering(requests, forms);
  const byId = new Map(plan.map(p => [p.id, p]));
  const batch = writeBatch(db);
  plan.forEach(change => {
    const request = requests.find(r => r.id === change.id);
    batch.update(doc(db, 'requests', change.id), {
      code: change.to,
      ...(request?.poRequest?.refNo === change.from ? { 'poRequest.refNo': change.to } : {}),
    });
  });
  notifications.forEach(n => {
    const change = byId.get(n.requestId);
    if (change && n.requestCode !== change.to) {
      batch.update(doc(db, 'notifications', n.id), { requestCode: change.to });
    }
  });
  // Written with the changes, so a failed run is tried again on the next admin sign-in
  batch.set(marker, { doneAt: serverTimestamp(), changes: plan });
  await batch.commit();
  return plan;
};
