import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/task-list.ts";

export default pollFromListAction({
  key: "new-task",
  title: "New Task",
  description: "The run gets each newly created task.",
  action,
  input: () => ({ sortBy: "created_on", sortDesc: true, limit: 100, offset: 0 }),
  items: (r) => (r as { tasks?: unknown[] }).tasks ?? [],
  idOf: (x) => String((x as { task_id?: unknown }).task_id ?? ""),
  output: [{ key: "task_id", type: "number", label: "Task ID" }],
  sample: { task_id: 2 },
  maxPages: 1,
});
