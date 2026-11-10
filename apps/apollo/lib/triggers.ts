import type { ActionDefinition, HookContext } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** 50 pages of 100 = the snapshot kit's 5000-row cap. */
const MAX_PAGES = 50;
const PER_PAGE = 100;

/**
 * Reads a whole (small, bounded) paginated list through the app's OWN search action: `page` /
 * `per_page` in, `<itemsKey>` + `pagination.total_pages` out.
 */
export async function readAllPages(
  action: unknown,
  itemsKey: string,
  ctx: HookContext,
): Promise<unknown[]> {
  const all: unknown[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await (action as ActionDefinition).execute({ page, per_page: PER_PAGE }, ctx) as
      & Record<string, unknown>
      & { pagination?: { total_pages?: number } };
    const items = res?.[itemsKey];
    all.push(...(Array.isArray(items) ? items : []));
    const totalPages = res?.pagination?.total_pages;
    if (typeof totalPages !== "number" || page >= totalPages) return all;
  }
  throw new Error(`Apollo list is longer than ${MAX_PAGES} pages; refusing to snapshot it`);
}

/** "New <record>" over a bounded collection: diff the ids against the previous check (added only). */
export async function newRecords(o: {
  state: unknown;
  items: unknown[];
  idOf(item: unknown): unknown;
}): Promise<{ events: unknown[]; nextState: unknown }> {
  const byId = new Map<string, unknown>();
  for (const item of o.items) {
    const id = o.idOf(item);
    if (typeof id !== "string" || id === "") {
      throw new Error("Apollo list returned a record without an id");
    }
    byId.set(id, item);
  }
  const { events, nextState } = await pollSnapshot({
    state: o.state,
    rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => byId.get(e.key)), nextState };
}
