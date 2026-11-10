import type { ActionDefinition, HookContext } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** 50 pages of 100 = the snapshot kit's 5000-row cap. */
const MAX_PAGES = 50;

interface Listing {
  data?: unknown[];
  paging?: { next?: string; cursors?: { after?: string } };
}

/**
 * Reads a whole edge through the app's OWN list action, following Graph's cursor paging
 * (`paging.cursors.after` while `paging.next` is present — the documented stop signal,
 * https://developers.facebook.com/docs/graph-api/results, 2026-11-10) with `limit` 100.
 */
export async function readAllPages(
  action: ActionDefinition,
  ctx: HookContext,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  for (let n = 0; n < MAX_PAGES; n++) {
    const res = await action.execute(
      { ...input, limit: 100, ...(cursor ? { cursor } : {}) },
      ctx,
    ) as Listing;
    for (const row of Array.isArray(res?.data) ? res.data : []) {
      all.push(row as Record<string, unknown>);
    }
    const after = res?.paging?.cursors?.after;
    if (!res?.paging?.next || typeof after !== "string" || after === "" || after === cursor) {
      return all;
    }
    cursor = after;
  }
  throw new Error(`Facebook list is longer than ${MAX_PAGES} pages; refusing to snapshot it`);
}

/** "New <record>" over a bounded collection: diff the ids against the previous check (added only). */
export async function newRecords(o: {
  state: unknown;
  items: Record<string, unknown>[];
  /** Maps a row to what the run gets (drop secrets here). */
  shape?: (row: Record<string, unknown>) => unknown;
}): Promise<{ events: unknown[]; nextState: unknown }> {
  const byId = new Map<string, Record<string, unknown>>();
  for (const item of o.items) {
    const id = item.id;
    if (typeof id !== "string" || id === "") {
      throw new Error("Facebook list returned a record without an id");
    }
    byId.set(id, item);
  }
  const { events, nextState } = await pollSnapshot({
    state: o.state,
    rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
    emit: { added: true, updated: false },
  });
  return {
    events: events.map((e) => (o.shape ? o.shape(byId.get(e.key)!) : byId.get(e.key))),
    nextState,
  };
}
