import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/invoice-list.ts";

export default pollFromListAction({
  key: "new-invoice",
  title: "New Invoice",
  description: "The run gets each newly created invoice.",
  action,
  input: () => ({ page: 1, limit: 100, sortField: "issuedOn", sortDirection: "desc" }),
  items: (result) => (result as { entries?: unknown[] }).entries ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Invoice ID" }],
  sample: { id: "invoice-101" },
  maxPages: 1,
});
