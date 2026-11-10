import type { TriggerDefinition } from "@w6w/types";
import { pollWindow } from "../lib/window.ts";
import auditEventList from "../actions/audit-event-list.ts";

/** Look-back before the previous check, so an event collected late is still seen. */
export const OVERLAP_MS = 600_000;
/** `page_size` maximum in the vendor's OpenAPI document. */
const PAGE_SIZE = 30;
const MAX_PAGES = 10;
/** At least MAX_EVENTS plus an overlap's worth, so a re-listed id is never evicted. */
const SEEN_WINDOW = 2 * MAX_PAGES * PAGE_SIZE;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

type Evt = { id?: unknown; occurred_at?: unknown };

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
  poll({ state }, ctx) {
    return pollWindow<Evt, string>({
      state,
      now: clock.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      seenWindow: SEEN_WINDOW,
      idOf: (e) => String(e.id ?? ""),
      // `occurred_at` is the field `occurred_after` filters on; an event without one is kept.
      tsOf: (e) => {
        const ms = Date.parse(String(e.occurred_at ?? ""));
        return Number.isNaN(ms) ? undefined : ms;
      },
      async load(since, cursor) {
        const res = await auditEventList.execute(
          { occurredAfter: new Date(since).toISOString(), pageSize: PAGE_SIZE, cursor },
          ctx,
        ) as Page;
        return {
          items: (res.events ?? []) as Evt[],
          next: res.hasMore && res.cursor ? res.cursor : undefined,
        };
      },
    });
  },
};

export default trigger;
