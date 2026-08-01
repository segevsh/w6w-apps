import type { ActionDefinition } from "@w6w/types";
import { HarvestClient } from "../lib/client.ts";

interface Input {
  timeEntryId: string;
}

/**
 * PATCH /time_entries/{id}/stop — stop a running time entry. Only possible
 * when the entry is currently running.
 */
const timeEntryStop: ActionDefinition<Input> = {
  key: "time-entry-stop",
  type: "perform",
  resource: "time-entry",
  title: "Stop Timer",
  description: "Stop a running time entry.",
  idempotent: true,
  params: [
    { key: "timeEntryId", label: "Time Entry ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Time Entry ID" },
    { key: "is_running", type: "boolean", label: "Is running" },
  ],

  execute(input, ctx) {
    const client = new HarvestClient(ctx);
    return client.request(`/time_entries/${encodeURIComponent(input.timeEntryId)}/stop`, {
      method: "PATCH",
    });
  },
};

export default timeEntryStop;
