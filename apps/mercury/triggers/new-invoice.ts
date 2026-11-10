import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import invoiceList from "../actions/invoice-list.ts";

/** Newest-first via the documented `order=desc` query parameter (https://docs.mercury.com/reference/listtransactions). */
export default pollFromListAction({
  key: "new-invoice",
  title: "New Invoice",
  description:
    "The run gets each newly created accounts-receivable invoice: id, amount and status.",
  action: invoiceList as ActionDefinition,
  input: () => ({ limit: 100, order: "desc" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "invoice-1", amount: 480, status: "Unpaid" },
  maxPages: 1,
});
