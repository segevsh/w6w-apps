import { newestFirst } from "../lib/triggers.ts";
import taskList from "../actions/task-list.ts";

export default newestFirst({
  key: "new-or-updated-task",
  title: "New or Updated Task",
  description:
    "The run gets each task in one project that is new or was edited since the last check.",
  action: taskList as never,
  params: [{
    key: "projectId",
    label: "Project ID",
    type: "number",
    required: true,
    hint: "The project to watch (the id in the project's URL or from List Projects).",
  }],
  input: (p) => ({ projectId: Number(p.projectId) }),
  sort: "-updated_at",
  idOf: (item) => `${item.id}:${item.updated_at}`,
  output: [{ key: "id", type: "number", label: "Task ID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "updated_at", type: "string", label: "Updated at" }],
  sample: { id: 101, name: "Draft the brief", updated_at: "2026-11-10T09:30:00Z" },
});
