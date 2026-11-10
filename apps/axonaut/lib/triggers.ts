import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import invoiceList from "../actions/invoice-list.ts";

type Invoice = { id?: string | number; updated_at?: string; updatedAt?: string };
type CursorState = { cursor?: string };

const DAY_MS = 86_400_000;
const MAX_PAGES = 5;

/** Axonaut filters are date-only (`DD/MM/YYYY`); one day of overlap covers the granularity. */
export function axonautDate(cursor: string): string {
  const d = new Date(new Date(cursor).getTime() - DAY_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

function invoiceTrigger(
  key: string,
  title: string,
  field: "creation_date_after" | "updated_after",
  updated: boolean,
): TriggerDefinition {
  return {
    key,
    title,
    description: `The run gets each ${updated ? "new or updated" : "new"} Axonaut invoice.`,
    type: "poll",
    minIntervalMs: 300_000,
    params: invoiceList.params,
    output: [{ key: "id", type: "string", label: "Invoice ID" }],
    sample: { id: "invoice_1", updated_at: "2026-11-09T00:00:00Z" },
    async poll(call, ctx) {
      const now = new Date(Date.now()).toISOString();
      const cursor = (call.state as CursorState | undefined)?.cursor ?? now;
      const filter = axonautDate(cursor);
      // The list is filtered, not ordered: read every page of the filtered window (bounded), then
      // dedupe by id. Seed records the window's ids and the cursor "now".
      const items: Invoice[] = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const result = await invoiceList.execute(
          { ...(call.params as Record<string, unknown>), [field]: filter, page },
          ctx,
        ) as { items?: Invoice[] };
        if (!result.items?.length) break;
        items.push(...result.items);
      }
      const polled = await pollNewItems({
        state: call.state,
        fetchPage: () => Promise.resolve({ items }),
        idOf: (item) => {
          const stamp = item.updated_at ?? item.updatedAt ?? "";
          return updated ? `${item.id}:${stamp}` : String(item.id);
        },
        maxPages: 1,
        maxEvents: 100,
        seenWindow: 1000,
      });
      return { ...polled, nextState: { ...polled.nextState, cursor: now } };
    },
  };
}

export const newInvoice = invoiceTrigger(
  "new-invoice",
  "New Invoice",
  "creation_date_after",
  false,
);
export const newOrUpdatedInvoice = invoiceTrigger(
  "new-or-updated-invoice",
  "New or Updated Invoice",
  "updated_after",
  true,
);
