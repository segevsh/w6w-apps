import type { TriggerDefinition } from "@w6w/types";
import conversionList from "../actions/conversion-list.ts";
import { pollSince } from "../lib/since-poll.ts";

/** Tapfiliate pages hold 25 items; 4 pages keep one check within the kit's 100-event cap. */
const PAGES_PER_CHECK = 4;
const DAY_MS = 86_400_000;
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

interface Page {
  items?: unknown[];
  nextPage?: number;
}

/**
 * `GET /conversions/` has no sort order and only a day-granular `date_from` / `date_to` (days in
 * UTC), so the window is asked one day wider on each side and every row is then kept or dropped by
 * its own `created_at` (brief §9.1 b, §9.8, §9.9).
 */
const trigger: TriggerDefinition = {
  key: "new-conversion",
  title: "New Conversion",
  description: "The run gets each newly created conversion.",
  output: [
    { key: "id", type: "number", label: "Conversion ID" },
    { key: "external_id", type: "string", label: "External ID" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 1,
    external_id: "ORD123",
    amount: 550,
    created_at: "2026-11-09T12:00:00+0000",
  },
  minIntervalMs: 300_000,
  poll: ({ state }, ctx) =>
    pollSince<unknown>({
      state,
      idOf: (c) => String((c as { id?: unknown }).id ?? ""),
      stampOf: (c) => Date.parse(String((c as { created_at?: unknown }).created_at)),
      async fetchPage(win, pos) {
        const items: unknown[] = [];
        let page: number | undefined = Number(pos ?? 1);
        for (let n = 0; n < PAGES_PER_CHECK && page !== undefined; n++) {
          const res = await conversionList.execute({
            page,
            dateFrom: day(Date.parse(win.since) - DAY_MS),
            dateTo: day(Date.parse(win.until) + DAY_MS),
          }, ctx) as Page;
          items.push(...(res.items ?? []));
          page = typeof res.nextPage === "number" ? res.nextPage : undefined;
        }
        return { items, next: page };
      },
    }),
};

export default trigger;
