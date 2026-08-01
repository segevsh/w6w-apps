import type { ActionDefinition } from "@w6w/types";
import { HarvestClient } from "../lib/client.ts";

interface Input {
  timeEntryId: string;
}

/**
 * PATCH /time_entries/{id}/restart — restart a stopped time entry as a
 * running timer. Only possible when the entry isn't already running.
 */
const timeEntryRestart: ActionDefinition<Input> = {
  key: "time-entry-restart",
  type: "perform",
  resource: "time-entry",
  title: "Restart Timer",
  description: "Restart a stopped time entry as a running timer.",
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
    return client.request(`/time_entries/${encodeURIComponent(input.timeEntryId)}/restart`, {
      method: "PATCH",
    });
  },
};

export default timeEntryRestart;
