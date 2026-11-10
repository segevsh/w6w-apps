import type { TriggerDefinition } from "@w6w/types";
import invoiceList from "../actions/invoice-list.ts";
import { pollWindow, toMs } from "../lib/window.ts";

// FreshBooks documents `search[updated_min]` on invoices as a YYYY-MM-DD, greater-than-or-equal
// filter (https://www.freshbooks.com/api/invoices), so each check re-reads the whole day and the
// day before (timezone slack) and de-duplicates on id + update stamp.
const OVERLAP_MS = 86_400_000;
const PAGE_SIZE = 100;
const MAX_PAGES = 5;
export const clock = { now: (): number => Date.now() };

interface Invoice {
  id?: number | string;
  updated?: string;
}

/**
 * `updated` is a zone-less `YYYY-MM-DD HH:MM:SS` stamp and FreshBooks does not document UTC for it
 * (its own times are US Eastern). To never drop a genuinely new invoice, the floor compares the
 * stamp read as UTC PLUS five hours, the latest instant it can mean: a pre-seed invoice updated in
 * the five hours before the seed may still fire once, nothing post-seed is ever dropped (brief 9.9).
 */
const ZONE_SLACK_MS = 5 * 3_600_000;
const SEEN_WINDOW = MAX_PAGES * PAGE_SIZE + PAGE_SIZE;

const trigger: TriggerDefinition = {
  key: "new-or-updated-invoice",
  title: "New or Updated Invoice",
  description: "The run gets each invoice created or updated since the previous check.",
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "invoice_number", type: "string", label: "Invoice number" },
    { key: "customerid", type: "number", label: "Client ID" },
    { key: "v3_status", type: "string", label: "Status" },
    { key: "updated", type: "string", label: "Updated" },
  ],
  sample: {
    id: 1234,
    invoice_number: "0000042",
    customerid: 806,
    v3_status: "sent",
    updated: "2026-11-09 09:00:00",
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    // A window longer than MAX_PAGES pages is resumed from the persisted page on the next check and
    // the cursor moves only once it drains (brief 9.8); the seed stores `floor = now` (brief 9.9).
    return pollWindow<Invoice, number>({
      state,
      now: clock.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      seenWindow: SEEN_WINDOW,
      idOf: (invoice) => `${invoice.id ?? ""}:${invoice.updated ?? ""}`,
      tsOf: (invoice) => {
        const ms = toMs(invoice.updated);
        return ms === undefined ? undefined : ms + ZONE_SLACK_MS;
      },
      async load(sinceMs, pos) {
        const page = pos ?? 1;
        const updatedMin = new Date(sinceMs).toISOString().slice(0, 10);
        const result = await invoiceList.execute(
          { page, perPage: PAGE_SIZE, search: { updated_min: updatedMin } },
          ctx,
        ) as { response?: { result?: { invoices?: Invoice[] } } };
        const items = result?.response?.result?.invoices ?? [];
        return { items, next: items.length >= PAGE_SIZE ? page + 1 : undefined };
      },
    });
  },
};

export default trigger;
