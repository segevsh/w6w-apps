import type { ActionDefinition, HookContext } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { pollSince } from "./since-poll.ts";

/** 200 pages of 25 = the snapshot kit's 5000-row cap. */
const MAX_PAGES = 200;

/**
 * Reads a whole (small, bounded) list through the app's OWN list action, following the action's
 * `nextPage` until it is absent. Actions that return a single array simply have no `nextPage`.
 */
export async function readAll(
  action: unknown,
  input: Record<string, unknown>,
  ctx: HookContext,
): Promise<unknown[]> {
  const all: unknown[] = [];
  let page: number | undefined;
  for (let n = 0; n < MAX_PAGES; n++) {
    const res = await (action as ActionDefinition).execute(
      page === undefined ? input : { ...input, page },
      ctx,
    ) as { items?: unknown[]; nextPage?: number };
    all.push(...(Array.isArray(res?.items) ? res.items : []));
    if (typeof res?.nextPage !== "number") return all;
    page = res.nextPage;
  }
  throw new Error(`Tapfiliate list is longer than ${MAX_PAGES} pages; refusing to snapshot it`);
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
    if (typeof id !== "string" && typeof id !== "number") {
      throw new Error("Tapfiliate list returned a record without an id");
    }
    byId.set(String(id), item);
  }
  const { events, nextState } = await pollSnapshot({
    state: o.state,
    rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => byId.get(e.key)), nextState };
}

/** Tapfiliate pages hold 25 items; 4 pages keep one check within the kit's 100-event cap. */
const PAGES_PER_CHECK = 4;
const DAY_MS = 86_400_000;
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * `poll` for a list action with a day-granular `date_from` / `date_to` (days in UTC) and no sort
 * (brief §9.1 b, §9.8, §9.9): the window is asked one day wider on each side and every row is then
 * kept or dropped by its own `created_at` inside `pollSince`.
 */
export function pollDatedList(action: unknown) {
  return ({ state }: { state: unknown }, ctx: HookContext) =>
    pollSince<unknown>({
      state,
      idOf: (r) => String((r as { id?: unknown }).id ?? ""),
      stampOf: (r) => Date.parse(String((r as { created_at?: unknown }).created_at)),
      async fetchPage(win, pos) {
        const items: unknown[] = [];
        let page: number | undefined = Number(pos ?? 1);
        for (let n = 0; n < PAGES_PER_CHECK && page !== undefined; n++) {
          const res = await (action as ActionDefinition).execute({
            page,
            dateFrom: day(Date.parse(win.since) - DAY_MS),
            dateTo: day(Date.parse(win.until) + DAY_MS),
          }, ctx) as { items?: unknown[]; nextPage?: number };
          items.push(...(res.items ?? []));
          page = typeof res.nextPage === "number" ? res.nextPage : undefined;
        }
        return { items, next: page };
      },
    });
}
