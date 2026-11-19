import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  QueryConstraint,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

type WithId = { id: string };

/** Read only the documents matching any of these queries (one listener each), merged by id. */
export interface CollectionScope {
  /** Changes whenever the queries do, so the listeners are set up again. */
  key: string;
  queries: QueryConstraint[][];
}
type Updater<T> = T[] | ((prev: T[]) => T[]);

/** JSON with sorted keys, so items read back from Firestore compare equal to local ones. */
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter(key => record[key] !== undefined)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};

/**
 * A Firestore collection shared by every device, used like useState over an array of items.
 * Each item is its own document (id = item.id), so two people changing different items never
 * overwrite each other. The setter writes only the items that actually changed.
 *
 * `_order` is stored with each document to keep list order: items added at the front of the
 * array (e.g. a new request) sort first, items added elsewhere sort last.
 */
export const useFirestoreCollection = <T extends WithId>(
  name: string,
  onWriteError: (error: unknown) => void,
  scope?: CollectionScope
) => {
  const [items, setItemsState] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);
  const itemsRef = useRef<T[]>([]);
  const orderRef = useRef(new Map<string, number>());
  const onErrorRef = useRef(onWriteError);
  onErrorRef.current = onWriteError;

  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const scopeKey = scope?.key ?? '*';

  useEffect(() => {
    const queries = scopeRef.current?.queries ?? [[]];
    // Each listener's latest rows; the list is all of them together, without duplicates
    const parts: (Map<string, { item: T; order: number }> | undefined)[] = queries.map(() => undefined);
    const publish = () => {
      if (parts.some(p => p === undefined)) return;
      const merged = new Map<string, { item: T; order: number }>();
      parts.forEach(p => p!.forEach((row, id) => merged.set(id, row)));
      const rows = [...merged.values()].sort((a, b) => a.order - b.order);
      orderRef.current = new Map(rows.map(r => [r.item.id, r.order]));
      itemsRef.current = rows.map(r => r.item);
      setItemsState(itemsRef.current);
      setLoaded(true);
    };
    const unsubscribes = queries.map((constraints, index) =>
      onSnapshot(
        constraints.length ? query(collection(db, name), ...constraints) : collection(db, name),
        snapshot => {
          parts[index] = new Map(
            snapshot.docs.map(d => {
              const { _order, ...data } = d.data() as Record<string, unknown>;
              return [d.id, { item: { ...data, id: d.id } as T, order: typeof _order === 'number' ? _order : 0 }];
            })
          );
          publish();
        },
        error => {
          onErrorRef.current(error);
          // Show what the other listeners found rather than waiting forever
          parts[index] = parts[index] ?? new Map();
          publish();
          setLoaded(true);
        }
      )
    );
    return () => unsubscribes.forEach(stop => stop());
  }, [name, scopeKey]);

  const setItems = useCallback(
    (updater: Updater<T>) => {
      const prev = itemsRef.current;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === prev) return;

      const prevById = new Map(prev.map(item => [item.id, item]));
      const nextIds = new Set(next.map(item => item.id));
      const orders = orderRef.current;
      const known = [...orders.values()];
      let minOrder = known.length ? Math.min(...known) : 0;
      let maxOrder = known.length ? Math.max(...known) : 0;

      next.forEach((item, index) => {
        const before = prevById.get(item.id);
        if (before && stableStringify(before) === stableStringify(item)) return;
        let order = orders.get(item.id);
        if (order === undefined) {
          order = index === 0 && next.length > 1 ? --minOrder : ++maxOrder;
          orders.set(item.id, order);
        }
        setDoc(doc(db, name, item.id), { ...item, _order: order }).catch(error => onErrorRef.current(error));
      });
      prev.forEach(item => {
        if (nextIds.has(item.id)) return;
        orders.delete(item.id);
        deleteDoc(doc(db, name, item.id)).catch(error => onErrorRef.current(error));
      });

      // Show the change right away; the snapshot listener confirms (or reverts) it
      itemsRef.current = next;
      setItemsState(next);
    },
    [name]
  );

  return [items, setItems, loaded] as const;
};

/**
 * True the first time it is called for a marker in a project, false ever after: for a
 * one-time change to data that is already there.
 */
export const markOnce = async (markerId: string): Promise<boolean> => {
  const marker = doc(db, 'meta', markerId);
  if ((await getDoc(marker)).exists()) return false;
  await setDoc(marker, { doneAt: serverTimestamp() });
  return true;
};

/**
 * Fill an empty project with starting data, once. A marker document records that seeding
 * happened, so deleting items later never brings the samples back.
 *
 * Data added to existing projects later (e.g. a new built-in form) uses its own `markerId`,
 * and a `startOrder` that lists it after what is already there.
 */
export const seedCollectionsOnce = async (
  seeds: Record<string, WithId[]>,
  markerId = 'seed',
  startOrder = 0
): Promise<boolean> => {
  const marker = doc(db, 'meta', markerId);
  if ((await getDoc(marker)).exists()) return false;
  const batch = writeBatch(db);
  Object.entries(seeds).forEach(([name, items]) =>
    items.forEach((item, index) => batch.set(doc(db, name, item.id), { ...item, _order: startOrder + index }))
  );
  batch.set(marker, { seededAt: serverTimestamp() });
  await batch.commit();
  return true;
};
