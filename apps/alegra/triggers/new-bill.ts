import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/bill-list.ts";

export default pollFromListAction({
  key: "new-bill",
  title: "New Supplier Bill",
  description: "The run gets each newly created supplier bill.",
  action,
  input: () => ({ start: 0, limit: 30, orderDirection: "DESC", orderField: "id" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Supplier Bill ID" }, {
    key: "number",
    type: "string",
    label: "Bill number",
  }],
  sample: { id: "bill-101", number: "sample" },
  maxPages: 1,
});
