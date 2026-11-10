import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/invoice-list.ts";

export default pollFromListAction({
  key: "new-or-updated-invoice",
  title: "New or Updated Invoice",
  description:
    "The run gets each invoice that is new or has been edited since the last check, polled from the existing `invoice-list` action sorted by `UPDATED_AT` descending.",
  action,
  input: () => ({ sortKey: "UPDATED_AT", sortDirection: "DESCENDING", first: 100 }),
  items: (result) => (result as { invoices?: { nodes?: unknown[] } }).invoices?.nodes ?? [],
  idOf: (item) => `${(item as { id?: unknown }).id}:${(item as { updatedAt?: unknown }).updatedAt}`,
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
    updatedAt: "2026-11-09T11:00:00Z",
  },
  maxPages: 1,
});
