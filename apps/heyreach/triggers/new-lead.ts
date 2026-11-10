import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollWindow } from "../lib/window.ts";
import listGetLeads from "../actions/list-get-leads.ts";

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

/** The since-filter is re-read this far back, so a lead added mid-check is not missed. */
const OVERLAP_MS = 120_000;
const PAGE_SIZE = 100;
/** Pages read per check; a larger window resumes from its offset on the next check (brief 9.8). */
const MAX_PAGES = 10;
type Lead = Record<string, unknown>;
/** At least MAX_EVENTS plus one overlap re-list, so an id emitted last check is never evicted. */
const SEEN_WINDOW = 1000;

/**
 * Shape (b): `createdFrom` (ISO 8601, "only leads created on or after this date" per HeyReach's
 * GetLeadsFromList description) is set to `cursor - 2 min` on the existing `list-get-leads` action,
 * every page of that window is read, and `pollNewItems` dedupes by lead id. The cursor sits beside
 * the ids in the state, as in Gmail's trigger. HeyReach documents no order, so the whole window is
 * read rather than stopping at the first page holding a seen id.
 */
export default {
  key: "new-lead",
  title: "New Lead",
  description: "The run gets each new lead added to the selected list.",
  params: [{ key: "listId", label: "List ID", type: "number", required: true }],
  output: [{ key: "id", type: "string", label: "Lead ID" }],
  sample: { id: "lead-1", firstName: "Ada" },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx: HookContext) {
    return pollWindow<Lead, number>({
      state,
      now: clock.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      seenWindow: SEEN_WINDOW,
      idOf: (lead) => String(lead.id ?? lead.leadId ?? ""),
      // A lead without a parseable `createdAt` is kept (README).
      tsOf: (lead) => {
        const ms = Date.parse(String(lead.createdAt ?? ""));
        return Number.isNaN(ms) ? undefined : ms;
      },
      async load(since, offset, until) {
        // Continuation pages are bounded by the window start so arrivals cannot shift the offset.
        const res = await listGetLeads.execute({
          listId: params.listId,
          createdFrom: new Date(since).toISOString(),
          ...(offset === undefined ? {} : { createdTo: new Date(until).toISOString() }),
          limit: PAGE_SIZE,
          offset: offset ?? 0,
        }, ctx) as { items?: Lead[] };
        const got = res.items ?? [];
        return {
          items: got,
          next: got.length >= PAGE_SIZE ? (offset ?? 0) + PAGE_SIZE : undefined,
        };
      },
    });
  },
} satisfies TriggerDefinition<{ listId: number }>;
