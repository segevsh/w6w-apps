import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/invoice-list.ts";

export default pollFromListAction({
  key: "new-invoice",
  title: "New Invoice",
  description: "The run gets each newly created sales invoice.",
  action,
  input: () => ({ start: 0, limit: 30, orderDirection: "DESC", orderField: "id" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Invoice ID" }, {
    key: "status",
    type: "string",
    label: "Status",
  }],
  sample: { id: "invoice-101", status: "sample" },
  maxPages: 1,
});
