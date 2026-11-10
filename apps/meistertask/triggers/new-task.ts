import { newestFirst } from "../lib/triggers.ts";
import taskList from "../actions/task-list.ts";

export default newestFirst({
  key: "new-task",
  title: "New Task",
  description: "The run gets each task newly created in one project.",
  action: taskList as never,
  params: [{
    key: "projectId",
    label: "Project ID",
    type: "number",
    required: true,
    hint: "The project to watch (the id in the project's URL or from List Projects).",
  }],
  input: (p) => ({ projectId: Number(p.projectId) }),
  idOf: (item) => String(item.id ?? ""),
  output: [
    { key: "id", type: "number", label: "Task ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "section_id", type: "number", label: "Section ID" },
    { key: "status", type: "number", label: "Status" },
  ],
  sample: { id: 101, name: "Draft the brief", section_id: 11, status: 1 },
});
