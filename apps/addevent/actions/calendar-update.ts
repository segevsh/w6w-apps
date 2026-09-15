import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import {
  calendarIdParam,
  type CalendarInput,
  calendarInputBody,
  calendarInputParams,
} from "../lib/params.ts";
import type { AddEventCalendar } from "../lib/schema.ts";

/**
 * `PATCH /calendars/{calendar_id}` — update a calendar. Only the fields provided are
 * changed; anything omitted is left unchanged.
 */
interface Input extends CalendarInput {
  calendarId: string;
}

const calendarUpdate: ActionDefinition<Input> = {
  key: "calendar-update",
  type: "perform",
  resource: "calendar",
  title: "Update Calendar",
  description: "Update a calendar. Only the fields you set are changed; everything else is " +
    "left as-is.",
  idempotent: true,
  params: [calendarIdParam, ...calendarInputParams(false)],
  output: [
    { key: "id", type: "string", label: "Calendar ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "timezone", type: "string", label: "Default timezone" },
    { key: "link_long", type: "string", label: "Public calendar page URL" },
    { key: "modified", type: "string", label: "Modified at" },
  ],

  execute(input, ctx) {
    const { calendarId, ...body } = input;
    return new AddEventClient(ctx).json<AddEventCalendar>(
      `/calendars/${encodeURIComponent(calendarId)}`,
      { method: "PATCH", body: calendarInputBody(body) },
    );
  },
};

export default calendarUpdate;
