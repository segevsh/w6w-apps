import type { ActionDefinition } from "@w6w/types";
import { HarvestClient } from "../lib/client.ts";

interface Input {
  timeEntryId: string;
}

/** GET /time_entries/{id} — fetch a single time entry by id. */
const timeEntryGet: ActionDefinition<Input> = {
  key: "time-entry-get",
  type: "read",
  resource: "time-entry",
  title: "Get Time Entry",
  description: "Retrieve a single time entry by its id.",
  params: [
    { key: "timeEntryId", label: "Time Entry ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Time Entry ID" },
    { key: "hours", type: "number", label: "Hours" },
    { key: "notes", type: "string", label: "Notes" },
    { key: "is_running", type: "boolean", label: "Is running" },
  ],

  execute(input, ctx) {
    const client = new HarvestClient(ctx);
    return client.request(`/time_entries/${encodeURIComponent(input.timeEntryId)}`);
  },
};

export default timeEntryGet;
