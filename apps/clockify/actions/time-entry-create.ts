import type { ActionDefinition } from "@w6w/types";
import { ClockifyClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  start: string;
  end?: string;
  description?: string;
  projectId?: string;
  taskId?: string;
  tagIds?: string[];
  billable?: boolean;
}

/**
 * POST /workspaces/{workspaceId}/time-entries.
 *
 * There is no dedicated "start timer" endpoint in Clockify's API — a time
 * entry created without `end` becomes the workspace's running timer, same
 * convention as this pack's Toggl app. Verified against n8n's
 * `Clockify.node.ts` (`timeEntry` → `create`), which posts exactly this
 * `{ start, end?, description?, projectId?, taskId?, tagIds?, billable? }`
 * shape to this path.
 */
const timeEntryCreate: ActionDefinition<Input> = {
  key: "time-entry-create",
  type: "perform",
  resource: "time-entry",
  title: "Create Time Entry",
  description: "Create a time entry — omit `end` to start a running timer.",
  idempotent: false,
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "string", required: true },
    { key: "start", label: "Start time", type: "datetime", required: true },
    {
      key: "end",
      label: "End time",
      type: "datetime",
      hint: "Leave blank to start a running timer.",
    },
    { key: "description", label: "Description", type: "string" },
    { key: "projectId", label: "Project ID", type: "string" },
    { key: "taskId", label: "Task ID", type: "string" },
    { key: "tagIds", label: "Tag IDs", type: "array", item: { type: "string" } },
    { key: "billable", label: "Billable", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Time Entry ID" },
  ],

  execute(input, ctx) {
    const client = new ClockifyClient(ctx);
    const body: Record<string, unknown> = { start: input.start };
    if (input.end !== undefined) body.end = input.end;
    if (input.description !== undefined) body.description = input.description;
    if (input.projectId !== undefined) body.projectId = input.projectId;
    if (input.taskId !== undefined) body.taskId = input.taskId;
    if (input.tagIds !== undefined) body.tagIds = input.tagIds;
    if (input.billable !== undefined) body.billable = input.billable;

    return client.request(`/workspaces/${input.workspaceId}/time-entries`, {
      method: "POST",
      body,
    });
  },
};

export default timeEntryCreate;
