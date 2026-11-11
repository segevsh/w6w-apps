import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/estimate-list.ts";

export default pollFromListAction({
  key: "new-estimate",
  title: "New Estimate",
  description: "The run gets each newly created estimate (quote).",
  action,
  input: () => ({ start: 0, limit: 30, orderDirection: "DESC", orderField: "id" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Estimate ID" }],
  sample: { id: "estimate-101" },
  maxPages: 1,
});
