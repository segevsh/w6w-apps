import type { ActionDefinition } from "@w6w/types";
import { CREATED_WITH, TogglClient, toTogglTime } from "../lib/client.ts";

interface Input {
  workspaceId: number;
  description?: string;
  projectId?: number;
  taskId?: number;
  tags?: string[];
  billable?: boolean;
  start?: string;
}

/**
 * POST /workspaces/{workspace_id}/time_entries — start a running timer.
 *
 * There is no dedicated "start" endpoint in Toggl's API v9: a running timer
 * is just a time entry created with `duration: -1` and no `stop`. `start`
 * defaults to now (formatted per Toggl's `2006-01-02T15:04:05Z`) when the
 * caller doesn't supply one. `created_with` is required by Toggl's schema and
 * is always `"w6w"` — it identifies the calling app, not user data.
 */
const timeEntryStart: ActionDefinition<Input> = {
  key: "time-entry-start",
  type: "perform",
  resource: "time-entry",
  title: "Start Time Entry",
  description: "Start a running timer in a workspace.",
  idempotent: false,
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
    { key: "description", label: "Description", type: "string" },
    { key: "projectId", label: "Project ID", type: "number" },
    { key: "taskId", label: "Task ID", type: "number" },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string" },
      hint: "Tag names. A name that doesn't exist yet is created automatically.",
    },
    { key: "billable", label: "Billable", type: "boolean" },
    {
      key: "start",
      label: "Start time",
      type: "datetime",
      hint: "UTC. Defaults to now when left blank.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Time Entry ID" },
    { key: "duration", type: "number", label: "Duration" },
  ],

  execute(input, ctx) {
    const client = new TogglClient(ctx);
    const body: Record<string, unknown> = {
      workspace_id: input.workspaceId,
      created_with: CREATED_WITH,
      start: input.start ?? toTogglTime(new Date()),
      duration: -1,
    };
    if (input.description !== undefined) body.description = input.description;
    if (input.projectId !== undefined) body.project_id = input.projectId;
    if (input.taskId !== undefined) body.task_id = input.taskId;
    if (input.tags !== undefined) body.tags = input.tags;
    if (input.billable !== undefined) body.billable = input.billable;

    return client.request(`/workspaces/${input.workspaceId}/time_entries`, {
      method: "POST",
      body,
    });
  },
};

export default timeEntryStart;
