import { pollFromListAction } from "../../_shared/poll/mod.ts";
import taskList from "../actions/task-list.ts";

export default pollFromListAction({
  key: "new-or-updated-task",
  title: "New or Updated Task",
  description: "The run gets each Mem task that was created or updated since the last check.",
  action: taskList,
  input: () => ({ page: "", limit: 100, order_by: "updated_at" }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => {
    const task = item as { id?: unknown; updated_at?: unknown };
    return `${String(task.id ?? "")}:${String(task.updated_at ?? "")}`;
  },
  output: [{ key: "id", type: "string", label: "Task ID" }],
  sample: { id: "task-1", title: "Ship trigger", updated_at: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
