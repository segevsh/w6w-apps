import type { ActionDefinition, HookContext } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` (UTC) of `now − days`. */
export function utcDate(days: number): string {
  return new Date(clock.now() - days * DAY_MS).toISOString().slice(0, 10);
}

/** 50 pages of 100 = the snapshot kit's 5000-row cap. */
const MAX_PAGES = 50;
const PAGE_SIZE = 100;

interface Reply {
  data?: unknown;
  nextPage?: number;
  nextCursor?: string;
}

/** A record's `id` as a string key. */
export const idOf = (v: unknown): string => String((v as { id?: unknown }).id ?? "");

/**
 * Reads a whole (bounded) collection through the app's OWN list action, following the pager hint
 * every action reply carries: `nextPage` (page-numbered lists) or `nextCursor` (cursor lists).
 */
export async function readAllPages(
  action: unknown,
  input: Record<string, unknown>,
  ctx: HookContext,
): Promise<unknown[]> {
  const all: unknown[] = [];
  let paging: Record<string, unknown> = {};
  for (let n = 1; n <= MAX_PAGES; n++) {
    const res = await (action as ActionDefinition).execute(
      { ...input, pageSize: PAGE_SIZE, ...paging },
      ctx,
    ) as Reply;
    if (Array.isArray(res?.data)) all.push(...res.data);
    if (typeof res?.nextPage === "number") paging = { page: res.nextPage };
    else if (typeof res?.nextCursor === "string" && res.nextCursor !== "") {
      paging = { cursor: res.nextCursor };
    } else return all;
  }
  throw new Error(`Leadfeeder list is longer than ${MAX_PAGES} pages; refusing to snapshot it`);
}

/** "New <record>" over a bounded collection: diff the ids against the previous check (added only). */
export async function newRecords(o: {
  state: unknown;
  items: unknown[];
}): Promise<{ events: unknown[]; nextState: unknown }> {
  const byId = new Map<string, unknown>();
  for (const item of o.items) {
    const id = idOf(item);
    if (id === "") throw new Error("Leadfeeder list returned a record without an id");
    byId.set(id, item);
  }
  const { events, nextState } = await pollSnapshot({
    state: o.state,
    rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => byId.get(e.key)), nextState };
}
