import type { ActionDefinition, HookContext } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import type { FubList } from "./client.ts";

/** 50 pages of 100 = the snapshot kit's 5000-row cap. */
const MAX_PAGES = 50;
const PER_PAGE = 100;

/** The `records` of a list action's flattened `{ records, metadata }` result. */
export const records = (r: unknown): unknown[] => (r as FubList)?.records ?? [];

/** A record's `id` as a string key. */
export const idOf = (v: unknown): string => String((v as { id?: unknown }).id ?? "");

/**
 * Reads a whole (small, bounded) collection through the app's OWN list action, following the
 * keyset cursor `metadata.next` (the paging Follow Up Boss recommends over `offset`).
 */
export async function readAllPages(
  action: unknown,
  input: Record<string, unknown>,
  ctx: HookContext,
): Promise<unknown[]> {
  const all: unknown[] = [];
  let next: string | undefined;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await (action as ActionDefinition).execute(
      { ...input, limit: PER_PAGE, ...(next ? { next } : {}) },
      ctx,
    ) as FubList;
    all.push(...records(res));
    const cursor = res?.metadata?.next;
    if (typeof cursor !== "string" || cursor === "") return all;
    next = cursor;
  }
  throw new Error(`Follow Up Boss list is longer than ${MAX_PAGES} pages; refusing to snapshot it`);
}

/** "New <record>" over a bounded collection: diff the ids against the previous check (added only). */
export async function newRecords(o: {
  state: unknown;
  items: unknown[];
}): Promise<{ events: unknown[]; nextState: unknown }> {
  const byId = new Map<string, unknown>();
  for (const item of o.items) {
    const id = idOf(item);
    if (id === "") throw new Error("Follow Up Boss list returned a record without an id");
    byId.set(id, item);
  }
  const { events, nextState } = await pollSnapshot({
    state: o.state,
    rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => byId.get(e.key)), nextState };
}
