"use client";
// React access to the outbox: the live list, and the entries for one screen.
import { useMemo, useSyncExternalStore } from "react";
import { getOutbox, subscribeOutbox, type OutboxItem, type OutboxKind } from "./outbox";

const serverSnapshot = (): OutboxItem[] => [];

/** Every waiting or refused entry; re-renders when it changes. */
export function useOutbox(): OutboxItem[] {
  return useSyncExternalStore(subscribeOutbox, getOutbox, serverSnapshot);
}

/** Waiting entries of some kinds, optionally only one day's or one workout's. */
export function usePending(kinds: OutboxKind[], filter: { day?: string; workoutId?: number } = {}): OutboxItem[] {
  const items = useOutbox();
  const key = kinds.join(",");
  return useMemo(
    () =>
      items.filter(
        (i) =>
          key.split(",").includes(i.kind) &&
          (filter.day === undefined || i.day === filter.day) &&
          (filter.workoutId === undefined || i.workoutId === filter.workoutId),
      ),
    [items, key, filter.day, filter.workoutId],
  );
}
