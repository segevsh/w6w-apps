import type { ActionDefinition } from "@w6w/types";
import { TogglClient } from "../lib/client.ts";

/**
 * GET /me/time_entries/current — the currently running time entry, or `null`
 * if none is running. No params, so this is also safe to invoke with `{}`.
 */
const timeEntryGetCurrent: ActionDefinition<Record<string, never>> = {
  key: "time-entry-get-current",
  type: "read",
  resource: "time-entry",
  title: "Get Current Time Entry",
  description: "Get the currently running time entry, if any.",
  params: [],
  output: [
    { key: "id", type: "number", label: "Time Entry ID" },
    { key: "duration", type: "number", label: "Duration" },
  ],

  execute(_input, ctx) {
    const client = new TogglClient(ctx);
    return client.request("/me/time_entries/current");
  },
};

export default timeEntryGetCurrent;
