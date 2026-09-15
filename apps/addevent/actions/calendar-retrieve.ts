import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import { calendarIdParam } from "../lib/params.ts";
import type { AddEventCalendar } from "../lib/schema.ts";

/** `GET /calendars/{calendar_id}` — retrieve one calendar object. */
interface Input {
  calendarId: string;
}

const calendarRetrieve: ActionDefinition<Input> = {
  key: "calendar-retrieve",
  type: "read",
  resource: "calendar",
  title: "Retrieve Calendar",
  description: "Fetch one calendar by id.",
  params: [calendarIdParam],
  output: [
    { key: "id", type: "string", label: "Calendar ID" },
    { key: "unique_key", type: "string", label: "Public share key" },
    { key: "title", type: "string", label: "Title" },
    { key: "timezone", type: "string", label: "Default timezone" },
    { key: "is_default_calendar", type: "boolean", label: "Is the account's default calendar" },
    { key: "stats", type: "object", label: "Subscriber and event counts" },
    { key: "link_long", type: "string", label: "Public calendar page URL" },
    { key: "link_short", type: "string", label: "Short public calendar page URL" },
    { key: "created", type: "string", label: "Created at" },
    { key: "modified", type: "string", label: "Modified at" },
  ],

  execute(input, ctx) {
    return new AddEventClient(ctx).json<AddEventCalendar>(
      `/calendars/${encodeURIComponent(input.calendarId)}`,
    );
  },
};

export default calendarRetrieve;
