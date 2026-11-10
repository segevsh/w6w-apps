import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listSegments from "../actions/list-segments.ts";

const MAX_PAGES = 12;

/**
 * Segments are a small bounded collection: "an account can have at most 250 segments", paged by
 * `page` with `meta.last_page` (https://developers.mailerlite.com/docs/segments.html, verified
 * 2026-11-10). Every check reads all pages through `list-segments` (default 25 a page) and diffs the
 * ids; the first check only records them.
 */
const trigger: TriggerDefinition = {
  key: "new-segment",
  title: "New Segment",
  description: "The run gets each segment newly created in the MailerLite account.",
  output: [
    { key: "id", type: "string", label: "Segment ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "total", type: "number", label: "Subscribers" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: "1", name: "Dummy segment", total: 21, created_at: "2026-11-10 09:00:00" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const segments: Array<{ id?: unknown }> = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const out = await listSegments.execute({ page }, ctx) as {
        data?: Array<{ id?: unknown }>;
        meta?: { last_page?: number };
      };
      segments.push(...(Array.isArray(out?.data) ? out.data : []));
      if (Number(out?.meta?.last_page ?? 1) <= page) break;
      if (page === MAX_PAGES) {
        throw new Error("MailerLite account has more than 300 segments; refusing to snapshot it");
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
