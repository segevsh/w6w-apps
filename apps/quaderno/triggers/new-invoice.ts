import { pollFromListAction } from "../../_shared/poll/mod.ts";
import invoiceList from "../actions/invoice-list.ts";

/** Quaderno documents the invoice list as newest first. */
export default pollFromListAction({
  key: "new-invoice",
  title: "New Invoice",
  description: "The run gets each newly created invoice.",
  action: invoiceList,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Invoice ID" }],
  sample: { id: 1234, number: "INV-0001" },
  maxPages: 1,
});
