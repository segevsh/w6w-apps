import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollWindow } from "./window.ts";
import salesInvoiceList from "../actions/sales-invoice-list.ts";

const OVERLAP_MS = 10 * 60 * 1000;
const PAGE_SIZE = 100;
/** Pages one check reads; a bigger window resumes next check. */
const MAX_PAGES = 5;
const SEEN_WINDOW = 1000;

export const clock = { now: (): number => Date.now() };

interface SalesInvoice {
  id: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

/** `created_after` / `updated_after` take an ISO 8601 UTC time and are exclusive. */
export function afterFilter(field: "created_after" | "updated_after", sinceMs: number): string {
  const iso = new Date(sinceMs).toISOString().replace(/\.\d{3}Z$/, "Z");
  return `${field}:${iso}`;
}

/**
 * `created_after` / `updated_after` have no upper bound, so a window that holds more than one read
 * resumes by page number (brief 9.8). An arrival while it drains can only push records to a LATER
 * page (a re-read, deduped by the seen ids), never skip one.
 */
function check(
  field: "created_after" | "updated_after",
  idOf: (invoice: SalesInvoice) => string,
  state: unknown,
  ctx: HookContext,
) {
  const stampKey = field === "created_after" ? "created_at" : "updated_at";
  return pollWindow<SalesInvoice, number>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    maxPages: MAX_PAGES,
    pageSize: PAGE_SIZE,
    seenWindow: SEEN_WINDOW,
    idOf,
    tsOf: (invoice) => {
      const ms = Date.parse(String(invoice[stampKey] ?? ""));
      return Number.isNaN(ms) ? undefined : ms;
    },
    async load(since, page) {
      const result = await salesInvoiceList.execute(
        { filter: afterFilter(field, since), page: page ?? 1, perPage: PAGE_SIZE },
        ctx,
      ) as { items?: SalesInvoice[] };
      const items = result.items ?? [];
      return { items, next: items.length >= PAGE_SIZE ? (page ?? 1) + 1 : undefined };
    },
  });
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
