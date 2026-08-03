import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, taskPath } from "../lib/client.ts";
import { taskListParam, taskParam } from "../lib/params.ts";

interface Input {
  taskList: string;
  task: string;
  displayName: string;
  isChecked?: boolean;
}

/**
 * `POST /me/todo/lists/{todoTaskListId}/tasks/{todoTaskId}/checklistItems`
 * https://learn.microsoft.com/en-us/graph/api/todotask-post-checklistitems?view=graph-rest-1.0
 *
 * Microsoft lists four writable properties (`displayName`, `isChecked`,
 * `checkedDateTime`, `createdDateTime`); the last two are server-stamped in
 * every documented response, so only the first two are offered here rather than
 * inviting a caller to fabricate timestamps.
 *
 * Response is `201 Created`.
 *
 * Least privileged permission: `Tasks.ReadWrite`.
 */
const createChecklistItem: ActionDefinition<Input> = {
  key: "create-checklist-item",
  type: "perform",
  resource: "checklist-item",
  title: "Create Checklist Item",
  description: "Add a checklist item (subtask) to a task.",
  // Graph mints a fresh id per call and does not deduplicate on name.
  idempotent: false,
  params: [
    taskListParam,
    taskParam,
    { key: "displayName", label: "Title", type: "string", required: true },
    {
      key: "isChecked",
      label: "Checked",
      type: "boolean",
      hint: "Graph defaults this to false.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Checklist item ID" },
    { key: "displayName", type: "string", label: "Title" },
    { key: "isChecked", type: "boolean", label: "Checked" },
    { key: "createdDateTime", type: "string", label: "Created" },
  ],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    return client.request(`${taskPath(input.taskList, input.task)}/checklistItems`, {
      method: "POST",
      body: compact({ displayName: input.displayName, isChecked: input.isChecked }),
    });
  },
};

export default createChecklistItem;
