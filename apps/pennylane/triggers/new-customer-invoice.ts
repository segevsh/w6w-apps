import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-customer-invoices.ts";

export default pollFromListAction({
  key: "new-customer-invoice",
  title: "New Customer Invoice",
  description: "The run gets each newly created customer invoice.",
  action,
  input: () => ({ sort: "date_desc", perPage: 100 }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Invoice ID" }],
  sample: { id: "invoice-1" },
  minIntervalMs: 300_000,
  maxPages: 1,
});
