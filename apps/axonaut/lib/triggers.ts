import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import invoiceList from "../actions/invoice-list.ts";

type Invoice = { id?: string | number; updated_at?: string; updatedAt?: string };
type CursorState = { cursor?: string };

function since(cursor?: string): string | undefined {
  if (!cursor) return undefined;
  return new Date(new Date(cursor).getTime() - 120_000).toISOString();
}

function newestCursor(items: Invoice[], cursor?: string): string | undefined {
  return items.reduce((latest, item) => {
    const stamp = item.updated_at ?? item.updatedAt;
    return stamp && (!latest || stamp > latest) ? stamp : latest;
  }, cursor);
}

function invoiceTrigger(
  key: string,
  title: string,
  field: "date_after" | "updated_after",
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
      const state = call.state as CursorState;
      const cursor = state?.cursor;
      const result = await invoiceList.execute(
        { ...(call.params as Record<string, unknown>), [field]: since(cursor), page: 1 },
        ctx,
      ) as { items?: Invoice[] };
      const polled = await pollNewItems({
        state: call.state,
        fetchPage: () => Promise.resolve({ items: result.items ?? [] }),
        idOf: (item) => {
          const stamp = item.updated_at ?? item.updatedAt ?? "";
          return updated ? `${item.id}:${stamp}` : String(item.id);
        },
        maxPages: 1,
      });
      return {
        ...polled,
        nextState: { ...polled.nextState, cursor: newestCursor(result.items ?? [], cursor) },
      };
    },
  };
}

export const newInvoice = invoiceTrigger("new-invoice", "New Invoice", "date_after", false);
export const newOrUpdatedInvoice = invoiceTrigger(
  "new-or-updated-invoice",
  "New or Updated Invoice",
  "updated_after",
  true,
);
