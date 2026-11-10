import type { ActionDefinition, HookContext } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** 50 pages of 100 = the snapshot kit's 5000-row cap. */
const MAX_PAGES = 50;
const PER_PAGE = 100;

interface ListResult {
  records?: unknown[];
  has_next_page?: boolean;
}

/** The `records` array of a Circle list envelope. */
export const records = (r: unknown): unknown[] => (r as ListResult)?.records ?? [];

/** A record's `id` as a string key (Circle ids are integers). */
export const idOf = (v: unknown): string => String((v as { id?: unknown }).id ?? "");

/**
 * Reads a whole (bounded) Circle collection through the app's OWN list action: `page` / `perPage`
 * in, `records` + `has_next_page` out.
 */
export async function readAllPages(
  action: unknown,
  input: Record<string, unknown>,
  ctx: HookContext,
): Promise<unknown[]> {
  const all: unknown[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await (action as ActionDefinition).execute(
      { ...input, page, perPage: PER_PAGE },
      ctx,
    ) as ListResult;
    all.push(...records(res));
    if (!res?.has_next_page) return all;
  }
  throw new Error(`Circle list is longer than ${MAX_PAGES} pages; refusing to snapshot it`);
}

/** "New <record>" over a bounded collection: diff the ids against the previous check (added only). */
export async function newRecords(o: {
  state: unknown;
  items: unknown[];
}): Promise<{ events: unknown[]; nextState: unknown }> {
  const byId = new Map<string, unknown>();
  for (const item of o.items) {
    const id = idOf(item);
    if (id === "") throw new Error("Circle list returned a record without an id");
    byId.set(id, item);
  }
  const { events, nextState } = await pollSnapshot({
    state: o.state,
    rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => byId.get(e.key)), nextState };
}
