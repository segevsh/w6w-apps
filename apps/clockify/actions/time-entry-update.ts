import type { ActionDefinition } from "@w6w/types";
import { ClockifyClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  timeEntryId: string;
  start?: string;
  end?: string;
  description?: string;
  projectId?: string;
  taskId?: string;
  tagIds?: string[];
  billable?: boolean;
}

/**
 * PUT /workspaces/{workspaceId}/time-entries/{timeEntryId}.
 *
 * Clockify's PUT requires `start` on every call even when only updating
 * another field — n8n's node fetches the entry first to backfill `start` if
 * the caller didn't supply one. This action does the same: if `start` is
 * omitted, it reads the entry's current start time before sending the
 * update, matching `Clockify.node.ts`'s documented workaround.
 */
const timeEntryUpdate: ActionDefinition<Input> = {
  key: "time-entry-update",
  type: "perform",
  resource: "time-entry",
  title: "Update Time Entry",
  description: "Update a time entry — often used to set `end` and stop a running timer.",
  idempotent: true,
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "string", required: true },
    { key: "timeEntryId", label: "Time Entry ID", type: "string", required: true },
    {
      key: "start",
      label: "Start time",
      type: "datetime",
      hint: "Required by Clockify's API on every update; fetched automatically if left blank.",
    },
    { key: "end", label: "End time", type: "datetime" },
    { key: "description", label: "Description", type: "string" },
    { key: "projectId", label: "Project ID", type: "string" },
    { key: "taskId", label: "Task ID", type: "string" },
    { key: "tagIds", label: "Tag IDs", type: "array", item: { type: "string" } },
    { key: "billable", label: "Billable", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Time Entry ID" },
  ],

  async execute(input, ctx) {
    const client = new ClockifyClient(ctx);
    const path = `/workspaces/${input.workspaceId}/time-entries/${input.timeEntryId}`;
    const body: Record<string, unknown> = {};
    if (input.end !== undefined) body.end = input.end;
    if (input.description !== undefined) body.description = input.description;
    if (input.projectId !== undefined) body.projectId = input.projectId;
    if (input.taskId !== undefined) body.taskId = input.taskId;
    if (input.tagIds !== undefined) body.tagIds = input.tagIds;
    if (input.billable !== undefined) body.billable = input.billable;

    if (input.start !== undefined) {
      body.start = input.start;
    } else {
      const current = await client.request<{ timeInterval?: { start?: string } }>(path);
      body.start = current.timeInterval?.start;
    }

    return client.request(path, { method: "PUT", body });
  },
};

export default timeEntryUpdate;
