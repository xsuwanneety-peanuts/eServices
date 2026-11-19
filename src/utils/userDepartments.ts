import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DepartmentId, UserPersona } from '../types';

// Firestore rules cannot search the Employee Directory by email, so each employee's department
// is copied to userDepartments/{sign-in email}. The rules read the signed-in person's own copy
// to decide which department-only Knowledge Base articles they may read.
//
// Only admins change employees, so an admin's app keeps the copy in step with the directory.
const COLLECTION = 'userDepartments';

interface UserDepartment {
  departmentId: DepartmentId;
  disabled: boolean;
}

const same = (a: UserDepartment, b: Record<string, unknown>) =>
  a.departmentId === b.departmentId && a.disabled === (b.disabled === true);

/** Brings userDepartments in line with the directory: adds, changes and removes copies. */
export const syncUserDepartments = async (employees: UserPersona[]): Promise<number> => {
  const wanted = new Map<string, UserDepartment>();
  employees.forEach(e => {
    const email = e.email.trim().toLowerCase();
    if (email) wanted.set(email, { departmentId: e.departmentId, disabled: !!e.disabled });
  });

  const saved = await getDocs(collection(db, COLLECTION));
  const batch = writeBatch(db);
  let changes = 0;
  saved.docs.forEach(snap => {
    const want = wanted.get(snap.id);
    if (!want) {
      batch.delete(snap.ref);
      changes++;
    } else if (!same(want, snap.data())) {
      batch.set(snap.ref, want);
      changes++;
    }
    wanted.delete(snap.id);
  });
  wanted.forEach((value, email) => {
    batch.set(doc(db, COLLECTION, email), value);
    changes++;
  });
  if (changes > 0) await batch.commit();
  return changes;
};
