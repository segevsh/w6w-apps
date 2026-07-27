import type { ActionDefinition } from "@w6w/types";
import { ClickUpClient } from "../lib/client.ts";

interface Input {
  teamId: string;
  taskId: string;
  start: string;
  duration: number;
  description?: string;
  billable?: boolean;
}

function epochMs(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : undefined;
}

const timeEntryCreate: ActionDefinition<Input> = {
  key: "time-entry-create",
  type: "perform",
  resource: "timeEntry",
  title: "Create Time Entry",
  description: "Log a time entry against a task in a workspace (team).",
  idempotent: false,
  params: [
    { key: "teamId", label: "Team (workspace) ID", type: "string", required: true },
    { key: "taskId", label: "Task ID", type: "string", required: true },
    { key: "start", label: "Start", type: "datetime", required: true },
    {
      key: "duration",
      label: "Duration (minutes)",
      type: "number",
      required: true,
      hint: "Length of the entry in minutes.",
    },
    { key: "description", label: "Description", type: "text" },
    { key: "billable", label: "Billable", type: "boolean" },
  ],
  output: [{ key: "data", type: "object", label: "Created time entry" }],

  execute(input, ctx) {
    return new ClickUpClient(ctx).request(
      `/team/${encodeURIComponent(input.teamId)}/time_entries`,
      {
        method: "POST",
        body: {
          tid: input.taskId,
          start: epochMs(input.start),
          duration: input.duration * 60000,
          description: input.description,
          billable: input.billable,
        },
      },
    );
  },
};

export default timeEntryCreate;
