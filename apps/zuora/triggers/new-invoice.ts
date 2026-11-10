import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/invoice-list.ts";

export default pollFromListAction({
  key: "new-invoice",
  title: "New Invoice",
  description: "Polls the existing invoice-list action ordered by CreatedDate descending.",
  action,
  input: () => ({ limit: 100, maxPages: 1, query: "order by CreatedDate desc" }),
  items: (result) => (result as { invoices?: unknown[] }).invoices ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Invoice ID" }],
  sample: { id: "invoice-101" },
});
