import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import auditEventList from "../actions/audit-event-list.ts";

/** Look-back before the previous check, so an event collected late is still seen. */
export const OVERLAP_MS = 600_000;
/** `page_size` maximum in the vendor's OpenAPI document. */
const PAGE_SIZE = 30;
const MAX_PAGES = 10;
const MAX_EVENTS = MAX_PAGES * PAGE_SIZE;
/** At least MAX_EVENTS plus an overlap's worth, so a re-listed id is never evicted. */
const SEEN_WINDOW = 2 * MAX_EVENTS;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

interface Page {
  events?: unknown[];
  hasMore?: boolean;
  cursor?: string;
}

const trigger: TriggerDefinition = {
  key: "new-audit-event",
  title: "New Audit Event",
  description: "The run gets each newly recorded audit event.",
  output: [
    { key: "id", type: "string", label: "Audit event ID" },
    { key: "action", type: "string", label: "Action" },
  ],
  sample: { id: "event-1", action: "workspace.member_added" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const checkedAt = clock.now();
    const prior = (state ?? {}) as { cursor?: unknown };
    const since = typeof prior.cursor === "number" ? prior.cursor : checkedAt;
    const occurredAfter = new Date(since - OVERLAP_MS).toISOString();
    let complete = true;
    const { events, nextState } = await pollNewItems<unknown>({
      state,
      seenWindow: SEEN_WINDOW,
      maxEvents: MAX_EVENTS,
      idOf: (e) => String((e as { id?: unknown }).id ?? ""),
      // The log is oldest-first, so every page of the window is read and handed to the kit as
      // one newest-first page; the id dedupe does the rest.
      async fetchPage() {
        const all: unknown[] = [];
        let cursor: string | undefined;
        for (let page = 0; page < MAX_PAGES; page++) {
          const res = await auditEventList.execute(
            { occurredAfter, pageSize: PAGE_SIZE, cursor },
            ctx,
          ) as Page;
          all.push(...(res.events ?? []));
          if (!res.hasMore || !res.cursor) return { items: all.reverse() };
          cursor = res.cursor;
        }
        complete = false;
        return { items: all.reverse() };
      },
    });
    // An unread tail keeps the window where it was, so the next check resumes from it.
    return { events, nextState: { ...nextState, cursor: complete ? checkedAt : since } };
  },
};

export default trigger;
