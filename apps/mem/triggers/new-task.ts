import { pollFromListAction } from "../../_shared/poll/mod.ts";
import taskList from "../actions/task-list.ts";

export default pollFromListAction({
  key: "new-task",
  title: "New Task",
  description: "The run gets each newly created Mem task.",
  action: taskList,
  input: () => ({ page: "", limit: 100, order_by: "created_at" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Task ID" }],
  sample: { id: "task-new", title: "Ship trigger" },
  maxPages: 1,
});
