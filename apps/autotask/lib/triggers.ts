import type { HookContext } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import entityQuery from "../actions/entity-query.ts";

const OVERLAP_MS = 120_000;
const MAX_PAGES = 3;
const MAX_EVENTS = 100;

interface QueryResult {
  items?: unknown[];
  nextPageUrl?: string;
}

/**
 * Tickets whose `field` (a datetime) is later than the last check, through the existing
 * `entity-query` action (`POST /Tickets/query`, filter `field > cursor - 2 minutes`). Each check
 * de-duplicates by `idOf` (`pollNewItems`) and moves the cursor to "now" only when every page the
 * filter matched was read and emitted; a first check records the last two minutes' ids and emits
 * nothing.
 */
export async function pollTicketsSince(o: {
  field: string;
  idOf(item: unknown): string;
  state: unknown;
  ctx: HookContext;
}) {
  const { state, ctx } = o;
  const now = Date.now();
  const prior = (state as { cursor?: unknown } | null)?.cursor;
  const cursor = typeof prior === "number" ? prior : now;
  const since = new Date(cursor - OVERLAP_MS).toISOString();
  let more = false;
  const { events, nextState } = await pollNewItems<unknown>({
    state,
    maxPages: 1,
    maxEvents: MAX_EVENTS,
    idOf: o.idOf,
    async fetchPage() {
      const items: unknown[] = [];
      let pageUrl: string | undefined;
      for (let page = 0; page < MAX_PAGES; page++) {
        const res = await entityQuery.execute(
          pageUrl ? { pageUrl } : {
            entity: "Tickets",
            filter: [{ op: "gt", field: o.field, value: since }],
            maxRecords: 500,
          },
          ctx,
        ) as QueryResult;
        items.push(...(res.items ?? []));
        pageUrl = res.nextPageUrl;
        if (!pageUrl) break;
      }
      more = pageUrl !== undefined;
      return { items };
    },
  });
  const caughtUp = !more && events.length < MAX_EVENTS;
  return { events, nextState: { ...nextState, cursor: caughtUp ? now : cursor } };
}
