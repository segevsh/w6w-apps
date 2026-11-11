import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "task-deleted",
  title: "Task Deleted",
  description: "The run gets each task deleted from a Clockify project.",
  webhookEvent: "TASK_DELETED",
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "projectId", type: "string", label: "Project ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "workspaceId", type: "string", label: "Workspace ID" },
  ],
  sample: {
    id: "5b715612b079875110792222",
    name: "Write copy",
    projectId: "5b641568b07987035750505e",
    status: "ACTIVE",
    workspaceId: "64a687e29ae1f428e7ebe303",
  },
});
