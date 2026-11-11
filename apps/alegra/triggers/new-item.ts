import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/item-list.ts";

export default pollFromListAction({
  key: "new-item",
  title: "New Item",
  description: "The run gets each newly created item (product or service).",
  action,
  input: () => ({ start: 0, limit: 30, orderDirection: "DESC", orderField: "id" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Item ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }],
  sample: { id: "item-101", name: "sample" },
  maxPages: 1,
});
