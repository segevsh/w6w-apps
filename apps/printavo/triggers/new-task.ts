import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/task-list.ts";

export default pollFromListAction({
  key: "new-task",
  title: "New Task",
  description: "The run gets each newly created task.",
  action,
  input: () => ({ first: 100, sortOn: "CREATED_AT", sortDescending: true }),
  items: (r) => (r as { nodes?: unknown[] }).nodes ?? [],
  idOf: (x) => String((x as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Task ID" }],
  sample: { id: "task-2" },
  maxPages: 1,
});
