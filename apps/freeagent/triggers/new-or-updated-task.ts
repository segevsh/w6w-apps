import { newestFirstTrigger } from "../lib/triggers.ts";
import taskList from "../actions/task-list.ts";

export default newestFirstTrigger({
  key: "new-or-updated-task",
  title: "New or Updated Task",
  description: "The run gets each FreeAgent task that is newly created or edited, once per edit.",
  action: taskList,
  itemsKey: "tasks",
  sort: "-updated_at",
  paged: false,
  updatedKey: "updated_at",
  output: [
    { key: "url", type: "string", label: "Task URL (its ID)" },
    { key: "project", type: "string", label: "Project URL" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "is_billable", type: "boolean", label: "Billable" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],
  sample: {
    url: "https://api.freeagent.com/v2/tasks/1",
    project: "https://api.freeagent.com/v2/projects/1",
    name: "Design",
    status: "Active",
    is_billable: true,
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-09T10:00:00Z",
  },
});
