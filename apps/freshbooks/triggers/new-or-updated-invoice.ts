import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import invoiceList from "../actions/invoice-list.ts";

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

interface State {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  cursor: number;
}

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
  async poll({ state }, ctx) {
    const now = clock.now();
    const prior = state as { cursor?: unknown } | null;
    const cursor = typeof prior?.cursor === "number" ? prior.cursor : now;
    const updatedMin = new Date(cursor - OVERLAP_MS).toISOString().slice(0, 10);
    const { events, nextState } = await pollNewItems<Invoice>({
      state,
      maxPages: 1,
      maxEvents: 500,
      seenWindow: 1000,
      idOf: (invoice) => `${invoice.id ?? ""}:${invoice.updated ?? ""}`,
      async fetchPage() {
        const items: Invoice[] = [];
        for (let page = 1; page <= MAX_PAGES; page++) {
          const result = await invoiceList.execute(
            { page, perPage: PAGE_SIZE, search: { updated_min: updatedMin } },
            ctx,
          ) as { response?: { result?: { invoices?: Invoice[] } } };
          const batch = result?.response?.result?.invoices ?? [];
          items.push(...batch);
          if (batch.length < PAGE_SIZE) break;
        }
        return { items };
      },
    });
    return { events, nextState: { ...nextState, cursor: now } as State };
  },
};

export default trigger;
