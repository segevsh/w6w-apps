import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import salesInvoiceList from "../actions/sales-invoice-list.ts";

const OVERLAP_MS = 10 * 60 * 1000;
const PAGE_SIZE = 100;
const SEEN_WINDOW = 300;

export const clock = { now: (): number => Date.now() };

interface SalesInvoice {
  id: string;
  updated_at?: string;
  [key: string]: unknown;
}

/** `created_after` / `updated_after` take an ISO 8601 UTC time and are exclusive. */
export function afterFilter(field: "created_after" | "updated_after", cursor: number): string {
  const iso = new Date(cursor - OVERLAP_MS).toISOString().replace(/\.\d{3}Z$/, "Z");
  return `${field}:${iso}`;
}

async function check(
  field: "created_after" | "updated_after",
  idOf: (invoice: SalesInvoice) => string,
  state: unknown,
  ctx: HookContext,
) {
  const checkedAt = clock.now();
  const prior = state as { cursor?: unknown } | null;
  const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
  const { events, nextState } = await pollNewItems<SalesInvoice>({
    state,
    maxPages: 1,
    maxEvents: PAGE_SIZE,
    seenWindow: SEEN_WINDOW,
    idOf,
    async fetchPage() {
      const result = await salesInvoiceList.execute(
        { filter: afterFilter(field, cursor), page: 1, perPage: PAGE_SIZE },
        ctx,
      ) as { items?: SalesInvoice[] };
      return { items: result.items ?? [] };
    },
  });
  return { events, nextState: { ...nextState, cursor: checkedAt } };
}

export function checkNewSalesInvoice(state: unknown, ctx: HookContext) {
  return check("created_after", (invoice) => String(invoice.id), state, ctx);
}

export function checkNewOrUpdatedSalesInvoice(state: unknown, ctx: HookContext) {
  return check(
    "updated_after",
    (invoice) => `${invoice.id}:${invoice.updated_at ?? ""}`,
    state,
    ctx,
  );
}

const output: TriggerDefinition["output"] = [
  { key: "id", type: "string", label: "Sales invoice ID" },
  { key: "invoice_id", type: "string", label: "Invoice number" },
  { key: "state", type: "string", label: "State" },
  { key: "contact_id", type: "string", label: "Contact ID" },
  { key: "total_price_incl_tax", type: "string", label: "Total incl. tax" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "updated_at", type: "string", label: "Updated at" },
];

const sample = {
  id: "403101852297429005",
  invoice_id: "2026-0001",
  state: "open",
  contact_id: "403101852183307262",
  total_price_incl_tax: "121.0",
  created_at: "2026-11-10T10:00:00.000Z",
  updated_at: "2026-11-10T10:00:00.000Z",
};

export const newSalesInvoiceTrigger: TriggerDefinition = {
  key: "new-sales-invoice",
  title: "New Sales Invoice",
  description: "The run gets each newly created Moneybird sales invoice.",
  output,
  sample,
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return checkNewSalesInvoice(state, ctx);
  },
};

export const newOrUpdatedSalesInvoiceTrigger: TriggerDefinition = {
  key: "new-or-updated-sales-invoice",
  title: "New or Updated Sales Invoice",
  description: "The run gets each sales invoice that is newly created or edited.",
  output,
  sample,
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return checkNewOrUpdatedSalesInvoice(state, ctx);
  },
};
