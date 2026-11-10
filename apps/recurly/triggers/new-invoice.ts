import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/list-invoices.ts";

export default pollFromListAction({
  key: "new-invoice",
  title: "New Invoice",
  description: "The run gets each newly created invoice.",
  action,
  input: () => ({ limit: 100, sort: "created_at", order: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Invoice ID" }],
  sample: { id: "invoice-1", number: "1001" },
  maxPages: 1,
});
