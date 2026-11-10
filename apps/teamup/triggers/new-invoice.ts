import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import invoicesList from "../actions/invoices-list.ts";

export default pollFromListAction({
  key: "new-invoice",
  title: "New Invoice",
  description:
    "The run gets each new invoice, polled newest-first through invoices-list (sort=-id).",
  action: invoicesList as unknown as ActionDefinition,
  input: () => ({ sort: "-id", page_size: 100 }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "number", label: "Invoice ID" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: 1001, status: "open" },
  maxPages: 1,
});
