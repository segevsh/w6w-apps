import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listInvoices from "../actions/list-invoices.ts";

export default pollFromListAction({
  key: "new-invoice",
  title: "New Invoice",
  description: "The run gets each newly created Outseta invoice (newest first).",
  action: listInvoices,
  input: () => ({ limit: 25, orderBy: "Created DESC" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { Uid?: unknown }).Uid ?? ""),
  output: [
    { key: "Uid", type: "string", label: "Invoice Uid" },
    { key: "Amount", type: "number", label: "Amount" },
    { key: "InvoiceDate", type: "string", label: "Invoice date" },
    { key: "Created", type: "string", label: "Created" },
  ],
  sample: {
    Uid: "i8Qw1NaD",
    Amount: 49,
    InvoiceDate: "2026-11-09T00:00:00Z",
    Created: "2026-11-09T09:00:00Z",
  },
  maxPages: 1,
});
