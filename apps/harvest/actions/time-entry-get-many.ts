import type { ActionDefinition } from "@w6w/types";
import { HarvestClient } from "../lib/client.ts";

interface Input {
  userId?: string;
  clientId?: string;
  projectId?: string;
  taskId?: string;
  isBilled?: boolean;
  isRunning?: boolean;
  updatedSince?: string;
  from?: string;
  to?: string;
  perPage?: number;
}

/**
 * GET /time_entries — list time entries, optionally filtered. All filters
 * combine as a conjunction. The response is the full Harvest page envelope
 * (`time_entries`, `total_entries`, `next_page`, …), passed through as-is.
 */
const timeEntryGetMany: ActionDefinition<Input> = {
  key: "time-entry-get-many",
  type: "read",
  resource: "time-entry",
  title: "Get Many Time Entries",
  description: "List time entries, optionally filtered by user, client, project, task, or date.",
  params: [
    { key: "userId", label: "User ID", type: "string" },
    { key: "clientId", label: "Client ID", type: "string" },
    { key: "projectId", label: "Project ID", type: "string" },
    { key: "taskId", label: "Task ID", type: "string" },
    { key: "isBilled", label: "Is billed", type: "boolean" },
    { key: "isRunning", label: "Is running", type: "boolean" },
    {
      key: "updatedSince",
      label: "Updated since",
      type: "datetime",
      hint: "Only entries updated on or after this time.",
    },
    { key: "from", label: "From date", type: "date", hint: "Only entries spent on or after." },
    { key: "to", label: "To date", type: "date", hint: "Only entries spent on or before." },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      hint: "1–2000. Defaults to Harvest's own default (2000).",
    },
  ],
  output: [
    { key: "time_entries", type: "array", label: "Time entries" },
    { key: "total_entries", type: "number", label: "Total entries" },
  ],

  execute(input, ctx) {
    const client = new HarvestClient(ctx);
    return client.request("/time_entries", {
      query: {
        user_id: input.userId,
        client_id: input.clientId,
        project_id: input.projectId,
        task_id: input.taskId,
        is_billed: input.isBilled,
        is_running: input.isRunning,
        updated_since: input.updatedSince,
        from: input.from,
        to: input.to,
        per_page: input.perPage,
      },
    });
  },
};

export default timeEntryGetMany;
