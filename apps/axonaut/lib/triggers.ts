import type { TriggerDefinition } from "@w6w/types";
import { pollWindow, toMs } from "./window.ts";
import invoiceList from "../actions/invoice-list.ts";

type Invoice = {
  id?: string | number;
  updated_at?: string;
  updatedAt?: string;
  creation_date?: string;
  created_at?: string;
  createdAt?: string;
};

const DAY_MS = 86_400_000;
const OVERLAP_MS = 120_000;
export const MAX_PAGES = 5;
const PAGE_SIZE = 100;

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
      // The list is filtered, not ordered. A window longer than MAX_PAGES pages is resumed from the
      // persisted page on the next check and the cursor moves only once it drains (brief 9.8); the
      // seed stores `floor = now` and later checks drop invoices stamped before it (brief 9.9).
      const polled = await pollWindow<Invoice, number>({
        state: call.state,
        now: Date.now(),
        overlapMs: OVERLAP_MS, // axonautDate() looks back one day from the cursor; clientSince trims to this
        clientSince: true,
        maxPages: MAX_PAGES,
        pageSize: PAGE_SIZE,
        seenWindow: 3000, // a date-only creation_date cannot be trimmed: the whole day is re-served
        idOf: (item) => {
          const stamp = item.updated_at ?? item.updatedAt ?? "";
          return updated ? `${item.id}:${stamp}` : String(item.id);
        },
        tsOf: (item) =>
          toMs(
            updated
              ? (item.updated_at ?? item.updatedAt)
              : (item.creation_date ?? item.created_at ?? item.createdAt),
          ),
        async load(sinceMs, pos) {
          const page = pos ?? 1;
          const result = await invoiceList.execute(
            {
              ...(call.params as Record<string, unknown>),
              [field]: axonautDate(new Date(sinceMs + OVERLAP_MS).toISOString()),
              page,
            },
            ctx,
          ) as { items?: Invoice[] };
          const items = result.items ?? [];
          return { items, next: items.length > 0 ? page + 1 : undefined };
        },
      });
      // The cursor has always been stored as an ISO string; keep that shape.
      const cursor = (polled.nextState as { cursor?: unknown }).cursor;
      return typeof cursor === "number"
        ? { ...polled, nextState: { ...polled.nextState, cursor: new Date(cursor).toISOString() } }
        : polled;
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
