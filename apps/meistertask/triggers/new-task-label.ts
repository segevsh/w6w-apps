import { boundedList } from "../lib/triggers.ts";
import taskLabelList from "../actions/task-label-list.ts";

export default boundedList({
  key: "new-task-label",
  title: "New Task Label",
  description: "The run gets each label newly attached to one task.",
  action: taskLabelList as never,
  params: [{
    key: "taskId",
    label: "Task ID",
    type: "number",
    required: true,
    hint: "The task to watch (from List Tasks).",
  }],
  input: (p) => ({ taskId: Number(p.taskId) }),
  output: [{ key: "id", type: "number", label: "Task label ID" }, {
    key: "task_id",
    type: "number",
    label: "Task ID",
  }, { key: "label_id", type: "number", label: "Label ID" }],
  sample: { id: 601, task_id: 101, label_id: 21 },
});
