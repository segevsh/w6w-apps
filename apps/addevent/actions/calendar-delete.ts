import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import { calendarIdParam } from "../lib/params.ts";

/**
 * `DELETE /calendars/{calendar_id}` — permanently delete a calendar. Cannot be undone.
 * Answers `204` with no body.
 */
interface Input {
  calendarId: string;
}

const calendarDelete: ActionDefinition<Input> = {
  key: "calendar-delete",
  type: "perform",
  resource: "calendar",
  title: "Delete Calendar",
  description: "Permanently delete a calendar by id. Cannot be undone.",
  idempotent: true,
  params: [calendarIdParam],
  output: [
    { key: "calendarId", type: "string", label: "Calendar deleted" },
    { key: "status", type: "number", label: "HTTP status — 204 on success" },
  ],

  async execute(input, ctx) {
    const status = await new AddEventClient(ctx).status(
      `/calendars/${encodeURIComponent(input.calendarId)}`,
      { method: "DELETE" },
    );
    return { calendarId: input.calendarId, status };
  },
};

export default calendarDelete;
