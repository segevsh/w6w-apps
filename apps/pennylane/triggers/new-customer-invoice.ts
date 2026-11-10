import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-customer-invoices.ts";

/** `GET /customer_invoices` documents `sort` as defaulting to `-id` (descending), newest first. */
export default pollFromListAction({
  key: "new-customer-invoice",
  title: "New Customer Invoice",
  description: "The run gets each newly created Pennylane customer invoice.",
  action,
  input: () => ({ sort: "-id", limit: 100 }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "invoice_number", type: "string", label: "Invoice number" },
    { key: "date", type: "string", label: "Invoice date" },
    { key: "status", type: "string", label: "Status" },
    { key: "currency_amount", type: "string", label: "Total amount" },
  ],
  sample: {
    id: 1042,
    invoice_number: "F-2026-1042",
    date: "2026-11-09",
    status: "upcoming",
    currency_amount: "120.00",
  },
  minIntervalMs: 300_000,
  maxPages: 1,
});
