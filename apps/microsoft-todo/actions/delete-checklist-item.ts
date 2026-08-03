import type { ActionDefinition } from "@w6w/types";
import { encodeId, GraphClient, taskPath } from "../lib/client.ts";
import { taskListParam, taskParam } from "../lib/params.ts";

interface Input {
  taskList: string;
  task: string;
  checklistItem: string;
}

/**
 * `DELETE .../tasks/{todoTaskId}/checklistItems/{checklistItemId}`
 * https://learn.microsoft.com/en-us/graph/api/checklistitem-delete?view=graph-rest-1.0
 *
 * Answers `204 No Content`, so this returns the status rather than a body.
 *
 * Least privileged permission: `Tasks.ReadWrite`.
 */
const deleteChecklistItem: ActionDefinition<Input> = {
  key: "delete-checklist-item",
  type: "perform",
  resource: "checklist-item",
  title: "Delete Checklist Item",
  description: "Remove a checklist item from a task.",
  idempotent: true,
  params: [
    taskListParam,
    taskParam,
    {
      key: "checklistItem",
      label: "Checklist item",
      type: "string",
      required: true,
      hint: "The `checklistItem` id. Use List Checklist Items to find it.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204)" }],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    const path = `${taskPath(input.taskList, input.task)}/checklistItems/${
      encodeId(input.checklistItem)
    }`;
    return client.status(path, { method: "DELETE" });
  },
};

export default deleteChecklistItem;
