import type { TriggerDefinition } from "@w6w/types";
import taskList from "../actions/task-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /projects/{project_id}/tasks`
 * (https://developers.everhour.com/api-reference/tasks/get-project-tasks.md) pages by
 * `page`/`limit` (250 max) with no documented order or changed-since filter, so the project's
 * tasks are read page by page (up to 8 pages) and diffed as a snapshot; only additions emit.
 */
const trigger: TriggerDefinition = snapshotTrigger({
  key: "new-task",
  title: "New Task",
  description: "The run gets each task newly added to the selected Everhour project.",
  noun: "tasks",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint:
        "Everhour project id: `ev:1234567890` for a native project, or `{platform}:{id}` such as `as:123456` for an integration project.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Task ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "projects", type: "array", label: "Project IDs" },
    { key: "status", type: "string", label: "open, completed or closed" },
    { key: "dueOn", type: "string", label: "Due date" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "ev:9876543210",
    name: "Write launch post",
    projects: ["ev:1234567890"],
    status: "open",
    dueOn: "2026-12-01",
    createdAt: "2026-11-10 09:30:00",
  },
  maxPages: 8,
  read: (params, page, ctx) =>
    taskList.execute({ projectId: String(params.projectId ?? ""), limit: 250, page }, ctx),
  keyOf: (item) => String((item as { id?: unknown }).id ?? ""),
});

export default trigger;
