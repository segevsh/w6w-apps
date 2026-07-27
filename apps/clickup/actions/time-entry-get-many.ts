import type { ActionDefinition } from "@w6w/types";
import { ClickUpClient } from "../lib/client.ts";

interface Input {
  teamId: string;
  startDate?: string;
  endDate?: string;
  assignee?: number;
}

function epochMs(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : undefined;
}

const timeEntryGetMany: ActionDefinition<Input> = {
  key: "time-entry-get-many",
  type: "read",
  resource: "timeEntry",
  title: "Get Many Time Entries",
  description: "List time entries in a workspace (team) within an optional date window.",
  params: [
    { key: "teamId", label: "Team (workspace) ID", type: "string", required: true },
    { key: "startDate", label: "Start date", type: "datetime" },
    { key: "endDate", label: "End date", type: "datetime" },
    {
      key: "assignee",
      label: "Assignee (user ID)",
      type: "number",
      hint: "Filter to a single user's entries.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Time entries" }],

  execute(input, ctx) {
    return new ClickUpClient(ctx).request(
      `/team/${encodeURIComponent(input.teamId)}/time_entries`,
      {
        query: {
          start_date: epochMs(input.startDate),
          end_date: epochMs(input.endDate),
          assignee: input.assignee,
        },
      },
    );
  },
};

export default timeEntryGetMany;
