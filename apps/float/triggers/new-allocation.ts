import { pollFromListAction } from "../../_shared/poll/mod.ts";
import allocationList from "../actions/allocation-list.ts";

export default pollFromListAction({
  key: "new-allocation",
  title: "New Allocation",
  description: "The run gets each newly created Float allocation.",
  action: allocationList,
  input: () => ({ page: 1, "per-page": 100, sort: "-created" }),
  items: (result) =>
    Array.isArray((result as { items?: unknown[] }).items)
      ? (result as { items: unknown[] }).items
      : [],
  idOf: (item) => String((item as { task_id?: unknown }).task_id ?? ""),
  output: [{ key: "task_id", type: "number", label: "Allocation ID" }],
  sample: { task_id: 101 },
  maxPages: 1,
});
