import type { ActionDefinition } from "@w6w/types";
import { TogglClient } from "../lib/client.ts";

interface Input {
  workspaceId: number;
  timeEntryId: number;
  description?: string;
  projectId?: number;
  taskId?: number;
  start?: string;
  stop?: string;
  duration?: number;
  tags?: string[];
  billable?: boolean;
}

/**
 * PUT /workspaces/{workspace_id}/time_entries/{time_entry_id} — update an
 * existing time entry. Only the fields supplied are sent.
 */
const timeEntryUpdate: ActionDefinition<Input> = {
  key: "time-entry-update",
  type: "perform",
  resource: "time-entry",
  title: "Update Time Entry",
  description: "Update the fields of an existing time entry.",
  idempotent: false,
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
    { key: "timeEntryId", label: "Time Entry ID", type: "number", required: true },
    { key: "description", label: "Description", type: "string" },
    { key: "projectId", label: "Project ID", type: "number" },
    { key: "taskId", label: "Task ID", type: "number" },
    { key: "start", label: "Start time", type: "datetime", hint: "UTC." },
    { key: "stop", label: "Stop time", type: "datetime", hint: "UTC." },
    { key: "duration", label: "Duration (seconds)", type: "number" },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string" },
    },
    { key: "billable", label: "Billable", type: "boolean" },
  ],
  output: [
    { key: "id", type: "number", label: "Time Entry ID" },
    { key: "duration", type: "number", label: "Duration" },
  ],

  execute(input, ctx) {
    const client = new TogglClient(ctx);
    const body: Record<string, unknown> = { workspace_id: input.workspaceId };
    if (input.description !== undefined) body.description = input.description;
    if (input.projectId !== undefined) body.project_id = input.projectId;
    if (input.taskId !== undefined) body.task_id = input.taskId;
    if (input.start !== undefined) body.start = input.start;
    if (input.stop !== undefined) body.stop = input.stop;
    if (input.duration !== undefined) body.duration = input.duration;
    if (input.tags !== undefined) body.tags = input.tags;
    if (input.billable !== undefined) body.billable = input.billable;

    return client.request(`/workspaces/${input.workspaceId}/time_entries/${input.timeEntryId}`, {
      method: "PUT",
      body,
    });
  },
};

export default timeEntryUpdate;
