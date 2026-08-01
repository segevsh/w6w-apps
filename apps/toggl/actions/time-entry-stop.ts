import type { ActionDefinition } from "@w6w/types";
import { TogglClient } from "../lib/client.ts";

interface Input {
  workspaceId: number;
  timeEntryId: number;
}

/**
 * PATCH /workspaces/{workspace_id}/time_entries/{time_entry_id}/stop — stop a
 * running time entry.
 */
const timeEntryStop: ActionDefinition<Input> = {
  key: "time-entry-stop",
  type: "perform",
  resource: "time-entry",
  title: "Stop Time Entry",
  description: "Stop a running time entry.",
  idempotent: true,
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
    { key: "timeEntryId", label: "Time Entry ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Time Entry ID" },
    { key: "duration", type: "number", label: "Duration" },
  ],

  execute(input, ctx) {
    const client = new TogglClient(ctx);
    return client.request(
      `/workspaces/${input.workspaceId}/time_entries/${input.timeEntryId}/stop`,
      { method: "PATCH" },
    );
  },
};

export default timeEntryStop;
