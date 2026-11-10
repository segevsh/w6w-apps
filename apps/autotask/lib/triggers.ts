import type { HookContext } from "@w6w/types";
import { pollWindow, toMs } from "./window.ts";
import entityQuery from "../actions/entity-query.ts";

const OVERLAP_MS = 120_000;
const MAX_PAGES = 3;

interface QueryResult {
  items?: unknown[];
  nextPageUrl?: string;
}

/**
 * Tickets whose `field` (a datetime) is later than the last check, through the existing
 * `entity-query` action (`POST /Tickets/query`, filter `field > cursor - 2 minutes`). A window
 * longer than `MAX_PAGES` pages is resumed from the persisted `nextPageUrl` on the next check, and
 * the cursor moves only once it drains (brief 9.8). The first check stores `floor = now` and emits
 * nothing; later checks drop tickets whose `field` is before the floor (brief 9.9).
 */
export function pollTicketsSince(o: {
  field: string;
  idOf(item: unknown): string;
  state: unknown;
  ctx: HookContext;
}) {
  const { state, ctx } = o;
  return pollWindow<unknown, string>({
    state,
    now: Date.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: 500,
    seenWindow: 2000,
    idOf: o.idOf,
    tsOf: (item) => toMs((item as Record<string, unknown>)[o.field]),
    async load(sinceMs, pageUrl) {
      const res = await entityQuery.execute(
        pageUrl ? { pageUrl } : {
          entity: "Tickets",
          filter: [{ op: "gt", field: o.field, value: new Date(sinceMs).toISOString() }],
          maxRecords: 500,
        },
        ctx,
      ) as QueryResult;
      return { items: res.items ?? [], next: res.nextPageUrl || undefined };
    },
  });
}
