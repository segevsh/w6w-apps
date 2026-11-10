import { newestFirst } from "../lib/triggers.ts";
import checklistList from "../actions/checklist-list.ts";

export default newestFirst({
  key: "new-checklist",
  title: "New Checklist",
  description: "The run gets each checklist newly added to one task.",
  action: checklistList as never,
  params: [{
    key: "taskId",
    label: "Task ID",
    type: "number",
    required: true,
    hint: "The task to watch (from List Tasks).",
  }],
  input: (p) => ({ taskId: Number(p.taskId) }),
  idOf: (item) => String(item.id ?? ""),
  output: [{ key: "id", type: "number", label: "Checklist ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "task_id", type: "number", label: "Task ID" }],
  sample: { id: 401, name: "Launch checks", task_id: 101 },
});
