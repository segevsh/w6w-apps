import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import listGetLeads from "../actions/list-get-leads.ts";

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

/** The since-filter is re-read this far back, so a lead added mid-check is not missed. */
const OVERLAP_MS = 120_000;
const PAGE_SIZE = 100;
/** At most this many pages (1000 leads) inside one overlap window; more fails loudly. */
const MAX_PAGES = 10;
const MAX_EVENTS = 500;
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
  async poll({ params, state }, ctx: HookContext) {
    const checkedAt = clock.now();
    const prior = state as { cursor?: unknown } | null;
    const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
    const createdFrom = new Date(cursor - OVERLAP_MS).toISOString();
    const { events, nextState } = await pollNewItems<Record<string, unknown>>({
      state,
      maxPages: 1,
      maxEvents: MAX_EVENTS,
      seenWindow: SEEN_WINDOW,
      idOf: (lead) => String(lead.id ?? lead.leadId ?? ""),
      async fetchPage() {
        const items: Array<Record<string, unknown>> = [];
        for (let page = 0; page < MAX_PAGES; page++) {
          const res = await listGetLeads.execute({
            listId: params.listId,
            createdFrom,
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
          }, ctx) as { items?: Array<Record<string, unknown>> };
          const got = res.items ?? [];
          items.push(...got);
          if (got.length < PAGE_SIZE) return { items };
        }
        throw new Error(`new-lead: more than ${MAX_PAGES * PAGE_SIZE} leads in one check window`);
      },
    });
    return { events, nextState: { ...nextState, cursor: checkedAt } };
  },
} satisfies TriggerDefinition<{ listId: number }>;
