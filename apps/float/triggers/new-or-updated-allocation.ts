import { pollFromListAction } from "../../_shared/poll/mod.ts";
import allocationList from "../actions/allocation-list.ts";

export default pollFromListAction({
  key: "new-or-updated-allocation",
  title: "New or Updated Allocation",
  description: "The run gets each newly created or updated Float allocation.",
  action: allocationList,
  input: () => ({ page: 1, "per-page": 100, sort: "-modified" }),
  items: (result) =>
    Array.isArray((result as { items?: unknown[] }).items)
      ? (result as { items: unknown[] }).items
      : [],
  idOf: (item) =>
    `${String((item as { task_id?: unknown }).task_id ?? "")}:${
      String((item as { modified?: unknown }).modified ?? "")
    }`,
  output: [{ key: "task_id", type: "number", label: "Allocation ID" }],
  sample: { task_id: 101, modified: "2026-11-09 12:00:00" },
  maxPages: 1,
});
