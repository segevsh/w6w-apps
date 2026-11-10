import type { TriggerDefinition } from "@w6w/types";
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
 * Tickets created since the last check, through the existing `entity-query` action
 * (`POST /Tickets/query`, filter `createDate > cursor - 2 minutes`). Each check de-duplicates by
 * ticket id (`pollNewItems`) and moves the cursor to "now" only when every page the filter matched
 * was read and emitted; a first check records the last two minutes' ids and emits nothing.
 */
const trigger: TriggerDefinition = {
  key: "new-ticket",
  title: "New Ticket",
  description: "The run gets each newly created Autotask ticket.",
  minIntervalMs: 300_000,
  output: [
    { key: "id", type: "number", label: "Ticket ID" },
    { key: "ticketNumber", type: "string", label: "Ticket number" },
    { key: "title", type: "string", label: "Title" },
    { key: "companyID", type: "number", label: "Company ID" },
    { key: "status", type: "number", label: "Status" },
    { key: "createDate", type: "string", label: "Created" },
  ],
  sample: {
    id: 12345,
    ticketNumber: "T20261109.0001",
    title: "Printer offline",
    companyID: 42,
    status: 1,
    createDate: "2026-11-09T10:00:00Z",
  },
  async poll({ state }, ctx) {
    const now = Date.now();
    const prior = (state as { cursor?: unknown } | null)?.cursor;
    const cursor = typeof prior === "number" ? prior : now;
    const since = new Date(cursor - OVERLAP_MS).toISOString();
    let more = false;
    const { events, nextState } = await pollNewItems<unknown>({
      state,
      maxPages: 1,
      maxEvents: MAX_EVENTS,
      idOf: (item) => String((item as { id?: unknown }).id ?? ""),
      async fetchPage() {
        const items: unknown[] = [];
        let pageUrl: string | undefined;
        for (let page = 0; page < MAX_PAGES; page++) {
          const res = await entityQuery.execute(
            pageUrl ? { pageUrl } : {
              entity: "Tickets",
              filter: [{ op: "gt", field: "createDate", value: since }],
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
  },
};

export default trigger;
