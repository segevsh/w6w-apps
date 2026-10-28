import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, GraphClient, taskPath } from "../lib/client.ts";
import { taskListParam, taskParam } from "../lib/params.ts";

interface Input {
  taskList: string;
  task: string;
  checklistItem: string;
  displayName?: string;
  isChecked?: boolean;
}

/**
 * `PATCH .../tasks/{todoTaskId}/checklistItems/{checklistItemId}`
 * https://learn.microsoft.com/en-us/graph/api/checklistitem-update?view=graph-rest-1.0
 *
 * This is how a subtask gets ticked off: `isChecked: true`. `checkedDateTime` is
 * stamped by the service, so it is not offered as an input.
 *
 * A partial update — an omitted field is left alone.
 *
 * Least privileged permission: `Tasks.ReadWrite`.
 */
const updateChecklistItem: ActionDefinition<Input> = {
  key: "update-checklist-item",
  type: "perform",
  resource: "checklist-item",
  title: "Update Checklist Item",
  description: "Rename a checklist item, or tick it off with 'Checked'.",
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
    { key: "displayName", label: "Title", type: "string" },
    {
      key: "isChecked",
      label: "Checked",
      type: "boolean",
      hint: "`true` ticks the subtask off; Graph stamps `checkedDateTime` itself.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Checklist item ID" },
    { key: "displayName", type: "string", label: "Title" },
    { key: "isChecked", type: "boolean", label: "Checked" },
    { key: "checkedDateTime", type: "string", label: "Checked at" },
  ],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    const path = `${taskPath(input.taskList, input.task)}/checklistItems/${
      encodeId(input.checklistItem)
    }`;
    return client.request(path, {
      method: "PATCH",
      body: compact({ displayName: input.displayName, isChecked: input.isChecked }),
    });
  },
};

export default updateChecklistItem;
