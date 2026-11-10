import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/invoice-list.ts";

export default pollFromListAction({
  key: "new-invoice",
  title: "New Invoice",
  description:
    "The run gets each newly created invoice, oldest first, polled from the existing `invoice-list` action sorted by `CREATED_AT` descending.",
  action,
  input: () => ({ sortKey: "CREATED_AT", sortDirection: "DESCENDING", first: 100 }),
  items: (result) => (result as { invoices?: { nodes?: unknown[] } }).invoices?.nodes ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "invoiceNumber", type: "string", label: "Invoice number" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "Z2lkOi8vSm9iYmVyL0ludm9pY2UvMQ==",
    invoiceNumber: "1",
    createdAt: "2026-11-09T10:00:00Z",
    updatedAt: "2026-11-09T10:00:00Z",
  },
  maxPages: 1,
});
