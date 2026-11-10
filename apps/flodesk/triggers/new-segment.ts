import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listSegments from "../actions/list-segments.ts";

const PER_PAGE = 100;
const MAX_PAGES = 5;

/**
 * Small bounded collection: segments are an account-configuration list (tens, not thousands),
 * offset-paginated at `per_page` 100 with `meta.total_pages`. The whole set is read each check (at
 * most five pages) and diffed; an account with more than 500 segments fails the check with an error
 * naming the cap instead of silently dropping rows.
 */
const trigger: TriggerDefinition = {
  key: "new-segment",
  title: "New Segment",
  description: "The run gets each segment newly created in the Flodesk account.",
  output: [
    { key: "id", type: "string", label: "Segment ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "color", type: "string", label: "Color" },
    { key: "total_active_subscribers", type: "number", label: "Active subscribers" },
  ],
  sample: { id: "seg_1", name: "VIP", color: "#ff0000", total_active_subscribers: 12 },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const segments: Array<{ id?: unknown }> = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const out = await listSegments.execute({ page, perPage: PER_PAGE }, ctx) as {
        meta?: { total_pages?: number };
        data?: Array<{ id?: unknown }>;
      };
      segments.push(...(Array.isArray(out?.data) ? out.data : []));
      if (Number(out?.meta?.total_pages ?? 1) <= page) break;
      if (page === MAX_PAGES) {
        throw new Error(
          `Flodesk account has more than ${
            MAX_PAGES * PER_PAGE
          } segments; the New Segment trigger is capped there`,
        );
      }
    }
    const { events, nextState } = await pollSnapshot({
      state,
      rows: segments.map((segment) => ({ key: String(segment.id ?? ""), values: segment })),
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((change) => change.values), nextState };
  },
};

export default trigger;
