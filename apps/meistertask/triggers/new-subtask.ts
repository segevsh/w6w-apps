import { newestFirst } from "../lib/triggers.ts";
import subtaskList from "../actions/subtask-list.ts";

export default newestFirst({
  key: "new-subtask",
  title: "New Subtask",
  description: "The run gets each subtask newly added to one task.",
  action: subtaskList as never,
  params: [{
    key: "taskId",
    label: "Task ID",
    type: "number",
    required: true,
    hint: "The task to watch (from List Tasks).",
  }],
  input: (p) => ({ taskId: Number(p.taskId) }),
  idOf: (item) => String(item.id ?? ""),
  output: [{ key: "id", type: "number", label: "Subtask ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "task_id", type: "number", label: "Parent task ID" }],
  sample: { id: 301, name: "Collect assets", task_id: 101 },
});
