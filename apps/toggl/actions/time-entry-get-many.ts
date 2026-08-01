import type { ActionDefinition } from "@w6w/types";
import { TogglClient } from "../lib/client.ts";

interface Input {
  since?: number;
  before?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * GET /me/time_entries — list the current user's time entries, newest first.
 * `startDate`/`endDate` (used together) and `before` accept either a plain
 * date (`YYYY-MM-DD`) or an RFC 3339 timestamp, per Toggl's own docs.
 */
const timeEntryGetMany: ActionDefinition<Input, unknown[]> = {
  key: "time-entry-get-many",
  type: "search",
  resource: "time-entry",
  title: "List Time Entries",
  description: "List the authenticated user's time entries, optionally filtered by date.",
  params: [
    {
      key: "since",
      label: "Since",
      type: "number",
      hint: "UNIX timestamp. Entries modified on or after this time, including deleted ones.",
    },
    {
      key: "before",
      label: "Before",
      type: "string",
      placeholder: "2026-07-01",
      hint: "Entries starting before this date (YYYY-MM-DD) or RFC 3339 timestamp.",
    },
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      placeholder: "2026-07-01",
      row: "range",
      hint: "Use together with End date. YYYY-MM-DD or RFC 3339.",
    },
    {
      key: "endDate",
      label: "End date",
      type: "string",
      placeholder: "2026-07-31",
      row: "range",
    },
  ],
  output: [{ key: "", type: "array", label: "Time entries" }],

  execute(input, ctx) {
    const client = new TogglClient(ctx);
    return client.request<unknown[]>("/me/time_entries", {
      query: {
        since: input.since,
        before: input.before,
        start_date: input.startDate,
        end_date: input.endDate,
      },
    });
  },
};

export default timeEntryGetMany;
